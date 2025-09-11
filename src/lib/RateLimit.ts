type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 10;         // allow 10 login attempts per window

const buckets = new Map<string, Bucket>();

export function rateLimitLogin(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const b = buckets.get(ip);

  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (b.count < MAX_ATTEMPTS) {
    b.count += 1;
    return { allowed: true };
  }

  const retryAfterSec = Math.ceil((b.resetAt - now) / 1000);
  return { allowed: false, retryAfterSec };
}

// Best-effort IP detection behind proxies
export function getClientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  // In dev this may be undefined; fall back to a constant to avoid blocking all
  return '127.0.0.1';
}
