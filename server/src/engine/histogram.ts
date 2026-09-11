import * as hdr from 'hdr-histogram-js';
import { LatencyStats, PercentilePoint } from '../types';

export class LatencyHistogram {
  private histogram: hdr.Histogram;
  private sampleCount: number = 0;

  constructor() {
    this.histogram = hdr.build({
      lowestDiscernibleValue: 1,
      highestTrackableValue: 60000,
      numberOfSignificantValueDigits: 3,
    });
  }

  public record(latencyMs: number): void {
    if (isNaN(latencyMs) || latencyMs <= 0) {
      latencyMs = 1;
    }
    const clamped = Math.min(60000, Math.max(1, Math.round(latencyMs)));
    this.histogram.recordValue(clamped);
    this.sampleCount++;
  }

  public get count(): number {
    return this.sampleCount;
  }

  public getPercentile(percentile: number): number {
    if (this.sampleCount === 0) return 0;
    return this.histogram.getValueAtPercentile(percentile);
  }

  public getStats(): LatencyStats {
    if (this.sampleCount === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        stdDev: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        p99_9: 0,
      };
    }

    return {
      min: this.histogram.minNonZeroValue,
      max: this.histogram.maxValue,
      mean: Math.round(this.histogram.mean * 10) / 10,
      stdDev: Math.round(this.histogram.stdDeviation * 10) / 10,
      p50: this.histogram.getValueAtPercentile(50),
      p75: this.histogram.getValueAtPercentile(75),
      p90: this.histogram.getValueAtPercentile(90),
      p95: this.histogram.getValueAtPercentile(95),
      p99: this.histogram.getValueAtPercentile(99),
      p99_9: this.histogram.getValueAtPercentile(99.9),
    };
  }

  public getPercentileCurve(): PercentilePoint[] {
    if (this.sampleCount === 0) {
      return [];
    }

    const percentiles = [
      0, 10, 25, 50, 70, 80, 85, 90, 92, 95, 97, 98, 99, 99.5, 99.9, 100
    ];

    return percentiles.map((p) => ({
      percentile: p,
      latencyMs: this.histogram.getValueAtPercentile(p),
    }));
  }

  public reset(): void {
    this.histogram.reset();
    this.sampleCount = 0;
  }
}
