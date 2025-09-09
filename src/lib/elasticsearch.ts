// src/lib/elasticsearch.ts
import { Client } from '@elastic/elasticsearch';

export const es = new Client({
  node: process.env.ELASTICSEARCH_NODE!,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY! },
});

export const USERS_INDEX = process.env.ELASTICSEARCH_USERS_INDEX || 'users';
export const VERIF_INDEX = process.env.ELASTICSEARCH_VERIF_INDEX || 'verifications';

export async function ensureIndices() {
  const usersExists = await es.indices.exists({ index: USERS_INDEX });
  if (!usersExists) {
    await es.indices.create({
      index: USERS_INDEX,
      mappings: {
        properties: {
          username: { type: 'keyword' },
          passwordHash: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    });
  }

  const verifExists = await es.indices.exists({ index: VERIF_INDEX });
  if (!verifExists) {
    await es.indices.create({
      index: VERIF_INDEX,
      mappings: {
        properties: {
          username: { type: 'keyword' },
          postcode: { type: 'keyword' },
          suburb: { type: 'keyword' },
          state: { type: 'keyword' },
          success: { type: 'boolean' },
          message: { type: 'text' },
          error: { type: 'text' },
          lat: { type: 'float' },
          lng: { type: 'float' },
          createdAt: { type: 'date' },
        },
      },
    });
  }
}
