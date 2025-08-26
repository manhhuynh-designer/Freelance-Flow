import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextauth';
import { listBackups } from '@/lib/cloud-storage';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const user = (session as any)?.user;
  const userId = user?.email || user?.id || 'anonymous';
  try {
    const items = await listBackups(userId as string);
    return NextResponse.json({ ok: true, backups: items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list backups' }, { status: 500 });
  }
}
