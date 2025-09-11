import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME!;
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// Small helper to verify token safely
async function isAuthed(token?: string) {
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET, { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const authed = await isAuthed(token);

  // Guard protected area
  if (pathname.startsWith('/verifier')) {
    if (!authed) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // Bounce logged-in users away from /login*
  if (pathname.startsWith('/login')) {
    if (authed) {
      // Use default 307; the 2nd status argument can be omitted in middleware
      return NextResponse.redirect(new URL('/verifier', req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

// IMPORTANT: match both /verifier/* and /login/* (handles trailing slash)
export const config = {
  matcher: ['/verifier/:path*', '/login/:path*'],
};
