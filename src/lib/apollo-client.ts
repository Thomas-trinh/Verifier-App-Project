import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

export function makeApolloClient() {
  // Use relative URL to client call /api/graphql
  const link = createHttpLink({ uri: '/api/graphql', fetchOptions: { cache: 'no-store' } });
  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
    defaultOptions: {
      query: { fetchPolicy: 'no-cache' },
      watchQuery: { fetchPolicy: 'no-cache' },
    },
  });
}
