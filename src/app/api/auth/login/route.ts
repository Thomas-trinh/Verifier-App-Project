import { NextResponse } from 'next/server';
import { z } from 'zod';
import { es, ensureIndices } from '@/lib/elasticsearch';
import { comparePassword } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { getClientIp, rateLimitLogin } from '@/lib/rateLimit';

const schema = z.object({ username: z.string(), password: z.string() });

export async function POST(req: Request) {
  await ensureIndices();

  // Rate limit
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = rateLimitLogin(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec || 60) } }
    );
  }

  const { username, password } = schema.parse(await req.json());
  const res = await es.search({ index: 'users', query: { term: { username } }, size: 1 });
  if (!res.hits.hits.length) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const user = res.hits.hits[0]._source as any;
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const JWT_SECRET = process.env.JWT_SECRET!;
  const COOKIE_NAME = process.env.SESSION_COOKIE_NAME!;
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });

  const response = NextResponse.json({ ok: true, username });
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
