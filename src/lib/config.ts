import { z } from 'zod';

const EnvSchema = z.object({
  // Server runtime env (do NOT expose to client)
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // JWT / Session
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_COOKIE_NAME: z.string().min(1, 'SESSION_COOKIE_NAME is required'),

  // Elasticsearch
  ELASTICSEARCH_NODE: z.string().url('ELASTICSEARCH_NODE must be a valid URL'),
  ELASTICSEARCH_USERNAME: z.string(),
  ELASTICSEARCH_PASSWORD: z.string(),

  // AusPost
  AUSPOST_BASE_URL: z.string().url('AUSPOST_BASE_URL must be a valid URL'),
  AUSPOST_BEARER: z.string().min(10, 'AUSPOST_BEARER looks too short'),

  // Client-exposed envs MUST start with NEXT_PUBLIC_
  NEXT_PUBLIC_APP_NAME: z.string().default('Verifier'),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string(),
});

// Only read from process.env (server-side), no defaults here.
// Fail-fast if anything is misconfigured.
export const env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,

  JWT_SECRET: process.env.JWT_SECRET,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,

  ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE,
  ELASTICSEARCH_USERNAME: process.env.ELASTICSEARCH_USERNAME,
  ELASTICSEARCH_PASSWORD: process.env.ELASTICSEARCH_PASSWORD,

  AUSPOST_BASE_URL: process.env.AUSPOST_BASE_URL,
  AUSPOST_BEARER: process.env.AUSPOST_BEARER,

  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
});
