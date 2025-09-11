import { describe, it, expect, vi, beforeEach } from 'vitest';

// hoisted mocks
const {
  ensureIndicesMock,
  logVerificationMock,
  getSessionMock,
  validateAgainstAusPostMock,
} = vi.hoisted(() => ({
  ensureIndicesMock: vi.fn(),
  logVerificationMock: vi.fn(),
  getSessionMock: vi.fn(),
  validateAgainstAusPostMock: vi.fn(),
}));

vi.mock('@/lib/elasticsearch', () => ({
  __esModule: true,
  ensureIndices: ensureIndicesMock,
  logVerification: logVerificationMock,
}));
vi.mock('@/lib/session', () => ({
  __esModule: true,
  getSession: getSessionMock,
}));
vi.mock('@/lib/auspost', () => ({
  __esModule: true,
  validateAgainstAusPost: validateAgainstAusPostMock,
}));

vi.mock('../lib/elasticsearch', () => ({
  __esModule: true,
  ensureIndices: ensureIndicesMock,
  logVerification: logVerificationMock,
}));
vi.mock('../lib/session', () => ({
  __esModule: true,
  getSession: getSessionMock,
}));
vi.mock('../lib/auspost', () => ({
  __esModule: true,
  validateAgainstAusPost: validateAgainstAusPostMock,
}));

function gqlReq(variables: any) {
  const query = `
    query($pc:String!,$sb:String!,$st:String!){
      validateAddress(postcode:$pc, suburb:$sb, state:$st){
        success message lat lng
      }
    }`;
  return new Request('http://localhost/api/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
}

describe('GraphQL /api/graphql validateAddress', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    ensureIndicesMock.mockReset();
    logVerificationMock.mockReset();
    getSessionMock.mockReset();
    validateAgainstAusPostMock.mockReset();

    logVerificationMock.mockResolvedValue({ _id: 'ok' });
  });

  it('returns unauthorized when no session', async () => {
    getSessionMock.mockResolvedValue(null);
    ensureIndicesMock.mockResolvedValue(undefined);

    const { POST } = await import('../app/api/graphql/route');
    const res = await POST(gqlReq({ pc: '2000', sb: 'Sydney', st: 'NSW' }));

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.validateAddress.success).toBe(false);
    expect(json.data.validateAddress.message).toBe('Unauthorized: please log in first.');
  });

  it('rejects invalid postcode format', async () => {
    getSessionMock.mockResolvedValue({ username: 'alice' });
    ensureIndicesMock.mockResolvedValue(undefined);

    const { POST } = await import('../app/api/graphql/route');
    const res = await POST(gqlReq({ pc: '12', sb: 'Sydney', st: 'NSW' }));

    const json: any = await res.json();
    expect(json.data.validateAddress.success).toBe(false);
    expect(json.data.validateAddress.message).toBe('Postcode must be 4 digits.');
  });

  it('success path logs verification', async () => {
    getSessionMock.mockResolvedValue({ username: 'alice' });
    ensureIndicesMock.mockResolvedValue(undefined);
    validateAgainstAusPostMock.mockResolvedValue({
      success: true,
      message: 'ok',
      lat: -33.86,
      lng: 151.21,
    });

    const { POST } = await import('../app/api/graphql/route');
    const res = await POST(gqlReq({ pc: '2000', sb: 'Sydney', st: 'NSW' }));

    const json: any = await res.json();
    expect(json.data.validateAddress.success).toBe(true);
    expect(json.data.validateAddress.message).toBe('ok');
    expect(json.data.validateAddress.lat).toBe(-33.86);
    expect(json.data.validateAddress.lng).toBe(151.21);

    await Promise.resolve();
    expect(logVerificationMock).toHaveBeenCalledWith(expect.objectContaining({
      username: 'alice',
      postcode: '2000',
      suburb: 'SYDNEY',
      state: 'NSW',
      success: true,
      message: 'ok',
      error: null,
      lat: -33.86,
      lng: 151.21,
    }));
  });

  it('upstream error is handled and logged', async () => {
    getSessionMock.mockResolvedValue({ username: 'alice' });
    ensureIndicesMock.mockResolvedValue(undefined);
    validateAgainstAusPostMock.mockRejectedValue(new Error('upstream failed'));

    const { POST } = await import('../app/api/graphql/route');
    const res = await POST(gqlReq({ pc: '2000', sb: 'Sydney', st: 'NSW' }));

    const json: any = await res.json();
    expect(json.data.validateAddress.success).toBe(false);
    expect(json.data.validateAddress.message).toBe('upstream failed');

    await Promise.resolve();
    expect(logVerificationMock).toHaveBeenCalledWith(expect.objectContaining({
      username: 'alice',
      postcode: '2000',
      suburb: 'SYDNEY',
      state: 'NSW',
      success: false,
      message: 'Validation failed due to an upstream error.',
      error: 'upstream failed',
      lat: null,
      lng: null,
    }));
  });
});
