import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureIndices, findUser, es, USERS_INDEX } from '@/lib/elasticsearch';
import { hashPassword } from '@/lib/auth';

const schema = z.object({
  username: z.string().trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dot (.), underscore (_), or dash (-)'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter (A–Z)')
    .regex(/[a-z]/, 'Password must include at least one lowercase letter (a–z)')
    .regex(/[0-9]/, 'Password must include at least one number (0–9)')
    .regex(/[^A-Za-z0-9]/, 'Password must include at least one symbol (e.g. !@#$%)'),
}).strict();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await ensureIndices();
  } catch {
    return NextResponse.json(
      { error: 'Sorry, we’re having trouble right now. Please try again later.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'The information you entered is not valid. Please try again.' },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();
    return NextResponse.json(
      { fieldErrors, formErrors },
      { status: 400 }
    );
  }

  const { username, password } = parsed.data;

  const existing = await findUser(username);
  if (existing) {
    return NextResponse.json(
      { fieldErrors: { username: ['This username is already taken. Please choose another one.'] } },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  const res = await es.index({
    index: USERS_INDEX,
    document: { username, passwordHash, createdAt: new Date().toISOString() },
    refresh: 'wait_for',
  });

  return NextResponse.json({ ok: true, id: res._id }, { status: 201 });
}
