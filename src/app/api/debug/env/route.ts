import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Allow in development, preview, or when explicitly testing
  const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
  const allowDebug = process.env.ALLOW_DEBUG === 'true' || !isProduction;
  
  if (isProduction && !allowDebug) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_BLOB_STORE_URL: process.env.VERCEL_BLOB_STORE_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_APP_ORIGIN: process.env.NEXT_PUBLIC_APP_ORIGIN,
    timestamp: new Date().toISOString(),
    headers: {
      host: request.headers.get('host'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    }
  };

  console.log('Debug env check:', envVars);

  return NextResponse.json(envVars);
}
