import { useState, useCallback, useRef, useEffect } from 'react';
import { BenchmarkConfig, BenchmarkReport, BenchmarkTick } from '../types';

export function useLiveBenchmark() {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [activeConfig, setActiveConfig] = useState<BenchmarkConfig | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [latestTick, setLatestTick] = useState<BenchmarkTick | null>(null);
  const [ticks, setTicks] = useState<BenchmarkTick[]>([]);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanupStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connectToStream = useCallback((benchId: string) => {
    cleanupStream();

    const es = new EventSource(`/api/bench/${benchId}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('started', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.config) setActiveConfig(payload.config);
      } catch (err) {
        console.error('Failed to parse started event', err);
      }
    });

    es.addEventListener('tick', (e: MessageEvent) => {
      try {
        const tick: BenchmarkTick = JSON.parse(e.data);
        setLatestTick(tick);
        setTicks((prev) => [...prev, tick]);
      } catch (err) {
        console.error('Failed to parse tick event', err);
      }
    });

    es.addEventListener('completed', (e: MessageEvent) => {
      try {
        const rep: BenchmarkReport = JSON.parse(e.data);
        setReport(rep);
        setStatus('completed');
        cleanupStream();
      } catch (err) {
        console.error('Failed to parse completed event', err);
      }
    });

    es.addEventListener('error', (e: any) => {
      let msg = 'Live telemetry stream disconnected.';
      try {
        if (e.data) {
          const parsed = JSON.parse(e.data);
          msg = parsed.message || msg;
        }
      } catch {}
      setErrorMessage(msg);
      setStatus('error');
      cleanupStream();
    });
  }, [cleanupStream]);

  const startBenchmark = useCallback(async (config: BenchmarkConfig) => {
    setStatus('running');
    setErrorMessage(null);
    setReport(null);
    setLatestTick(null);
    setTicks([]);
    setActiveConfig(config);

    try {
      const res = await fetch('/api/bench', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to start benchmark');
      }

      setActiveId(data.id);
      connectToStream(data.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network request failed');
      setStatus('error');
    }
  }, [connectToStream]);

  const stopBenchmark = useCallback(async () => {
    if (!activeId) return;
    try {
      await fetch(`/api/bench/${activeId}/stop`, { method: 'POST' });
    } catch (err) {
      console.warn('Failed to send stop request', err);
    }
    cleanupStream();
    setStatus('error');
    setErrorMessage('Benchmark was aborted by user.');
  }, [activeId, cleanupStream]);

  const loadReport = useCallback(async (id: string) => {
    setStatus('running');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/bench/${id}/report`);
      if (!res.ok) {
        throw new Error(`Report ${id} not found`);
      }
      const data: BenchmarkReport = await res.json();
      setReport(data);
      setActiveId(id);
      setActiveConfig({
        url: data.url,
        concurrency: data.concurrency,
        durationSec: data.durationSec,
      });
      setTicks(data.ticks || []);
      setStatus('completed');
    } catch (err: any) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    cleanupStream();
    setStatus('idle');
    setReport(null);
    setLatestTick(null);
    setTicks([]);
    setErrorMessage(null);
    setActiveId(null);
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    status,
    activeId,
    activeConfig,
    latestTick,
    ticks,
    report,
    errorMessage,
    startBenchmark,
    stopBenchmark,
    loadReport,
    reset,
  };
}
