// Minimal cloud-storage adapter (local-first fallback)
// Exports: listBackups(userId), uploadBackup(userId, name, content), deleteBackup(userId, name)
// This keeps the app local-first and avoids external provider setup during development.

import fs from 'fs';
import path from 'path';

const BACKUP_ROOT = path.join(process.cwd(), 'data', 'backups');

function ensureUserDir(userId: string) {
  const dir = path.join(BACKUP_ROOT, encodeURIComponent(userId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Local FS adapter (default)
async function localListBackups(userId: string) {
  const dir = ensureUserDir(userId);
  const files = fs.readdirSync(dir).filter(f => !f.endsWith('.meta.json'));
  const results: any[] = [];
  for (const f of files) {
    const filePath = path.join(dir, f);
    // read sidecar metadata if present
    let meta: any = null;
    try {
      const metaPath = `${filePath}.meta.json`;
      if (fs.existsSync(metaPath)) {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      }
    } catch (e) {
      // ignore meta read errors
    }
    results.push({ name: f, path: filePath, provider: 'local', encrypted: !!(meta && meta.encrypted), contentType: meta?.contentType || null, compressed: !!(meta && meta.compressed), isBase64: !!(meta && meta.isBase64) });
  }
  return results;
}

async function localUploadBackup(userId: string, name: string, content: string, options: any = {}) {
  const dir = ensureUserDir(userId);
  const ext = options.format === 'excel' || options.contentType?.includes('spreadsheet') ? '.xlsx' : '.json';
  const filePath = path.join(dir, `${name}${ext}`);
  if (options.isBase64) {
    // decode base64 and write binary
  const buffer = Buffer.from(content, 'base64') as any;
  fs.writeFileSync(filePath, buffer);
  } else {
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf-8');
  }
  // write metadata sidecar with encryption/compression flags
  try {
    const meta = { encrypted: !!options.encrypted, contentType: options.contentType || (options.isBase64 ? 'application/octet-stream' : 'application/json'), isBase64: !!options.isBase64, compressed: !!options.compressed };
    fs.writeFileSync(`${filePath}.meta.json`, JSON.stringify(meta, null, 2), 'utf-8');
  } catch (e) {
    // ignore
  }
  return { name: `${name}${ext}`, path: filePath };
}

async function localDeleteBackup(userId: string, name: string) {
  const dir = ensureUserDir(userId);
  const filePath = path.join(dir, name);
  if (!fs.existsSync(filePath)) throw new Error('Not found');
  fs.unlinkSync(filePath);
  return true;
}

async function localDownloadBackup(userId: string, name: string) {
  const dir = ensureUserDir(userId);
  const filePath = path.join(dir, name);
  if (!fs.existsSync(filePath)) throw new Error('Backup not found');
  // read metadata to decide return format
  let meta: any = null;
  try {
    const metaPath = `${filePath}.meta.json`;
    if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch (e) { /* ignore */ }

  const buffer = fs.readFileSync(filePath);
  // if binary/base64 or encrypted, return base64 string so client can decrypt
  if (meta?.isBase64 || meta?.encrypted || (meta?.contentType && !meta.contentType.startsWith('text') && !meta.contentType.includes('json'))) {
    return buffer.toString('base64');
  }
  return buffer.toString('utf-8');
}

// Adapter selector: supports CLOUD_PROVIDER=vercel.
// If a Vercel blob token is provided in .env.local (BLOB_READ_WRITE_TOKEN),
// automatically prefer the vercel adapter in local development.
const provider = (process.env.CLOUD_PROVIDER || (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel' : 'local')).toLowerCase();

let vercelAdapter: any = null;
if (provider === 'vercel') {
  try {
    // lazy import the vercel adapter
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    vercelAdapter = require('./cloud-storage/vercel-blob').default;
  } catch (e) {
    // Keep vercelAdapter null if it's not available; we'll fall back to local
    vercelAdapter = null;
  }
}

export async function listBackups(userId: string) {
  if (provider === 'vercel' && vercelAdapter) {
    try {
      console.log('[cloud-storage] using vercel adapter for listBackups');
      const res = await vercelAdapter.listBackups(userId);
      return (res || []).map((r: any) => ({ ...r, provider: 'vercel' }));
    } catch (e) {
      console.warn('[cloud-storage] vercel list failed, falling back to local', e);
    }
  }
  console.log('[cloud-storage] using local adapter for listBackups');
  return localListBackups(userId);
}

export async function uploadBackup(userId: string, name: string, content: string, options: any = {}) {
  if (provider === 'vercel' && vercelAdapter) {
    try {
    console.log('[cloud-storage] attempting vercel.uploadBackup', { userId, name });
    const res = await vercelAdapter.uploadBackup(userId, name, content, options);
    // Trim to latest 5 backups
    try {
      const all = await vercelAdapter.listBackups(userId);
      const sorted = (all || []).sort((a: any, b: any) => {
        return (new Date(b.createdAt || b.timestamp || 0) as any) - (new Date(a.createdAt || a.timestamp || 0) as any);
      });
      const toDelete = sorted.slice(5);
      for (const d of toDelete) {
        try { await vercelAdapter.deleteBackup(userId, d.name); } catch (e) { /* ignore */ }
      }
    } catch (e) { console.warn('[cloud-storage] trimming vercel backups failed', e); }
    return { ...(res || {}), provider: 'vercel' };
    } catch (error) {
    console.warn('[cloud-storage] vercel upload failed, falling back to local:', error);
      // Fallback to local if vercel fails
    const localRes = await localUploadBackup(userId, name, content, options);
    // trim local backups after fallback
    try {
      const dir = ensureUserDir(userId);
      const files = fs.readdirSync(dir).filter(f => !f.endsWith('.meta.json')).map(f => ({ f, mtime: fs.statSync(path.join(dir, f)).mtime.getTime() })).sort((a, b) => b.mtime - a.mtime);
      const toRemove = files.slice(5);
      for (const r of toRemove) {
        try { fs.unlinkSync(path.join(dir, r.f)); } catch (e) {}
      }
    } catch (e) { console.warn('[cloud-storage] trimming local backups failed', e); }
    return { ...(localRes || {}), provider: 'local' };
    }
  }
  console.log('[cloud-storage] using local uploadBackup');
  const res = await localUploadBackup(userId, name, content, options);
  // trim local backups to 5 most recent
  try {
    const dir = ensureUserDir(userId);
    const files = fs.readdirSync(dir).filter(f => !f.endsWith('.meta.json')).map(f => ({ f, mtime: fs.statSync(path.join(dir, f)).mtime.getTime() })).sort((a, b) => b.mtime - a.mtime);
    const toRemove = files.slice(5);
    for (const r of toRemove) {
      try { fs.unlinkSync(path.join(dir, r.f)); } catch (e) {}
    }
  } catch (e) { console.warn('[cloud-storage] trimming local backups failed', e); }
  return { ...(res || {}), provider: 'local' };
}

export async function deleteBackup(userId: string, name: string) {
  if (provider === 'vercel' && vercelAdapter) {
    try {
    console.log('[cloud-storage] attempting vercel.deleteBackup', { userId, name });
      return await vercelAdapter.deleteBackup(userId, name);
    } catch (error) {
    console.warn('[cloud-storage] vercel delete failed, falling back to local:', error);
    return localDeleteBackup(userId, name);
    }
  }
  console.log('[cloud-storage] using local deleteBackup');
  return localDeleteBackup(userId, name);
}

export async function downloadBackup(userId: string, name: string) {
  if (provider === 'vercel' && vercelAdapter) {
    try {
    console.log('[cloud-storage] attempting vercel.downloadBackup', { userId, name });
      return await vercelAdapter.downloadBackup(userId, name);
    } catch (error) {
    console.warn('[cloud-storage] vercel download failed, falling back to local:', error);
    return localDownloadBackup(userId, name);
    }
  }
  console.log('[cloud-storage] using local downloadBackup');
  return localDownloadBackup(userId, name);
}

export default { listBackups, uploadBackup, deleteBackup, downloadBackup };
