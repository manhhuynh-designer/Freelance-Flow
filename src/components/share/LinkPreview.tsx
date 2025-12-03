'use client';

import React, { useState, useEffect } from 'react';

interface LinkPreviewProps {
  url: string;
  color?: 'blue' | 'green';
}

interface LinkMetadata {
  title: string;
  favicon: string;
  domain: string;
}

export default function LinkPreview({ url, color = 'blue' }: LinkPreviewProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // Extract domain
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        
        // Try to get favicon using Google's favicon service as fallback
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        
        // Try to fetch the page to get title
        try {
          const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
          if (response.ok) {
            const data = await response.json();
            setMetadata({
              title: data.title || domain,
              favicon: data.favicon || favicon,
              domain,
            });
          } else {
            throw new Error('Failed to fetch metadata');
          }
        } catch (error) {
          // Fallback: use domain as title and Google favicon
          setMetadata({
            title: domain,
            favicon,
            domain,
          });
        }
      } catch (error) {
        // If URL parsing fails, use URL as fallback
        setMetadata({
          title: url,
          favicon: '',
          domain: url,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  const colorClasses = {
    blue: 'text-blue-600 hover:text-blue-800',
    green: 'text-green-600 hover:text-green-800',
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-4 h-4 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 text-sm ${colorClasses[color]} group`}
      title={url}
    >
      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
        {metadata?.favicon ? (
          <img 
            src={metadata.favicon} 
            alt="" 
            className="w-4 h-4 object-contain"
            onError={(e) => {
              // Fallback if favicon fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<svg class="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>`;
              }
            }}
          />
        ) : (
          <svg className="w-4 h-4 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        )}
      </div>
      <span className="truncate font-medium">{metadata?.title || url}</span>
      <svg className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
