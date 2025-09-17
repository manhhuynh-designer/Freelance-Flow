import React from 'react';
import { AppSettings, Category, Client, Quote, QuoteColumn, QuoteItem, Task } from '@/lib/types';
import { i18n } from '@/lib/i18n';

type Props = {
  quote: Quote;
  task: Task;
  settings: AppSettings;
  clients: Client[];
  categories: Category[];
  clientName?: string;
  categoryName?: string;
  defaultColumns?: QuoteColumn[];
  calculationResults?: Array<{ id: string; name: string; calculation: string; result: number | string }>;
  grandTotal?: number;
  showHeader?: boolean;
};

function calcRowValue(item: QuoteItem, column: QuoteColumn, allColumns: QuoteColumn[]) {
  if (!column) return 0;
  if (column.rowFormula) {
    try {
      const rowVals: Record<string, number> = {};
      (allColumns || []).forEach((c: any) => {
        if (c.type === 'number') {
          const val = c.id === 'unitPrice' ? Number((item as any).unitPrice) || 0 : Number((item as any).customFields?.[c.id]) || 0;
          rowVals[c.id] = val;
        }
      });
      let expr = String(column.rowFormula);
      Object.entries(rowVals).forEach(([cid, val]) => { expr = expr.replaceAll(cid, String(val)); });
      const result = eval(expr);
      return !isNaN(result) ? Number(result) : 0;
    } catch { return 0; }
  }
  if (column.id === 'unitPrice') return Number((item as any).unitPrice) || 0;
  return Number((item as any).customFields?.[column.id]) || 0;
}

export default function QuoteViewer(props: Props) {
  const { quote, task, settings, clients, categories, clientName, categoryName, defaultColumns = [], calculationResults = [], grandTotal, showHeader = true } = props;
  const T = { ...(i18n[settings.language] || {}), unitPrice: (i18n[settings.language] as any)?.unitPrice || 'Unit Price', grandTotal: (i18n[settings.language] as any)?.grandTotal || 'Grand Total' } as any;

  const cols = quote.columns && quote.columns.length > 0 ? quote.columns : defaultColumns;
  const sections = (quote.sections || []).map((s, idx) => ({
    id: s.id || `section-${idx}`,
    name: s.name || `Section ${idx + 1}`,
    items: (s.items || []) as QuoteItem[],
  }));
  const currentClient = clients.find(c => c.id === task.clientId);
  const currentCategory = categories.find(cat => cat.id === task.categoryId);

  const currency = settings.currency || 'USD';

  // Calculate grand total if not provided
  const allItems: QuoteItem[] = sections.flatMap(s => s.items);
  const calculatedGrandTotal = grandTotal ?? allItems.reduce((total, item) => {
    const priceCol = cols.find(col => col.id === 'unitPrice');
    if (priceCol) {
      return total + calcRowValue(item as any, priceCol, cols);
    }
    return total;
  }, 0);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      {showHeader && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 break-words">{task.name || 'Quote'}</h1>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
            <div><span className="text-gray-500">{(T as any).quoteCode || 'Quote ID'}:</span> <span className="font-medium">{quote.id || '—'}</span></div>
            <div><span className="text-gray-500">{(T as any).startDate || 'Start'}:</span> <span className="font-medium">{task.startDate ? new Date(task.startDate).toLocaleDateString() : '—'}</span></div>
            <div><span className="text-gray-500">{(T as any).deadline || 'Deadline'}:</span> <span className="font-medium">{task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}</span></div>
          </div>
        </div>
      )}

      {sections.some(s => s.items.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {cols.map(col => (
                  <th key={col.id} className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 ${col.type === 'number' ? 'text-right' : ''}`}>
                    {col.id === 'unitPrice' ? `${T.unitPrice} (${currency})` : col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sections.map((section, sIdx) => (
                <React.Fragment key={section.id}>
                  <tr>
                    <td colSpan={cols.length} className="px-6 py-2 bg-gray-50 text-sm font-semibold text-gray-700">
                      {section.name}
                    </td>
                  </tr>
                  {section.items.length === 0 && (
                    <tr>
                      <td colSpan={cols.length} className="px-6 py-3 text-sm text-gray-500">{(T as any).noItemsInSection || 'No items in this section.'}</td>
                    </tr>
                  )}
                  {section.items.map((item, index) => (
                    <tr key={item.id || `${section.id}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {cols.map(col => {
                    let value: any = '';
                    let displayValue: string = '';
                    
                    if (col.type === 'number') {
                      value = calcRowValue(item as any, col, cols);
                      displayValue = typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value);
                    } else if (col.id === 'timeline') {
                      // Special handling for timeline column - parse JSON and format dates
                      value = (item as any)[col.id] ?? (item as any).customFields?.[col.id] ?? '';
                      
                      if (typeof value === 'string' && value.trim() !== '') {
                        try {
                          const timelineData = JSON.parse(value);
                          if (timelineData && typeof timelineData === 'object' && 
                              timelineData.start && timelineData.end) {
                            const start = new Date(timelineData.start);
                            const end = new Date(timelineData.end);
                            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                              displayValue = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
                            } else {
                              displayValue = (T as any).invalidDates || 'Invalid dates';
                            }
                          } else {
                            displayValue = (T as any).noTimeline || 'No timeline set';
                          }
                        } catch (e) {
                          displayValue = (T as any).invalidTimelineData || 'Invalid timeline data';
                        }
                      } else if (typeof value === 'object' && value !== null && value.start && value.end) {
                        // Handle case where value is already an object
                        try {
                          const start = new Date(value.start);
                          const end = new Date(value.end);
                          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                            displayValue = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
                          } else {
                            displayValue = (T as any).invalidDates || 'Invalid dates';
                          }
                        } catch (e) {
                          displayValue = (T as any).invalidDates || 'Invalid dates';
                        }
                      } else {
                        displayValue = (T as any).noTimeline || 'No timeline set';
                      }
                    } else {
                      value = (item as any)[col.id] ?? (item as any).customFields?.[col.id] ?? '';
                      displayValue = String(value);
                    }
                    
                        return (
                          <td key={col.id} className={`px-6 py-4 text-sm text-gray-900 ${col.type === 'number' ? 'text-right font-medium' : ''}`}>
                            {displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

  {!sections.some(s => s.items.length > 0) && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 mb-6">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-1">{(T as any).noQuoteItems || 'No Quote Items'}</h3>
          <p className="text-gray-500">{(T as any).noQuoteItemsDesc || 'No items have been added to this quote yet.'}</p>
        </div>
      )}

      {(calculationResults && calculationResults.length > 0) && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {calculationResults.filter(c => c.id !== 'unitPrice' && !c.name.toLowerCase().includes('price')).map(c => (
            <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500 font-medium">{c.name}</div>
              <div className="text-lg font-semibold text-gray-900 mt-1">{typeof c.result === 'number' ? c.result.toLocaleString() : c.result}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">{T.grandTotal}</div>
          <div className="text-3xl font-bold">
            {calculatedGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
          </div>
        </div>
      </div>
    </div>
  );
}
