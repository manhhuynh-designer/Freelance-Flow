import type { Task, Quote, AppSettings, Client, Category, QuoteColumn } from '@/lib/types';

interface ExportQuoteToExcelParams {
  quote: Quote;
  task: Task;
  settings: AppSettings;
  clients: Client[];
  categories: Category[];
  defaultColumns: QuoteColumn[];
  calculationResults: Array<{ id: string; name: string; calculation: string; result: number | string; type: any }>;
  calculateRowValue: (item: any, column: QuoteColumn, allColumns: QuoteColumn[]) => number;
  grandTotal: number;
  T: any;
}

export async function exportQuoteToExcel({
  quote,
  task,
  settings,
  clients,
  categories,
  defaultColumns,
  calculationResults,
  calculateRowValue,
  grandTotal,
  T,
}: ExportQuoteToExcelParams): Promise<void> {
  const columns = quote.columns || defaultColumns;
  let excelText = '';

  // Header information
  excelText += `${T.taskName || 'Task'}\t${task.name}\n`;
  
  if (task.clientId) {
    const client = clients.find(c => c.id === task.clientId);
    if (client) {
      excelText += `${T.client || 'Client'}\t${client.name}\n`;
    }
  }
  
  if (task.categoryId) {
    const category = categories.find(c => c.id === task.categoryId);
    if (category) {
      excelText += `${T.category || 'Category'}\t${category.name}\n`;
    }
  }

  excelText += '\n';

  // Each section
  (quote.sections || []).forEach((section, sectionIdx) => {
    // Section name
    if (section.name) {
      excelText += `${section.name}\n`;
    }

    // Column headers
    const headers = columns.map(col => col.name).join('\t');
    excelText += `${headers}\n`;

    // Items
    section.items.forEach(item => {
      const row = columns.map(col => {
        let value: any;
        
        if (col.id === 'description') {
          value = item.description || '';
        } else if (col.id === 'quantity') {
          value = item.quantity ?? '';
        } else if (col.id === 'unitPrice') {
          value = item.unitPrice ?? '';
        } else if (col.id === 'timeline') {
          // Special handling for timeline column
          const timelineData = item.customFields?.[col.id];
          if (timelineData) {
            try {
              // Parse if it's a JSON string
              const parsed = typeof timelineData === 'string' ? JSON.parse(timelineData) : timelineData;
              
              if (parsed && typeof parsed === 'object' && parsed.start && parsed.end) {
                // Format dates
                const startDate = new Date(parsed.start);
                const endDate = new Date(parsed.end);
                
                const formatDate = (date: Date) => {
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = date.getFullYear();
                  return settings.language === 'vi' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
                };
                
                value = `${formatDate(startDate)} - ${formatDate(endDate)}`;
              } else {
                value = '';
              }
            } catch (e) {
              // If parsing fails, just use empty string
              value = '';
            }
          } else {
            value = '';
          }
        } else {
          value = item.customFields?.[col.id] ?? '';
        }

        // For number columns, calculate with formula if present
        if (col.type === 'number' && col.rowFormula) {
          const calculated = calculateRowValue(item, col, columns);
          return calculated.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
        }

        // Format numbers
        if (typeof value === 'number') {
          return value.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
        }

        // Replace newlines with spaces for text
        return String(value).replace(/\n/g, ' ').replace(/\t/g, ' ');
      });

      excelText += `${row.join('\t')}\n`;
    });

    // Section total if needed
    if (section.items.length > 0) {
      const sectionTotal = section.items.reduce((sum, item) => {
        const priceCol = columns.find(c => c.id === 'unitPrice');
        if (priceCol) {
          return sum + calculateRowValue(item, priceCol, columns);
        }
        return sum + (item.unitPrice || 0);
      }, 0);

      const totalRow = columns.map((col, idx) => {
        if (idx === columns.length - 2) {
          return T.subtotal || 'Subtotal';
        } else if (idx === columns.length - 1) {
          return sectionTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
        }
        return '';
      });

      excelText += `${totalRow.join('\t')}\n`;
    }

    excelText += '\n';
  });

  // Calculation results
  if (calculationResults && calculationResults.length > 0) {
    calculationResults.forEach(calc => {
      const emptyColumns = Array(Math.max(0, columns.length - 2)).fill('');
      const resultValue = typeof calc.result === 'number' 
        ? calc.result.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')
        : calc.result;
      excelText += `${[...emptyColumns, calc.name, resultValue].join('\t')}\n`;
    });
    excelText += '\n';
  }

  // Grand total
  const emptyColumns = Array(Math.max(0, columns.length - 2)).fill('');
  const grandTotalFormatted = grandTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
  excelText += `${[...emptyColumns, T.grandTotal || 'Grand Total', `${grandTotalFormatted} ${settings.currency}`].join('\t')}\n`;

  // Copy to clipboard
  await navigator.clipboard.writeText(excelText.trim());
}

export default exportQuoteToExcel;
