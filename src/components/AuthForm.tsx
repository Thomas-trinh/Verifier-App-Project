'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ApiResponse =
  | {
      ok?: boolean;
      error?: string;
      fieldErrors?: Record<string, string[]>;
      formErrors?: string[];
      username?: string;
    }
  | any;

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();

  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const hasUErr = (fieldErrors.username?.length ?? 0) > 0;
  const hasPErr = (fieldErrors.password?.length ?? 0) > 0;
  const disabled = loading || !username || !password;

  async function parseJSONSafe(res: Response): Promise<ApiResponse | null> {
    try {
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading) return;
    setLoading(true);
    setFormErrors([]);
    setFieldErrors({});

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await parseJSONSafe(res);

      if (!res.ok || data?.ok === false) {
        if (data?.fieldErrors) setFieldErrors(data.fieldErrors);

        const msgs: string[] = [];
        if (Array.isArray(data?.formErrors) && data.formErrors.length) msgs.push(...data.formErrors);
        if (data?.error) msgs.push(String(data.error));
        setFormErrors(msgs.length ? msgs : [`Request failed (${res.status})`]);
        return;
      }

      // Success navigation
      if (mode === 'login') {
        // Hard navigation so middleware/RSC see the new cookie immediately
        window.location.assign('/verifier');
      } else {
        // After register, send to login (soft nav is fine here)
        router.replace('/login');
      }
    } catch (err: any) {
      setFormErrors([err?.message ?? 'Unexpected error']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-5">
          {mode === 'login' ? 'Welcome back' : 'Create an account'}
        </h2>

        <div className="space-y-4">
          {/* Username */}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Username</span>
            <input
              className={[
                'w-full rounded-lg border bg-white px-3 py-2 outline-none ring-0 focus:border-slate-400',
                hasUErr ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300',
              ].join(' ')}
              placeholder="Your username"
              value={username}
              onChange={(e) => {
                setU(e.target.value);
                if (hasUErr) setFieldErrors((prev) => ({ ...prev, username: [] }));
              }}
              autoComplete="username"
              aria-invalid={hasUErr}
              aria-describedby={hasUErr ? 'username-error' : undefined}
            />
            {hasUErr && (
              <ul id="username-error" className="mt-1 space-y-1">
                {fieldErrors.username!.map((m, i) => (
                  <li key={i} className="text-xs text-red-600">
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </label>

          {/* Password */}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Password</span>
            <input
              className={[
                'w-full rounded-lg border bg-white px-3 py-2 outline-none ring-0 focus:border-slate-400',
                hasPErr ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300',
              ].join(' ')}
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => {
                setP(e.target.value);
                if (hasPErr) setFieldErrors((prev) => ({ ...prev, password: [] }));
              }}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              aria-invalid={hasPErr}
              aria-describedby={hasPErr ? 'password-error' : undefined}
            />
            {hasPErr && (
              <ul id="password-error" className="mt-1 space-y-1">
                {fieldErrors.password!.map((m, i) => (
                  <li key={i} className="text-xs text-red-600">
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </label>

          <button
            type="submit"
            disabled={disabled}
            className={`w-full rounded-lg px-4 py-2.5 text-white transition-colors ${
              disabled ? 'bg-slate-300' : 'bg-slate-900 hover:bg-black'
            }`}
            aria-busy={loading}
          >
            {loading ? 'Processing…' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </div>
      </div>
    </form>
  );
}
