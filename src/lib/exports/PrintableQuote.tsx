import React from 'react';
import { Quote, Task, AppSettings, Client, Category, QuoteColumn, QuoteItem, ColumnCalculationType } from "@/lib/types";
import { i18n } from "@/lib/i18n";
import { format } from "date-fns";

type Props = {
  quote: Quote;
  task: Task;
  settings: AppSettings;
  clients: Client[];
  categories: Category[];
  clientName?: string;
  categoryName?: string;
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
};

// Component UI báo giá được tối ưu cho việc xuất hình ảnh chuyên nghiệp.
export const PrintableQuote: React.FC<Props> = ({ 
  quote, 
  task, 
  settings, 
  clients, 
  categories, 
  clientName, 
  categoryName, 
  defaultColumns, 
  calculationResults, 
  calculateRowValue, 
  grandTotal 
}) => {
  const currency = settings.currency || 'USD';
  const lang = settings.language === 'vi' ? 'vi-VN' : 'en-US';
  const T = i18n[settings.language] || i18n.vi;

  // Format numbers to have 2 decimal places
  const formatNumber = (v: any) => {
    const n = Number(v) || 0;
    try {
      return n.toLocaleString(lang, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } catch {
      return String(n.toFixed(0));
    }
  };

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return '-';
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString as any);
      if (isNaN(date.getTime())) return '-';
      return format(date, "MMM dd, yyyy");
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return String(dateString);
    }
  };

  const currentClient = clients.find(c => c.id === task.clientId);
  const currentCategory = categories.find(cat => cat.id === task.categoryId);

  const getTranslationForCalculation = (calculationType: string) => {
    switch (calculationType) {
      case 'sum': return T.sum;
      case 'average': return T.average;
      case 'min': return T.min;
      case 'max': return T.max;
      case 'custom': return T.customFormula;
      default: return calculationType;
    }
  };

  const primaryColor = settings.theme?.primary || '#2563eb'; // fallback to a default blue

  const styles: { [key: string]: React.CSSProperties } = {
    container: {
        width: '2048px',
        backgroundColor: '#f1f5f9',
        fontFamily: '"Be Vietnam Pro", sans-serif',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
        lineHeight: '1.75',
        fontSize: '2rem',
        padding: '4rem'
    },
    sheet: {
        backgroundColor: '#ffffff',
        padding: '5rem',
        borderRadius: '1rem',
        border: '2px solid #e2e8f0'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '4rem',
        paddingBottom: '3rem',
        borderBottom: `4px solid ${primaryColor}`
    },
    headerMain: { flex: '1' },
    h1: { fontSize: '6rem', fontWeight: 900, color: primaryColor, marginBottom: '2rem', lineHeight: 1 },
    clientName: { fontSize: '3rem', fontWeight: 700, color: '#1e293b', marginBottom: '2rem' },
    quoteInfo: { marginTop: '2rem', fontSize: '1.875rem', color: '#475569', lineHeight: '1.5' },
    quoteInfoP: { margin: '0 0 0.5rem 0' },
    quoteInfoSpan: { fontWeight: 700, color: '#1e293b' },
    detailsBox: {
        textAlign: 'right',
        backgroundColor: '#f8fafc',
        padding: '2.5rem 2.5rem',
        borderRadius: '0.75rem',
        border: '2px solid #e2e8f0'
    },
    section: { marginBottom: '5rem' },
    h2: {
        fontSize: '3.75rem',
        fontWeight: 700,
        color: '#1e293b',
        marginBottom: '2.5rem',
        paddingBottom: '1rem',
        borderBottom: '2px solid #e2e8f0'
    },
    tableContainer: {
        overflow: 'hidden',
        borderRadius: '0.75rem',
        border: '2px solid #cbd5e1'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '1.875rem'
    },
    theadTr: { backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' },
    th: { padding: '2rem 2.5rem', fontWeight: 900, color: '#1e293b', textAlign: 'left' },
    thRight: { textAlign: 'right' },
    tbody: { backgroundColor: '#ffffff' },
    tbodyTr: { borderBottom: '1px solid #e2e8f0' },
    tbodyTrAlt: { backgroundColor: '#f8fafc' },
    td: { padding: '2rem 2.5rem', verticalAlign: 'top' },
    tdRight: { textAlign: 'right', fontWeight: 700 },
    footer: {
        marginTop: '6rem',
        paddingTop: '4rem',
        borderTop: '4px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
    },
    calcContainer: { width: '100%', maxWidth: '1200px', marginBottom: '4rem' },
    calcHeader: { fontSize: '3rem', fontWeight: 700, color: '#1e293b', marginBottom: '3rem', textAlign: 'center' },
    calcRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2.5rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.75rem',
        border: '2px solid #e2e8f0',
        marginBottom: '1rem'
    },
    calcLabel: { fontSize: '1.875rem', fontWeight: 500, color: '#334155' },
    calcValue: { fontSize: '1.875rem', fontWeight: 900, color: '#1e293b' },
    totalContainer: { width: '100%', maxWidth: '1200px' },
    totalBox: { backgroundColor: primaryColor, borderRadius: '0.75rem', padding: '3rem', color: '#ffffff', textAlign: 'center' },
    totalLabel: { fontSize: '2.25rem', fontWeight: 700, marginBottom: '1.5rem' },
    totalValueWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' },
    totalAmount: { fontSize: '4rem', fontWeight: 900 },
    totalCurrency: { fontSize: '2rem', fontWeight: 700 },
    notes: {
        marginTop: '5rem',
        paddingTop: '3rem',
        borderTop: '2px solid #e2e8f0',
        textAlign: 'center',
        fontSize: '1.875rem',
        color: '#475569',
        fontWeight: 500,
        lineHeight: 1.6
    }
  };

  return (
    <div style={styles.container}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700;900&display=swap" rel="stylesheet" />
      
      <div style={styles.sheet}>
        <div style={styles.header}>
          <div style={styles.headerMain}>
            <h1 style={styles.h1}>
              {task.name}
            </h1>
            <p style={styles.clientName}>{clientName || currentClient?.name || 'Tên Khách Hàng'}</p>
            <div style={styles.quoteInfo}>
              <p style={styles.quoteInfoP}><span style={styles.quoteInfoSpan}>Mã báo giá:</span> {quote.id || 'N/A'}</p>
              <p style={styles.quoteInfoP}><span style={styles.quoteInfoSpan}>Ngày tạo:</span> {formatDate(task.createdAt || new Date())}</p>
            </div>
          </div>
          <div style={styles.detailsBox}>
            <div style={{...styles.quoteInfo, marginTop: '0'}}>
              <p style={styles.quoteInfoP}><span style={styles.quoteInfoSpan}>{T.category || 'Danh mục'}:</span> {categoryName || currentCategory?.name || 'Chung'}</p>
              <p style={styles.quoteInfoP}><span style={styles.quoteInfoSpan}>{T.startDate}:</span> {formatDate(task.startDate)}</p>
              <p style={styles.quoteInfoP}><span style={styles.quoteInfoSpan}>{T.deadline}:</span> {formatDate(task.deadline)}</p>
            </div>
          </div>
        </div>
        {(quote.sections || []).map((section, sectionIndex) => (
          <div key={section.id || sectionIndex} style={styles.section}>
            {section.name && <h2 style={styles.h2}>{section.name}</h2>}
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadTr}>
                    {(quote.columns || defaultColumns).map(col => (
                      <th key={col.id} style={{ ...styles.th, ...(col.type === 'number' && styles.thRight) }}>
                        {col.id === "unitPrice" ? `${T.unitPrice} (${currency})` : col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={styles.tbody}>
                  {section.items.map((item, index) => (
                    <tr key={item.id || index} style={{ ...styles.tbodyTr, ...(index % 2 === 0 && styles.tbodyTrAlt) }}>
                      {(quote.columns || defaultColumns).map(col => {
                        let displayValue: string | number = '';
                        if (col.type === 'number' && col.rowFormula) {
                          displayValue = calculateRowValue(item, col, quote.columns || defaultColumns);
                        } else {
                          const value = (item as any)[col.id] !== undefined
                                ? (item as any)[col.id]
                                : item.customFields?.[col.id];
                          displayValue = value ?? '';
                        }
                        
                        let formattedValue: string = '';
                        if (col.type === 'number') {
                          formattedValue = formatNumber(displayValue);
                        } else {
                          formattedValue = String(displayValue);
                        }
                        return (
                          <td key={col.id} style={{ ...styles.td, ...(col.type === 'number' && styles.tdRight) }}>
                            {formattedValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <div style={styles.footer}>
           
          <div style={styles.totalContainer}>
            <div style={styles.totalBox}>
              <p style={styles.totalLabel}>{T.grandTotal || 'Tổng cộng'}:</p>
              <div style={styles.totalValueWrapper}>
                <p style={styles.totalAmount}>{formatNumber(grandTotal)}</p>
                <span style={styles.totalCurrency}>{currency}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={styles.notes}>
          <p>Báo giá này có hiệu lực trong 30 ngày kể từ ngày ban hành. Mọi thắc mắc xin vui lòng liên hệ.</p>
        </div>
      </div>
    </div>
  );
};

export default PrintableQuote;