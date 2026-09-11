import React, { useEffect, useState } from 'react';
import { History, ArrowRight, RotateCcw, Trash2, Clock, GitCompare } from 'lucide-react';
import { BenchmarkReport, BenchmarkConfig } from '../types';
import { BenchmarkDiffModal } from './BenchmarkDiffModal';

interface HistoryListProps {
  onSelectReport: (report: BenchmarkReport) => void;
  onRerun: (config: BenchmarkConfig) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ onSelectReport, onRerun }) => {
  const [reports, setReports] = useState<BenchmarkReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [diffRuns, setDiffRuns] = useState<{ runA: BenchmarkReport; runB: BenchmarkReport } | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear benchmark history?')) return;
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setReports([]);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 2) {
        // Replace oldest
        setSelectedIds([selectedIds[1], id]);
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleLaunchDiff = () => {
    if (selectedIds.length !== 2) return;
    const runA = reports.find((r) => r.id === selectedIds[0]);
    const runB = reports.find((r) => r.id === selectedIds[1]);
    if (runA && runB) {
      setDiffRuns({ runA, runB });
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
        Loading historical runs...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center flex flex-col items-center gap-3">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
          <History className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">No Previous Runs</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Run your first benchmark from the Configurator or via Telegram bot commands.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-pulse-400" />
            <h3 className="text-sm font-bold text-white">Previous Benchmarks</h3>
            <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
              {reports.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length === 2 && (
              <button
                onClick={handleLaunchDiff}
                className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all animate-pulse"
              >
                <GitCompare className="w-3.5 h-3.5" /> Compare 2 Runs (Diff)
              </button>
            )}
            <button
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Select any 2 runs using the checkboxes to generate an A/B regression diff.
        </p>

        <div className="flex flex-col gap-3">
          {reports.map((r) => {
            const time = new Date(r.startTime).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const isSelected = selectedIds.includes(r.id);

            return (
              <div
                key={r.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-purple-950/20 border-purple-500/50 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(r.id)}
                    className="mt-1 rounded accent-purple-500 w-4 h-4 cursor-pointer shrink-0"
                  />
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-pulse-500/10 text-pulse-400 border border-pulse-500/20 font-bold">
                        {r.method}
                      </span>
                      {r.loadProfile && r.loadProfile !== 'flat' && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {r.loadProfile}
                        </span>
                      )}
                      {r.sloResult && (
                        <span
                          className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                            r.sloResult.passed
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {r.sloResult.passed ? 'SLO PASS' : 'SLO FAIL'}
                        </span>
                      )}
                      <span className="text-xs font-mono font-medium text-white truncate max-w-xs sm:max-w-md">
                        {r.url}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> {time}
                      </span>
                      <span>•</span>
                      <span>{r.concurrency} VUs</span>
                      <span>•</span>
                      <span className="text-pulse-400 font-semibold">{r.rpsMean} req/s</span>
                      <span>•</span>
                      <span>p95: {r.latencies.p95}ms</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() =>
                      onRerun({
                        url: r.url,
                        method: r.method as any,
                        concurrency: r.concurrency,
                        durationSec: r.durationSec,
                        loadProfile: r.loadProfile,
                      })
                    }
                    title="Rerun with same parameters"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onSelectReport(r)}
                    className="px-3 py-1.5 rounded-lg bg-pulse-500/10 hover:bg-pulse-500/20 text-pulse-400 border border-pulse-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    Inspect <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* A/B Diff Modal */}
      {diffRuns && (
        <BenchmarkDiffModal
          runA={diffRuns.runA}
          runB={diffRuns.runB}
          onClose={() => setDiffRuns(null)}
        />
      )}
    </>
  );
};
