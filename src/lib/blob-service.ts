import { del, put } from '@vercel/blob';
import { ShareBlob, ShareIndex, ShareIndexSchema, ShareRecord } from '@/types/share';

export type PutResult = {
  url: string;
  pathname: string; // aka blob key
};

export async function putJsonBlob(
  pathname: string,
  payload: unknown,
  opts?: { token?: string; allowOverwrite?: boolean; addRandomSuffix?: boolean }
): Promise<PutResult> {
  const json = JSON.stringify(payload);
  const res = await put(
    pathname,
    new Blob([json], { type: 'application/json' }),
    {
      access: 'public',
      contentType: 'application/json',
      token: opts?.token,
      allowOverwrite: opts?.allowOverwrite,
      addRandomSuffix: opts?.addRandomSuffix,
    } as any
  );
  return { url: res.url, pathname: new URL(res.url).pathname };
}

export async function deleteBlob(pathname: string, opts?: { token?: string }) {
  // Try raw pathname first
  try {
    await del(pathname, { token: opts?.token } as any);
    return;
  } catch (e) {
    // Fallback to absolute URL if pathname form is not accepted
    try {
      const baseUrl = process.env.VERCEL_BLOB_STORE_URL || 'https://blob.vercel-storage.com';
      const url = pathname.startsWith('http') ? pathname : `${baseUrl}${pathname}`;
      await del(url, { token: opts?.token } as any);
    } catch (e2) {
      throw e2;
    }
  }
}

export async function fetchJson<T = unknown>(blobKeyOrUrl: string, opts?: { token?: string; requireAuth?: boolean }): Promise<T> {
  let url = blobKeyOrUrl;
  
  // Debug logging for production issues
  console.log('fetchJson called with:', {
    input: blobKeyOrUrl,
    isFullUrl: blobKeyOrUrl.startsWith('http'),
    envBlobUrl: process.env.VERCEL_BLOB_STORE_URL,
    nodeEnv: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  });
  
  // If it's not a full URL, we need to construct it
  if (!blobKeyOrUrl.startsWith('http')) {
    // Get base URL from environment with fallback
    let baseUrl = process.env.VERCEL_BLOB_STORE_URL;
    
    if (!baseUrl) {
      // Fallback to default Vercel blob storage
      baseUrl = 'https://blob.vercel-storage.com';
      console.warn('VERCEL_BLOB_STORE_URL not set, using fallback:', baseUrl);
    }
    
    // Ensure clean URL construction
    const cleanPath = blobKeyOrUrl.startsWith('/') ? blobKeyOrUrl : '/' + blobKeyOrUrl;
    url = `${baseUrl}${cleanPath}`;
    
    console.log('fetchJson URL construction:', {
      input: blobKeyOrUrl,
      baseUrl,
      cleanPath,
      finalUrl: url,
      hasEnvVar: !!process.env.VERCEL_BLOB_STORE_URL
    });
  } else {
    console.log('fetchJson using full URL as-is:', url);
  }
  
  const headers: Record<string, string> = { 
    'cache-control': 'no-store',
    'user-agent': 'FreelanceFlow/1.0'
  };
  
  // Only add auth header if explicitly required (for private blobs)
  if (opts?.requireAuth && opts?.token) {
    headers['authorization'] = `Bearer ${opts.token}`;
  }
  
  try {
    console.log('fetchJson attempting fetch:', { url, hasToken: !!opts?.token });
    
    const res = await fetch(url, { 
      cache: 'no-store', 
      headers,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(15000) // Increased timeout
    });
    
    console.log('fetchJson response:', { 
      url, 
      status: res.status, 
      statusText: res.statusText,
      ok: res.ok,
      contentType: res.headers.get('content-type')
    });
    
    if (!res.ok) {
      // Better error logging for debugging
      const errorText = await res.text();
      console.error(`fetchJson failed: ${res.status} ${res.statusText} for ${url}`, errorText);
      throw new Error(`Failed to load blob ${blobKeyOrUrl}: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    const text = await res.text();
    if (!text) {
      throw new Error(`Empty response from blob ${blobKeyOrUrl}`);
    }
    
    const parsed = JSON.parse(text) as T;
    console.log('fetchJson success:', { url, dataKeys: Object.keys(parsed || {}) });
    return parsed;
  } catch (error: any) {
    console.error(`Error fetching blob ${blobKeyOrUrl}:`, {
      input: blobKeyOrUrl,
      constructedUrl: url,
      error: error.message,
      isAbortError: error.name === 'AbortError'
    });
    throw new Error(`Failed to load blob ${blobKeyOrUrl}: ${error.message}`);
  }
}

export async function loadUserIndex(prefix: string, opts?: { token?: string }): Promise<ShareIndex> {
  try {
  // Don't pass token for reading public blobs; add cache buster to avoid CDN staleness
  const index = await fetchJson<ShareIndex>(`${prefix}/index.json?ts=${Date.now()}`);
    return ShareIndexSchema.parse(index);
  } catch {
    return { items: [] };
  }
}

export async function saveUserIndex(prefix: string, index: ShareIndex, opts?: { token?: string }) {
  await putJsonBlob(`${prefix}/index.json`, index, { token: opts?.token, allowOverwrite: true });
}

export function resolveBlobUrl(blobKeyOrUrl: string): string {
  if (blobKeyOrUrl.startsWith('http')) return blobKeyOrUrl;
  const baseUrl = process.env.VERCEL_BLOB_STORE_URL || 'https://blob.vercel-storage.com';
  const cleanPath = blobKeyOrUrl.startsWith('/') ? blobKeyOrUrl : '/' + blobKeyOrUrl;
  return `${baseUrl}${cleanPath}`;
}

export async function checkBlobExists(blobKeyOrUrl: string): Promise<boolean> {
  const url = resolveBlobUrl(blobKeyOrUrl);
  try {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      headers: { 'cache-control': 'no-store', 'user-agent': 'FreelanceFlow/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 200) return true;
    if (res.status === 404) return false;
    // Fallback to GET for providers not supporting HEAD fully
    const getRes = await fetch(`${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'cache-control': 'no-store', 'user-agent': 'FreelanceFlow/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    return getRes.ok;
  } catch {
    return false;
  }
}

export function buildSharePaths(userBucket: string, id: string) {
  const prefix = `/shares/${userBucket}`;
  const blobPath = `${prefix}/${id}.json`;
  const indexPath = `${prefix}/index.json`;
  const globalMapPath = `/shares/_idmap/${id}.json`;
  return { prefix, blobPath, indexPath, globalMapPath };
}

export function toRecordFromBlob(blob: ShareBlob, blobKey: string): ShareRecord {
  return {
    id: blob.meta.id,
    type: blob.meta.type,
    title: '',
    taskId: undefined,
    createdAt: blob.meta.createdAt,
    updatedAt: blob.meta.updatedAt,
    expiresAt: blob.meta.expiresAt ?? null,
    status: 'active',
    blobKey,
    viewCount: 0,
    lastAccessAt: null,
  };
}

export async function saveGlobalIdMap(
  id: string,
  entry: { blobKey: string; userBucket?: string; status?: 'active'|'revoked'; expiresAt?: string|null },
  opts?: { token?: string }
) {
  // Merge with existing to preserve userBucket and other fields unless explicitly overridden
  let merged = entry;
  try {
    const existing = await loadGlobalIdMap(id);
    if (existing) {
      merged = { ...existing, ...entry };
    }
  } catch {
    // ignore
  }
  await putJsonBlob(`/shares/_idmap/${id}.json`, merged, { token: opts?.token, allowOverwrite: true });
}

export type IdMapEntry = { blobKey: string; userBucket?: string; status?: 'active'|'revoked'; expiresAt?: string|null };

export async function loadGlobalIdMap(id: string, opts?: { token?: string }): Promise<IdMapEntry | null> {
  try {
  // Don't pass token for reading public blobs; add cache buster
  const result = await fetchJson<IdMapEntry>(`/shares/_idmap/${id}.json?ts=${Date.now()}`);
    console.log(`Successfully loaded global ID map for ${id}:`, result);
    return result;
  } catch (error: any) {
    console.error(`Failed to load global ID map for ${id}:`, error.message);
    return null;
  }
}
