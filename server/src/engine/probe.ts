import dns from 'node:dns';
import { performance } from 'node:perf_hooks';
import { request } from 'undici';
import { ProbeResult } from '../types';
import { validateBenchmarkConfig } from './guard';

export async function runPreflightProbe(
  targetUrl: string,
  isDemoMode: boolean = false,
  method: string = 'GET',
  customHeaders?: Record<string, string>
): Promise<ProbeResult> {
  // Validate URL and check SSRF
  const { url, resolvedIps } = await validateBenchmarkConfig(
    { url: targetUrl, concurrency: 1, durationSec: 5 },
    isDemoMode
  );

  if (isDemoMode) {
    // Realistic simulated network timings
    const dnsMs = Math.round(8 + Math.random() * 8);
    const tlsMs = url.protocol === 'https:' ? Math.round(18 + Math.random() * 15) : 0;
    const ttfbMs = Math.round(25 + Math.random() * 20);
    const totalMs = dnsMs + tlsMs + ttfbMs + 3;

    return {
      url: url.toString(),
      statusCode: 200,
      statusText: 'OK',
      dnsMs,
      tlsMs,
      ttfbMs,
      totalMs,
      ip: '198.51.100.42',
      serverHeader: 'nginx/1.24.0 (Ubuntu)',
      contentLength: 1024,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'server': 'nginx/1.24.0 (Ubuntu)',
        'cache-control': 'max-age=0, private, must-revalidate',
        'x-loadpulse-probe': 'synthetic',
      },
      isDemo: true,
    };
  }

  // Live measurement
  const dnsStart = performance.now();
  let resolvedIp = resolvedIps[0] || '';
  try {
    const lookup = await dns.promises.lookup(url.hostname);
    resolvedIp = lookup.address;
  } catch {}
  const dnsMs = Math.round((performance.now() - dnsStart) * 10) / 10;

  const reqStart = performance.now();
  try {
    const res = await request(url.toString(), {
      method: (method as any) || 'GET',
      headers: {
        'User-Agent': 'LoadPulse-Probe/1.0 (+https://github.com/alexandrmotologa/loadpulse-cloud)',
        ...customHeaders,
      },
      headersTimeout: 8000,
      bodyTimeout: 8000,
    });

    const ttfbMs = Math.round((performance.now() - reqStart) * 10) / 10;

    // Drain body
    const bodyData = await res.body.text();
    const totalMs = Math.round((performance.now() - reqStart + dnsMs) * 10) / 10;

    // TLS estimate if HTTPS
    const tlsMs = url.protocol === 'https:' ? Math.round(Math.max(5, ttfbMs * 0.4) * 10) / 10 : 0;

    const responseHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers)) {
      if (typeof v === 'string') responseHeaders[k] = v;
      else if (Array.isArray(v)) responseHeaders[k] = v.join(', ');
    }

    return {
      url: url.toString(),
      statusCode: res.statusCode,
      statusText: res.statusCode === 200 ? 'OK' : `HTTP ${res.statusCode}`,
      dnsMs,
      tlsMs,
      ttfbMs,
      totalMs,
      ip: resolvedIp,
      serverHeader: responseHeaders['server'],
      contentLength: bodyData.length,
      headers: responseHeaders,
      isDemo: false,
    };
  } catch (err: any) {
    const totalMs = Math.round((performance.now() - reqStart + dnsMs) * 10) / 10;
    throw new Error(`Probe connection failed after ${totalMs}ms: ${err.message || 'unknown error'}`);
  }
}
