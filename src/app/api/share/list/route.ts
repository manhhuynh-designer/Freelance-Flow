import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/nextauth';
import { loadUserIndex } from '@/lib/blob-service';
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
  // Only return active entries
  return NextResponse.json({ items: index.items.filter((i) => i.status === 'active') });
}
