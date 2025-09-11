import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureIndices, findUser } from '@/lib/ElasticSearch';
import { comparePassword } from '@/lib/Auth';
import jwt from 'jsonwebtoken';
import { getClientIp, rateLimitLogin } from '@/lib/RateLimit';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  await ensureIndices();

  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = rateLimitLogin(ip);
  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        formErrors: ['Too many login attempts. Please wait a moment and try again.'],
      },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec || 60) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, formErrors: ['Invalid request. Please check your input and try again.'] },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();
    return NextResponse.json(
      { ok: false, fieldErrors, formErrors },
      { status: 400 }
    );
  }

  const { username, password } = parsed.data;
  const user = await findUser(username);

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        fieldErrors: { username: ['No account found with that username.'] },
      },
      { status: 401 }
    );
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { ok: false, fieldErrors: { password: ['Incorrect password.'] } },
      { status: 401 }
    );
  }

  // Generate JWT
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
