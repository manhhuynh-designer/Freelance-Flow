import { NextRequest, NextResponse } from 'next/server';
import { listBackups, uploadBackup, deleteBackup, downloadBackup } from '@/lib/cloud-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, name, content, options } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    switch (action) {
      case 'list':
        const backups = await listBackups(userId);
        return NextResponse.json(backups);

      case 'upload':
        if (!name || !content) {
          return NextResponse.json({ error: 'Name and content are required for upload' }, { status: 400 });
        }
        const uploadResult = await uploadBackup(userId, name, content, options || {});
        return NextResponse.json(uploadResult);

      case 'download':
        if (!name) {
          return NextResponse.json({ error: 'Name is required for download' }, { status: 400 });
        }
        const downloadResult = await downloadBackup(userId, name);
        return new NextResponse(downloadResult, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${name}"`,
          },
        });

      case 'delete':
        if (!name) {
          return NextResponse.json({ error: 'Name is required for delete' }, { status: 400 });
        }
        await deleteBackup(userId, name);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Cloud backup API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}