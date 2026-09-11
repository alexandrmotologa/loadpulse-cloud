import { describe, it, expect } from 'vitest';
import { LatencyHistogram } from '../src/engine/histogram';

describe('LatencyHistogram', () => {
  it('should initialize with zeros when empty', () => {
    const hist = new LatencyHistogram();
    expect(hist.count).toBe(0);
    const stats = hist.getStats();
    expect(stats.p50).toBe(0);
    expect(stats.p99).toBe(0);
  });

  it('should record latencies and compute ordered percentiles', () => {
    const hist = new LatencyHistogram();
    // Record sample distribution: mostly around 20ms, some 50ms, a few 200ms
    for (let i = 0; i < 80; i++) hist.record(20);
    for (let i = 0; i < 15; i++) hist.record(50);
    for (let i = 0; i < 5; i++) hist.record(200);

    expect(hist.count).toBe(100);
    const stats = hist.getStats();

    expect(stats.min).toBe(20);
    expect(stats.max).toBe(200);
    expect(stats.p50).toBeLessThanOrEqual(stats.p90);
    expect(stats.p90).toBeLessThanOrEqual(stats.p95);
    expect(stats.p95).toBeLessThanOrEqual(stats.p99);
    expect(stats.p99).toBeLessThanOrEqual(stats.p99_9);
  });

  it('should return curve points', () => {
    const hist = new LatencyHistogram();
    for (let i = 1; i <= 100; i++) hist.record(i);
    const curve = hist.getPercentileCurve();
    expect(curve.length).toBeGreaterThan(5);
    expect(curve[0].percentile).toBe(0);
    expect(curve[curve.length - 1].percentile).toBe(100);
  });
});
