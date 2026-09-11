import React, { useState } from 'react';
import { BenchmarkTick } from '../types';

interface StreamingChartProps {
  ticks: BenchmarkTick[];
  durationSec: number;
}

export const StreamingChart: React.FC<StreamingChartProps> = ({ ticks, durationSec }) => {
  const [hoveredTick, setHoveredTick] = useState<BenchmarkTick | null>(null);

  if (!ticks || ticks.length === 0) {
    return (
      <div className="glass-card p-5 rounded-2xl text-center text-slate-500 text-xs font-mono">
        Waiting for telemetry stream ticks...
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Max values for auto-scaling
  const maxRps = Math.max(...ticks.map((t) => t.rps), 500);
  const maxLatency = Math.max(...ticks.map((t) => t.currentP95), 50);

  // Map ticks to coordinates
  const rpsCoords = ticks.map((t) => {
    const x = paddingX + (t.elapsedSec / durationSec) * chartW;
    const y = height - paddingY - (t.rps / maxRps) * chartH;
    return { x, y, tick: t };
  });

  const latencyCoords = ticks.map((t) => {
    const x = paddingX + (t.elapsedSec / durationSec) * chartW;
    const y = height - paddingY - (t.currentP95 / maxLatency) * chartH;
    return { x, y, tick: t };
  });

  // Build SVG path
  const rpsLinePath = rpsCoords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const latencyLinePath = latencyCoords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const rpsAreaPath =
    rpsCoords.length > 0
      ? `${rpsLinePath} L ${rpsCoords[rpsCoords.length - 1].x} ${height - paddingY} L ${rpsCoords[0].x} ${height - paddingY} Z`
      : '';

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-slate-200">Real-Time Throughput & Latency Stream</h4>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-pulse-400">
              <span className="w-2.5 h-1 rounded bg-pulse-500 inline-block" /> RPS
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2.5 h-1 rounded bg-cyan-400 inline-block" /> p95 Latency (ms)
            </span>
          </div>
        </div>

        {hoveredTick && (
          <div className="text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
            t={hoveredTick.elapsedSec}s: <span className="text-pulse-400 font-bold">{hoveredTick.rps} req/s</span> |{' '}
            <span className="text-cyan-400 font-bold">{hoveredTick.currentP95}ms</span>
          </div>
        )}
      </div>

      <div className="relative w-full h-44 bg-slate-950/50 rounded-xl p-2 border border-slate-800/80 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="streamRpsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#334155" />

          {/* RPS Area */}
          {rpsAreaPath && <path d={rpsAreaPath} fill="url(#streamRpsGrad)" />}

          {/* RPS Line (Orange) */}
          <path d={rpsLinePath} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />

          {/* Latency Line (Cyan) */}
          <path d={latencyLinePath} fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 2" strokeLinecap="round" />

          {/* Interactive dots */}
          {rpsCoords.map(({ x, y, tick }, idx) => (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={hoveredTick?.timestamp === tick.timestamp ? 5 : 2.5}
              className="fill-pulse-400 cursor-pointer transition-all hover:scale-150"
              onMouseEnter={() => setHoveredTick(tick)}
              onMouseLeave={() => setHoveredTick(null)}
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
        <span>0.0s</span>
        <span>{(durationSec / 2).toFixed(1)}s</span>
        <span>{durationSec.toFixed(1)}s</span>
      </div>
    </div>
  );
};
