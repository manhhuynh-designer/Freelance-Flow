import { NextRequest, NextResponse } from 'next/server';
import { fetchJson } from '@/lib/blob-service';
import { loadGlobalIdMap } from '@/lib/blob-service';
import { ShareBlobSchema } from '@/types/share';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Don't pass token for reading public blobs
  const map = await loadGlobalIdMap(id);
  if (!map) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (map.status === 'revoked') return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    // Try load via stored blobKey (pathname or full URL)
    let blob: any = null;
    try {
      blob = await fetchJson(map.blobKey);
    } catch (e) {
      // Fallback: if blobKey was full URL and failed due to host mismatch, try interpreting as pathname
      if (map.blobKey?.startsWith('http')) {
        const pathname = new URL(map.blobKey).pathname;
        blob = await fetchJson(pathname);
      } else {
        throw e;
      }
    }
    const parsed = ShareBlobSchema.parse(blob);
    const expiresAt = parsed.meta.expiresAt || map.expiresAt || null;
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Expired' }, { status: 404 });
    }
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load', details: e?.message }, { status: 500 });
  }
}
