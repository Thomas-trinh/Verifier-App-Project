import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { ApolloServer } from '@apollo/server';
import { gql } from 'graphql-tag';
import type { NextRequest } from 'next/server';
import { ensureIndices, logVerification } from '@/lib/elasticsearch';
import { getSession } from '@/lib/session';
import { validateAgainstAusPost } from '@/lib/auspost';

// ---- Debug switch -----------------------------------------------------------
const DEBUG =
  process.env.DEBUG_VALIDATION === 'true' || process.env.NODE_ENV !== 'production';
const dlog = (...args: any[]) => {
  if (DEBUG) console.log('[GQL]', ...args);
};
// ----------------------------------------------------------------------------

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
      if (!/^(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)$/i.test(st))
        return { success: false, message: 'Invalid state.' };

      await ensureIndices();

      try {
        const result = await validateAgainstAusPost(pc, sb, st);

        // Log to ES via helper (fire-and-forget with error log)
        logVerification({
          username: session.username,
          postcode: pc,
          suburb: sb.toUpperCase(),
          state: st.toUpperCase(),
          success: result.success,
          message: result.message ?? null,
          error: result.success ? null : result.message ?? 'Validation failed',
          lat: result.lat ?? null,
          lng: result.lng ?? null,
        }).catch((e) => dlog('ES logVerification error:', e?.message));

        dlog('Final result:', result);
        return result;
      } catch (e: any) {
        dlog('validateAddress exception:', e?.message);

        logVerification({
          username: session.username,
          postcode: pc,
          suburb: sb.toUpperCase(),
          state: st.toUpperCase(),
          success: false,
          message: 'Validation failed due to an upstream error.',
          error: e?.message ?? 'Unknown upstream error',
          lat: null,
          lng: null,
        }).catch((err) => dlog('ES logVerification error (exception path):', err?.message));

        return {
          success: false,
          message: e?.message ?? 'Validation failed due to an upstream error.',
        };
      }
    },
  },
};

// Bootstrap
const server = new ApolloServer({ typeDefs, resolvers });
const handler = startServerAndCreateNextHandler<NextRequest>(server);
export { handler as GET, handler as POST };
