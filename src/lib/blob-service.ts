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
  // pathname can be either full URL or path
  const url = pathname.startsWith('http') ? pathname : `https://blob.vercel-storage.com${pathname}`;
  await del(url, { token: opts?.token } as any);
}

export async function fetchJson<T = unknown>(blobKeyOrUrl: string, opts?: { token?: string; requireAuth?: boolean }): Promise<T> {
  let url = blobKeyOrUrl;
  
  // If it's not a full URL, we need to construct it
  if (!blobKeyOrUrl.startsWith('http')) {
    // Try to get the base URL from environment or use the generic domain
    const baseUrl = process.env.VERCEL_BLOB_STORE_URL || 'https://blob.vercel-storage.com';
    url = `${baseUrl}${blobKeyOrUrl}`;
  }
  
  const headers: Record<string, string> = { 'cache-control': 'no-store' };
  // Only add auth header if explicitly required (for private blobs)
  if (opts?.requireAuth && opts?.token) {
    headers['authorization'] = `Bearer ${opts.token}`;
  }
  
  const res = await fetch(url, { cache: 'no-store', headers });
  if (!res.ok) throw new Error(`Failed to load blob ${blobKeyOrUrl}: ${res.status} from ${url}`);
  return (await res.json()) as T;
}

export async function loadUserIndex(prefix: string, opts?: { token?: string }): Promise<ShareIndex> {
  try {
    // Don't pass token for reading public blobs
    const index = await fetchJson<ShareIndex>(`${prefix}/index.json`);
    return ShareIndexSchema.parse(index);
  } catch {
    return { items: [] };
  }
}

export async function saveUserIndex(prefix: string, index: ShareIndex, opts?: { token?: string }) {
  await putJsonBlob(`${prefix}/index.json`, index, { token: opts?.token, allowOverwrite: true });
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
  await putJsonBlob(`/shares/_idmap/${id}.json`, entry, { token: opts?.token, allowOverwrite: true });
}

export type IdMapEntry = { blobKey: string; userBucket?: string; status?: 'active'|'revoked'; expiresAt?: string|null };

export async function loadGlobalIdMap(id: string, opts?: { token?: string }): Promise<IdMapEntry | null> {
  try {
    // Don't pass token for reading public blobs
    return await fetchJson<IdMapEntry>(`/shares/_idmap/${id}.json`);
  } catch {
    return null;
  }
}
