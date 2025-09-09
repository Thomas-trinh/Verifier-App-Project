import { NextResponse } from 'next/server';
import { es, ensureIndices } from '@/lib/elasticsearch';
import { getSession } from '@/lib/session';
import { z } from 'zod';

const VerifySchema = z.object({
  postcode: z.string().min(1),
  suburb: z.string().min(1),
  state: z.string().min(1),
  success: z.boolean(),
  error: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await ensureIndices();

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const { postcode, suburb, state, success, error } = VerifySchema.parse(json);

    const res = await es.index({
      index: 'verifications',
      document: {
        username: session.username,
        postcode,
        suburb,
        state,
        success,
        error: error ?? null,
        createdAt: new Date().toISOString(),
      },
      refresh: 'wait_for',
    });

    return NextResponse.json(
      { ok: true, id: res._id },
      { status: 201 }
    );
  } catch (e: any) {
    // zod error or ES error
    const message =
      e?.issues?.[0]?.message /* zod */ ||
      e?.meta?.body?.error?.reason /* ES */ ||
      e?.message ||
      'Internal error';

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
