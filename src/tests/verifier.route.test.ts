import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const { ensureIndicesMock, logVerificationMock, getSessionMock } = vi.hoisted(() => ({
  ensureIndicesMock: vi.fn(),
  logVerificationMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock('@/lib/ElasticSearch', () => ({
  __esModule: true,
  ensureIndices: ensureIndicesMock,
  logVerification: logVerificationMock,
}));
vi.mock('@/lib/Session', () => ({
  __esModule: true,
  getSession: getSessionMock,
}));

vi.mock('../lib/ElasticSearch', () => ({
  __esModule: true,
  ensureIndices: ensureIndicesMock,
  logVerification: logVerificationMock,
}));
vi.mock('../lib/Session', () => ({
  __esModule: true,
  getSession: getSessionMock,
}));

function makeReq(body?: any) {
  return new Request('http://localhost/api/verifier', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/verifier', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    ensureIndicesMock.mockReset();
    logVerificationMock.mockReset();
    getSessionMock.mockReset();
  });

  it('401 when no session', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import('../app/api/verify/route');
    const res = await POST(makeReq({}));

    expect(res.status).toBe(401);
    const json: any = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('201 logs verification ok', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);
    getSessionMock.mockResolvedValue({ username: 'alice' });
    logVerificationMock.mockResolvedValue({ _id: 'log-1' });

    const { POST } = await import('../app/api/verify/route');
    const res = await POST(makeReq({
      postcode: '2000',
      suburb: 'SYDNEY',
      state: 'NSW',
      success: true,
      lat: -33.86,
      lng: 151.21,
    }));

    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBe('log-1');

    expect(logVerificationMock).toHaveBeenCalledWith(expect.objectContaining({
      username: 'alice',
      postcode: '2000',
      suburb: 'SYDNEY',
      state: 'NSW',
      success: true,
      message: 'The postcode, suburb, and state input are valid.',
      error: null,
      lat: -33.86,
      lng: 151.21,
    }));
  });

  it('400 Zod validation error', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);
    getSessionMock.mockResolvedValue({ username: 'alice' });

    const { POST } = await import('../app/api/verify/route');
    const res = await POST(makeReq({
      postcode: '2000',
      suburb: 'SYDNEY',
      state: 'NSW',
      success: 'true',
    } as any));

    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBeTruthy();
  });

  it('400 ES error bubbled', async () => {
    ensureIndicesMock.mockResolvedValue(undefined);
    getSessionMock.mockResolvedValue({ username: 'alice' });
    logVerificationMock.mockRejectedValue({
      meta: { body: { error: { reason: 'ES down' } } },
    });

    const { POST } = await import('../app/api/verify/route');
    const res = await POST(makeReq({
      postcode: '2000',
      suburb: 'SYDNEY',
      state: 'NSW',
      success: false,
      error: 'failed',
    }));

    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe('ES down');
  });
});
