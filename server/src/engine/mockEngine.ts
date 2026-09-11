import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import { BenchmarkConfig, BenchmarkReport, BenchmarkTick } from '../types';
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

    // Target RPS simulation based on concurrency (e.g. 50-1200 RPS)
    const baseRps = Math.min(1500, Math.max(80, this.config.concurrency * 35));

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

      // Add a slight realistic fluctuation to RPS (+/- 15%)
      const fluctuation = 1 + (Math.sin(elapsedMs / 1000) * 0.12) + ((Math.random() - 0.5) * 0.08);
      const instantRps = Math.round(baseRps * fluctuation);
      if (instantRps > rpsPeak) rpsPeak = instantRps;

      // Generate requests for this 250ms interval
      const requestsThisTick = Math.round((instantRps * tickFrequencyMs) / 1000);

      for (let i = 0; i < requestsThisTick; i++) {
        // Gaussian distributed latency
        // Box-Muller transform
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        
        let latency = 18 + z * 6; // median around 18ms
        
        // 2% chance of tail latency spike
        if (Math.random() < 0.02) {
          latency += 50 + Math.random() * 150;
        }
        latency = Math.max(4, latency);

        this.histogram.record(latency);
        totalRequests++;

        // Status code distribution: 98.8% 200, 0.8% 429, 0.4% 500
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
        activeWorkers: this.config.concurrency,
      };

      ticks.push(tick);
      this.emit('tick', tick);

      // Check if finished
      if (elapsedMs >= durationMs) {
        this.cleanup();
        const endTime = new Date();
        const durationActualMs = endTime.getTime() - startTimeMs;
        const rpsMean = Math.round((totalRequests / (durationActualMs / 1000)) * 10) / 10;

        const report: BenchmarkReport = {
          id: this.id,
          url: this.config.url,
          method: this.config.method || 'GET',
          concurrency: this.config.concurrency,
          durationSec: this.config.durationSec,
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
