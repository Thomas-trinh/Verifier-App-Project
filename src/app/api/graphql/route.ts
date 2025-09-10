import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { ApolloServer } from '@apollo/server';
import { gql } from 'graphql-tag';
import type { NextRequest } from 'next/server';
import { es, ensureIndices, VERIF_INDEX } from '@/lib/elasticsearch';
import { getSession } from '@/lib/session';

// ---- Debug switch -----------------------------------------------------------
const DEBUG = process.env.DEBUG_VALIDATION === 'true' || process.env.NODE_ENV !== 'production';
const dlog = (...args: any[]) => {
  if (DEBUG) console.log('[GQL]', ...args);
};
// ----------------------------------------------------------------------------

// Environment (fail fast)
const AUSPOST_BASE_URL = process.env.AUSPOST_BASE_URL;
const AUSPOST_BEARER = process.env.AUSPOST_BEARER;
if (!AUSPOST_BASE_URL) throw new Error('AUSPOST_BASE_URL is not set');
if (!AUSPOST_BEARER) throw new Error('AUSPOST_BEARER is not set');

// GraphQL schema
const typeDefs = gql`
  type ValidationResult {
    success: Boolean!
    message: String
    lat: Float
    lng: Float
  }

  type Query {
    validateAddress(postcode: String!, suburb: String!, state: String!): ValidationResult!
  }
`;

// AusPost types
type AusPostLocality = {
  latitude?: number | string;
  longitude?: number | string;
  location?: string;
  postcode?: string;
  state?: string;
};
type AusPostResponse = {
  localities?: { locality?: AusPostLocality[] | AusPostLocality };
};

// Helpers
const U = (s: string) => s.trim().toUpperCase();
const UL = (s: string) => U(s).replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const toNum = (n: any) => (n == null ? undefined : Number.isFinite(+n) ? +n : undefined);
const toArr = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);

// Call AusPost
async function fetchAusPost(q: string, state?: string) {
  const url = new URL(AUSPOST_BASE_URL!);
  url.searchParams.set('q', q);
  if (state) url.searchParams.set('state', state);

  dlog('AusPost request =>', { q, state, url: url.toString() });

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${AUSPOST_BEARER}`, Accept: 'application/json' },
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    dlog('AusPost error status:', res.status, res.statusText, 'body:', text.slice(0, 500));
    throw new Error(`AusPost API error: ${res.status} ${res.statusText}`);
  }

  // Try to parse JSON; log a sample of the payload
  let json: AusPostResponse;
  try {
    json = JSON.parse(text) as AusPostResponse;
  } catch (e) {
    dlog('AusPost JSON parse failed, raw body:', text.slice(0, 500));
    throw new Error('AusPost API returned non-JSON');
  }

  const list = toArr(json?.localities?.locality);
  dlog('AusPost total results:', list.length, 'sample:', list[0]);
  return list;
}

async function validateAgainstAusPost(postcode: string, suburb: string, state: string) {
  const pc = U(postcode);
  const sb = U(suburb);
  const sbL = UL(suburb);
  const st = U(state);

  // Query by postcode + state
  const list = await fetchAusPost(pc, st);
  const inState = list.filter((x) => U(x.state ?? '') === st);
  const exactPc = inState.filter((x) => (x.postcode ?? '').trim() === pc);

  dlog('Filter counts =>', {
    total: list.length,
    inState: inState.length,
    exactPc: exactPc.length,
    target: { pc, sb, st },
  });

  if (exactPc.length === 0) {
    const msg = `The postcode ${postcode} does not exist in the state ${state}.`;
    dlog('Result:', msg);
    return { success: false, message: msg };
  }

  // Strict equality first
  let hit = exactPc.find((x) => U(x.location ?? '') === sb);

  // Fuzzy (stable)
  if (!hit) {
    hit = exactPc.find((x) => {
      const loc = UL(x.location ?? '');
      return loc === sbL || loc.startsWith(sbL) || sbL.startsWith(loc) || loc.includes(sbL);
    });
  }

  if (!hit) {
    const msg = `The postcode ${postcode} does not match the suburb ${suburb}.`;
    dlog('Result:', msg, 'candidates sample:', exactPc[0]);
    return { success: false, message: msg };
  }

  const lat = toNum(hit.latitude);
  const lng = toNum(hit.longitude);
  const okMsg = 'The postcode, suburb, and state input are valid.';
  dlog('Result: OK', { lat, lng, suburbHit: hit.location });

  return { success: true, message: okMsg, lat, lng };
}

// Resolvers
const resolvers = {
  Query: {
    validateAddress: async (
      _: unknown,
      args: { postcode: string; suburb: string; state: string }
    ) => {
      const session = await getSession();
      if (!session?.username) {
        dlog('Unauthorized request (no session).');
        return { success: false, message: 'Unauthorized: please log in first.' };
      }

      const pc = args.postcode?.trim() ?? '';
      const sb = args.suburb?.trim() ?? '';
      const st = args.state?.trim() ?? '';

      dlog('Incoming validateAddress', { user: session.username, pc, sb, st });

      if (!/^\d{4}$/.test(pc)) return { success: false, message: 'Postcode must be 4 digits.' };
      if (!sb) return { success: false, message: 'Suburb is required.' };
      if (!/^(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)$/i.test(st)) return { success: false, message: 'Invalid state.' };

      await ensureIndices();

      try {
        const result = await validateAgainstAusPost(pc, sb, st);

        // Log to ES (fire-and-forget with error log)
        es.index({
          index: VERIF_INDEX,
          document: {
            username: session.username,
            postcode: pc,
            suburb: U(sb),
            state: U(st),
            success: result.success,
            message: result.message ?? null,
            error: result.success ? null : result.message ?? 'Validation failed',
            lat: result.lat ?? null,
            lng: result.lng ?? null,
            createdAt: new Date().toISOString(),
          },
        }).catch((e) => dlog('ES index error:', e?.message));

        dlog('Final result:', result);
        return result;
      } catch (e: any) {
        dlog('validateAddress exception:', e?.message);

        es.index({
          index: VERIF_INDEX,
          document: {
            username: session.username,
            postcode: pc,
            suburb: U(sb),
            state: U(st),
            success: false,
            message: 'Validation failed due to an upstream error.',
            error: e?.message ?? 'Unknown upstream error',
            lat: null,
            lng: null,
            createdAt: new Date().toISOString(),
          },
        }).catch((err) => dlog('ES index error (exception path):', err?.message));

        return { success: false, message: e?.message ?? 'Validation failed due to an upstream error.' };
      }
    },
  },
};

// Bootstrap
const server = new ApolloServer({ typeDefs, resolvers });
const handler = startServerAndCreateNextHandler<NextRequest>(server);
export { handler as GET, handler as POST };

// Helpers for unit tests
export const __testables = { validateAgainstAusPost: validateAgainstAusPost };