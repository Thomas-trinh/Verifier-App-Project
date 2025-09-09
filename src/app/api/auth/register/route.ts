import { NextResponse } from 'next/server';
import { z } from 'zod';
import { es, ensureIndices } from '@/lib/elasticsearch';
import { hashPassword } from '@/lib/auth';

const schema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, 'Only letters, numbers, . _ -'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[0-9]/, 'Must include a number')
    .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
});

export async function POST(req: Request) {
  await ensureIndices();
  const { username, password } = schema.parse(await req.json());
  const existing = await es.search({ index: 'users', query: { term: { username } }, size: 1 });
  if (existing.hits.hits.length) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
  }
  const passwordHash = await hashPassword(password);
  await es.index({
    index: 'users',
    document: { username, passwordHash, createdAt: new Date().toISOString() },
    refresh: 'wait_for',
  });
  return NextResponse.json({ ok: true });
}
