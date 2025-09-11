import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const {
  ensureIndicesMock,
  findUserMock,
  comparePasswordMock,
  jwtSignMock,
  getClientIpMock,
  rateLimitLoginMock,
} = vi.hoisted(() => ({
  ensureIndicesMock: vi.fn(),
  findUserMock: vi.fn(),
  comparePasswordMock: vi.fn(),
  jwtSignMock: vi.fn().mockReturnValue('signed.token'),
  getClientIpMock: vi.fn().mockReturnValue('1.2.3.4'),
  rateLimitLoginMock: vi.fn().mockReturnValue({ allowed: true, retryAfterSec: 0 }),
}));

// Mock alias modules
vi.mock('@/lib/elasticsearch', () => ({
  __esModule: true,
  ensureIndices: ensureIndicesMock,
  findUser: findUserMock,
}));
vi.mock('@/lib/auth', () => ({
  __esModule: true,
  comparePassword: comparePasswordMock,
}));
vi.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { sign: jwtSignMock },
  sign: jwtSignMock,
}));
vi.mock('@/lib/rateLimit', () => ({
  __esModule: true,
  getClientIp: getClientIpMock,
  rateLimitLogin: rateLimitLoginMock,
}));

// (tuỳ chọn) mock thêm biến thể relative nếu test khác dùng ../
vi.mock('../lib/elasticsearch', () => ({
  __esModule: true,
  ensureIndices: ensureIndicesMock,
  findUser: findUserMock,
}));
vi.mock('../lib/auth', () => ({
  __esModule: true,
  comparePassword: comparePasswordMock,
}));
vi.mock('../lib/rateLimit', () => ({
  __esModule: true,
  getClientIp: getClientIpMock,
  rateLimitLogin: rateLimitLoginMock,
}));

function makeReq(body?: any) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    ensureIndicesMock.mockReset();
    findUserMock.mockReset();
    comparePasswordMock.mockReset();
    jwtSignMock.mockReset().mockReturnValue('signed.token');
    getClientIpMock.mockReset().mockReturnValue('1.2.3.4');
    rateLimitLoginMock.mockReset().mockReturnValue({ allowed: true, retryAfterSec: 0 });

    // ENV cho JWT/cookie
    (process.env as any).JWT_SECRET = 'test-secret';
    (process.env as any).SESSION_COOKIE_NAME = 'session';
    (process.env as any).NODE_ENV = 'test';
  });

  it('429 when rate limited', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);
    rateLimitLoginMock.mockReturnValue({ allowed: false, retryAfterSec: 45 });

    const { POST } = await import('../app/api/auth/login/route');
    const res = await POST(makeReq({ username: 'u', password: 'p' }));

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('45');
    const json: any = await res.json();
    expect(json.error).toBe('Too many login attempts. Please wait a moment before trying again.');
    expect(jwtSignMock).not.toHaveBeenCalled();
  });

  it('400 invalid JSON (no body)', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);

    const { POST } = await import('../app/api/auth/login/route');
    const res = await POST(new Request('http://localhost/api/auth/login', { method: 'POST' }));

    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.error).toBe('Invalid request. Please check your input and try again.');
  });

  it('400 missing fields (schema fail)', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);

    const { POST } = await import('../app/api/auth/login/route');
    const res = await POST(makeReq({})); // thiếu username/password

    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.error).toBe('Please provide both username and password.');
  });

  it('401 user not found', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);
    findUserMock.mockResolvedValue(null);

    const { POST } = await import('../app/api/auth/login/route');
    const res = await POST(makeReq({ username: 'john', password: 'Aa1!aaaa' }));

    expect(res.status).toBe(401);
    const json: any = await res.json();
    expect(json.error).toBe('The username or password you entered is incorrect.');
  });

  it('401 wrong password', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);
    findUserMock.mockResolvedValue({ username: 'john', passwordHash: 'hash' });
    comparePasswordMock.mockResolvedValue(false);

    const { POST } = await import('../app/api/auth/login/route');
    const res = await POST(makeReq({ username: 'john', password: 'wrong' }));

    expect(res.status).toBe(401);
    const json: any = await res.json();
    expect(json.error).toBe('The username or password you entered is incorrect.');
  });

  it('200 success (sets cookie)', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);
    findUserMock.mockResolvedValue({ username: 'john', passwordHash: 'hash' });
    comparePasswordMock.mockResolvedValue(true);

    const { POST } = await import('../app/api/auth/login/route');
    const res = await POST(makeReq({ username: 'john', password: 'Aa1!aaaa' }));

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') || res.headers.get('Set-Cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie!.toLowerCase()).toContain(`${process.env.SESSION_COOKIE_NAME}=`);

    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.username).toBe('john');
    expect(jwtSignMock).toHaveBeenCalledWith({ username: 'john' }, 'test-secret', { expiresIn: '7d' });
  });
});
