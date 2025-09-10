'use client';

import { useMemo, useRef, useState } from 'react';
import { useFormStore } from '@/store/formStore';
import { makeApolloClient } from '@/lib/apollo-client';
import { ApolloProvider, useApolloClient } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { z } from 'zod';
import GoogleMap from '@/components/GoogleMap';
import { useRouter } from 'next/navigation';

const SCHEMA = z.object({
  postcode: z.string().trim().regex(/^\d{4}$/, 'Postcode must be 4 digits'),
  suburb: z.string().trim().min(2, 'Suburb is too short').transform((s) => s.toUpperCase()),
  state: z
    .string()
    .trim()
    .regex(/^(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)$/i, 'Invalid state')
    .transform((s) => s.toUpperCase()),
});

const VALIDATE = gql`
  query Validate($postcode: String!, $suburb: String!, $state: String!) {
    validateAddress(postcode: $postcode, suburb: $suburb, state: $state) {
      success
      message
      lat
      lng
    }
  }
`;

type ValidateVars = { postcode: string; suburb: string; state: string };
type ValidateResp = {
  validateAddress: { success: boolean; message?: string | null; lat?: number | null; lng?: number | null };
};

function InnerForm() {
  const { postcode, suburb, state, setField, _hasHydrated } = useFormStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [last, setLast] = useState<{ success: boolean; message?: string; lat?: number; lng?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [netErr, setNetErr] = useState<string | null>(null);

  const client = useApolloClient();
  const reqIdRef = useRef(0);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErrors({});
    setNetErr(null);
    setLast(null);

    const parsed = SCHEMA.safeParse({ postcode, suburb, state });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
      setErrors(map);
      return;
    }

    const clean = parsed.data;
    const myReq = ++reqIdRef.current;
    setLoading(true);

    try {
      const { data } = await client.query<ValidateResp, ValidateVars>({
        query: VALIDATE,
        variables: {
          postcode: clean.postcode,
          suburb: clean.suburb,
          state: clean.state,
        },
        fetchPolicy: 'network-only',
      });

      if (myReq === reqIdRef.current) {
        const r = data?.validateAddress;
        if (r?.message?.toLowerCase().includes('unauthorized')) {
          router.push('/login');
          return;
        }
        setLast({
          success: !!r?.success,
          message: r?.message ?? undefined,
          lat: r?.lat ?? undefined,
          lng: r?.lng ?? undefined,
        });
      }
    } catch (err: any) {
      if (myReq === reqIdRef.current) setNetErr(err?.message || 'Network error');
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }

  if (!_hasHydrated) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Loading saved form…
      </div>
    );
  }

  const fieldCls = (hasErr?: boolean) =>
    [
      'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition',
      hasErr
        ? 'border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200'
        : 'border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200',
      loading ? 'opacity-60 cursor-not-allowed' : '',
    ].join(' ');

  const labelCls = 'mb-1 block text-xs font-medium text-slate-600';
  const errCls = 'mt-1 block text-xs text-rose-600';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Verify an address</h2>
            <p className="mt-1 text-sm text-slate-500">Enter postcode • suburb • state</p>
          </div>
          <span className="text-xs font-medium text-slate-500">All fields are required</span>
        </div>

        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-6"
          onInvalid={(e) => e.preventDefault()}
        >
          {/* Postcode */}
          <label className="sm:col-span-2">
            <span className={labelCls}>Postcode</span>
            <input
              inputMode="numeric"
              autoComplete="postal-code"
              className={fieldCls(!!errors.postcode)}
              placeholder="2000"
              value={postcode}
              onChange={(e) => setField('postcode', e.target.value)}
              aria-invalid={!!errors.postcode}
            />
            {errors.postcode && <span className={errCls}>{errors.postcode}</span>}
          </label>

          {/* Suburb */}
          <label className="sm:col-span-3">
            <span className={labelCls}>Suburb</span>
            <input
              className={fieldCls(!!errors.suburb)}
              placeholder="Sydney"
              value={suburb}
              onChange={(e) => setField('suburb', e.target.value)}
              aria-invalid={!!errors.suburb}
            />
            {errors.suburb && <span className={errCls}>{errors.suburb}</span>}
          </label>

          {/* State */}
          <label className="sm:col-span-1">
            <span className={labelCls}>State</span>
            <input
              className={[fieldCls(!!errors.state), 'uppercase tracking-wide'].join(' ')}
              placeholder="NSW/VIC/QLD/WA/SA/ACT/NT"
              value={state}
              onChange={(e) => setField('state', e.target.value)}
              aria-invalid={!!errors.state}
            />
            {errors.state && <span className={errCls}>{errors.state}</span>}
          </label>

          {/* Action buttons */}
          <div className="sm:col-span-6 mt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className={[
                'inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-white transition',
                loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-black',
              ].join(' ')}
            >
              {loading ? 'Validating…' : 'Validate'}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setField('postcode', '');
                setField('suburb', '');
                setField('state', '');
                setLast(null);
                setErrors({});
                setNetErr(null);
              }}
              className={[
                'inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-medium border transition',
                loading ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              Clear
            </button>
          </div>

          {/* Net error */}
          {netErr && (
            <div className="sm:col-span-6">
              <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {netErr}
              </p>
            </div>
          )}
        </form>
      </div>

      {/* Result card */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-base font-semibold">Result</h3>
        {!last ? (
          <p className="text-sm text-slate-500">Fill the form and press “Validate” to see results.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={[
                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1',
                  last.success
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-rose-50 text-rose-700 ring-rose-200',
                ].join(' ')}
              >
                {last.success ? 'Valid' : 'Invalid'}
              </span>
              <span className="text-sm text-slate-600">
                {last.message ?? (last.success ? 'Match found.' : 'No match.')}
              </span>
            </div>

            {last.success && typeof last.lat === 'number' && typeof last.lng === 'number' ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <GoogleMap lat={last.lat} lng={last.lng} height={300} zoom={14} />
              </div>
            ) : (
              <p className="text-xs text-slate-500">No geolocation available for this result.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifierForm() {
  const client = useMemo(() => makeApolloClient(), []);
  return (
    <ApolloProvider client={client}>
      <InnerForm />
    </ApolloProvider>
  );
}
