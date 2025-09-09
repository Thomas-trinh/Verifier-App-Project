'use client';

import { useMemo, useState } from 'react';
import { useFormStore } from '@/store/formStore';
import { makeApolloClient } from '@/lib/apollo-client';
import { ApolloProvider } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { z } from 'zod';

const SCHEMA = z.object({
  postcode: z.string().regex(/^\d{4}$/, 'Postcode must be 4 digits'),
  suburb: z.string().min(2, 'Suburb is too short'),
  state: z
    .string()
    .toUpperCase()
    .regex(/^(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)$/, 'Invalid state'),
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

type ValidateVars = {
  postcode: string;
  suburb: string;
  state: string;
};

type ValidateResp = {
  validateAddress: {
    success: boolean;
    message?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
};

function InnerForm() {
  const { postcode, suburb, state, setField } = useFormStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [last, setLast] = useState<{ success: boolean; message?: string; lat?: number; lng?: number } | null>(null);

  // ---- Provide generics so `data` is correctly typed ----
  const [run, { loading, data }] = useLazyQuery<ValidateResp, ValidateVars>(VALIDATE);
  // -------------------------------------------------------

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = SCHEMA.safeParse({ postcode, suburb, state });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0]);
        map[k] = issue.message;
      }
      setErrors(map);
      return;
    }

    // Execute GraphQL validation
    await run({ variables: { postcode, suburb, state: state.toUpperCase() } });

    const r = data?.validateAddress;
    const success = !!r?.success;
    setLast({
      success,
      message: r?.message ?? undefined,
      lat: r?.lat ?? undefined,
      lng: r?.lng ?? undefined,
    });

    // Log to ES (requires auth; /api/verify checks cookie)
    await fetch('/api/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        postcode,
        suburb,
        state: state.toUpperCase(),
        success,
        error: success ? undefined : (r?.message || 'Validation failed'),
      }),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-lg">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <input
            className="border rounded p-2 w-full"
            placeholder="Postcode (4 digits)"
            value={postcode}
            onChange={(e) => setField('postcode', e.target.value.trim())}
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
            onChange={(e) => setField('state', e.target.value.toUpperCase())}
          />
          {errors.state && <p className="text-red-600 text-sm">{errors.state}</p>}
        </div>
      </div>

      <button disabled={loading} className="bg-black text-white rounded px-4 py-2">
        {loading ? 'Validating…' : 'Validate'}
      </button>

      {last && (
        <p className="text-sm">
          {last.success ? 'Valid address' : `${last.message || 'Invalid'}`}
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
