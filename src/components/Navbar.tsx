'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === '/login' || pathname.startsWith('/login/');
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔑 Dùng biến dẫn xuất để thống nhất UI
  const effectiveUsername = isLoginRoute ? null : username;
  const authed = !!effectiveUsername;

  useEffect(() => {
    let ignore = false;

    // Khi ở /login*, đừng fetch & reset ngay để không flash
    if (isLoginRoute) {
      setUsername(null);
      setLoading(false);
      return () => {};
    }

    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) {
          if (!ignore) setUsername(null);
          return;
        }
        const data = await res.json().catch(() => ({} as any));
        if (!ignore) setUsername(typeof data.username === 'string' ? data.username : null);
      } catch {
        if (!ignore) setUsername(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => { ignore = true; };
  }, [pathname, isLoginRoute]);

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      // Sau logout, đưa về /login (middleware sẽ cho qua)
      router.replace('/login');
    }
  }

  const links = [
    { href: '/', label: 'Home' },
    { href: '/verifier', label: 'Verifier' },
    { href: '/register', label: 'Register' },
    { href: '/login', label: 'Login' },
  ] as const;

  // Ẩn Login (và tuỳ chọn: Register) khi đã đăng nhập, dựa trên *effectiveUsername*
  const visibleLinks = links.filter((l) =>
    authed ? l.href !== '/login' : true
  );

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/verifier') return pathname === '/verifier' || pathname.startsWith('/verifier/');
    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-slate-200">
      <nav className="container mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex gap-1">
          {visibleLinks.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  'px-3 py-2 rounded-md text-sm transition-colors ' +
                  (active
                    ? 'font-semibold text-slate-900 bg-slate-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                }
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {isLoginRoute ? (
            <span className="text-sm text-slate-500">Not logged in</span>
          ) : loading ? (
            <span className="text-sm text-slate-500">Loading…</span>
          ) : authed ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-slate-900 text-white grid place-items-center text-xs">
                  {(effectiveUsername!.slice(0, 2) || '').toUpperCase()}
                </div>
                <span className="text-sm">
                  Hi, <strong>{effectiveUsername}</strong>
                </span>
              </div>
              <button
                onClick={logout}
                className="text-sm border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          ) : (
            <span className="text-sm text-slate-500">Not logged in</span>
          )}
        </div>
      </nav>
    </header>
  );
}
