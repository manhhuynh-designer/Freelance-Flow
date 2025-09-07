import { NextRequest, NextResponse } from 'next/server';
import { loadGlobalIdMap, loadUserIndex, saveUserIndex } from '@/lib/blob-service';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  if (!id) return NextResponse.json({ ok: false });

  const map = await loadGlobalIdMap(id);
  if (!map) return NextResponse.json({ ok: false });

  try {
    // Infer user bucket from blobKey: /shares/{bucket}/{id}.json
    const m = map.blobKey.match(/^\/shares\/([^/]+)\//);
    if (!m) return NextResponse.json({ ok: false });
    const bucket = m[1];
    const prefix = `/shares/${bucket}`;
    const index = await loadUserIndex(prefix);
    const it = index.items.find((i) => i.id === id);
    if (!it) return NextResponse.json({ ok: false });
    it.viewCount = (it.viewCount || 0) + 1;
    it.lastAccessAt = new Date().toISOString();
    await saveUserIndex(prefix, index);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
