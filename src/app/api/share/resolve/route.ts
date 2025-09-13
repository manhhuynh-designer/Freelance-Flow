import { NextRequest, NextResponse } from 'next/server';
import { fetchJson } from '@/lib/blob-service';
import { loadGlobalIdMap } from '@/lib/blob-service';
import { ShareBlobSchema } from '@/types/share';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  console.log(`[Share Resolve] Looking up ID: ${id}`);

  // Don't pass token for reading public blobs
  const map = await loadGlobalIdMap(id);
  if (!map) {
    console.error(`[Share Resolve] No ID map found for: ${id}`);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  if (map.status === 'revoked') {
    console.warn(`[Share Resolve] Revoked share: ${id}`);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  console.log(`[Share Resolve] Found map for ${id}:`, { blobKey: map.blobKey, status: map.status });

  try {
  // Always prioritize the original stored blobKey as-is (no fallback rewrite)
  // blobKey may be a pathname or a full URL; fetchJson handles both but we won't rewrite on failures
  console.log(`[Share Resolve] Fetching blob (original key): ${map.blobKey}`);
  const blob: any = await fetchJson(map.blobKey);
    
    if (!blob) {
      console.error(`[Share Resolve] Blob is null or empty`);
      return NextResponse.json({ error: 'Blob data is empty' }, { status: 500 });
    }
    
    const parsed = ShareBlobSchema.parse(blob);
    const expiresAt = parsed.meta.expiresAt || map.expiresAt || null;
    
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      console.warn(`[Share Resolve] Expired share: ${id}, expired at ${expiresAt}`);
      return NextResponse.json({ error: 'Expired' }, { status: 404 });
    }
    
    console.log(`[Share Resolve] Successfully resolved ${id}`);
    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error(`[Share Resolve] Failed to load ${id}:`, e.message, e.stack);
    return NextResponse.json({ 
      error: 'Failed to load', 
      details: e?.message,
      blobKey: map.blobKey 
    }, { status: 500 });
  }
}
