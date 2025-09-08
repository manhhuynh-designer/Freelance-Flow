import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testPath = searchParams.get('path') || '/shares/_idmap/test.json';
  
  // Test URL construction logic
  const envVars = {
    VERCEL_BLOB_STORE_URL: process.env.VERCEL_BLOB_STORE_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  };

  // Test different URL construction methods
  const urlTests = {
    method1_env_var: process.env.VERCEL_BLOB_STORE_URL ? 
      `${process.env.VERCEL_BLOB_STORE_URL}${testPath}` : 
      'ENV_VAR_NOT_SET',
    method2_hardcoded: `https://blob.vercel-storage.com${testPath}`,
    method3_from_token: process.env.BLOB_READ_WRITE_TOKEN ? 
      `https://dekfhy7aahb69fxy.public.blob.vercel-storage.com${testPath}` : 
      'TOKEN_NOT_SET'
  };

  // Test actual fetch to see which works
  const fetchTests = {};
  
  for (const [method, url] of Object.entries(urlTests)) {
    if (url.startsWith('http')) {
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          cache: 'no-store'
        });
        fetchTests[method] = {
          url,
          status: response.status,
          ok: response.ok,
          headers: {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length')
          }
        };
      } catch (error) {
        fetchTests[method] = {
          url,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      fetchTests[method] = { url, error: 'Invalid URL' };
    }
  }

  return NextResponse.json({
    envVars,
    urlTests,
    fetchTests,
    testPath,
    timestamp: new Date().toISOString()
  });
}
