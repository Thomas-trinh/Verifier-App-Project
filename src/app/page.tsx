'use client';
import { useEffect, useState } from 'react';

type LogItem = {
  id: string;
  username: string;
  postcode: string;
  suburb: string;
  state: string;
  success: boolean;
  message?: string | null;
  error?: string | null;
  lat?: number | null;
  lng?: number | null;
  createdAt: string;
};

export default function LogsPage() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/logs').then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setItems(j.items || []);
    }).catch(e => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-600">{err}</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Recent Verification Logs</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Time</th>
              <th className="p-2 border">User</th>
              <th className="p-2 border">Postcode</th>
              <th className="p-2 border">Suburb</th>
              <th className="p-2 border">State</th>
              <th className="p-2 border">Result</th>
              <th className="p-2 border">Message</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="p-2 border">{new Date(it.createdAt).toLocaleString()}</td>
                <td className="p-2 border">{it.username}</td>
                <td className="p-2 border">{it.postcode}</td>
                <td className="p-2 border">{it.suburb}</td>
                <td className="p-2 border">{it.state}</td>
                <td className="p-2 border">{it.success ? '✅' : '❌'}</td>
                <td className="p-2 border">{it.error ?? it.message ?? ''}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="p-2 border text-center" colSpan={7}>No logs yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
