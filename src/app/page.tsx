'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/logs', { cache: 'no-store' });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        setItems(j.items || []);
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load logs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpis = useMemo(() => {
    const total = items.length;
    const passed = items.filter((x) => x.success).length;
    const rate = total ? Math.round((passed / total) * 100) : 0;

    const uniqueUsers = new Set(items.map((x) => x.username)).size;

    // top state
    const stateCount = new Map<string, number>();
    for (const x of items) {
      const s = x.state?.toUpperCase?.() || '';
      if (!s) continue;
      stateCount.set(s, (stateCount.get(s) ?? 0) + 1);
    }
    const topStates = [...stateCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const lastUpdated = items.length
      ? new Date(Math.max(...items.map((x) => new Date(x.createdAt).getTime())))
      : null;

    return { total, passed, rate, uniqueUsers, topStates, lastUpdated };
  }, [items]);

  // recent activities (limit 8)
  const recent = useMemo(
    () =>
      [...items]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 8),
    [items]
  );

  return (
    <div className="space-y-6">
      {/* === HERO / LANDING === */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <img
          src="/HeroImage.png"
          alt="AUSPOST Verifier App"
          className="w-full h-56 sm:h-72 lg:h-80 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent" />
        <div className="absolute left-4 right-4 bottom-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white drop-shadow">
              Verifier App
            </h1>
            <p className="text-white/90 text-sm sm:text-base drop-shadow">
              Validate Australian addresses via GraphQL proxy • Track logs in Elasticsearch
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/verifier"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5
                         bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors
                         text-sm sm:text-base"
            >
              Start Verifying
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5
                         bg-white/90 hover:bg-white text-slate-900 shadow transition-colors
                         text-sm sm:text-base backdrop-blur"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* === ALERT / ERROR === */}
      {err && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </p>
      )}

      {/* === KPI STRIP === */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Logs"
          value={loading ? '—' : kpis.total.toLocaleString()}
          foot={
            kpis.lastUpdated ? `Updated ${timeAgo(kpis.lastUpdated)}` : '—'
          }
        />
        <StatCard
          title="Pass Rate"
          value={loading ? '—' : `${kpis.rate}%`}
          foot={`${kpis.passed ?? 0}/${kpis.total ?? 0} valid`}
          tone="emerald"
        />
        <StatCard
          title="Unique Users"
          value={loading ? '—' : kpis.uniqueUsers.toString()}
          foot="Last fetch scope"
          tone="indigo"
        />
        <StatCard
          title="Top State"
          value={
            loading
              ? '—'
              : kpis.topStates[0]
              ? `${kpis.topStates[0][0]} • ${kpis.topStates[0][1]}`
              : '-'
          }
          foot="Most frequent state"
          tone="amber"
        />
      </section>

      {/* === TOP STATES LIST === */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Top States</h3>
          <span className="text-xs text-slate-500">
            Based on recent fetch
          </span>
        </div>
        {loading ? (
          <div className="h-16 rounded-lg bg-slate-100 animate-pulse" />
        ) : kpis.topStates.length === 0 ? (
          <p className="text-sm text-slate-500">No data</p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {kpis.topStates.map(([st, count]) => (
              <li
                key={st}
                className="rounded-xl border border-slate-200 p-3 flex items-center justify-between"
              >
                <span className="font-medium">{st}</span>
                <span className="text-sm text-slate-600">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === RECENT ACTIVITY (CARDS) === */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <Link
            href="/verifier"
            className="text-sm text-blue-700 hover:underline"
          >
            Verify another address →
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-slate-500">No logs yet</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {recent.map((it) => (
              <li
                key={it.id}
                className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusPill success={it.success} />
                      <span className="text-xs text-slate-500">
                        {timeAgo(new Date(it.createdAt))}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{it.suburb}</span>
                      <span className="mx-1">·</span>
                      <span className="uppercase">{it.state}</span>
                      <span className="mx-1">·</span>
                      <span className="tabular-nums">{it.postcode}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      By <span className="font-medium">{it.username}</span>
                    </div>
                  </div>
                  <div className="text-right max-w-[50%]">
                    <p className="text-xs text-slate-600 line-clamp-3">
                      {it.error ?? it.message ?? '—'}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* === CTA FOOTER === */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold">Ready to validate faster?</h4>
            <p className="text-sm text-slate-600">
              Use the Verifier tab to check addresses and auto-log results to Elasticsearch.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/verifier"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5
                         bg-blue-600 hover:bg-blue-700 text-white shadow transition-colors
                         text-sm"
            >
              Open Verifier
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5
                         bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 shadow-sm
                         transition-colors text-sm"
            >
              Refresh
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- UI bits ---------- */

function StatCard({
  title,
  value,
  foot,
  tone = 'slate',
}: {
  title: string;
  value: string;
  foot?: string;
  tone?: 'slate' | 'emerald' | 'indigo' | 'amber';
}) {
  const ring =
    tone === 'emerald'
      ? 'ring-emerald-200 bg-emerald-50'
      : tone === 'indigo'
      ? 'ring-indigo-200 bg-indigo-50'
      : tone === 'amber'
      ? 'ring-amber-200 bg-amber-50'
      : 'ring-slate-200 bg-slate-50';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {foot ? (
        <div
          className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${ring}`}
        >
          {foot}
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ success }: { success: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1
      ${
        success
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-rose-50 text-rose-700 ring-rose-200'
      }`}
    >
      {success ? 'Valid' : 'Invalid'}
    </span>
  );
}

function timeAgo(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const minutes = Math.round(diff / 60);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  const months = Math.round(days / 30);
  return rtf.format(-months, 'month');
}
