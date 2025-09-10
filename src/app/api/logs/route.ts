import { NextResponse } from 'next/server';
import { es, VERIF_INDEX } from '@/lib/elasticsearch';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  // if (!session?.username) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  const resp = await es.search({
    index: VERIF_INDEX,
    size: 50,
    sort: [
      { createdAt: { order: 'desc', unmapped_type: 'date', missing: '_last' } },
    ],
    query: { match_all: {} },
    _source: [
      'username','postcode','suburb','state','success','message','error','lat','lng','createdAt'
    ],
  });

  const hits = (resp.hits.hits || []).map((h: any) => ({ id: h._id, ...h._source }));
  return NextResponse.json({ items: hits });
}
