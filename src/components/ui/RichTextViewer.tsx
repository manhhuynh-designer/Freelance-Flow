"use client";

import React from 'react';
import { cn } from '@/lib/utils';

type RichTextViewerProps = {
  content: string;
  className?: string;
};

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  // Use a client-side effect to prevent React hydration errors
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }
  
  const createMarkup = (htmlString: string) => ({ __html: htmlString });

  return (
    <div
      className={cn("tiptap-rendered-content", className)}
      dangerouslySetInnerHTML={createMarkup(content)}
    />
  );
}