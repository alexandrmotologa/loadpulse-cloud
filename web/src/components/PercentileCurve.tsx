import React, { useState } from 'react';
import { LatencyStats, PercentilePoint } from '../types';

interface PercentileCurveProps {
  stats: LatencyStats;
  points: PercentilePoint[];
}

export const PercentileCurve: React.FC<PercentileCurveProps> = ({ stats, points }) => {
  const [hoveredPoint, setHoveredPoint] = useState<PercentilePoint | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="glass-card p-6 rounded-2xl text-center text-slate-400 text-sm">
        No latency data recorded yet.
      </div>
    );
  }

  // Find max latency for scaling
  const maxLatency = Math.max(...points.map((p) => p.latencyMs), stats.max, 10);

  // SVG viewBox dimensions
  const width = 400;
  const height = 160;
  const paddingX = 30;
  const paddingY = 20;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Map points to SVG coordinates
  const svgCoords = points.map((pt) => {
    const x = paddingX + (pt.percentile / 100) * chartW;
    const y = height - paddingY - (pt.latencyMs / maxLatency) * chartH;
    return { x, y, pt };
  });

  // Build SVG path
  const linePath = svgCoords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaPath = `${linePath} L ${svgCoords[svgCoords.length - 1].x} ${height - paddingY} L ${svgCoords[0].x} ${height - paddingY} Z`;

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pulse-500 animate-ping" />
          Latency Percentile Distribution (HDR)
        </h3>
        {hoveredPoint && (
          <span className="text-xs font-mono text-pulse-400 bg-pulse-500/10 px-2 py-0.5 rounded border border-pulse-500/30">
            p{hoveredPoint.percentile}: {hoveredPoint.latencyMs}ms
          </span>
        )}
      </div>

      {/* Latency Cards Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">p50 (Median)</span>
          <span className="text-base font-bold font-mono text-emerald-400">{stats.p50}ms</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">p90</span>
          <span className="text-base font-bold font-mono text-cyan-400">{stats.p90}ms</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">p95</span>
          <span className="text-base font-bold font-mono text-amber-400">{stats.p95}ms</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">p99</span>
          <span className="text-base font-bold font-mono text-pulse-400">{stats.p99}ms</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 col-span-3 sm:col-span-1">
          <span className="text-[11px] text-slate-400 block font-medium">p99.9 (Tail)</span>
          <span className="text-base font-bold font-mono text-rose-400">{stats.p99_9}ms</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-40 bg-slate-950/40 rounded-xl p-2 border border-slate-800/80 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#334155" />

          {/* Area fill */}
          <path d={areaPath} fill="url(#curveGradient)" />

          {/* Stroke Line */}
          <path d={linePath} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />

          {/* Interactive Data Dots */}
          {svgCoords.map(({ x, y, pt }, idx) => (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={hoveredPoint?.percentile === pt.percentile ? 5 : 3}
              className="fill-pulse-400 stroke-dark-base stroke-2 cursor-pointer transition-all hover:scale-150"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={() => setHoveredPoint(pt)}
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[11px] text-slate-500 font-mono px-1">
        <span>0% (Min: {stats.min}ms)</span>
        <span>50% (Median)</span>
        <span>99.9% (Max: {stats.max}ms)</span>
      </div>
    </div>
  );
};
