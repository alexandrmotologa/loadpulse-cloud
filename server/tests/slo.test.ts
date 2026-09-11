import { describe, it, expect } from 'vitest';
import { MockEngine } from '../src/engine/mockEngine';
import { BenchmarkConfig } from '../src/types';

describe('MockEngine with Load Profiles and SLOs', () => {
  it('should run ramp-up profile and compute SLO results', async () => {
    const config: BenchmarkConfig = {
      url: 'https://api.test.com/v1',
      concurrency: 20,
      durationSec: 5,
      loadProfile: 'ramp-up',
      slo: {
        maxP95Ms: 500, // Generous threshold, should pass
        maxErrorRatePercent: 5,
      },
    };

    const engine = new MockEngine(config);
    const reportPromise = new Promise<any>((resolve) => {
      engine.on('completed', resolve);
    });

    engine.start();
    const report = await reportPromise;

    expect(report.id).toBeDefined();
    expect(report.loadProfile).toBe('ramp-up');
    expect(report.sloResult).toBeDefined();
    expect(report.sloResult.passed).toBe(true);
    expect(report.sloResult.breaches.length).toBe(0);
    expect(report.ticks.length).toBeGreaterThan(5);
  }, 10000);

  it('should flag breached SLO when thresholds are unmet', async () => {
    const config: BenchmarkConfig = {
      url: 'https://api.test.com/v1',
      concurrency: 20,
      durationSec: 5,
      loadProfile: 'spike',
      slo: {
        maxP95Ms: 1, // Impossibly tight threshold, must fail
        minRps: 999999, // Impossibly high RPS, must fail
      },
    };

    const engine = new MockEngine(config);
    const reportPromise = new Promise<any>((resolve) => {
      engine.on('completed', resolve);
    });

    engine.start();
    const report = await reportPromise;

    expect(report.sloResult).toBeDefined();
    expect(report.sloResult.passed).toBe(false);
    expect(report.sloResult.breaches.length).toBeGreaterThanOrEqual(1);
  }, 10000);
});
