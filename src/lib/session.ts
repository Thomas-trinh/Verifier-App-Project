import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME!;
const JWT_SECRET = process.env.JWT_SECRET!;

export type SessionPayload = { username: string };

export async function setSessionCookie(payload: SessionPayload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET) as SessionPayload; }
  catch { return null; }
}
