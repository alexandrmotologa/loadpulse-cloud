import dns from 'node:dns';
import ipaddr from 'ipaddr.js';
import { BenchmarkConfig } from '../types';

export class SSRFValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFValidationError';
  }
}

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

const FORBIDDEN_IPV4_RANGES: [string, number][] = [
  ['127.0.0.0', 8],      // Loopback
  ['10.0.0.0', 8],       // Private RFC 1918
  ['172.16.0.0', 12],    // Private RFC 1918
  ['192.168.0.0', 16],   // Private RFC 1918
  ['169.254.0.0', 16],   // Link-local & Cloud Metadata (169.254.169.254)
  ['0.0.0.0', 8],        // Broadcast / current network
  ['224.0.0.0', 4],      // Multicast
  ['240.0.0.0', 4],      // Reserved
];

const FORBIDDEN_IPV6_RANGES: [string, number][] = [
  ['::1', 128],          // Loopback
  ['fc00::', 7],         // Unique Local Address (ULA)
  ['fe80::', 10],        // Link-Local
  ['::', 128],           // Unspecified
];

export function isPrivateOrForbiddenIp(ipString: string): boolean {
  try {
    const addr = ipaddr.parse(ipString);

    if (addr.kind() === 'ipv4') {
      const ipv4 = addr as ipaddr.IPv4;
      for (const [rangeIp, prefix] of FORBIDDEN_IPV4_RANGES) {
        const range = ipaddr.IPv4.parseCIDR(`${rangeIp}/${prefix}`);
        if (ipv4.match(range)) {
          return true;
        }
      }
      return false;
    }

    if (addr.kind() === 'ipv6') {
      const ipv6 = addr as ipaddr.IPv6;
      // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
      if (ipv6.isIPv4MappedAddress()) {
        return isPrivateOrForbiddenIp(ipv6.toIPv4Address().toString());
      }
      for (const [rangeIp, prefix] of FORBIDDEN_IPV6_RANGES) {
        const range = ipaddr.IPv6.parseCIDR(`${rangeIp}/${prefix}`);
        if (ipv6.match(range)) {
          return true;
        }
      }
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export async function validateBenchmarkConfig(
  config: BenchmarkConfig,
  isDemoMode: boolean = false
): Promise<{ url: URL; resolvedIps: string[] }> {
  if (!config.url || typeof config.url !== 'string') {
    throw new ConfigValidationError('Target URL is required.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(config.url.trim());
  } catch {
    throw new ConfigValidationError(`Invalid target URL: ${config.url}`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new ConfigValidationError(`Protocol "${parsedUrl.protocol}" is not allowed. Only HTTP and HTTPS are permitted.`);
  }

  const concurrency = Number(config.concurrency);
  if (isNaN(concurrency) || concurrency < 1 || concurrency > 100) {
    throw new ConfigValidationError('Concurrency must be an integer between 1 and 100 virtual users.');
  }

  const durationSec = Number(config.durationSec);
  if (isNaN(durationSec) || durationSec < 5 || durationSec > 30) {
    throw new ConfigValidationError('Duration must be an integer between 5 and 30 seconds.');
  }

  // In demo mode, synthetic tests do not hit remote IPs, but we still validate domain syntax
  if (isDemoMode) {
    return { url: parsedUrl, resolvedIps: ['198.51.100.1'] };
  }

  const hostname = parsedUrl.hostname;

  // Reject raw localhost
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new SSRFValidationError(`Hostname "${hostname}" resolves to an internal or private domain.`);
  }

  // Resolve hostname via DNS
  let lookupResults: dns.LookupAddress[];
  try {
    lookupResults = await dns.promises.lookup(hostname, { all: true });
  } catch (err: any) {
    throw new SSRFValidationError(`DNS resolution failed for hostname "${hostname}": ${err.message || 'unknown error'}`);
  }

  if (!lookupResults || lookupResults.length === 0) {
    throw new SSRFValidationError(`Could not resolve any IP address for host "${hostname}".`);
  }

  const resolvedIps: string[] = [];
  for (const res of lookupResults) {
    const ip = res.address;
    resolvedIps.push(ip);
    if (isPrivateOrForbiddenIp(ip)) {
      throw new SSRFValidationError(
        `Target host "${hostname}" resolved to blocked IP ${ip}. Access to private networks, loopbacks, and cloud metadata is forbidden.`
      );
    }
  }

  return { url: parsedUrl, resolvedIps };
}
