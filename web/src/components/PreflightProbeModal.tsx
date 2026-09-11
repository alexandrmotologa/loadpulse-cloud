import React, { useState } from 'react';
import { Search, X, CheckCircle, AlertTriangle, Globe, Server, Clock } from 'lucide-react';
import { ProbeResult } from '../types';

interface PreflightProbeModalProps {
  url: string;
  method: string;
  onClose: () => void;
}

export const PreflightProbeModal: React.FC<PreflightProbeModalProps> = ({
  url,
  method,
  onClose,
}) => {
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runProbe = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Probe failed');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Diagnostic probe request failed');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    runProbe();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5 border border-slate-700/80 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Target Pre-Flight Diagnostic</h3>
            <p className="text-xs text-slate-400 truncate max-w-sm">{url}</p>
          </div>
        </div>

        {isLoading && (
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-slate-300">Resolving DNS and measuring handshake...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Pre-flight Check Failed</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            {/* Top Status Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.statusCode >= 200 && result.statusCode < 400 ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    HTTP {result.statusCode} ({result.statusText})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {result.ip ? `Resolved IP: ${result.ip}` : 'DNS resolved'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-cyan-400 font-bold block">
                  {result.totalMs}ms
                </span>
                <span className="text-[10px] text-slate-500 uppercase">Total Roundtrip</span>
              </div>
            </div>

            {/* Waterfall Breakdown */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Network Latency Waterfall
              </h4>

              <div className="flex flex-col gap-2 mt-1">
                {/* DNS */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">1. DNS Resolution</span>
                  <span className="text-slate-200">{result.dnsMs} ms</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (result.dnsMs / result.totalMs) * 100)}%` }}
                    className="h-full bg-sky-500"
                  />
                </div>

                {/* TLS */}
                {result.tlsMs > 0 && (
                  <>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">2. TLS Handshake</span>
                      <span className="text-slate-200">{result.tlsMs} ms</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, (result.tlsMs / result.totalMs) * 100)}%` }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                  </>
                )}

                {/* TTFB */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">3. Time to First Byte (TTFB)</span>
                  <span className="text-emerald-400 font-semibold">{result.ttfbMs} ms</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (result.ttfbMs / result.totalMs) * 100)}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Server Details */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Web Server</span>
                <span className="text-slate-300 truncate block">{result.serverHeader || 'Hidden'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Content Length</span>
                <span className="text-slate-300">{result.contentLength || 0} bytes</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={runProbe}
            disabled={isLoading}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Re-probe
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-pulse-500 hover:bg-pulse-600 text-xs font-semibold text-white transition-colors"
          >
            Ready to Benchmark
          </button>
        </div>
      </div>
    </div>
  );
};
