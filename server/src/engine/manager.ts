import { EventEmitter } from 'node:events';
import { BenchmarkConfig, BenchmarkReport, BenchmarkTick } from '../types';
import { BenchmarkWorker } from './worker';
import { MockEngine } from './mockEngine';
import { validateBenchmarkConfig } from './guard';

export interface ActiveJob {
  id: string;
  config: BenchmarkConfig;
  startTime: number;
  engine: BenchmarkWorker | MockEngine;
  emitter: EventEmitter;
  lastTick: BenchmarkTick | null;
  report: BenchmarkReport | null;
  status: 'running' | 'completed' | 'error';
}

export class BenchmarkManager {
  private activeJobs: Map<string, ActiveJob> = new Map();
  private isDemoMode: boolean;

  constructor(isDemoMode: boolean = false) {
    this.isDemoMode = isDemoMode;
  }

  public setDemoMode(val: boolean): void {
    this.isDemoMode = val;
  }

  public async startBenchmark(config: BenchmarkConfig): Promise<ActiveJob> {
    // Validate config and check SSRF
    await validateBenchmarkConfig(config, this.isDemoMode);

    const emitter = new EventEmitter();
    // Allow multiple SSE clients and bot listeners
    emitter.setMaxListeners(50);

    const engine = this.isDemoMode ? new MockEngine(config) : new BenchmarkWorker(config);
    const id = engine.getId();

    const job: ActiveJob = {
      id,
      config,
      startTime: Date.now(),
      engine,
      emitter,
      lastTick: null,
      report: null,
      status: 'running',
    };

    this.activeJobs.set(id, job);

    engine.on('started', (data) => {
      emitter.emit('started', data);
    });

    engine.on('tick', (tick: BenchmarkTick) => {
      job.lastTick = tick;
      emitter.emit('tick', tick);
    });

    engine.on('completed', (report: BenchmarkReport) => {
      job.report = report;
      job.status = 'completed';
      emitter.emit('completed', report);
    });

    engine.on('error', (errData) => {
      job.status = 'error';
      emitter.emit('error', errData);
    });

    // Start engine asynchronously
    Promise.resolve(engine.start()).catch((err) => {
      job.status = 'error';
      emitter.emit('error', { id, message: err.message || 'Benchmark execution failed' });
    });

    return job;
  }

  public getJob(id: string): ActiveJob | null {
    return this.activeJobs.get(id) || null;
  }

  public stopBenchmark(id: string): boolean {
    const job = this.activeJobs.get(id);
    if (job && job.status === 'running') {
      job.engine.stop();
      job.status = 'error';
      return true;
    }
    return false;
  }

  public getActiveJobs(): ActiveJob[] {
    return Array.from(this.activeJobs.values()).filter((j) => j.status === 'running');
  }
}

export const benchmarkManager = new BenchmarkManager(process.env.DEMO_MODE === 'true');
