import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const FIVE_MIN_MS = 5 * 60 * 1000;

describe('lib/RateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getClientIp', () => {
    it('returns first IP from x-forwarded-for (if present)', async () => {
      const mod = await import('../lib/RateLimit');
      const req = new Request('http://localhost/', {
        headers: {
          'x-forwarded-for': '203.0.113.5, 70.41.3.18, 150.172.238.178',
          'x-real-ip': '198.51.100.17',
        },
      });
      expect(mod.getClientIp(req)).toBe('203.0.113.5');
    });

    it('falls back to x-real-ip if no x-forwarded-for', async () => {
      const mod = await import('../lib/RateLimit');
      const req = new Request('http://localhost/', {
        headers: { 'x-real-ip': '198.51.100.17' },
      });
      expect(mod.getClientIp(req)).toBe('198.51.100.17');
    });

    it('returns 127.0.0.1 if neither header exists', async () => {
      const mod = await import('../lib/RateLimit');
      const req = new Request('http://localhost/');
      expect(mod.getClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('rateLimitLogin', () => {
    it('allows first 10 attempts within the 5-minute window, then blocks', async () => {
      // reset module to clear internal buckets map
      vi.resetModules();
      const mod = await import('../lib/RateLimit');

      const ip = '192.0.2.10';

      // 10 allowed attempts
      for (let i = 1; i <= 10; i++) {
        const r = mod.rateLimitLogin(ip);
        expect(r.allowed).toBe(true);
      }

      // 11th should be blocked with a positive Retry-After <= 300s
      const blocked = mod.rateLimitLogin(ip);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
      expect(blocked.retryAfterSec).toBeLessThanOrEqual(300);
    });

    it('resets after 5 minutes so the next attempt is allowed again', async () => {
      vi.resetModules();
      const mod = await import('../lib/RateLimit');

      const ip = '192.0.2.11';

      // consume the window
      for (let i = 1; i <= 10; i++) mod.rateLimitLogin(ip);
      const blocked = mod.rateLimitLogin(ip);
      expect(blocked.allowed).toBe(false);

      // advance time beyond the window
      vi.setSystemTime(new Date(Date.now() + FIVE_MIN_MS + 1000));

      const afterWindow = mod.rateLimitLogin(ip);
      expect(afterWindow.allowed).toBe(true);
      expect(afterWindow.retryAfterSec).toBeUndefined();
    });
  });
});
