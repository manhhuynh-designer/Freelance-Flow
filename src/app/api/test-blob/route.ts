import { NextResponse } from 'next/server';

export async function GET() {
  const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  
  console.log('=== Vercel Blob Test ===');
  console.log('Token exists:', !!BLOB_TOKEN);
  console.log('Token preview:', BLOB_TOKEN?.substring(0, 20) + '...');

  if (!BLOB_TOKEN) {
    return NextResponse.json({ error: 'No BLOB_READ_WRITE_TOKEN found' });
  }

  try {
    // Test list endpoint
    console.log('Testing list endpoint...');
    const listResponse = await fetch('https://blob.vercel-storage.com/list', {
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
      },
    });
    
    console.log('List response status:', listResponse.status);
    const listResult = listResponse.ok ? await listResponse.json() : await listResponse.text();
    console.log('List result:', listResult);

    // Test upload endpoint  
    console.log('Testing upload endpoint...');
    const testContent = JSON.stringify({ test: 'data', timestamp: new Date().toISOString() });
    const uploadResponse = await fetch('https://blob.vercel-storage.com/upload?filename=test-backup.json', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: testContent,
    });
    
    console.log('Upload response status:', uploadResponse.status);
    const uploadResult = uploadResponse.ok ? await uploadResponse.json() : await uploadResponse.text();
    console.log('Upload result:', uploadResult);

    return NextResponse.json({
      success: true,
      tokenExists: !!BLOB_TOKEN,
      listStatus: listResponse.status,
      listResult,
      uploadStatus: uploadResponse.status,
      uploadResult,
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
