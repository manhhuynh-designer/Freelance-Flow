"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={cn("prose dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Tùy chỉnh các thẻ HTML nếu cần
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-4" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold my-3" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-semibold my-2" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
          em: ({node, ...props}) => <em className="italic" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside my-4 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside my-4 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="pl-2" {...props} />,
          code: ({node, className, children, ...props}) => {
            // 'inline' is not a prop, but is passed as the second argument
            // See: https://github.com/remarkjs/react-markdown#use-custom-components
            // The function signature is (props, isInline)
            // So we need to use the second argument to determine if it's inline
            return (
              <code className={cn("bg-muted text-muted-foreground p-1 rounded-md text-sm", className)} {...props}>
                {children}
              </code>
            );
          },
          table: ({node, ...props}) => <table className="table-auto w-full my-4 border-collapse border border-border" {...props} />,
          thead: ({node, ...props}) => <thead className="bg-muted" {...props} />,
          th: ({node, ...props}) => <th className="border border-border px-4 py-2 text-left font-semibold" {...props} />,
          td: ({node, ...props}) => <td className="border border-border px-4 py-2" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
