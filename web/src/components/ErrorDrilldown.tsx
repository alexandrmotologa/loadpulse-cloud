import React from 'react';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';

interface ErrorDrilldownProps {
  statusCodes: Record<string, number>;
  totalRequests: number;
}

export const ErrorDrilldown: React.FC<ErrorDrilldownProps> = ({ statusCodes, totalRequests }) => {
  const errors: { code: string; count: number; category: string; description: string; advice: string }[] = [];

  Object.entries(statusCodes).forEach(([codeStr, count]) => {
    const code = parseInt(codeStr, 10);
    if (isNaN(code) || code >= 400) {
      if (code === 429) {
        errors.push({
          code: '429',
          count,
          category: 'Rate Limiting',
          description: 'Too Many Requests - Target rate limiter or WAF is throttling load test traffic.',
          advice: 'Increase token bucket limit or test against staging with IP allowlisting.',
        });
      } else if (code === 500) {
        errors.push({
          code: '500',
          count,
          category: 'Internal Server Error',
          description: 'Target application crashed or threw unhandled exceptions during load.',
          advice: 'Inspect server application logs, database connection pool, and thread limits.',
        });
      } else if (code === 502 || code === 504) {
        errors.push({
          code: String(code),
          count,
          category: 'Gateway / Timeout',
          description: 'Reverse proxy (Nginx, Envoy, Cloudflare) timed out waiting for backend worker.',
          advice: 'Check backend response times and upstream keepalive timeouts.',
        });
      } else if (code === 503) {
        errors.push({
          code: '503',
          count,
          category: 'Service Unavailable',
          description: 'Target server is overloaded or undergoing maintenance.',
          advice: 'Check CPU/memory saturation or circuit breakers on the target.',
        });
      } else if (isNaN(code)) {
        errors.push({
          code: codeStr,
          count,
          category: 'Network Failure',
          description: `Socket connection failed with error: ${codeStr}`,
          advice: 'Verify network connectivity, socket limits (ulimit), and TLS certificates.',
        });
      } else {
        errors.push({
          code: String(code),
          count,
          category: `HTTP ${code}`,
          description: `Received ${count} error responses with status ${code}.`,
          advice: 'Verify URL endpoint route and authorization tokens.',
        });
      }
    }
  });

  if (errors.length === 0) {
    return null;
  }

  const totalFailed = errors.reduce((acc, curr) => acc + curr.count, 0);
  const failurePercent = totalRequests > 0 ? ((totalFailed / totalRequests) * 100).toFixed(1) : '0';

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col gap-3 border border-rose-500/30 bg-rose-950/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h4 className="text-sm font-semibold text-rose-300">Failure & Error Diagnostics</h4>
        </div>
        <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
          {totalFailed.toLocaleString()} failures ({failurePercent}%)
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {errors.map((err, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {err.code}
                </span>
                <span className="text-xs font-semibold text-white">{err.category}</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {err.count.toLocaleString()} occurrences
              </span>
            </div>

            <p className="text-[11px] text-slate-300">{err.description}</p>

            <div className="flex items-start gap-1.5 text-[11px] text-amber-300/90 font-sans mt-0.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Fix Recommendation:</strong> {err.advice}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
