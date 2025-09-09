// src/app/api/graphql/route.ts
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { ApolloServer } from '@apollo/server';
import { gql } from 'graphql-tag';

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

async function callAusPost(postcode: string, suburb: string, state: string) {
  // TODO: Replace with real AusPost call (Appendix A)
  const ok =
    /^[0-9]{4}$/.test(postcode) &&
    suburb.trim().length > 1 &&
    /^[A-Z]{2,3}$/.test(state);

  return {
    success: ok,
    message: ok ? 'Valid' : 'Not found',
    lat: ok ? -33.8688 : undefined,
    lng: ok ? 151.2093 : undefined,
  };
}

const resolvers = {
  Query: {
    validateAddress: async (
      _: unknown,
      args: { postcode: string; suburb: string; state: string }
    ) => callAusPost(args.postcode, args.suburb, args.state),
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

// Create a single handler and export it for both GET and POST
const handler = startServerAndCreateNextHandler(server);

export { handler as GET, handler as POST };
