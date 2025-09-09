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
        if (!ignore) setUsername(data.username);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    // Optional: hard refresh to clear client state/UI quickly
    window.location.href = '/';
  }

  const links = [
    { href: '/', label: 'Home' },
    { href: '/register', label: 'Register' },
    { href: '/login', label: 'Login' },
    { href: '/verifier', label: 'Verifier' },
  ];

  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <div className="flex gap-4">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`hover:underline ${pathname === l.href ? 'font-semibold text-blue-600' : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {loading ? <span className="text-sm text-gray-500">…</span> : (
          username ? (
            <>
              <span className="text-sm">Hi, <strong>{username}</strong></span>
              <button
                onClick={logout}
                className="text-sm border rounded px-3 py-1 hover:bg-gray-50"
              >
                Logout
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-500">Not logged in</span>
          )
        )}
      </div>
    </nav>
  );
}
