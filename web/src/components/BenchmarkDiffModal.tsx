import React, { useState } from 'react';
import { GitCompare, X, Copy, Check, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { BenchmarkReport } from '../types';

interface BenchmarkDiffModalProps {
  runA: BenchmarkReport;
  runB: BenchmarkReport;
  onClose: () => void;
}

export const BenchmarkDiffModal: React.FC<BenchmarkDiffModalProps> = ({ runA, runB, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Compute metrics deltas (B relative to A)
  const rpsDelta = runA.rpsMean > 0 ? ((runB.rpsMean - runA.rpsMean) / runA.rpsMean) * 100 : 0;
  const p50Delta = runB.latencies.p50 - runA.latencies.p50;
  const p95Delta = runB.latencies.p95 - runA.latencies.p95;
  const p99Delta = runB.latencies.p99 - runA.latencies.p99;
  const errorDelta = runB.failedRequests - runA.failedRequests;

  const generateDiffMarkdown = () => {
    return (
      `### 📊 LoadPulse A/B Benchmark Diff\n\n` +
      `| Metric | Baseline (Run A) | Candidate (Run B) | Delta |\n` +
      `| :--- | :--- | :--- | :--- |\n` +
      `| **Target** | \`${runA.url}\` | \`${runB.url}\` | - |\n` +
      `| **Workers** | ${runA.concurrency} VUs | ${runB.concurrency} VUs | - |\n` +
      `| **Throughput (Mean)** | ${runA.rpsMean} req/s | ${runB.rpsMean} req/s | **${rpsDelta >= 0 ? '+' : ''}${rpsDelta.toFixed(1)}%** |\n` +
      `| **Throughput (Peak)** | ${runA.rpsPeak} req/s | ${runB.rpsPeak} req/s | ${runB.rpsPeak - runA.rpsPeak >= 0 ? '+' : ''}${runB.rpsPeak - runA.rpsPeak} req/s |\n` +
      `| **Latency p50** | ${runA.latencies.p50} ms | ${runB.latencies.p50} ms | **${p50Delta > 0 ? `+${p50Delta}ms (Slower)` : `${p50Delta}ms (Faster)`}** |\n` +
      `| **Latency p95** | ${runA.latencies.p95} ms | ${runB.latencies.p95} ms | **${p95Delta > 0 ? `+${p95Delta}ms (Regression)` : `${p95Delta}ms (Improvement)`}** |\n` +
      `| **Latency p99** | ${runA.latencies.p99} ms | ${runB.latencies.p99} ms | ${p99Delta > 0 ? `+${p99Delta}ms` : `${p99Delta}ms`} |\n` +
      `| **Errors** | ${runA.failedRequests} | ${runB.failedRequests} | ${errorDelta >= 0 ? `+${errorDelta}` : `${errorDelta}`} |\n\n` +
      `_Generated with [LoadPulse Cloud](https://github.com/alexandrmotologa/loadpulse-cloud)_`
    );
  };

  const copyTable = () => {
    navigator.clipboard.writeText(generateDiffMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-xl rounded-2xl p-6 flex flex-col gap-5 border border-slate-700/80 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">A/B Benchmark Regression Diff</h3>
            <p className="text-xs text-slate-400">Comparing Run A (Baseline) with Run B (Candidate)</p>
          </div>
        </div>

        {/* Delta Summary Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {/* RPS Delta */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Throughput Delta</span>
            <div className={`text-base font-mono font-bold flex items-center justify-center gap-0.5 ${rpsDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {rpsDelta >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {rpsDelta >= 0 ? '+' : ''}{rpsDelta.toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{runA.rpsMean} → {runB.rpsMean} req/s</span>
          </div>

          {/* p95 Delta */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">p95 Latency Delta</span>
            <div className={`text-base font-mono font-bold flex items-center justify-center gap-0.5 ${p95Delta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {p95Delta <= 0 ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              {p95Delta > 0 ? `+${p95Delta}ms` : `${p95Delta}ms`}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{runA.latencies.p95}ms → {runB.latencies.p95}ms</span>
          </div>

          {/* Error Delta */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Error Delta</span>
            <div className={`text-base font-mono font-bold flex items-center justify-center gap-0.5 ${errorDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {errorDelta === 0 ? <Minus className="w-4 h-4 text-slate-400" /> : errorDelta > 0 ? `+${errorDelta}` : `${errorDelta}`}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{runA.failedRequests} → {runB.failedRequests}</span>
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
          <div className="grid grid-cols-4 text-[11px] font-semibold text-slate-400 pb-1.5 border-b border-slate-800">
            <span>Metric</span>
            <span className="text-right">Run A (Base)</span>
            <span className="text-right">Run B (New)</span>
            <span className="text-right">Variance</span>
          </div>

          <div className="flex flex-col gap-1.5 text-xs font-mono">
            <div className="grid grid-cols-4 text-slate-300">
              <span className="text-slate-400 font-sans">Throughput (Mean)</span>
              <span className="text-right">{runA.rpsMean} req/s</span>
              <span className="text-right">{runB.rpsMean} req/s</span>
              <span className={`text-right font-bold ${rpsDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {rpsDelta >= 0 ? '+' : ''}{rpsDelta.toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-4 text-slate-300">
              <span className="text-slate-400 font-sans">p50 Latency</span>
              <span className="text-right">{runA.latencies.p50} ms</span>
              <span className="text-right">{runB.latencies.p50} ms</span>
              <span className={`text-right font-bold ${p50Delta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {p50Delta > 0 ? `+${p50Delta}ms` : `${p50Delta}ms`}
              </span>
            </div>

            <div className="grid grid-cols-4 text-slate-300">
              <span className="text-slate-400 font-sans">p95 Latency</span>
              <span className="text-right">{runA.latencies.p95} ms</span>
              <span className="text-right">{runB.latencies.p95} ms</span>
              <span className={`text-right font-bold ${p95Delta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {p95Delta > 0 ? `+${p95Delta}ms` : `${p95Delta}ms`}
              </span>
            </div>

            <div className="grid grid-cols-4 text-slate-300">
              <span className="text-slate-400 font-sans">p99 Latency</span>
              <span className="text-right">{runA.latencies.p99} ms</span>
              <span className="text-right">{runB.latencies.p99} ms</span>
              <span className={`text-right font-bold ${p99Delta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {p99Delta > 0 ? `+${p99Delta}ms` : `${p99Delta}ms`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyTable}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Markdown Diff!' : 'Copy GitHub PR Comparison'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
