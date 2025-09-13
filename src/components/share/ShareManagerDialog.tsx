"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { i18n } from '@/lib/i18n';
import { signIn } from 'next-auth/react';
import { Link as LinkIcon, Copy, Trash2, ExternalLink } from 'lucide-react';

type Props = { open: boolean; onOpenChange: (v: boolean) => void };
export default function ShareManagerDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string>('');
  const [deletingId, setDeletingId] = React.useState<string>('');
  const [purging, setPurging] = React.useState<Array<{ id: string; title: string; url: string; startedAt: number }>>([]);
  const { toast } = useToast();
  const T = i18n.vi;
  const load = async () => {
    setLoading(true);
    try {
      setError('');
      const res = await fetch('/api/share/list', { cache: 'no-store', headers: { 'accept': 'application/json' } });
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { errorText: text }; }
      if (!res.ok) {
        const msg = (data && (data.error || data.message || data.errorText)) || `${res.status} ${res.statusText}`;
        setItems([]);
        setError(msg);
      } else {
        const rawItems: any[] = Array.isArray(data?.items) ? data.items : [];
        // Derive missing titles by resolving snapshot
        const deriveTitle = (snap: any): string => {
          try {
            if (!snap) return '';
            const s = snap.data ? snap.data : snap; // accept ShareBlob or snapshot
            if (!s) return '';
            if (s.kind === 'quote') {
              return s.task?.name || s.task?.title || s.quote?.task?.name || '';
            }
            if (s.kind === 'timeline') {
              return s.task?.name || s.task?.title || '';
            }
            if (s.kind === 'combined') {
              const fromTimeline = s.timeline?.task?.name || s.timeline?.task?.title;
              const fromQuote = s.quote?.task?.name || s.quote?.task?.title;
              return fromTimeline || fromQuote || '';
            }
            return '';
          } catch { return ''; }
        };
        const enriched = await Promise.all(
          rawItems.map(async (it) => {
            if (it.title) return it;
            try {
              const r = await fetch(`/api/share/resolve?id=${encodeURIComponent(it.id)}`, { cache: 'no-store', headers: { 'accept': 'application/json' } });
              if (!r.ok) return it;
              const blob = await r.json();
              const t = deriveTitle(blob);
              return t ? { ...it, title: t } : it;
            } catch {
              return it;
            }
          })
        );
        setItems(enriched);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    }
    setLoading(false);
  };
  React.useEffect(() => { if (open) load(); }, [open]);
  // While dialog is open, refresh periodically to avoid staleness from other tabs/actions
  React.useEffect(() => {
    if (!open) return;
    const id = setInterval(() => { load(); }, 15000); // 15s lightweight refresh
    return () => clearInterval(id);
  }, [open]);

  const handleOpenChange = React.useCallback((v: boolean) => {
    onOpenChange(v);
    if (v) {
      // Ensure fresh load right when the dialog opens
      load();
    }
  }, [onOpenChange]);

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${id}`);
      toast({ title: T.linkCopied || 'Link copied' });
    } catch {}
  };

  const deleteShare = async (id: string) => {
    try {
      if (deletingId) return;
      setDeletingId(id);
      const found = items.find(x => x.id === id);
      const capturedTitle = found?.title || found?.taskName || 'Untitled';
      const capturedUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${id}`;
      // Optimistically hide from list immediately to avoid duplication with purging section
      setItems(prev => prev.filter(x => x.id !== id));
      const res = await fetch(`/api/share/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 401) {
        let txt = '';
        try { txt = await res.text(); } catch {}
        const msg = txt || `${res.status} ${res.statusText}`;
        toast({ variant: 'destructive', title: 'Không xoá được liên kết', description: 'Vui lòng thử lại.' });
        // Reload to restore item if server-side delete failed
        load();
        setDeletingId('');
        return;
      }
      // Show a purging state for up to ~1 minute while CDN cache clears
      setPurging(prev => {
        const next = [...prev, { id, title: capturedTitle, url: capturedUrl, startedAt: Date.now() }];
        // Auto-hide after 65s
        setTimeout(() => {
          setPurging(curr => curr.filter(p => p.id !== id));
        }, 65000);
        return next;
      });
      // Silent refresh in background (avoid flicker); no need to block UX
      load();
      toast({ title: 'Đã xoá liên kết', description: 'Có thể mất một chút thời gian để biến mất hoàn toàn.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Lỗi mạng', description: 'Vui lòng kiểm tra kết nối và thử lại.' });
    } finally {
      setTimeout(() => setDeletingId(''), 100);
    }
  };
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{T.manageSharesTitle || 'Manage Shares'}</DialogTitle>
          <DialogDescription>{T.manageSharesDesc || 'Copy links, edit, or delete'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}
          {!!error && (
            <div className="text-sm text-red-600 flex items-center gap-2">
              <span>{error === 'Unauthorized' ? 'Please sign in to manage your shares.' : error}</span>
              {error === 'Unauthorized' ? (
                <Button variant="outline" size="sm" onClick={() => signIn()}>
                  Sign in
                </Button>
              ) : null}
            </div>
          )}
          {purging.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Liên kết vừa xoá</div>
              {purging.map(p => (
                <div key={p.id} className="border rounded p-2 flex items-center gap-3 opacity-60 animate-pulse">
                  <div className="flex items-center justify-center w-7 h-7 rounded bg-muted text-muted-foreground flex-shrink-0">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-[10px] text-muted-foreground">Đang xử lý xoá, có thể mất một chút thời gian.</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setPurging(prev => prev.filter(x => x.id !== p.id))}>Ẩn</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {items
            .filter((it) => !purging.some(p => p.id === it.id) && it.id !== deletingId)
            .map((it) => {
            const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${it.id}`;
            const title = it.title || it.taskName || 'Untitled';
            return (
              <div key={it.id} className="border rounded p-2 flex items-center gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-primary/10 text-primary flex-shrink-0">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{title}</div>
                  <a href={url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1 truncate">
                    {url}
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(it.id)} title={T.copy || 'Copy'}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteShare(it.id)} title={T.delete || 'Delete'} disabled={deletingId === it.id}>
                    {deletingId === it.id ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
          {(!loading && items.filter((it) => !purging.some(p => p.id === it.id) && it.id !== deletingId).length === 0) ? (
            <div className="text-sm text-muted-foreground">{T.noShares || 'Chưa có liên kết'}</div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
