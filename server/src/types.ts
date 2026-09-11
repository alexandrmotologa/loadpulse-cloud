export type LoadProfile = 'flat' | 'ramp-up' | 'spike' | 'step';

export interface SloCriteria {
  maxP95Ms?: number;
  maxErrorRatePercent?: number;
  minRps?: number;
}

export interface SloResult {
  passed: boolean;
  breaches: string[];
}

export interface ProbeResult {
  url: string;
  statusCode: number;
  statusText: string;
  dnsMs: number;
  tlsMs: number;
  ttfbMs: number;
  totalMs: number;
  ip?: string;
  serverHeader?: string;
  contentLength?: number;
  headers: Record<string, string>;
  isDemo?: boolean;
}

export interface BenchmarkConfig {
  id?: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  headers?: Record<string, string>;
  body?: string;
  concurrency: number; // 1 - 100
  durationSec: number; // 5 - 30
  timeoutMs?: number;
  loadProfile?: LoadProfile;
  slo?: SloCriteria;
}

export interface LatencyStats {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  p99_9: number;
}

export interface PercentilePoint {
  percentile: number;
  latencyMs: number;
}

export interface BenchmarkTick {
  timestamp: number;
  elapsedSec: number;
  rps: number;
  currentP50: number;
  currentP95: number;
  currentP99: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  activeWorkers: number;
}

export interface BenchmarkReport {
  id: string;
  url: string;
  method: string;
  concurrency: number;
  durationSec: number;
  loadProfile: LoadProfile;
  startTime: string;
  endTime: string;
  durationActualMs: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rpsMean: number;
  rpsPeak: number;
  latencies: LatencyStats;
  statusCodes: Record<string, number>;
  percentilePoints: PercentilePoint[];
  ticks: BenchmarkTick[];
  slo?: SloCriteria;
  sloResult?: SloResult;
  isDemo?: boolean;
}

export type BenchmarkEvent =
  | { type: 'started'; data: { id: string; config: BenchmarkConfig } }
  | { type: 'tick'; data: BenchmarkTick }
  | { type: 'completed'; data: BenchmarkReport }
  | { type: 'error'; data: { id: string; message: string } };
