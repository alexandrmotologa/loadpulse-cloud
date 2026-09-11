import React from 'react';

interface LiveGaugeProps {
  rps: number;
  peakRps: number;
  maxRps?: number;
  activeWorkers: number;
}

export const LiveGauge: React.FC<LiveGaugeProps> = ({
  rps,
  peakRps,
  maxRps = 2000,
  activeWorkers,
}) => {
  // Normalize ratio between 0 and 1
  const effectiveMax = Math.max(maxRps, peakRps * 1.2, 500);
  const ratio = Math.min(1, Math.max(0, rps / effectiveMax));

  // Gauge geometry
  const radius = 80;
  const strokeWidth = 12;
  const circumference = Math.PI * radius; // Half-circle
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <div className="flex flex-col items-center justify-center p-6 glass-card rounded-2xl relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{
          backgroundColor: ratio > 0.8 ? '#f43f5e' : ratio > 0.4 ? '#f97316' : '#06b6d4',
          transform: `scale(${1 + ratio * 0.5})`,
        }}
      />

      <div className="relative w-48 h-28 flex items-end justify-center">
        <svg viewBox="0 0 200 110" className="w-48 h-28 overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="60%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Dynamic Active Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Digital Readout */}
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-3xl font-bold tracking-tight text-white font-mono">
            {rps.toLocaleString()}
          </span>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            Requests / Sec
          </span>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-2 gap-4 w-full mt-4 pt-3 border-t border-slate-800/80 text-center">
        <div>
          <span className="text-xs text-slate-400 block">Peak Throughput</span>
          <span className="text-sm font-semibold font-mono text-pulse-400">
            {peakRps.toLocaleString()} req/s
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block">Active Workers</span>
          <span className="text-sm font-semibold font-mono text-cyan-400">
            {activeWorkers} VUs
          </span>
        </div>
      </div>
    </div>
  );
};
