import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextauth';
import { downloadBackup } from '@/lib/cloud-storage';

export async function GET(req: Request, { params }: { params: { name: string } }) {
  const session = await getServerSession(authOptions as any);
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const user = (session as any)?.user;
  const userId = user?.email || user?.id || 'anonymous';
  const { name } = params;

  if (!name) return NextResponse.json({ error: 'Missing backup name' }, { status: 400 });

  try {
    const content = await downloadBackup(userId as string, name);
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Download failed' }, { status: 500 });
  }
}
