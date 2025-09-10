'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json();
        if (!ignore) setUsername(data.username ?? null);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  const links = [
    { href: '/', label: 'Home' },
    { href: '/verifier', label: 'Verifier' },
    { href: '/register', label: 'Register' },
    { href: '/login', label: 'Login' },
  ];

  // hide login (and optionally register) if logged in
  const visibleLinks = links.filter((l) => {
    if (username && (l.href === '/login' /* || l.href === '/register' */)) {
      return false;
    }
    return true;
  });

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-slate-200">
      <nav className="container mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex gap-1">
          {visibleLinks.map((l) => {
            const active = pathname === l.href;
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
          {loading ? (
            <span className="text-sm text-slate-500">Loading…</span>
          ) : username ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-slate-900 text-white grid place-items-center text-xs">
                  {username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm">
                  Hi, <strong>{username}</strong>
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
