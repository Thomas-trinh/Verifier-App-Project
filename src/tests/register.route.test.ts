import { describe, it, expect, vi, beforeEach } from 'vitest';

const { indexMock, ensureIndicesMock, findUserMock, hashPasswordMock } = vi.hoisted(() => ({
    indexMock: vi.fn(),                     // es.index(...)
    ensureIndicesMock: vi.fn(),             // ensureIndices()
    findUserMock: vi.fn(),                  // findUser()
    hashPasswordMock: vi.fn().mockResolvedValue('hashed'), // hashPassword()
}));

vi.mock('@/lib/elasticsearch', () => ({
    __esModule: true,
    ensureIndices: ensureIndicesMock,
    findUser: findUserMock,
    USERS_INDEX: 'users',
    es: { index: indexMock },
}));
vi.mock('@/lib/auth', () => ({
    __esModule: true,
    hashPassword: hashPasswordMock,
}));

vi.mock('../lib/elasticsearch', () => ({
    __esModule: true,
    ensureIndices: ensureIndicesMock,
    findUser: findUserMock,
    USERS_INDEX: 'users',
    es: { index: indexMock },
}));
vi.mock('../lib/auth', () => ({
    __esModule: true,
    hashPassword: hashPasswordMock,
}));

function makeReq(body?: any) {
    return new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
}

describe('POST /api/auth/register', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        indexMock.mockReset();
        ensureIndicesMock.mockReset();
        findUserMock.mockReset();
        hashPasswordMock.mockClear();
    });

    it('503 when ensureIndices fails', async () => {
        ensureIndicesMock.mockRejectedValue(new Error('boom'));

        const { POST } = await import('../app/api/auth/register/route');

        const res = await POST(makeReq({ username: 'abc', password: 'Aa1!aaaa' }));
        expect(res.status).toBe(503);
        const json: any = await res.json();
        expect(json.error).toBeTruthy();
    });

    it('400 when schema fails (username too short / weak password)', async () => {
        ensureIndicesMock.mockResolvedValue(undefined);

        const { POST } = await import('../app/api/auth/register/route');

        const res = await POST(makeReq({ username: 'a', password: 'short' }));
        expect(res.status).toBe(400);
        const json: any = await res.json();
        expect(json.error).toBeTruthy();
    });

    it('400 when username already exists', async () => {
        ensureIndicesMock.mockResolvedValue(undefined);
        findUserMock.mockResolvedValue({ username: 'abc', passwordHash: 'x' });

        const { POST } = await import('../app/api/auth/register/route');

        const res = await POST(makeReq({ username: 'abc', password: 'Aa1!aaaa' }));
        expect(res.status).toBe(400);
        const json: any = await res.json();
        expect(String(json.error).toLowerCase()).toContain('already');
    });

    it('201 creates user successfully', async () => {
        ensureIndicesMock.mockResolvedValue(undefined);
        findUserMock.mockResolvedValue(null);
        indexMock.mockResolvedValue({ _id: 'new-id' });

        const { POST } = await import('../app/api/auth/register/route');

        const res = await POST(makeReq({ username: 'abc', password: 'Aa1!aaaa' }));
        expect(res.status).toBe(201);
        const json: any = await res.json();

        expect(json.ok).toBe(true);
        expect(json.id).toBe('new-id');
        expect(indexMock).toHaveBeenCalled();
        expect(hashPasswordMock).toHaveBeenCalledWith('Aa1!aaaa');
    });

    it('400 for invalid JSON body (no body)', async () => {
        ensureIndicesMock.mockResolvedValue(undefined);

        const { POST } = await import('../app/api/auth/register/route');

        const res = await POST(new Request('http://localhost/api/auth/register', { method: 'POST' }));
        expect(res.status).toBe(400);
        const json: any = await res.json();
        expect(json.error).toBe('The information you entered is not valid. Please try again.');
    });
});
