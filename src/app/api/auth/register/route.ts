import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureIndices, findUser, es, USERS_INDEX } from '@/lib/elasticsearch';
import { hashPassword } from '@/lib/auth';

const schema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

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

  const parseResult = schema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Please check your username and password format.' },
      { status: 400 }
    );
  }

  const { username, password } = parseResult.data;

  const existing = await findUser(username);
  if (existing) {
    return NextResponse.json(
      { error: 'This username is already taken. Please choose another one.' },
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
