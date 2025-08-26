'use client';

import React, { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useSession } from 'next-auth/react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, Trash2, Cloud, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { emitNotification } from '@/lib/notifications';

export default function CloudBackupManager() {
  const { data: session, status } = useSession();
  const dashboard = useDashboard();
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [step, setStep] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const { toast } = useToast();

  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any | null>(null);

  const [decryptPromptOpen, setDecryptPromptOpen] = useState(false);
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [decryptPendingContent, setDecryptPendingContent] = useState<string | null>(null);
  const [decryptPendingBackupName, setDecryptPendingBackupName] = useState<string | null>(null);

  async function fetchBackups() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/backups');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const json = await res.json();
      if (json.ok) setBackups(json.backups || []);
      else setError(json.error || 'Failed to load backups');
    } catch (e: any) {
      console.error('Fetch backups error:', e);
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) fetchBackups();
  }, [session]);

  async function encryptBytes(plaintext: Uint8Array, pass: string) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const pwKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, pwKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext.buffer as ArrayBuffer);
    const combined = new Uint8Array(salt.byteLength + iv.byteLength + ct.byteLength);
    combined.set(salt, 0); combined.set(iv, salt.byteLength); combined.set(new Uint8Array(ct), salt.byteLength + iv.byteLength);
    const b64 = btoa(String.fromCharCode(...combined));
    return b64;
  }

  async function decryptToBytes(b64: string, pass: string) {
    const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ct = combined.slice(28);
    const pwKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, pwKey, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new Uint8Array(plain);
  }

  async function createBackup() {
    setLoading(true);
    setIsWorking(true);
    setStep('Preparing');
    setError(null);
    try {
      const appData = (dashboard as any).appData || {};
      const backupData = {
        tasks: appData.tasks || [],
        quotes: appData.quotes || [],
        collaboratorQuotes: appData.collaboratorQuotes || [],
        clients: appData.clients || [],
        collaborators: appData.collaborators || [],
        quoteTemplates: appData.quoteTemplates || [],
        categories: appData.categories || [],
        appSettings: appData.appSettings || {},
        notes: appData.notes || [],
        events: appData.events || [],
        workSessions: appData.workSessions || [],
        expenses: appData.expenses || [],
        fixedCosts: appData.fixedCosts || [],
        backupCreated: new Date().toISOString(),
      };

      const backupName = `backup-${new Date().toISOString().split('T')[0]}-${Date.now()}`;

      if (!passphrase) throw new Error('Please enter a passphrase to encrypt the backup');
      const jsonString = JSON.stringify(backupData);

      let payloadBytes: Uint8Array;
      setStep('Compressing');
      try {
        if (typeof CompressionStream !== 'undefined' && typeof ReadableStream !== 'undefined') {
          const enc = new TextEncoder();
          const sourceStream = new Response(enc.encode(jsonString)).body!;
          const cs = new CompressionStream('gzip');
          const compressedStream = sourceStream.pipeThrough(cs);
          const compressedBuf = await new Response(compressedStream).arrayBuffer();
          payloadBytes = new Uint8Array(compressedBuf);
        } else {
          payloadBytes = new TextEncoder().encode(jsonString);
        }
      } catch (err) {
        console.error('Compression failed, falling back to raw bytes', err);
        payloadBytes = new TextEncoder().encode(jsonString);
      }

      setStep('Encrypting');
      const encB64 = await encryptBytes(payloadBytes, passphrase);
      const payloadContent = encB64;
      const options: any = { isBase64: true, encrypted: true, contentType: 'application/octet-stream', compressed: typeof CompressionStream !== 'undefined' };

      setStep('Uploading');
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: backupName, content: payloadContent, options })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Backup API error:', text);
        throw new Error(`Backup failed: ${res.status} - ${text}`);
      }

      const json = await res.json();
      if (json.ok) {
        setStep('Done');
        await fetchBackups();
        setError(null);
        const providerLabel = json.provider || 'cloud';
        toast({ title: `Backup saved`, description: `${providerLabel}` });
        try { emitNotification({ title: `Backup saved`, body: `Provider: ${providerLabel}` }); } catch (_) {}
      } else {
        setStep(null);
        setError(json.error || 'Upload failed');
      }
    } catch (e: any) {
      console.error('Create backup error:', e);
      setStep(null);
      setError(e?.message || 'Backup creation failed');
    } finally {
      setLoading(false);
      setIsWorking(false);
      if (step === 'Done') setTimeout(() => setStep(null), 900);
    }
  }

  function restoreBackup(backup: any) {
    setSelectedBackup(backup);
    setConfirmRestoreOpen(true);
  }

  function deleteBackup(backupName: string) {
    setSelectedBackup({ name: backupName });
    setConfirmDeleteOpen(true);
  }

  async function performDelete(backupName: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/backups?name=${encodeURIComponent(backupName)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.ok) await fetchBackups();
      else setError(json.error || 'Delete failed');
    } catch (e: any) {
      console.error('Delete backup error:', e);
      setError(e?.message || 'Delete failed');
    } finally { setLoading(false); }
  }

  async function performRestore(backup: any) {
    setLoading(true);
    setIsWorking(true);
    setStep('Downloading');
    setError(null);
    try {
      const backupName = backup.name;
      const res = await fetch(`/api/backups/${encodeURIComponent(backupName)}`);
      if (!res.ok) throw new Error(`Failed to download backup: ${res.status}`);
      const backupContent = await res.text();

      try {
        const restoredData = JSON.parse(backupContent);
        if ((dashboard as any).saveAppData) {
          setStep('Restoring');
          await (dashboard as any).saveAppData(restoredData);
          setStep('Done');
          toast({ title: 'Data restored', description: 'Data restored successfully. Reloading...' });
          try { emitNotification({ title: 'Data restored', body: `Restored from ${backupName}` }); } catch(_) {}
          setTimeout(() => window.location.reload(), 500);
        } else {
          setError('Unable to restore data - dashboard not available');
        }
      } catch (parseErr) {
        setDecryptPendingContent(backupContent);
        setDecryptPendingBackupName(backupName);
        setDecryptPassphrase('');
        setDecryptPromptOpen(true);
      }
    } catch (e: any) {
      console.error('Restore backup error:', e);
      setError(e?.message || 'Restore failed');
    } finally {
      setLoading(false);
      setIsWorking(false);
      if (step === 'Done') setTimeout(() => setStep(null), 900);
    }
  }

  async function handleDecryptSubmit() {
    const b64 = decryptPendingContent;
    const backupName = decryptPendingBackupName;
    if (!b64 || !backupName) { setDecryptPromptOpen(false); return; }
    setDecryptPromptOpen(false);
    setLoading(true);
    setIsWorking(true);
    setStep('Decrypting');
    try {
      const plainBytes = await decryptToBytes(b64, decryptPassphrase);
      let decompressedBytes = plainBytes;
      try {
        const looksLikeGzip = plainBytes && plainBytes.length > 2 && plainBytes[0] === 0x1f && plainBytes[1] === 0x8b;
        if (looksLikeGzip && typeof DecompressionStream !== 'undefined') {
          setStep('Decompressing');
          const sourceStream = new Response(plainBytes).body!;
          const ds = new DecompressionStream('gzip');
          const decompressedStream = sourceStream.pipeThrough(ds);
          const ab = await new Response(decompressedStream).arrayBuffer();
          decompressedBytes = new Uint8Array(ab);
        }
      } catch (decompErr) {
        console.warn('Decompression failed or timed out, continuing with raw decrypted bytes', decompErr);
        decompressedBytes = plainBytes;
      }

      setStep('Parsing');
      const text = new TextDecoder().decode(decompressedBytes);
      const trimmed = text.trimStart();
      if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
        setStep('Unsupported backup format');
        throw new Error('Backup content is not JSON (likely a binary file). Unified restore supports JSON app-data backups only.');
      }
      const restoredData = JSON.parse(text);
      if ((dashboard as any).saveAppData) {
        setStep('Restoring');
        await (dashboard as any).saveAppData(restoredData);
        setStep('Done');
        toast({ title: 'Data restored', description: 'Data restored successfully. Reloading...' });
        try { emitNotification({ title: 'Data restored', body: `Restored from ${backupName}` }); } catch(_) {}
        setTimeout(() => window.location.reload(), 500);
      } else {
        setError('Unable to restore data - dashboard not available');
      }
    } catch (e: any) {
      console.error('Decrypt/Restore error:', e);
      setError(e?.message || 'Decrypt or restore failed');
    } finally {
      setLoading(false);
      setIsWorking(false);
      if (step === 'Done') setTimeout(() => setStep(null), 900);
    }
  }

  if (status === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" /> Cloud Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" /> Cloud Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please sign in to access cloud backup features.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" /> Cloud Backups
        </CardTitle>
        <CardDescription>
          Backup your data to the cloud and restore from previous backups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm">Passphrase:</label>
            <Input type="password" placeholder="Enter a passphrase" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="w-[240px]" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2">
              {isWorking && (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full animate-spin border-2 border-t-transparent border-gray-500" />
                  <div className="text-xs text-muted-foreground">{step || 'Working...'}</div>
                </div>
              )}
            </div>
            <Button onClick={createBackup} disabled={loading || isWorking}>
              <Upload className="w-4 h-4 mr-2" />
              Create Backup
            </Button>
            <Button variant="outline" onClick={fetchBackups} disabled={loading || isWorking}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-sm text-muted-foreground">Processing...</div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2">Available Backups ({backups.length})</h4>
          {backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cloud backups found.</p>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div key={backup.name} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{backup.name}</span>
                    {backup.encrypted && (
                      <Badge variant="destructive" className="text-xs">ENCRYPTED</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {backup.path && (
                      <a href={backup.path} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground mr-2">View</a>
                    )}
                    <Button variant="outline" size="sm" onClick={() => restoreBackup(backup)} disabled={loading}>
                      <Download className="w-4 h-4 mr-1" />
                      Restore
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteBackup(backup.name)} disabled={loading}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmRestoreOpen} onOpenChange={(open) => setConfirmRestoreOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore backup?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to restore from "{selectedBackup?.name}"? This will replace all current data.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmRestoreOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { setConfirmRestoreOpen(false); if (selectedBackup) await performRestore(selectedBackup); }}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={(open) => setConfirmDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{selectedBackup?.name}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { setConfirmDeleteOpen(false); if (selectedBackup?.name) await performDelete(selectedBackup.name); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={decryptPromptOpen} onOpenChange={(open) => setDecryptPromptOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter passphrase</AlertDialogTitle>
            <AlertDialogDescription>This backup appears encrypted. Enter your passphrase to decrypt.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-4">
            <Input type="password" placeholder="Enter passphrase" aria-label="Decrypt passphrase" value={decryptPassphrase} onChange={(e) => setDecryptPassphrase(e.target.value)} className="w-full" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDecryptPromptOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDecryptSubmit}>Decrypt</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}


