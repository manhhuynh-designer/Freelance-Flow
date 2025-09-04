import React from 'react';
import ReactDOM from 'react-dom/client';
import { Task, Quote, AppSettings, Milestone, Client, Category } from '@/lib/types';
import PrintableTimeline from './PrintableTimeline';

type Params = {
  task: Task;
  quote?: Quote;
  milestones: Milestone[];
  settings: AppSettings;
  clients: Client[];
  categories: Category[];
  viewMode: 'day' | 'week' | 'month';
  timelineScale: number;
  displayDate: Date;
  fileName?: string;
};

export async function exportTimelineToClipboard({ 
  task,
  quote,
  milestones,
  settings,
  clients,
  categories,
  viewMode,
  timelineScale,
  displayDate,
  fileName
}: Params): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    const container = document.createElement('div');
    container.setAttribute('id', 'ff-timeline-print-container');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '4096px'; // Updated to 4096px
    document.body.appendChild(container);

    try {
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(PrintableTimeline, { 
        task,
        quote,
        milestones,
        settings,
        clients,
        categories,
        viewMode,
        timelineScale,
        displayDate,
        fileName
      }));

      // Allow styles and webfonts to settle
      await new Promise(r => setTimeout(r, 300));

      const html2canvas = (await import('html2canvas')).default;
      
      // Render using the actual container width (4096px) to avoid cropping
      const canvas = await html2canvas(container, {
        width: container.clientWidth || 4096,
        height: container.scrollHeight,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: false,
        windowWidth: container.clientWidth || 4096
      });

      // Try clipboard first, fallback to download
      try {
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/png', 1.0);
        });

        if (blob && navigator.clipboard && navigator.clipboard.write) {
          const clipboardItem = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([clipboardItem]);
        } else {
          // Fallback to download
          downloadImage(canvas, fileName);
        }
      } catch (clipboardError) {
        console.warn('Clipboard not supported, falling back to download:', clipboardError);
        downloadImage(canvas, fileName);
      }

      // Cleanup
      root.unmount();
      document.body.removeChild(container);
      resolve();

    } catch (err) {
      console.error('Error exporting timeline:', err);
      
      // Cleanup on error
      try {
        document.body.removeChild(container);
      } catch (cleanupErr) {
        console.error('Error during cleanup:', cleanupErr);
      }
      
      reject(err);
    }
  });
}

function downloadImage(canvas: HTMLCanvasElement, fileName?: string) {
  const link = document.createElement('a');
  link.download = fileName || `timeline-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default exportTimelineToClipboard;
