import { describe, it, expect } from 'vitest';
import { isPrivateOrForbiddenIp, validateBenchmarkConfig, SSRFValidationError, ConfigValidationError } from '../src/engine/guard';

describe('SSRF Guard', () => {
  describe('isPrivateOrForbiddenIp', () => {
    it('should detect loopback IPv4', () => {
      expect(isPrivateOrForbiddenIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrForbiddenIp('127.10.0.5')).toBe(true);
    });

    it('should detect RFC 1918 private ranges', () => {
      expect(isPrivateOrForbiddenIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrForbiddenIp('10.254.1.2')).toBe(true);
      expect(isPrivateOrForbiddenIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrForbiddenIp('172.31.255.254')).toBe(true);
      expect(isPrivateOrForbiddenIp('192.168.1.1')).toBe(true);
      expect(isPrivateOrForbiddenIp('192.168.100.50')).toBe(true);
    });

    it('should detect cloud metadata and link-local', () => {
      expect(isPrivateOrForbiddenIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrForbiddenIp('169.254.1.1')).toBe(true);
    });

    it('should detect IPv6 loopback and private ranges', () => {
      expect(isPrivateOrForbiddenIp('::1')).toBe(true);
      expect(isPrivateOrForbiddenIp('fc00::1')).toBe(true);
      expect(isPrivateOrForbiddenIp('fe80::1')).toBe(true);
    });

    it('should allow public routable IPs', () => {
      expect(isPrivateOrForbiddenIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrForbiddenIp('1.1.1.1')).toBe(false);
      expect(isPrivateOrForbiddenIp('142.250.190.46')).toBe(false);
    });
  });

  describe('validateBenchmarkConfig', () => {
    it('should reject invalid or missing URLs', async () => {
      await expect(validateBenchmarkConfig({ url: '', concurrency: 10, durationSec: 10 })).rejects.toThrow(
        ConfigValidationError
      );
      await expect(validateBenchmarkConfig({ url: 'not-a-url', concurrency: 10, durationSec: 10 })).rejects.toThrow(
        ConfigValidationError
      );
    });

    it('should reject non-http protocols', async () => {
      await expect(
        validateBenchmarkConfig({ url: 'ftp://example.com/file', concurrency: 10, durationSec: 10 })
      ).rejects.toThrow(ConfigValidationError);
      await expect(
        validateBenchmarkConfig({ url: 'file:///etc/passwd', concurrency: 10, durationSec: 10 })
      ).rejects.toThrow(ConfigValidationError);
    });

    it('should reject out-of-bounds concurrency and duration', async () => {
      await expect(
        validateBenchmarkConfig({ url: 'https://example.com', concurrency: 0, durationSec: 10 })
      ).rejects.toThrow(ConfigValidationError);
      await expect(
        validateBenchmarkConfig({ url: 'https://example.com', concurrency: 150, durationSec: 10 })
      ).rejects.toThrow(ConfigValidationError);
      await expect(
        validateBenchmarkConfig({ url: 'https://example.com', concurrency: 10, durationSec: 3 })
      ).rejects.toThrow(ConfigValidationError);
      await expect(
        validateBenchmarkConfig({ url: 'https://example.com', concurrency: 10, durationSec: 40 })
      ).rejects.toThrow(ConfigValidationError);
    });

    it('should reject localhost in live mode', async () => {
      await expect(
        validateBenchmarkConfig({ url: 'http://localhost:8080/test', concurrency: 10, durationSec: 10 }, false)
      ).rejects.toThrow(SSRFValidationError);
    });

    it('should pass in demo mode with synthetic resolution', async () => {
      const res = await validateBenchmarkConfig(
        { url: 'https://demo-service.com/api', concurrency: 25, durationSec: 10 },
        true
      );
      expect(res.url.hostname).toBe('demo-service.com');
      expect(res.resolvedIps.length).toBeGreaterThan(0);
    });
  });
});
