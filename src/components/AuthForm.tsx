'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed');
        return;
      }
      router.push(mode === 'login' ? '/verifier' : '/login');
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !username || !password;

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-5">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h2>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Username</span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-0 focus:border-slate-400"
              placeholder="Your username"
              value={username}
              onChange={(e) => setU(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Password</span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-0 focus:border-slate-400"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setP(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={disabled}
            className={`w-full rounded-lg px-4 py-2.5 text-white transition-colors ${
              disabled ? 'bg-slate-300' : 'bg-slate-900 hover:bg-black'
            }`}
          >
            {loading ? 'Processing…' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </div>
      </div>
    </form>
  );
}
