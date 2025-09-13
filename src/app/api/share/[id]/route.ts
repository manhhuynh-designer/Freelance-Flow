import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/nextauth';
import { buildSharePaths, deleteBlob, fetchJson, loadUserIndex, putJsonBlob, saveGlobalIdMap, saveUserIndex, loadGlobalIdMap, checkBlobExists } from '@/lib/blob-service';
import { ShareBlob, ShareRecord } from '@/types/share';
import { userBucketId } from '@/lib/hash';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions as any);
  if (!session || !(session as any).user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session as any).user.id as string;
  const userBucket = userBucketId(userId);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const { id } = await params;
  const { prefix } = buildSharePaths(userBucket, id);
  const index = await loadUserIndex(prefix);
  const body = await req.json();
  const item = index.items.find((i) => i.id === id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (typeof body?.title === 'string') item.title = body.title;
  if (typeof body?.expiresAt !== 'undefined') item.expiresAt = body.expiresAt ?? null;
  item.updatedAt = new Date().toISOString();

  await saveUserIndex(prefix, index, { token });
  await saveGlobalIdMap(id, { blobKey: item.blobKey, userBucket, status: undefined, expiresAt: item.expiresAt ?? null }, { token });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions as any);
  if (!session || !(session as any).user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session as any).user.id as string;
  const userBucket = userBucketId(userId);
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const { id } = await params;
  const { prefix, blobPath } = buildSharePaths(userBucket, id);
  const index = await loadUserIndex(prefix);
  const idx = index.items.findIndex((i) => i.id === id);
  if (idx === -1) {
    // Fallback: use global id map to revoke and delete, with verification
    try {
      const map = await loadGlobalIdMap(id);
      if (!map) {
        // Nothing to delete if no mapping exists
        return NextResponse.json({ ok: true });
      }
      if (map && map.userBucket && map.userBucket !== userBucket) {
        // Different owner; treat as not found for this user
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      // Revoke first
  try { await saveGlobalIdMap(id, { blobKey: map.blobKey, userBucket, status: 'revoked', expiresAt: map.expiresAt ?? null }, { token }); } catch {}
      // Attempt delete and do a quick existence check
      try { await deleteBlob(map.blobKey, { token }); } catch {}
      for (let i = 0; i < 3; i++) {
        const exists = await checkBlobExists(map.blobKey);
        if (!exists) break;
        await new Promise(r => setTimeout(r, 200 * (i + 1)));
      }
      return NextResponse.json({ ok: true });
    } catch {
      // On unexpected errors, surface a failure so UI doesn't claim success while blob remains
      return NextResponse.json({ ok: false, error: 'Deletion failed' }, { status: 500 });
    }
  }

  const it = index.items[idx];
  // Remove from index so it won't show up in listing anymore (write index first)
  index.items.splice(idx, 1);
  try { await saveUserIndex(prefix, index, { token }); } catch {}
  // Immediately mark global id map as revoked to block resolve right away
  try { await saveGlobalIdMap(id, { blobKey: it.blobKey, userBucket, status: 'revoked', expiresAt: it.expiresAt ?? null }, { token }); } catch {}
  // Best effort delete then a short existence check loop
  try { await deleteBlob(it.blobKey, { token }); } catch {}
  for (let i = 0; i < 3; i++) {
    const exists = await checkBlobExists(it.blobKey);
    if (!exists) break;
    await new Promise(r => setTimeout(r, 200 * (i + 1)));
  }
  return NextResponse.json({ ok: true });
}
