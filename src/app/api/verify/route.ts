import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureIndices, logVerification } from '@/lib/ElasticSearch';
import { getSession } from '@/lib/Session';

const VerifySchema = z.object({
  postcode: z.string().min(1),
  suburb: z.string().min(1),
  state: z.string().min(1),
  success: z.boolean(),
  error: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await ensureIndices();

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const { postcode, suburb, state, success, error, lat, lng } =
      VerifySchema.parse(json);

    const res = await logVerification({
      username: session.username,
      postcode,
      suburb,
      state,
      success,
      error: error ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      message: success
        ? 'The postcode, suburb, and state input are valid.'
        : error ?? 'Validation failed',
    });

    return NextResponse.json(
      { ok: true, id: res._id },
      { status: 201 }
    );
  } catch (e: any) {
    const message =
      e?.issues?.[0]?.message /* Zod */ ||
      e?.meta?.body?.error?.reason /* ES */ ||
      e?.message ||
      'Internal error';

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
