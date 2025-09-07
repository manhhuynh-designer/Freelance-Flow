"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { i18n } from '@/lib/i18n';
import { Link as LinkIcon, Copy, Trash2, ExternalLink } from 'lucide-react';

type Props = { open: boolean; onOpenChange: (v: boolean) => void };
export default function ShareManagerDialog({ open, onOpenChange }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string>('');
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

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${id}`);
      toast({ title: T.linkCopied || 'Link copied' });
    } catch {}
  };

  const deleteShare = async (id: string) => {
    try {
      const res = await fetch(`/api/share/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        let txt = '';
        try { txt = await res.text(); } catch {}
        const msg = txt || `${res.status} ${res.statusText}`;
        toast({ variant: 'destructive', title: 'Delete failed', description: msg });
        return;
      }
      // Optimistic remove for realtime UX
      setItems(prev => prev.filter(x => x.id !== id));
      toast({ title: 'Deleted' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Network error', description: e?.message || String(e) });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{T.manageSharesTitle || 'Manage Shares'}</DialogTitle>
          <DialogDescription>{T.manageSharesDesc || 'Copy links, edit, or delete'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}
          {!!error && (
            <div className="text-sm text-red-600">{error === 'Unauthorized' ? 'Please sign in to manage your shares.' : error}</div>
          )}
          {items.map((it) => {
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteShare(it.id)} title={T.delete || 'Delete'}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {(!loading && items.length === 0) ? <div className="text-sm text-muted-foreground">{T.noShares || 'No shares yet'}</div> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
