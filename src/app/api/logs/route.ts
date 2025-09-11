import { NextResponse } from 'next/server';
import { ensureIndices, fetchLogs } from '@/lib/elasticsearch';
import { getSession } from '@/lib/session';

export async function GET() {
  await ensureIndices();

  const session = await getSession();
  if (!session?.username) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const items = await fetchLogs(50);
  return NextResponse.json({ items });
}
