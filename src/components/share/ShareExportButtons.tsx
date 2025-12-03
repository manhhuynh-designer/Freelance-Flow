"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Image, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import exportQuoteImageToClipboard from '@/lib/exports/exportImageToClipboard';
import exportTimelineToClipboard from '@/lib/exports/exportTimelineToClipboard';
import exportQuoteToExcel from '@/lib/exports/exportQuoteToExcel';
import exportTimelineToExcel from '@/lib/exports/exportTimelineToExcel';
import type { Task, Quote, AppSettings, Client, Category, QuoteColumn, Milestone } from '@/lib/types';

interface ShareExportButtonsProps {
  task: Task;
  quote?: Quote;
  settings: AppSettings;
  clients: Client[];
  categories: Category[];
  defaultColumns: QuoteColumn[];
  calculationResults: Array<{ id: string; name: string; calculation: string; result: number | string; type: any }>;
  grandTotal: number;
  milestones?: Milestone[];
  type: 'quote' | 'timeline';
  viewMode?: 'day' | 'week' | 'month';
  timelineScale?: number;
  T: any;
}

export default function ShareExportButtons({
  task,
  quote,
  settings,
  clients,
  categories,
  defaultColumns,
  calculationResults,
  grandTotal,
  milestones = [],
  type,
  viewMode = 'week',
  timelineScale = 1,
  T,
}: ShareExportButtonsProps) {
  const { toast } = useToast();
  const [exportingImage, setExportingImage] = React.useState(false);
  const [exportingExcel, setExportingExcel] = React.useState(false);

  // Helper function to calculate row value with formula support
  const calculateRowValue = React.useCallback((item: any, column: QuoteColumn, allColumns: QuoteColumn[]) => {
    if (column.rowFormula) {
      try {
        const rowVals: Record<string, number> = {};
        allColumns.forEach((c: any) => {
          if (c.type === 'number') {
            const val = c.id === 'unitPrice' 
              ? Number(item.unitPrice) || 0 
              : Number(item.customFields?.[c.id]) || 0;
            rowVals[c.id] = val;
          }
        });
        let expr = String(column.rowFormula);
        Object.entries(rowVals).forEach(([cid, val]) => {
          expr = expr.replaceAll(cid, String(val));
        });
        const result = eval(expr);
        return !isNaN(result) ? Number(result) : 0;
      } catch {
        return 0;
      }
    } else {
      if (column.id === 'unitPrice') {
        return Number(item.unitPrice) || 0;
      } else {
        return Number(item.customFields?.[column.id]) || 0;
      }
    }
  }, []);

  const handleExportQuoteImage = async () => {
    if (!quote) return;
    
    setExportingImage(true);
    try {
      toast({ title: T.exportPreparing || 'Preparing image...' });
      
      await exportQuoteImageToClipboard({
        quote,
        task,
        settings,
        fileName: `quote-${task.id || 'export'}.png`,
        clients,
        categories,
        defaultColumns: quote.columns || defaultColumns,
        calculationResults,
        calculateRowValue,
        grandTotal,
      });
      
      toast({ 
        title: T.exportCopied || 'Image copied to clipboard', 
        description: T.exportCopiedDesc || 'You can paste the image into an email or document.' 
      });
    } catch (err: any) {
      console.error('Export quote image failed', err);
      toast({ 
        variant: 'destructive', 
        title: T.exportFailed || 'Export failed', 
        description: err?.message || String(err) 
      });
    } finally {
      setExportingImage(false);
    }
  };

  const handleExportTimelineImage = async () => {
    setExportingImage(true);
    try {
      toast({ title: T.exportPreparing || 'Preparing timeline image...' });
      
      await exportTimelineToClipboard({
        task,
        quote,
        milestones,
        settings,
        clients,
        categories,
        viewMode,
        timelineScale,
        displayDate: new Date(),
        fileName: `timeline-${task.id || 'export'}.png`,
      });
      
      toast({ 
        title: T.exportCopied || 'Timeline image copied to clipboard', 
        description: T.exportCopiedDesc || 'You can paste the image into an email or document.' 
      });
    } catch (err: any) {
      console.error('Export timeline image failed', err);
      toast({ 
        variant: 'destructive', 
        title: T.exportFailed || 'Export failed', 
        description: err?.message || String(err) 
      });
    } finally {
      setExportingImage(false);
    }
  };

  const handleExportQuoteToExcel = async () => {
    if (!quote) return;
    
    setExportingExcel(true);
    try {
      toast({ title: T.exportPreparing || 'Preparing Excel data...' });
      
      await exportQuoteToExcel({
        quote,
        task,
        settings,
        clients,
        categories,
        defaultColumns: quote.columns || defaultColumns,
        calculationResults,
        calculateRowValue,
        grandTotal,
        T,
      });
      
      toast({ 
        title: T.exportCopiedExcel || 'Data copied to clipboard', 
        description: T.exportCopiedExcelDesc || 'You can now paste into Excel or Google Sheets.' 
      });
    } catch (err: any) {
      console.error('Export quote to Excel failed', err);
      toast({ 
        variant: 'destructive', 
        title: T.exportFailed || 'Export failed', 
        description: err?.message || String(err) 
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportTimelineToExcel = async () => {
    setExportingExcel(true);
    try {
      toast({ title: T.exportPreparing || 'Preparing Excel data...' });
      
      await exportTimelineToExcel({
        task,
        quote,
        milestones,
        settings,
        T,
      });
      
      toast({ 
        title: T.exportCopiedExcel || 'Data copied to clipboard', 
        description: T.exportCopiedExcelDesc || 'You can now paste into Excel or Google Sheets.' 
      });
    } catch (err: any) {
      console.error('Export timeline to Excel failed', err);
      toast({ 
        variant: 'destructive', 
        title: T.exportFailed || 'Export failed', 
        description: err?.message || String(err) 
      });
    } finally {
      setExportingExcel(false);
    }
  };

  if (type === 'quote') {
    return (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportQuoteImage}
          disabled={exportingImage || exportingExcel}
          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
          title={T.exportQuoteImage || 'Export Quote as Image'}
        >
          {exportingImage ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <Image className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportQuoteToExcel}
          disabled={exportingImage || exportingExcel}
          className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
          title={T.exportQuoteExcel || 'Copy Quote for Excel/Spreadsheet'}
        >
          {exportingExcel ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  if (type === 'timeline') {
    return (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportTimelineImage}
          disabled={exportingImage || exportingExcel}
          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
          title={T.exportTimelineImage || 'Export Timeline as Image'}
        >
          {exportingImage ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <Image className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportTimelineToExcel}
          disabled={exportingImage || exportingExcel}
          className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
          title={T.exportTimelineExcel || 'Copy Timeline for Excel/Spreadsheet'}
        >
          {exportingExcel ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  return null;
}
