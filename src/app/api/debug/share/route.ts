import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('id');
  
  if (!shareId) {
    return NextResponse.json({ error: 'Missing share ID' }, { status: 400 });
  }

  // This endpoint will always work - useful for debugging share resolution
  const debugInfo = {
    shareId,
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL ? 'true' : 'false',
      VERCEL_ENV: process.env.VERCEL_ENV || 'unknown',
      hasBlob: !!process.env.VERCEL_BLOB_STORE_URL,
      hasToken: !!process.env.BLOB_READ_WRITE_TOKEN
    },
    urls: {
      globalIdMap: `/shares/_idmap/${shareId}.json`,
      constructed: process.env.VERCEL_BLOB_STORE_URL ? 
        `${process.env.VERCEL_BLOB_STORE_URL}/shares/_idmap/${shareId}.json` :
        'ENV_VAR_NOT_SET - using fallback'
    }
  };

  // Try to resolve the share
  try {
    const origin = request.headers.get('x-forwarded-host') 
      ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
      : `http://${request.headers.get('host')}`;
    
    const resolveUrl = `${origin}/api/share/resolve?id=${shareId}`;
    
    console.log('Debug share attempting resolve:', { shareId, resolveUrl });
    
    const res = await fetch(resolveUrl, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Debug-Share/1.0'
      }
    });
    
    const resolveResult: any = {
      url: resolveUrl,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok
    };
    
    if (res.ok) {
      try {
        const data = await res.json();
        resolveResult.hasData = !!data;
        resolveResult.dataKeys = Object.keys(data || {});
      } catch (e) {
        resolveResult.parseError = 'Failed to parse JSON';
      }
    } else {
      resolveResult.error = await res.text();
    }
    
    return NextResponse.json({
      ...debugInfo,
      resolveResult
    });
    
  } catch (error) {
    return NextResponse.json({
      ...debugInfo,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
