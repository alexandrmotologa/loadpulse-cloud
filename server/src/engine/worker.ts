import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import { Pool } from 'undici';
import { nanoid } from 'nanoid';
import { BenchmarkConfig, BenchmarkReport, BenchmarkTick } from '../types';
import { LatencyHistogram } from './histogram';
import { historyStore } from '../storage/historyStore';

export class BenchmarkWorker extends EventEmitter {
  private config: BenchmarkConfig;
  private id: string;
  private isRunning: boolean = false;
  private isStopped: boolean = false;
  private histogram: LatencyHistogram;
  private pool: Pool | null = null;
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

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isStopped = false;

    const parsedUrl = new URL(this.config.url);
    const origin = parsedUrl.origin;
    const pathAndQuery = parsedUrl.pathname + parsedUrl.search;

    this.pool = new Pool(origin, {
      connections: Math.max(1, this.config.concurrency),
      pipelining: 1,
      keepAliveTimeout: 10000,
      keepAliveMaxTimeout: 30000,
    });

    const startTime = new Date();
    const startTimeMs = startTime.getTime();
    const durationMs = this.config.durationSec * 1000;
    const endTimeTarget = startTimeMs + durationMs;

    const ticks: BenchmarkTick[] = [];
    const statusCodes: Record<string, number> = {};

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let rpsPeak = 0;

    // Sliding window counter for RPS calculation
    let windowRequests = 0;
    let lastWindowTime = performance.now();

    this.emit('started', { id: this.id, config: this.config });

    // Background tick broadcaster every 250ms
    const tickFrequencyMs = 250;
    let elapsedMs = 0;

    this.tickInterval = setInterval(() => {
      if (this.isStopped) {
        this.cleanup();
        return;
      }

      const now = performance.now();
      const windowSec = (now - lastWindowTime) / 1000;
      const instantRps = windowSec > 0 ? Math.round(windowRequests / windowSec) : 0;
      if (instantRps > rpsPeak) rpsPeak = instantRps;

      // Reset sliding window
      windowRequests = 0;
      lastWindowTime = now;

      elapsedMs += tickFrequencyMs;
      const elapsedSec = Math.round((elapsedMs / 1000) * 10) / 10;

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
    }, tickFrequencyMs);

    // Concurrency worker loop
    const runWorker = async () => {
      while (!this.isStopped && Date.now() < endTimeTarget) {
        const reqStart = performance.now();
        try {
          if (!this.pool) break;
          const res = await this.pool.request({
            path: pathAndQuery,
            method: this.config.method || 'GET',
            headers: {
              'User-Agent': 'LoadPulse-Cloud/1.0 (+https://github.com/alexandrmotologa/loadpulse-cloud)',
              'Accept': '*/*',
              ...this.config.headers,
            },
            body: this.config.body || undefined,
            headersTimeout: this.config.timeoutMs || 10000,
            bodyTimeout: this.config.timeoutMs || 10000,
          });

          // Drain response body
          await res.body.dump();

          const latency = performance.now() - reqStart;
          this.histogram.record(latency);

          totalRequests++;
          windowRequests++;

          const codeStr = String(res.statusCode);
          statusCodes[codeStr] = (statusCodes[codeStr] || 0) + 1;

          if (res.statusCode >= 200 && res.statusCode < 400) {
            successfulRequests++;
          } else {
            failedRequests++;
          }
        } catch (err: any) {
          const latency = performance.now() - reqStart;
          this.histogram.record(latency);

          totalRequests++;
          windowRequests++;
          failedRequests++;

          const errKey = err.code || 'ERR_REQUEST_FAILED';
          statusCodes[errKey] = (statusCodes[errKey] || 0) + 1;
        }
      }
    };

    // Launch all concurrent virtual user workers
    const workers = Array.from({ length: this.config.concurrency }, () => runWorker());
    await Promise.all(workers);

    this.cleanup();

    const endTime = new Date();
    const durationActualMs = endTime.getTime() - startTimeMs;
    const rpsMean = durationActualMs > 0 ? Math.round((totalRequests / (durationActualMs / 1000)) * 10) / 10 : 0;

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
      isDemo: false,
    };

    historyStore.save(report);
    this.emit('completed', report);
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
    if (this.pool) {
      this.pool.destroy().catch(() => {});
      this.pool = null;
    }
    this.isRunning = false;
  }
}
