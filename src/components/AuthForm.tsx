'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [username, setU] = useState(''); const [password, setP] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); return; }
    router.push(mode === 'login' ? '/verifier' : '/login');
  }

  return (
    <div className="max-w-sm w-full space-y-4">
      <input className="w-full border rounded p-2" placeholder="Username" value={username} onChange={e=>setU(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={e=>setP(e.target.value)} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button onClick={submit} className="w-full bg-black text-white rounded p-2">
        {mode === 'login' ? 'Login' : 'Register'}
      </button>
    </div>
  );
}
