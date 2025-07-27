import React, { useState, useEffect } from 'react';
import { Skeleton } from './skeleton';
import { Globe } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
}

interface LinkData {
  title: string;
  favicon: string | null;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [data, setData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // NOTE: Using a CORS proxy. This is for demonstration purposes.
        // For a production app, you should use your own server-side endpoint to fetch metadata.
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch');
        }
        const text = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const title = doc.querySelector('title')?.textContent || url;
        
        let favicon = doc.querySelector<HTMLLinkElement>('link[rel="icon"]')?.href || 
                      doc.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]')?.href;

        if (favicon) {
            // Convert relative URL to absolute
            try {
                favicon = new URL(favicon, url).href;
            } catch(e) {
                // If it's an invalid URL, fall back to default
                 favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
            }
        } else {
            // Fallback to Google's favicon service if not found
             favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
        }

        setData({ title, favicon });

      } catch (error) {
        console.error("Failed to fetch link preview:", error);
        // Fallback to URL display on error
        setData({ title: url, favicon: null });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  if (loading) {
    return (
        <div className="flex items-center gap-2 p-2 border rounded-md">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/50 transition-colors">
       {data?.favicon ? (
           <img src={data.favicon} alt="favicon" className="h-5 w-5" />
       ) : (
           <Globe className="h-5 w-5 text-muted-foreground" />
       )}
      <span className="text-sm font-medium truncate flex-1">{data?.title || url}</span>
    </a>
  );
};

export default LinkPreview;