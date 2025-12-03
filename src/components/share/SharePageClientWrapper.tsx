"use client";

import React from 'react';
import ShareExportButtons from './ShareExportButtons';
import type { Task, Quote, AppSettings, Client, Category, QuoteColumn, Milestone, ColumnCalculationType } from '@/lib/types';

interface SharePageClientWrapperProps {
  task: Task;
  quote?: Quote;
  settings: AppSettings;
  clients: Client[];
  categories: Category[];
  quotePart: any;
  timelinePart: any;
  type: 'quote' | 'timeline';
  T: any;
}

export default function SharePageClientWrapper({
  task,
  quote,
  settings,
  clients,
  categories,
  quotePart,
  timelinePart,
  type,
  T,
}: SharePageClientWrapperProps) {
  const defaultColumns: QuoteColumn[] = [
    { id: 'description', name: T.description || 'Description', type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice || 'Unit Price'} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ];

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

  // Calculate calculation results
  const calculationResults = React.useMemo(() => {
    if (!quote?.sections) return [];
    
    const results: Array<{
      id: string;
      name: string;
      calculation: string;
      result: number | string;
      type: ColumnCalculationType;
    }> = [];

    (quote.columns || defaultColumns).filter(col => 
      col.calculation && col.calculation.type && col.calculation.type !== 'none' && col.type === 'number'
    ).forEach(col => {
      if (!col.calculation) return;

      const allValues = quote.sections!.flatMap((section) => 
        (section.items || []).map((item) => calculateRowValue(item, col, quote.columns || defaultColumns))
          .filter((v: number) => !isNaN(v))
      );

      let result: number | string = 0;
      let calculation = '';
      const calcType = col.calculation.type;

      switch (calcType) {
        case 'sum':
          result = allValues.reduce((a, b) => a + b, 0);
          calculation = `SUM`;
          break;
        case 'average':
          result = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
          calculation = `AVG`;
          break;
        case 'min':
          result = allValues.length > 0 ? Math.min(...allValues) : 0;
          calculation = `MIN`;
          break;
        case 'max':
          result = allValues.length > 0 ? Math.max(...allValues) : 0;
          calculation = `MAX`;
          break;
        case 'custom':
          if (col.calculation.formula) {
            try {
              const colMap: Record<string, number> = {};
              (quote.columns || defaultColumns).forEach(c => {
                if (c.type === 'number') {
                  const vals = quote.sections!.flatMap(s => 
                    (s.items || []).map(item => calculateRowValue(item, c, quote.columns || defaultColumns))
                  ).filter(v => !isNaN(v));
                  colMap[c.id] = vals.reduce((a, b) => a + b, 0);
                }
              });
              let expr = col.calculation.formula;
              Object.entries(colMap).forEach(([id, val]) => {
                expr = expr.replaceAll(id, String(val));
              });
              const evalResult = eval(expr);
              result = !isNaN(evalResult) ? Number(evalResult) : 0;
              calculation = col.calculation.formula;
            } catch {
              result = 0;
              calculation = col.calculation.formula || '';
            }
          }
          break;
        default:
          result = 0;
      }

      results.push({
        id: col.id,
        name: col.name,
        calculation,
        result,
        type: calcType
      });
    });

    return results;
  }, [quote, defaultColumns, calculateRowValue]);

  // Calculate grand total
  const grandTotal = React.useMemo(() => {
    if (!quote?.sections) return 0;
    const priceColumn = (quote.columns || defaultColumns).find(col => col.id === 'unitPrice');
    if (!priceColumn) return 0;
    return quote.sections.reduce((acc, section) => {
      return acc + (section.items?.reduce((itemAcc, item) => {
        return itemAcc + calculateRowValue(item, priceColumn, quote.columns || defaultColumns);
      }, 0) || 0);
    }, 0);
  }, [quote, defaultColumns, calculateRowValue]);

  // Extract milestones from quote or task
  const milestones = React.useMemo(() => {
    if (!quote?.sections || !quote.columns?.some(col => col.id === 'timeline')) {
      return task.milestones || [];
    }
    
    const extracted: Milestone[] = [];
    
    quote.sections.forEach((section, sectionIndex) => {
      const items = section.items || [];
      items.forEach((item, itemIndex) => {
        let timelineValue = item.customFields?.timeline;
        
        if (typeof timelineValue === 'string' && timelineValue.trim() !== '') {
          try {
            timelineValue = JSON.parse(timelineValue);
          } catch (e) {
            return;
          }
        }
        
        if (timelineValue && 
            typeof timelineValue === 'object' && 
            timelineValue !== null &&
            timelineValue.start && 
            timelineValue.end) {
          
          const sectionIdForMilestone = section.id || `section-${sectionIndex}`;
          const itemIdForMilestone = item.id || `item-${itemIndex}`;
          const milestoneId = `${sectionIdForMilestone}-${itemIdForMilestone}`;
          
          const timelineData = timelineValue as { start: string; end: string; color?: string };
          
          extracted.push({
            id: milestoneId,
            name: item.description || `${section.name || 'Section'} - Item ${itemIndex + 1}`,
            startDate: timelineData.start,
            endDate: timelineData.end,
            color: timelineData.color || `hsl(${(sectionIndex * 137.5 + itemIndex * 60) % 360}, 60%, 55%)`,
            content: `Section: ${section.name || 'Unnamed Section'}`
          });
        }
      });
    });
    
    return extracted.length > 0 ? extracted : (task.milestones || []);
  }, [quote, task.milestones]);

  return (
    <ShareExportButtons
      task={task}
      quote={quote}
      settings={settings}
      clients={clients}
      categories={categories}
      defaultColumns={quote?.columns || defaultColumns}
      calculationResults={calculationResults}
      grandTotal={grandTotal}
      milestones={milestones}
      type={type}
      viewMode={timelinePart?.viewMode || 'week'}
      timelineScale={timelinePart?.timelineScale || 1}
      T={T}
    />
  );
}
