import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fetchLogsMock, getSessionMock } = vi.hoisted(() => ({
  fetchLogsMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock('@/lib/elasticsearch', () => ({
  __esModule: true,
  fetchLogs: fetchLogsMock,
}));
vi.mock('@/lib/session', () => ({
  __esModule: true,
  getSession: getSessionMock,
}));

vi.mock('../lib/elasticsearch', () => ({
  __esModule: true,
  fetchLogs: fetchLogsMock,
}));
vi.mock('../lib/session', () => ({
  __esModule: true,
  getSession: getSessionMock,
}));

describe('GET /api/logs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fetchLogsMock.mockReset();
    getSessionMock.mockReset();
  });

  it('returns empty list when no session', async () => {
    getSessionMock.mockResolvedValue(null);

    const { GET } = await import('../app/api/logs/route');
    const res = await GET();

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.items).toEqual([]);
    expect(fetchLogsMock).not.toHaveBeenCalled();
  });

  it('returns logs when session present', async () => {
    getSessionMock.mockResolvedValue({ username: 'bob' });
    fetchLogsMock.mockResolvedValue([{ id: '1' }, { id: '2' }]);

    const { GET } = await import('../app/api/logs/route');
    const res = await GET();

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.items).toEqual([{ id: '1' }, { id: '2' }]);
    expect(fetchLogsMock).toHaveBeenCalledWith(50);
  });
});
