import { useState, useEffect } from 'react';
import {
  Activity,
  Sliders,
  History as HistoryIcon,
  ExternalLink,
  Zap,
  Share2,
  StopCircle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useTelegram } from './hooks/useTelegram';
import { useLiveBenchmark } from './hooks/useLiveBenchmark';
import { LiveGauge } from './components/LiveGauge';
import { PercentileCurve } from './components/PercentileCurve';
import { StatusBreakdown } from './components/StatusBreakdown';
import { BenchConfigModal } from './components/BenchConfigModal';
import { HistoryList } from './components/HistoryList';
import { ReportExportModal } from './components/ReportExportModal';
import { BenchmarkConfig, BenchmarkReport } from './types';

export function App() {
  const { user, triggerHaptic } = useTelegram();
  const {
    status,
    activeConfig,
    latestTick,
    ticks,
    report,
    errorMessage,
    startBenchmark,
    stopBenchmark,
    loadReport,
    reset,
  } = useLiveBenchmark();

  const [activeTab, setActiveTab] = useState<'cockpit' | 'config' | 'history' | 'about'>('config');
  const [showExportModal, setShowExportModal] = useState(false);

  // Check URL params for benchmark ID (e.g. from Telegram WebApp button)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const benchId = params.get('benchId');
    if (benchId) {
      loadReport(benchId);
      setActiveTab('cockpit');
    }
  }, [loadReport]);

  const handleStartBenchmark = (config: BenchmarkConfig) => {
    triggerHaptic('impact');
    startBenchmark(config);
    setActiveTab('cockpit');
  };

  const handleStop = () => {
    triggerHaptic('warning');
    stopBenchmark();
  };

  const handleSelectHistoryReport = (rep: BenchmarkReport) => {
    triggerHaptic('selection' as any);
    loadReport(rep.id);
    setActiveTab('cockpit');
  };

  const handleRerun = (config: BenchmarkConfig) => {
    triggerHaptic('selection' as any);
    startBenchmark(config);
    setActiveTab('cockpit');
  };

  // Compute live or completed stats
  const currentRps = latestTick?.rps || (status === 'completed' && report ? report.rpsMean : 0);
  const peakRps = Math.max(
    latestTick ? Math.max(...ticks.map((t) => t.rps), latestTick.rps) : 0,
    report?.rpsPeak || 0
  );
  const activeWorkers = activeConfig?.concurrency || report?.concurrency || 0;

  return (
    <div className="min-h-screen bg-dark-base flex flex-col text-slate-100">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pulse-600 to-amber-500 flex items-center justify-center shadow-lg shadow-pulse-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white">LoadPulse Cloud</h1>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-pulse-500/10 text-pulse-400 border border-pulse-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Telegram Load Testing Cockpit</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/alexandrmotologa/loadpulse"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg transition-colors"
            >
              loadpulse core <ExternalLink className="w-3 h-3" />
            </a>
            {user && (
              <span className="text-xs font-mono text-pulse-400 bg-pulse-500/10 px-2.5 py-1 rounded-lg border border-pulse-500/20">
                @{user.username || user.first_name}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto flex gap-1 mt-3 pt-2 border-t border-slate-800/60">
          <button
            onClick={() => {
              triggerHaptic('selection' as any);
              setActiveTab('cockpit');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'cockpit'
                ? 'bg-pulse-500/20 text-pulse-400 border border-pulse-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Cockpit
            {status === 'running' && (
              <span className="w-2 h-2 rounded-full bg-pulse-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection' as any);
              setActiveTab('config');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'config'
                ? 'bg-pulse-500/20 text-pulse-400 border border-pulse-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            New Test
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection' as any);
              setActiveTab('history');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'history'
                ? 'bg-pulse-500/20 text-pulse-400 border border-pulse-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            History
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-5">
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Benchmark Stopped</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={reset}
              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Cockpit View */}
        {activeTab === 'cockpit' && (
          <div className="flex flex-col gap-5">
            {/* Status Header */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                    Target URL
                  </span>
                  {status === 'running' && (
                    <span className="flex items-center gap-1 text-[10px] font-mono bg-pulse-500/20 text-pulse-400 px-2 py-0.5 rounded-full animate-pulse">
                      <Zap className="w-3 h-3" /> LIVE STREAMING
                    </span>
                  )}
                  {status === 'completed' && (
                    <span className="flex items-center gap-1 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> FINISHED
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-mono font-bold text-white truncate max-w-sm sm:max-w-xl">
                  {activeConfig?.url || report?.url || 'No active test. Launch one from New Test.'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {status === 'running' && (
                  <button
                    onClick={handleStop}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <StopCircle className="w-4 h-4" /> Stop Test
                  </button>
                )}
                {status === 'completed' && report && (
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-pulse-500/20 hover:bg-pulse-500/30 text-pulse-400 border border-pulse-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Share2 className="w-4 h-4" /> Share Report
                  </button>
                )}
              </div>
            </div>

            {/* Gauge & Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-1">
                <LiveGauge
                  rps={currentRps}
                  peakRps={peakRps}
                  activeWorkers={activeWorkers}
                />
              </div>

              <div className="md:col-span-2 flex flex-col justify-between gap-4">
                {/* Latency Stats or Progress */}
                {report ? (
                  <PercentileCurve
                    stats={report.latencies}
                    points={report.percentilePoints}
                  />
                ) : latestTick ? (
                  <div className="glass-card p-5 rounded-2xl flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Running Progress
                      </h3>
                      <span className="text-xs font-mono text-pulse-400">
                        {latestTick.elapsedSec}s / {activeConfig?.durationSec}s
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            (latestTick.elapsedSec / (activeConfig?.durationSec || 10)) * 100
                          )}%`,
                        }}
                        className="h-full bg-gradient-to-r from-pulse-500 to-amber-400 transition-all duration-300"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Total Requests</span>
                        <span className="text-sm font-mono font-bold text-white">
                          {latestTick.totalRequests.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Current p50</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          {latestTick.currentP50}ms
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Current p95</span>
                        <span className="text-sm font-mono font-bold text-amber-400">
                          {latestTick.currentP95}ms
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
                    <Activity className="w-8 h-8 text-slate-600 mb-1" />
                    <span>No benchmark in progress.</span>
                    <button
                      onClick={() => setActiveTab('config')}
                      className="mt-2 px-4 py-2 rounded-xl bg-pulse-500 text-white text-xs font-semibold"
                    >
                      Configure a Test
                    </button>
                  </div>
                )}

                {/* Status Code Breakdown */}
                {report && (
                  <StatusBreakdown
                    statusCodes={report.statusCodes}
                    totalRequests={report.totalRequests}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Configurator View */}
        {activeTab === 'config' && (
          <BenchConfigModal
            onStart={handleStartBenchmark}
            isLoading={status === 'running'}
          />
        )}

        {/* Tab 3: History View */}
        {activeTab === 'history' && (
          <HistoryList
            onSelectReport={handleSelectHistoryReport}
            onRerun={handleRerun}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 p-4 text-center text-xs text-slate-500">
        <span>LoadPulse Cloud • Official Telegram companion to </span>
        <a
          href="https://github.com/alexandrmotologa/loadpulse"
          target="_blank"
          rel="noreferrer"
          className="text-pulse-400 hover:underline font-semibold"
        >
          alexandrmotologa/loadpulse
        </a>
      </footer>

      {/* Export Modal */}
      {showExportModal && report && (
        <ReportExportModal
          report={report}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
