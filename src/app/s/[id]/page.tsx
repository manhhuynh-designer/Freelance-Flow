import QuoteViewer from '@/components/share/quote-viewer';
import TimelineViewer from '@/components/share/timeline-viewer';
import { headers } from 'next/headers';

async function getOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'http';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000';
}

async function loadShare(id: string) {
  const origin = await getOrigin();
  const res = await fetch(`${origin}/api/share/resolve?id=${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as any;
}

export default async function ShareViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadShare(id);
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <meta name="robots" content="noindex,nofollow" />
        <h1 className="text-xl font-semibold">Link not found</h1>
        <p className="text-sm text-gray-500">This share may have been revoked or expired.</p>
      </div>
    );
  }
  const snapshot: any = data.data;
  // fire-and-forget tracking (best-effort)
  const origin = await getOrigin();
  fetch(`${origin}/api/share/trackView`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
    cache: 'no-store',
  }).catch(() => {});
  // Unified landing-style page
  const task = (snapshot.kind === 'combined' ? snapshot.timeline?.task || snapshot.quote?.task : (snapshot as any).task) as any;
  const settings = (snapshot as any).settings || (snapshot.kind === 'combined' ? (snapshot.timeline?.settings || snapshot.quote?.settings) : undefined);
  const clients = (snapshot as any).clients || (snapshot.kind === 'combined' ? (snapshot.timeline?.clients || snapshot.quote?.clients) : undefined);
  const categories = (snapshot as any).categories || (snapshot.kind === 'combined' ? (snapshot.timeline?.categories || snapshot.quote?.categories) : undefined);
  const quotePart = snapshot.kind === 'quote' ? snapshot : (snapshot.kind === 'combined' ? snapshot.quote : undefined);
  const timelinePart = snapshot.kind === 'timeline' ? snapshot : (snapshot.kind === 'combined' ? snapshot.timeline : undefined);
  const currentClient = clients?.find((c: any) => c.id === task?.clientId);
  const currentCategory = categories?.find((cat: any) => cat.id === task?.categoryId);

  return (
    <div className="min-h-screen bg-gray-50">
      <meta name="robots" content="noindex,nofollow" />
      {/* Unified Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{task?.name || 'Project'}</h1>
          <p className="text-gray-600">
            {currentClient?.name && currentCategory?.name ? `${currentClient.name} • ${currentCategory.name}` : (currentClient?.name || currentCategory?.name || '')}
          </p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            {quotePart && (
              <a href="#quote" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md">Quote</a>
            )}
            {timelinePart && (
              <a href="#timeline" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md">Timeline</a>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {quotePart && (
          <section id="quote">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Quote</h2>
            <QuoteViewer {...(quotePart as any)} showHeader={false} />
          </section>
        )}
        {timelinePart && (
          <section id="timeline">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Timeline</h2>
            <TimelineViewer {...(timelinePart as any)} showHeader={false} embedded />
          </section>
        )}
      </main>
    </div>
  );
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Unsupported content</h1>
    </div>
  );
}
