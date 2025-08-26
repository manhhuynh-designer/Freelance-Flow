
// Vercel Blob SDK
import { put, del, list } from '@vercel/blob';

export async function uploadBackup(userId: string, name: string, content: string, options: any = {}) {
  const ext = options.format === 'excel' || (options.contentType || '').includes('spreadsheet') ? '.xlsx' : '.json';
  const filename = `${userId}/${name}${ext}`;
  let body: any = content;
  if (options.isBase64) {
    body = Buffer.from(content, 'base64') as any;
  }
  const blob = await put(filename, body, {
    access: 'public',
    contentType: options.contentType || (options.isBase64 ? 'application/octet-stream' : 'application/json')
  });
  // Store metadata in blob metadata if SDK supports it - fallback included
  return { name: `${name}${ext}`, path: blob.url, provider: 'vercel', isBase64: !!options.isBase64, encrypted: !!options.encrypted, compressed: !!options.compressed };
}

export async function listBackups(userId: string) {
  const result = await list({ prefix: `${userId}/` });
  return result.blobs.map((blob: any) => ({
    name: blob.pathname.split('/').pop() || blob.pathname,
  path: blob.url,
  provider: 'vercel',
  createdAt: blob.createdAt || blob.updatedAt || blob.lastModified || null,
  timestamp: blob.createdAt || blob.updatedAt || blob.lastModified || null,
  // best-effort flags (may be undefined depending on provider metadata)
  isBase64: blob.isBase64 || false,
  encrypted: blob.encrypted || false,
  compressed: blob.compressed || false,
  }));
}

export async function deleteBackup(userId: string, name: string) {
  const pathname = `${userId}/${name}`;
  await del(pathname);
  return true;
}

export async function downloadBackup(userId: string, name: string) {
  const result = await list({ prefix: `${userId}/` });
  const blob = result.blobs.find((b: any) => b.pathname.split('/').pop() === name);
  if (!blob) throw new Error('Backup not found');
  const response = await fetch(blob.url);
  if (!response.ok) throw new Error(`Download error: ${response.status}`);
  // If blob is binary, return base64 for client to decode/decrypt
  const arrayBuffer = await response.arrayBuffer();
  const isBinary = true; // treat as binary so UI can decrypt/decompress as needed
  if (isBinary) {
    const b64 = Buffer.from(arrayBuffer).toString('base64');
    return b64;
  }
  return await response.text();
}

export default { listBackups, uploadBackup, deleteBackup, downloadBackup };
