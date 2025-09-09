import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME!;
const JWT_SECRET = process.env.JWT_SECRET!;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/verifier')) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.redirect(new URL('/login', req.url));
    try { jwt.verify(token, JWT_SECRET); return NextResponse.next(); }
    catch { return NextResponse.redirect(new URL('/login', req.url)); }
  }
  return NextResponse.next();
}
export const config = { matcher: ['/verifier/:path*'] };
