import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/nextauth';
import { buildSharePaths, deleteBlob, fetchJson, loadUserIndex, putJsonBlob, saveGlobalIdMap, saveUserIndex, loadGlobalIdMap } from '@/lib/blob-service';
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
  await saveGlobalIdMap(id, { blobKey: item.blobKey }, { token });
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
    // Fallback: try to revoke via global id map and delete the blob even if index is missing or stale
    try {
      const map = await loadGlobalIdMap(id);
      if (map && (!map.userBucket || map.userBucket === userBucket)) {
        try { await deleteBlob(map.blobKey, { token }); } catch {}
        try { await saveGlobalIdMap(id, { blobKey: map.blobKey, status: 'revoked', expiresAt: map.expiresAt ?? null }, { token }); } catch {}
      }
    } catch {}
    return NextResponse.json({ ok: true });
  }

  const it = index.items[idx];
  // Remove from index so it won't show up in listing anymore
  index.items.splice(idx, 1);
  try { await saveUserIndex(prefix, index, { token }); } catch {}

  // Try to delete underlying blob (best-effort)
  try {
    await deleteBlob(it.blobKey, { token });
  } catch {}
  // Mark global id map as revoked to block public resolve
  try { await saveGlobalIdMap(id, { blobKey: it.blobKey, status: 'revoked', expiresAt: it.expiresAt ?? null }, { token }); } catch {}
  return NextResponse.json({ ok: true });
}
