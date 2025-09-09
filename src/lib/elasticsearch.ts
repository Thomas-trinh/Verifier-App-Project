import { Client } from '@elastic/elasticsearch';

const node = process.env.ELASTICSEARCH_NODE!;
const username = process.env.ELASTICSEARCH_USERNAME || undefined;
const password = process.env.ELASTICSEARCH_PASSWORD || undefined;

export const es = new Client({
  node,
  auth: username && password ? { username, password } : undefined,
});

export async function ensureIndices() {
  const usersExists = await es.indices.exists({ index: 'users' });
  if (!usersExists) {
    await es.indices.create({
      index: 'users',
      mappings: {
        properties: {
          username: { type: 'keyword' },
          passwordHash: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    });
  }

  const verExists = await es.indices.exists({ index: 'verifications' });
  if (!verExists) {
    await es.indices.create({
      index: 'verifications',
      mappings: {
        properties: {
          username:  { type: 'keyword' },
          postcode:  { type: 'keyword' },
          suburb:    { type: 'text'    },
          state:     { type: 'keyword' },
          success:   { type: 'boolean' },
          error:     { type: 'text'    },
          createdAt: { type: 'date'    },
        },
      },
    });
  }
}
