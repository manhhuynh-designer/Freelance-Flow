import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function extractMetaTag(html: string, property: string, attr: string = 'content'): string {
  const regex = new RegExp(`<meta[^>]*${property}="([^"]*)"[^>]*${attr}="([^"]*)"`, 'i');
  const match = html.match(regex);
  if (match) return match[2];
  
  const regex2 = new RegExp(`<meta[^>]*${attr}="([^"]*)"[^>]*${property}="([^"]*)"`, 'i');
  const match2 = html.match(regex2);
  if (match2) return match2[1];
  
  return '';
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : '';
}

function extractFavicon(html: string): string {
  const iconRegex = /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["']/i;
  const match = html.match(iconRegex);
  if (match) return match[1];
  
  const iconRegex2 = /<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i;
  const match2 = html.match(iconRegex2);
  if (match2) return match2[1];
  
  return '';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Fetch the page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to fetch URL');
      }

      const html = await response.text();

      // Extract metadata
      let title = extractMetaTag(html, 'property="og:title"')
               || extractMetaTag(html, 'name="twitter:title"')
               || extractTitle(html)
               || urlObj.hostname.replace('www.', '');

      title = title.trim();

      // Get favicon
      const domain = urlObj.hostname;
      let favicon = extractFavicon(html);

      // Make favicon absolute URL if it's relative
      if (favicon && !favicon.startsWith('http')) {
        if (favicon.startsWith('//')) {
          favicon = 'https:' + favicon;
        } else if (favicon.startsWith('/')) {
          favicon = `${urlObj.origin}${favicon}`;
        } else {
          favicon = `${urlObj.origin}/${favicon}`;
        }
      }

      // Fallback to Google's favicon service
      if (!favicon) {
        favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      }

      return NextResponse.json({
        title,
        favicon,
        domain,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error: any) {
    console.error('Link preview error:', error);
    
    // Return fallback data
    try {
      const urlObj = new URL(request.nextUrl.searchParams.get('url') || '');
      const domain = urlObj.hostname.replace('www.', '');
      return NextResponse.json({
        title: domain,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        domain,
      });
    } catch {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch link preview' },
        { status: 500 }
      );
    }
  }
}
