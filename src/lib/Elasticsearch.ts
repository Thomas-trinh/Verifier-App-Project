import { Client } from '@elastic/elasticsearch';

const NODE = process.env.ELASTICSEARCH_NODE!;
const API_KEY = process.env.ELASTICSEARCH_API_KEY;
const USERNAME = process.env.ELASTICSEARCH_USERNAME;
const PASSWORD = process.env.ELASTICSEARCH_PASSWORD;

export const USERS_INDEX = process.env.ELASTICSEARCH_USERS_INDEX || 'users';
export const VERIF_INDEX  = process.env.ELASTICSEARCH_VERIF_INDEX || 'verifications';

// Init client
export const es = new Client({
  node: NODE,
  auth: API_KEY
    ? { apiKey: API_KEY }
    : USERNAME && PASSWORD
    ? { username: USERNAME, password: PASSWORD }
    : undefined,
  tls: NODE.startsWith('https://')
    ? { rejectUnauthorized: false }
    : undefined,
});

// Common helpers
export async function ensureIndices() {
  await ensureUsersIndex();
  await ensureVerifIndex();
}

async function ensureUsersIndex() {
  const exists = await es.indices.exists({ index: USERS_INDEX });
  // @ts-ignore elastic v8 returns boolean
  if (!exists) {
    await es.indices.create({
      index: USERS_INDEX,
      mappings: {
        properties: {
          username:     { type: 'keyword' },
          passwordHash: { type: 'keyword' },
          createdAt:    { type: 'date' },
        },
      },
    });
  }
}

async function ensureVerifIndex() {
  const exists = await es.indices.exists({ index: VERIF_INDEX });
  // @ts-ignore
  if (!exists) {
    await es.indices.create({
      index: VERIF_INDEX,
      mappings: {
        properties: {
          username:  { type: 'keyword' },
          postcode:  { type: 'keyword' },
          suburb:    { type: 'keyword' },
          state:     { type: 'keyword' },
          success:   { type: 'boolean' },
          message:   { type: 'text' },
          error:     { type: 'text' },
          lat:       { type: 'float' },
          lng:       { type: 'float' },
          createdAt: { type: 'date' },
        },
      },
    });
  }
}

// Domain-specific helpers
export async function findUser(username: string) {
  const res = await es.search({
    index: USERS_INDEX,
    size: 1,
    query: { term: { username } },
  });
  return res.hits.hits[0]?._source as any | null;
}

export async function createUser(username: string, passwordHash: string) {
  return es.index({
    index: USERS_INDEX,
    document: { username, passwordHash, createdAt: new Date().toISOString() },
    refresh: 'wait_for',
  });
}

export type VerificationLogDoc = {
  username: string;
  postcode: string;
  suburb: string;
  state: string;
  success: boolean;
  message?: string | null;
  error?: string | null;
  lat?: number | null;
  lng?: number | null;
};

/**
 * Log a verification attempt to Elasticsearch.
 * Safe to call from routes/resolvers. Returns the ES response promise.
 */
export async function logVerification(doc: VerificationLogDoc) {
  return es.index({
    index: VERIF_INDEX,
    document: { ...doc, createdAt: new Date().toISOString() },
    refresh: 'wait_for',
  });
}

export async function fetchLogs(limit = 50) {
  const resp = await es.search({
    index: VERIF_INDEX,
    size: limit,
    sort: [{ createdAt: { order: 'desc', unmapped_type: 'date', missing: '_last' } }],
    _source: [
      'username','postcode','suburb','state',
      'success','message','error','lat','lng','createdAt'
    ],
  });
  return (resp.hits.hits || []).map((h: any) => ({ id: h._id, ...h._source }));
}
