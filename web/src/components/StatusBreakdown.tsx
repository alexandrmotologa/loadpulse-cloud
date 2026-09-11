import React from 'react';

interface StatusBreakdownProps {
  statusCodes: Record<string, number>;
  totalRequests: number;
}

export const StatusBreakdown: React.FC<StatusBreakdownProps> = ({
  statusCodes,
  totalRequests,
}) => {
  if (!statusCodes || totalRequests === 0) {
    return null;
  }

  // Aggregate into standard buckets
  let count2xx = 0;
  let count3xx = 0;
  let count4xx = 0;
  let count5xx = 0;
  let countOther = 0;

  Object.entries(statusCodes).forEach(([codeStr, count]) => {
    const code = parseInt(codeStr, 10);
    if (!isNaN(code)) {
      if (code >= 200 && code < 300) count2xx += count;
      else if (code >= 300 && code < 400) count3xx += count;
      else if (code >= 400 && code < 500) count4xx += count;
      else if (code >= 500 && code < 600) count5xx += count;
      else countOther += count;
    } else {
      countOther += count;
    }
  });

  const getPercent = (count: number) =>
    totalRequests > 0 ? ((count / totalRequests) * 100).toFixed(1) : '0';

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">HTTP Status Distribution</h4>
        <span className="text-xs text-slate-400 font-mono">
          {totalRequests.toLocaleString()} Total Requests
        </span>
      </div>

      {/* Multi-segmented visual bar */}
      <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
        {count2xx > 0 && (
          <div
            style={{ width: `${(count2xx / totalRequests) * 100}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
            title={`2xx Success: ${count2xx}`}
          />
        )}
        {count3xx > 0 && (
          <div
            style={{ width: `${(count3xx / totalRequests) * 100}%` }}
            className="h-full bg-sky-500 transition-all duration-500"
            title={`3xx Redirect: ${count3xx}`}
          />
        )}
        {count4xx > 0 && (
          <div
            style={{ width: `${(count4xx / totalRequests) * 100}%` }}
            className="h-full bg-amber-500 transition-all duration-500"
            title={`4xx Client Error: ${count4xx}`}
          />
        )}
        {count5xx > 0 && (
          <div
            style={{ width: `${(count5xx / totalRequests) * 100}%` }}
            className="h-full bg-rose-500 transition-all duration-500"
            title={`5xx Server Error: ${count5xx}`}
          />
        )}
        {countOther > 0 && (
          <div
            style={{ width: `${(countOther / totalRequests) * 100}%` }}
            className="h-full bg-purple-500 transition-all duration-500"
            title={`Network/Other Errors: ${countOther}`}
          />
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        {count2xx > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            2xx: {count2xx.toLocaleString()} ({getPercent(count2xx)}%)
          </div>
        )}
        {count3xx > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-mono bg-sky-500/10 border border-sky-500/30 text-sky-400 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            3xx: {count3xx.toLocaleString()} ({getPercent(count3xx)}%)
          </div>
        )}
        {count4xx > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            4xx: {count4xx.toLocaleString()} ({getPercent(count4xx)}%)
          </div>
        )}
        {count5xx > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            5xx: {count5xx.toLocaleString()} ({getPercent(count5xx)}%)
          </div>
        )}
        {countOther > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-mono bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Errors: {countOther.toLocaleString()} ({getPercent(countOther)}%)
          </div>
        )}
      </div>
    </div>
  );
};
