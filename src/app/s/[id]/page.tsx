import QuoteViewer from '@/components/share/quote-viewer';
import TimelineViewer from '@/components/share/timeline-viewer';
import { i18n } from '@/lib/i18n';
import { headers } from 'next/headers';

async function getOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'http';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000';
}

async function loadShare(id: string) {
  try {
    const origin = await getOrigin();
    console.log('Share page loadShare:', { id, origin });
    
    const url = `${origin}/api/share/resolve?id=${id}`;
    console.log('Fetching share from:', url);
    
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Share-Page/1.0'
      }
    });
    
    console.log('Share fetch response:', { 
      status: res.status, 
      statusText: res.statusText,
      ok: res.ok 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Share fetch failed:', errorText);
      return null;
    }
    
    const data = await res.json();
    console.log('Share data loaded successfully:', { hasData: !!data });
    return data;
  } catch (error) {
    console.error('Error loading share:', error);
    return null;
  }
}

export default async function ShareViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log('ShareViewerPage rendering for id:', id);
  
  const data = await loadShare(id);
  
  if (!data) {
    console.log('Share data not found for id:', id);
    return (
      <div className="mx-auto max-w-3xl p-6">
        <meta name="robots" content="noindex,nofollow" />
        <h1 className="text-xl font-semibold">Link not found</h1>
        <p className="text-sm text-gray-500">This share may have been revoked or expired.</p>
        <p className="text-xs text-gray-400 mt-4">Share ID: {id}</p>
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
  const T: any = (settings?.language && (i18n as any)[settings.language]) || {};
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
              <a href="#quote" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md">{T.priceQuote || 'Quote'}</a>
            )}
            {timelinePart && (
              <a href="#timeline" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md">{(T as any).timeline || 'Timeline'}</a>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {quotePart && (
          <section id="quote">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">{T.priceQuote || 'Quote'}</h2>
            <QuoteViewer {...(quotePart as any)} showHeader={false} />
          </section>
        )}
        {timelinePart && (
          <section id="timeline">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">{(T as any).timeline || 'Timeline'}</h2>
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
