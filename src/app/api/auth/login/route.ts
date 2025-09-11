import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureIndices, findUser } from '@/lib/elasticsearch';
import { comparePassword } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { getClientIp, rateLimitLogin } from '@/lib/rateLimit';

const schema = z.object({ username: z.string(), password: z.string() });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  await ensureIndices();

  // Rate limit by IP
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = rateLimitLogin(ip);
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          'Too many login attempts. Please wait a moment before trying again.',
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec || 60) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request. Please check your input and try again.' },
      { status: 400 }
    );
  }

  const parseResult = schema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Please provide both username and password.' },
      { status: 400 }
    );
  }

  const { username, password } = parseResult.data;
  const user = await findUser(username);

  if (!user) {
    return NextResponse.json(
      { error: 'The username or password you entered is incorrect.' },
      { status: 401 }
    );
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: 'The username or password you entered is incorrect.' },
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
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
