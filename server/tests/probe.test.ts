import { describe, it, expect } from 'vitest';
import { runPreflightProbe } from '../src/engine/probe';

describe('Preflight Probe', () => {
  it('should return synthetic diagnostic metrics in demo mode', async () => {
    const res = await runPreflightProbe('https://example.com/api/test', true);

    expect(res.url).toBe('https://example.com/api/test');
    expect(res.statusCode).toBe(200);
    expect(res.statusText).toBe('OK');
    expect(res.dnsMs).toBeGreaterThan(0);
    expect(res.tlsMs).toBeGreaterThan(0);
    expect(res.ttfbMs).toBeGreaterThan(0);
    expect(res.totalMs).toBeGreaterThan(res.ttfbMs);
    expect(res.isDemo).toBe(true);
    expect(res.headers).toBeDefined();
    expect(res.headers['server']).toBeDefined();
  });

  it('should reject loopback / SSRF targets even in probe mode', async () => {
    await expect(runPreflightProbe('http://127.0.0.1:8080/secret', false)).rejects.toThrow();
  });
});
