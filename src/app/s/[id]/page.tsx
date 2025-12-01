import QuoteViewer from '@/components/share/quote-viewer';
import TimelineViewer from '@/components/share/timeline-viewer';
import { i18n } from '@/lib/i18n';
import type { Metadata } from 'next';
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

function resolveTask(snapshot: any) {
  if (!snapshot) return undefined;
  if (snapshot.kind === 'combined') {
    return snapshot.timeline?.task || snapshot.quote?.task;
  }
  return snapshot.task;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await loadShare(id);
  const snapshot: any = data?.data;
  const task = resolveTask(snapshot);
  const title = typeof task?.name === 'string' && task.name.trim().length > 0 ? task.name : (data ? 'Freelance Flow Share' : 'Share Not Found');

  return {
    title,
    openGraph: { title },
    twitter: { title },
  };
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
  const task = resolveTask(snapshot) as any;
  const settings = (snapshot as any).settings || (snapshot.kind === 'combined' ? (snapshot.timeline?.settings || snapshot.quote?.settings) : undefined);
  const T: any = (settings?.language && (i18n as any)[settings.language]) || {};
  const clients = (snapshot as any).clients || (snapshot.kind === 'combined' ? (snapshot.timeline?.clients || snapshot.quote?.clients) : undefined);
  const categories = (snapshot as any).categories || (snapshot.kind === 'combined' ? (snapshot.timeline?.categories || snapshot.quote?.categories) : undefined);
  const quotePart = snapshot.kind === 'quote' ? snapshot : (snapshot.kind === 'combined' ? snapshot.quote : undefined);
  const timelinePart = snapshot.kind === 'timeline' ? snapshot : (snapshot.kind === 'combined' ? snapshot.timeline : undefined);
  const currentClient = clients?.find((c: any) => c.id === task?.clientId);
  const currentCategory = categories?.find((cat: any) => cat.id === task?.categoryId);

  // Determine which links to show based on snapshot settings
  const showBriefLinks = quotePart?.showBriefLinks !== false || timelinePart?.showBriefLinks !== false;
  const showDriveLinks = quotePart?.showDriveLinks !== false || timelinePart?.showDriveLinks !== false;
  const hasBriefLinks = task?.briefLink && task.briefLink.length > 0;
  const hasDriveLinks = task?.driveLink && task.driveLink.length > 0;
  const shouldShowLinks = (showBriefLinks && hasBriefLinks) || (showDriveLinks && hasDriveLinks);

  return (
    <div className="min-h-screen bg-gray-50">
      <meta name="robots" content="noindex,nofollow" />
      {/* Unified Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">{task?.name || 'Project'}</h1>
          <p className="text-sm sm:text-base text-gray-600 break-words">
            {currentClient?.name && currentCategory?.name ? `${currentClient.name} • ${currentCategory.name}` : (currentClient?.name || currentCategory?.name || '')}
          </p>
        </div>
      </header>

      {/* Links Section - Right after header */}
      {shouldShowLinks && (
        <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {showBriefLinks && hasBriefLinks && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-900">{T.briefLink || 'Brief'}</h3>
                  </div>
                  <div className="space-y-2">
                    {task.briefLink.map((link: string, idx: number) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 group"
                        title={link}
                      >
                        <svg className="w-4 h-4 flex-shrink-0 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="truncate font-medium">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {showDriveLinks && hasDriveLinks && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-900">{T.driveLink || 'Storage'}</h3>
                  </div>
                  <div className="space-y-2">
                    {task.driveLink.map((link: string, idx: number) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 group"
                        title={link}
                      >
                        <svg className="w-4 h-4 flex-shrink-0 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="truncate font-medium">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto">
            {quotePart && (
              <a href="#quote" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md whitespace-nowrap">{T.priceQuote || 'Quote'}</a>
            )}
            {timelinePart && (
              <a href="#timeline" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 rounded-md whitespace-nowrap">{(T as any).timeline || 'Timeline'}</a>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-12">
        {quotePart && (
          <section id="quote" className="scroll-mt-16">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">{T.priceQuote || 'Quote'}</h2>
            <QuoteViewer {...(quotePart as any)} showHeader={false} showBriefLinks={false} showDriveLinks={false} />
          </section>
        )}
        {timelinePart && (
          <section id="timeline" className="scroll-mt-16">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">{(T as any).timeline || 'Timeline'}</h2>
            <TimelineViewer {...(timelinePart as any)} showHeader={false} embedded showBriefLinks={false} showDriveLinks={false} />
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
