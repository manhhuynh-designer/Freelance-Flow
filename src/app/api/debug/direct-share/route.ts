import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('id');
  
  if (!shareId) {
    return NextResponse.json({ 
      error: 'Missing share ID',
      usage: 'Add ?id=SHARE_ID to test'
    }, { status: 400 });
  }

  console.log('Direct share test for ID:', shareId);

  try {
    // Direct test without going through other APIs
    const { loadGlobalIdMap, fetchJson } = await import('@/lib/blob-service');
    
    console.log('Loading global ID map for:', shareId);
    const entry = await loadGlobalIdMap(shareId);
    
    if (!entry) {
      console.log('Global ID map not found for:', shareId);
      return NextResponse.json({
        error: 'Share not found',
        shareId,
        step: 'global_id_map_not_found'
      }, { status: 404 });
    }

    console.log('Global ID map found:', entry);

    if (entry.status === 'revoked') {
      return NextResponse.json({
        error: 'Share has been revoked',
        shareId,
        step: 'share_revoked'
      }, { status: 410 });
    }

    console.log('Loading blob data from:', entry.blobKey);
    const blobData = await fetchJson(entry.blobKey);
    
    console.log('Blob data loaded successfully');

    return NextResponse.json({
      success: true,
      shareId,
      entry,
      hasData: !!blobData,
      dataKeys: Object.keys(blobData || {}),
      meta: (blobData as any)?.meta,
      dataType: (blobData as any)?.data?.kind
    });

  } catch (error: any) {
    console.error('Direct share test error:', error);
    
    return NextResponse.json({
      error: 'Failed to resolve share',
      shareId,
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
