import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import { BenchmarkConfig, BenchmarkReport, BenchmarkTick, LoadProfile, SloResult } from '../types';
import { LatencyHistogram } from './histogram';
import { historyStore } from '../storage/historyStore';

export class MockEngine extends EventEmitter {
  private config: BenchmarkConfig;
  private id: string;
  private isRunning: boolean = false;
  private isStopped: boolean = false;
  private histogram: LatencyHistogram;
  private tickInterval: NodeJS.Timeout | null = null;

  constructor(config: BenchmarkConfig) {
    super();
    this.config = config;
    this.id = config.id || `bench_${nanoid(10)}`;
    this.histogram = new LatencyHistogram();
  }

  public getId(): string {
    return this.id;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isStopped = false;

    const startTime = new Date();
    const startTimeMs = startTime.getTime();
    const durationMs = this.config.durationSec * 1000;
    const ticks: BenchmarkTick[] = [];
    const statusCodes: Record<string, number> = {
      '200': 0,
      '429': 0,
      '500': 0,
    };

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let rpsPeak = 0;

    const loadProfile: LoadProfile = this.config.loadProfile || 'flat';
    const targetConcurrency = this.config.concurrency;

    this.emit('started', { id: this.id, config: this.config });

    const tickFrequencyMs = 250;
    let elapsedMs = 0;

    this.tickInterval = setInterval(() => {
      if (this.isStopped) {
        this.cleanup();
        return;
      }

      elapsedMs += tickFrequencyMs;
      const elapsedSec = Math.round((elapsedMs / 1000) * 10) / 10;
      const progressRatio = Math.min(1, elapsedMs / durationMs);

      // Compute dynamic concurrency based on load profile
      let activeConcurrency = targetConcurrency;
      if (loadProfile === 'ramp-up') {
        if (progressRatio < 0.3) {
          activeConcurrency = Math.max(1, Math.round(targetConcurrency * (progressRatio / 0.3)));
        } else if (progressRatio > 0.8) {
          activeConcurrency = Math.max(1, Math.round(targetConcurrency * ((1 - progressRatio) / 0.2)));
        }
      } else if (loadProfile === 'spike') {
        if (progressRatio >= 0.45 && progressRatio <= 0.65) {
          activeConcurrency = targetConcurrency;
        } else {
          activeConcurrency = Math.max(1, Math.round(targetConcurrency * 0.25));
        }
      } else if (loadProfile === 'step') {
        if (progressRatio < 0.33) {
          activeConcurrency = Math.max(1, Math.round(targetConcurrency * 0.33));
        } else if (progressRatio < 0.66) {
          activeConcurrency = Math.max(1, Math.round(targetConcurrency * 0.66));
        } else {
          activeConcurrency = targetConcurrency;
        }
      }

      // Base RPS scales with active concurrency
      const baseRps = Math.min(1800, Math.max(40, activeConcurrency * 35));
      const fluctuation = 1 + Math.sin(elapsedMs / 1000) * 0.1 + (Math.random() - 0.5) * 0.08;
      const instantRps = Math.round(baseRps * fluctuation);
      if (instantRps > rpsPeak) rpsPeak = instantRps;

      // Generate requests for this 250ms interval
      const requestsThisTick = Math.round((instantRps * tickFrequencyMs) / 1000);

      for (let i = 0; i < requestsThisTick; i++) {
        // Gaussian distributed latency
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

        // Latency slightly increases under heavy spike load
        const loadFactor = activeConcurrency / targetConcurrency;
        let latency = 16 + loadFactor * 4 + z * 5;

        if (Math.random() < 0.02) {
          latency += 60 + Math.random() * 120;
        }
        latency = Math.max(4, latency);

        this.histogram.record(latency);
        totalRequests++;

        const rand = Math.random();
        if (rand > 0.996) {
          statusCodes['500']++;
          failedRequests++;
        } else if (rand > 0.988) {
          statusCodes['429']++;
          failedRequests++;
        } else {
          statusCodes['200']++;
          successfulRequests++;
        }
      }

      const tick: BenchmarkTick = {
        timestamp: Date.now(),
        elapsedSec,
        rps: instantRps,
        currentP50: this.histogram.getPercentile(50),
        currentP95: this.histogram.getPercentile(95),
        currentP99: this.histogram.getPercentile(99),
        totalRequests,
        successfulRequests,
        failedRequests,
        activeWorkers: activeConcurrency,
      };

      ticks.push(tick);
      this.emit('tick', tick);

      if (elapsedMs >= durationMs) {
        this.cleanup();
        const endTime = new Date();
        const durationActualMs = endTime.getTime() - startTimeMs;
        const rpsMean = Math.round((totalRequests / (durationActualMs / 1000)) * 10) / 10;

        // Evaluate SLO assertions if provided
        let sloResult: SloResult | undefined;
        if (this.config.slo) {
          const breaches: string[] = [];
          const p95Val = this.histogram.getPercentile(95);

          if (this.config.slo.maxP95Ms !== undefined && p95Val > this.config.slo.maxP95Ms) {
            breaches.push(`p95 latency was ${p95Val}ms (target: <= ${this.config.slo.maxP95Ms}ms)`);
          }

          const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
          if (
            this.config.slo.maxErrorRatePercent !== undefined &&
            errorRate > this.config.slo.maxErrorRatePercent
          ) {
            breaches.push(`Error rate was ${errorRate.toFixed(1)}% (target: <= ${this.config.slo.maxErrorRatePercent}%)`);
          }

          if (this.config.slo.minRps !== undefined && rpsMean < this.config.slo.minRps) {
            breaches.push(`Average throughput was ${rpsMean} req/s (target: >= ${this.config.slo.minRps} req/s)`);
          }

          sloResult = {
            passed: breaches.length === 0,
            breaches,
          };
        }

        const report: BenchmarkReport = {
          id: this.id,
          url: this.config.url,
          method: this.config.method || 'GET',
          concurrency: this.config.concurrency,
          durationSec: this.config.durationSec,
          loadProfile,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationActualMs,
          totalRequests,
          successfulRequests,
          failedRequests,
          rpsMean,
          rpsPeak,
          latencies: this.histogram.getStats(),
          statusCodes,
          percentilePoints: this.histogram.getPercentileCurve(),
          ticks,
          slo: this.config.slo,
          sloResult,
          isDemo: true,
        };

        historyStore.save(report);
        this.emit('completed', report);
      }
    }, tickFrequencyMs);
  }

  public stop(): void {
    this.isStopped = true;
    this.cleanup();
    this.emit('error', { id: this.id, message: 'Benchmark cancelled by user.' });
  }

  private cleanup(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.isRunning = false;
  }
}
