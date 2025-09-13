import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/lib/nextauth';
import { userBucketId } from '@/lib/hash';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id;
  const userBucket = userId ? userBucketId(userId) : null;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  const info: any = {
    hasSession: !!session,
    userId,
    userBucket,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    id,
    idMapPath: id ? `/shares/_idmap/${id}.json` : null,
    baseUrl: process.env.VERCEL_BLOB_STORE_URL || 'fallback-url',
  };
  
  if (id && token) {
    try {
      const baseUrl = process.env.VERCEL_BLOB_STORE_URL;
      if (!baseUrl) {
        throw new Error('VERCEL_BLOB_STORE_URL not configured');
      }
      const idMapUrl = `${baseUrl}/shares/_idmap/${id}.json`;
      const headers: Record<string, string> = { 
        'cache-control': 'no-store'
      };
      const res = await fetch(idMapUrl, { cache: 'no-store', headers });
      info.idMapStatus = res.status;
      info.idMapUrl = idMapUrl;
      if (res.ok) {
        const data = await res.json();
        info.idMapData = data;
        info.blobKeyFormat = data.blobKey?.startsWith('http') ? 'fullURL' : 'pathname';
        
        // Try to fetch the actual blob using the stored blobKey
        if (data.blobKey) {
          let blobUrl = data.blobKey;
          // If it's a pathname, convert to full URL with correct domain
          if (!blobUrl.startsWith('http')) {
            blobUrl = `${baseUrl}${blobUrl}`;
          }
          const blobRes = await fetch(blobUrl, { cache: 'no-store', headers });
          info.blobStatus = blobRes.status;
          info.blobKey = data.blobKey;
          info.blobUrlUsed = blobUrl;
          if (!blobRes.ok) {
            info.blobError = await blobRes.text();
          }
        }
      } else {
        info.idMapError = await res.text();
      }
    } catch (e: any) {
      info.idMapException = e.message;
    }
  }
  
  return NextResponse.json(info);
}
