import React, { useState } from 'react';
import { Play, Zap, ChevronDown, ChevronUp, Sliders, ShieldCheck, Search, Award } from 'lucide-react';
import { BenchmarkConfig, LoadProfile, SloCriteria } from '../types';
import { PreflightProbeModal } from './PreflightProbeModal';

interface BenchConfigModalProps {
  onStart: (config: BenchmarkConfig) => void;
  isLoading?: boolean;
}

export const BenchConfigModal: React.FC<BenchConfigModalProps> = ({ onStart, isLoading }) => {
  const [url, setUrl] = useState('https://httpbin.org/get');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'>('GET');
  const [concurrency, setConcurrency] = useState(20);
  const [durationSec, setDurationSec] = useState(10);
  const [loadProfile, setLoadProfile] = useState<LoadProfile>('flat');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showProbeModal, setShowProbeModal] = useState(false);
  const [enableSlo, setEnableSlo] = useState(false);
  const [maxP95, setMaxP95] = useState(150);
  const [maxErrors, setMaxErrors] = useState(1);
  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState('');

  const handlePreset = (vu: number, dur: number, prof: LoadProfile = 'flat') => {
    setConcurrency(vu);
    setDurationSec(dur);
    setLoadProfile(prof);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let parsedHeaders: Record<string, string> | undefined;
    if (headersText.trim()) {
      try {
        parsedHeaders = JSON.parse(headersText);
      } catch {
        parsedHeaders = {};
        headersText.split('\n').forEach((line) => {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const k = line.slice(0, colonIdx).trim();
            const v = line.slice(colonIdx + 1).trim();
            if (k) parsedHeaders![k] = v;
          }
        });
      }
    }

    const slo: SloCriteria | undefined = enableSlo
      ? {
          maxP95Ms: maxP95 > 0 ? maxP95 : undefined,
          maxErrorRatePercent: maxErrors >= 0 ? maxErrors : undefined,
        }
      : undefined;

    onStart({
      url: url.trim(),
      method,
      concurrency,
      durationSec,
      loadProfile,
      slo,
      headers: parsedHeaders,
      body: bodyText.trim() ? bodyText.trim() : undefined,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pulse-500/10 border border-pulse-500/20 text-pulse-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Benchmark Configurator</h2>
              <p className="text-xs text-slate-400">Specify target API and load parameters</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            SSRF Guard Active
          </div>
        </div>

        {/* Target URL with Pre-flight Probe Button */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Target Endpoint URL
            </label>
            <button
              type="button"
              onClick={() => setShowProbeModal(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
            >
              <Search className="w-3 h-3" /> Pre-Flight Probe Check
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-pulse-400 focus:outline-none focus:border-pulse-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
            </select>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-api.com/endpoint"
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-pulse-500 focus:ring-1 focus:ring-pulse-500"
            />
          </div>
        </div>

        {/* Load Profile Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Load Traffic Profile
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setLoadProfile('flat')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                loadProfile === 'flat'
                  ? 'bg-pulse-500/20 border-pulse-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xs font-bold block">Constant (Flat)</span>
              <span className="text-[10px] text-slate-400 block">Instant full concurrency</span>
            </button>

            <button
              type="button"
              onClick={() => setLoadProfile('ramp-up')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                loadProfile === 'ramp-up'
                  ? 'bg-pulse-500/20 border-pulse-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xs font-bold block">Ramp-Up</span>
              <span className="text-[10px] text-slate-400 block">Organic traffic growth</span>
            </button>

            <button
              type="button"
              onClick={() => setLoadProfile('spike')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                loadProfile === 'spike'
                  ? 'bg-pulse-500/20 border-pulse-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xs font-bold block">Spike Burst</span>
              <span className="text-[10px] text-slate-400 block">Sudden load shockwave</span>
            </button>

            <button
              type="button"
              onClick={() => setLoadProfile('step')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                loadProfile === 'step'
                  ? 'bg-pulse-500/20 border-pulse-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xs font-bold block">Step Tiers</span>
              <span className="text-[10px] text-slate-400 block">3-stage incremental load</span>
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Quick Bench Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handlePreset(5, 5, 'flat')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                concurrency === 5 && durationSec === 5
                  ? 'bg-pulse-500/20 border-pulse-500 text-pulse-300 font-semibold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              ⚡ Quick Probe (5 VU, 5s)
            </button>
            <button
              type="button"
              onClick={() => handlePreset(20, 10, 'flat')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                concurrency === 20 && durationSec === 10
                  ? 'bg-pulse-500/20 border-pulse-500 text-pulse-300 font-semibold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              🎯 Standard (20 VU, 10s)
            </button>
            <button
              type="button"
              onClick={() => handlePreset(50, 15, 'ramp-up')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                concurrency === 50 && durationSec === 15 && loadProfile === 'ramp-up'
                  ? 'bg-pulse-500/20 border-pulse-500 text-pulse-300 font-semibold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              📈 Ramp Stress (50 VU, 15s)
            </button>
            <button
              type="button"
              onClick={() => handlePreset(100, 30, 'spike')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                concurrency === 100 && durationSec === 30 && loadProfile === 'spike'
                  ? 'bg-pulse-500/20 border-pulse-500 text-pulse-300 font-semibold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              🚀 Max Spike (100 VU, 30s)
            </button>
          </div>
        </div>

        {/* Dual Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Virtual Users (Peak Concurrency)</span>
              <span className="font-mono font-bold text-pulse-400 text-sm">{concurrency} VUs</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
              className="w-full accent-pulse-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1</span>
              <span>50</span>
              <span>100 (Max)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Test Duration</span>
              <span className="font-mono font-bold text-cyan-400 text-sm">{durationSec} Seconds</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              value={durationSec}
              onChange={(e) => setDurationSec(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5s</span>
              <span>15s</span>
              <span>30s (Max)</span>
            </div>
          </div>
        </div>

        {/* SLO Quality Gate Toggle */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={enableSlo}
                onChange={(e) => setEnableSlo(e.target.checked)}
                className="rounded accent-pulse-500 w-4 h-4 cursor-pointer"
              />
              <Award className="w-4 h-4 text-pulse-400" />
              Enforce SLO Quality Gate (Pass / Fail Criteria)
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {enableSlo ? 'Enabled' : 'Optional'}
            </span>
          </div>

          {enableSlo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Max p95 Latency (ms)</label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  value={maxP95}
                  onChange={(e) => setMaxP95(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-pulse-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Max Error Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={maxErrors}
                  onChange={(e) => setMaxErrors(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-pulse-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Advanced Headers & Body */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAdvanced ? 'Hide Advanced Options' : 'Custom Headers & Request Payload'}
          </button>

          {showAdvanced && (
            <div className="mt-3 flex flex-col gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Custom Headers (Header: Value or JSON)
                </label>
                <textarea
                  rows={2}
                  value={headersText}
                  onChange={(e) => setHeadersText(e.target.value)}
                  placeholder="Authorization: Bearer token123&#10;X-Custom-Header: value"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-pulse-500"
                />
              </div>

              {(method === 'POST' || method === 'PUT') && (
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Request Body (JSON)</label>
                  <textarea
                    rows={3}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder='{"name": "test", "active": true}'
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-pulse-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Launch CTA */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-pulse-600 via-pulse-500 to-amber-500 hover:from-pulse-500 hover:to-amber-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-pulse-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? (
            <>
              <Zap className="w-4 h-4 animate-spin text-white" />
              Benchmarking in Progress...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Fire Stress Test ({concurrency} VUs • {durationSec}s • {loadProfile.toUpperCase()})
            </>
          )}
        </button>
      </form>

      {/* Pre-flight Probe Modal */}
      {showProbeModal && (
        <PreflightProbeModal
          url={url}
          method={method}
          onClose={() => setShowProbeModal(false)}
        />
      )}
    </>
  );
};
