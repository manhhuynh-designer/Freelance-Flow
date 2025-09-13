import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/nextauth';
import { loadUserIndex, loadGlobalIdMap, checkBlobExists } from '@/lib/blob-service';
import { userBucketId } from '@/lib/hash';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  if (!session || !(session as any).user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session as any).user.id as string;
  const prefix = `/shares/${userBucketId(userId)}`;
  // Don't pass token for reading public blobs
  const index = await loadUserIndex(prefix);
  // Only return active entries, and additionally filter out ones that are revoked via global map
  // or whose underlying blob no longer exists (e.g., deleted but index failed to save).
  const activeItems = index.items.filter((i) => i.status === 'active');

  // Validate items in parallel to avoid listing stale entries
  const validated = await Promise.all(
    activeItems.map(async (it) => {
      try {
        // Check global id map first (if present and marked revoked, exclude)
  const idMap = await loadGlobalIdMap(it.id);
  if (!idMap || idMap.status === 'revoked') return null;

  // Verify blob exists; if not, exclude
  const exists = await checkBlobExists(it.blobKey);
  if (!exists) return null;
        return it;
      } catch {
        return null;
      }
    })
  );
  const items = validated.filter((x): x is typeof activeItems[number] => !!x);
  return NextResponse.json({ items });
}
