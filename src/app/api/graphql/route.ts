import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { ApolloServer } from '@apollo/server';
import { gql } from 'graphql-tag';
import { es } from '@/lib/elasticsearch';
import { getSession } from '@/lib/session';

// Fail-fast on missing env (clean & explicit)
const AUSPOST_BASE_URL = process.env.AUSPOST_BASE_URL;
const AUSPOST_BEARER = process.env.AUSPOST_BEARER;
if (!AUSPOST_BASE_URL) throw new Error('AUSPOST_BASE_URL is not set');
if (!AUSPOST_BEARER) throw new Error('AUSPOST_BEARER is not set');

// Optional: leave it out if you only use POST; POST is non-cacheable by default
// export const dynamic = 'force-dynamic';

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

type AusPostLocality = {
  latitude?: number | string;
  longitude?: number | string;
  location?: string; // suburb name
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

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 7000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchAusPost(q: string, state?: string) {
  const url = new URL(AUSPOST_BASE_URL!);
  url.searchParams.set('q', q);
  if (state) url.searchParams.set('state', state);

  const res = await fetchWithTimeout(url.toString(), {
    method: 'GET',
    headers: { Authorization: `Bearer ${AUSPOST_BEARER}`, Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AusPost API error: ${res.status} ${res.statusText} ${text}`);
  }

  const json = (await res.json()) as AusPostResponse;
  return toArr(json?.localities?.locality);
}

// Core validation (with stable fuzzy matching)
async function validateAgainstAusPost(postcode: string, suburb: string, state: string) {
  const pc = U(postcode);
  const sb = U(suburb);
  const sbL = UL(suburb);
  const st = U(state);

  // Query by postcode + state
  const list = await fetchAusPost(pc, st);
  const inState = list.filter(x => U(x.state ?? '') === st);
  const exactPc = inState.filter(x => (x.postcode ?? '').trim() === pc);

  if (exactPc.length === 0) {
    return { success: false, message: `The postcode ${postcode} does not exist in the state ${state}.` };
  }

  // Strict equality first
  let hit = exactPc.find(x => U(x.location ?? '') === sb);

  // Fuzzy match: equal, startsWith, contains (covers "BRISBANE" vs "BRISBANE CITY")
  if (!hit) {
    hit = exactPc.find(x => {
      const loc = UL(x.location ?? '');
      return loc === sbL || loc.startsWith(sbL) || sbL.startsWith(loc) || loc.includes(sbL);
    });
  }

  if (!hit) {
    return { success: false, message: `The postcode ${postcode} does not match the suburb ${suburb}.` };
  }

  return {
    success: true,
    message: 'The postcode, suburb, and state input are valid.',
    lat: toNum(hit.latitude),
    lng: toNum(hit.longitude),
  };
}

const resolvers = {
  Query: {
    validateAddress: async (_: unknown, args: { postcode: string; suburb: string; state: string }) => {
      const pc = args.postcode?.trim() ?? '';
      const sb = args.suburb?.trim() ?? '';
      const st = args.state?.trim() ?? '';

      if (!/^\d{4}$/.test(pc)) return { success: false, message: 'Postcode must be 4 digits.' };
      if (!sb) return { success: false, message: 'Suburb is required.' };
      if (!/^(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)$/i.test(st)) return { success: false, message: 'Invalid state.' };

      try {
        const result = await validateAgainstAusPost(pc, sb, st);

        // Fire-and-forget logging to Elasticsearch (non-blocking)
        (async () => {
            const session = await getSession();
            await es.index({
              index: 'verifications',
              document: {
                username: session?.username ?? null,
                postcode: pc,
                suburb: U(sb),
                state: U(st),
                success: result.success,
                message: result.message ?? null,
                lat: result.lat ?? null,
                lng: result.lng ?? null,
                createdAt: new Date().toISOString(),
              },
            });
        });

        return result;
      } catch (e: any) {
        return { success: false, message: e?.message ?? 'Validation failed due to an upstream error.' };
      }
    },
  },
};

// Bootstrap
import type { NextRequest } from 'next/server';
const server = new ApolloServer({ typeDefs, resolvers });
const handler = startServerAndCreateNextHandler<NextRequest>(server);
export { handler as GET, handler as POST };
