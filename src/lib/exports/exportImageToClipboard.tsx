import React from 'react';
import ReactDOM from 'react-dom/client';
import PrintableQuote from './PrintableQuote';
import type { Quote, Task, AppSettings, Client, Category, QuoteColumn, QuoteItem, ColumnCalculationType } from "@/lib/types";


type Params = {
  quote: Quote;
  task: Task;
  settings: AppSettings;
  fileName?: string;
  clients: Client[];
  categories: Category[];
  defaultColumns: QuoteColumn[];
  calculationResults: Array<{
    id: string;
    name: string;
    calculation: string;
    result: number | string;
    type: ColumnCalculationType;
  }>;
  calculateRowValue: (item: QuoteItem, column: QuoteColumn, allColumns: QuoteColumn[]) => number;
  grandTotal: number;
  hiddenColumnIds?: string[];
};

export async function exportQuoteImageToClipboard({ 
    quote, 
    task, 
    settings, 
    fileName, 
    clients, 
    categories,
    defaultColumns,
    calculationResults,
    calculateRowValue,
  grandTotal,
  hiddenColumnIds
}: Params): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    const container = document.createElement('div');
    container.setAttribute('id', 'ff-print-container');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '2048px';
    document.body.appendChild(container);

    try {
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(PrintableQuote, { 
        quote, 
        task, 
        settings, 
        clients, 
        categories,
        defaultColumns,
        calculationResults,
        calculateRowValue,
        grandTotal,
        hiddenColumnIds
      }));

      // allow styles and webfonts to settle
      await new Promise(r => setTimeout(r, 300));

      const html2canvas = (await import('html2canvas')).default;
      // Render with explicit width to ensure 2048px output and avoid cropping
      const canvas = await html2canvas(container as HTMLElement, {
        scale: 1,
        backgroundColor: '#ffffff',
        useCORS: true,
        width: 2048,
        windowWidth: 2048,
        scrollX: 0,
        scrollY: 0,
      });

      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) {
          root.unmount();
          container.remove();
          return reject(new Error('Failed to create image blob'));
        }

        const canClipboardImage = !!(navigator.clipboard && (window as any).ClipboardItem);
        const defaultFileName = fileName || `quote-${task?.id || 'export'}-${Date.now()}.png`;

        if (canClipboardImage) {
          try {
            // @ts-ignore - ClipboardItem may not be in lib dom types
            await navigator.clipboard.write([new (window as any).ClipboardItem({ 'image/png': blob })]);
            root.unmount();
            container.remove();
            return resolve();
          } catch (err) {
            // fallback to download
            try {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = defaultFileName;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
              root.unmount();
              container.remove();
              return resolve();
            } catch (e) {
              root.unmount();
              container.remove();
              return reject(e);
            }
          }
        } else {
          // fallback to download
          try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultFileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            root.unmount();
            container.remove();
            return resolve();
          } catch (e) {
            root.unmount();
            container.remove();
            return reject(e);
          }
        }
      }, 'image/png');
    } catch (err) {
      try { document.body.removeChild(container); } catch {}
      return reject(err);
    }
  });
}

export default exportQuoteImageToClipboard;
