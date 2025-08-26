import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextauth';
import { listBackups, uploadBackup, deleteBackup } from '@/lib/cloud-storage';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const user = (session as any)?.user;
    const userId = user?.email || user?.id || 'anonymous';
  const items = await listBackups(userId as string);
  return NextResponse.json({ ok: true, backups: items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const user = (session as any)?.user;
    const userId = user?.email || user?.id || 'anonymous';
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, content, options } = body || {};
  if (!name || content === undefined || content === null) return NextResponse.json({ error: 'Missing name or content' }, { status: 400 });

  try {
  console.log('[api/backups] upload request options:', options);
  const res = await uploadBackup(userId as string, name, content, options || {});
  console.log('[api/backups] upload result:', res);
  return NextResponse.json({ ok: true, name: res?.name || name, path: res?.path, provider: res?.provider || 'local', encrypted: options?.encrypted || false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const user = (session as any)?.user;
    const userId = user?.email || user?.id || 'anonymous';
  const url = new URL(req.url);
  const name = url.searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'Missing name query param' }, { status: 400 });

  try {
    await deleteBackup(userId as string, name);
    return NextResponse.json({ ok: true, name });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 });
  }
}
