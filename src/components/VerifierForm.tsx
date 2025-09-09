'use client';

import { useMemo, useRef, useState } from 'react';
import { useFormStore } from '@/store/formStore';
import { makeApolloClient } from '@/lib/apollo-client';
import { ApolloProvider, useApolloClient } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { z } from 'zod';

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
  const { postcode, suburb, state, setField } = useFormStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [last, setLast] = useState<{ success: boolean; message?: string; lat?: number; lng?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [netErr, setNetErr] = useState<string | null>(null);

  // Use Apollo client directly to avoid hook staleness.
  const client = useApolloClient();

  // Request guard to drop out-of-order responses
  const reqIdRef = useRef(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Debounce/double-click guard (prevents racing requests)
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

    const clean = parsed.data; // suburb/state already UPPERCASE, postcode trimmed
    const myReq = ++reqIdRef.current;

    setLoading(true);
    try {
      // Force uppercase again when sending (defensive)
      const { data } = await client.query<ValidateResp, ValidateVars>({
        query: VALIDATE,
        variables: {
          postcode: clean.postcode,
          suburb: clean.suburb.toUpperCase(),
          state: clean.state.toUpperCase(),
        },
        fetchPolicy: 'network-only',
      });

      // Only apply if this is the latest request (race-proof UI)
      if (myReq === reqIdRef.current) {
        const r = data?.validateAddress;
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

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-lg">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <input
            className="border rounded p-2 w-full"
            placeholder="Postcode (4 digits)"
            value={postcode}
            onChange={(e) => setField('postcode', e.target.value)}
          />
          {errors.postcode && <p className="text-red-600 text-sm">{errors.postcode}</p>}
        </div>

        <div className="col-span-2">
          <input
            className="border rounded p-2 w-full"
            placeholder="Suburb"
            value={suburb}
            onChange={(e) => setField('suburb', e.target.value)}
          />
          {errors.suburb && <p className="text-red-600 text-sm">{errors.suburb}</p>}
        </div>

        <div>
          <input
            className="border rounded p-2 w-full uppercase"
            placeholder="State (NSW/VIC/QLD/WA/SA/TAS/ACT/NT)"
            value={state}
            onChange={(e) => setField('state', e.target.value)}
          />
          {errors.state && <p className="text-red-600 text-sm">{errors.state}</p>}
        </div>
      </div>

      <button disabled={loading} className="bg-black text-white rounded px-4 py-2">
        {loading ? 'Validating…' : 'Validate'}
      </button>

      {netErr && <p className="text-sm text-red-600">{netErr}</p>}

      {last && (
        <p className="text-sm">
          {last.success ? 'Valid address' : `${last.message || 'Invalid address'}`}
        </p>
      )}
    </form>
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
