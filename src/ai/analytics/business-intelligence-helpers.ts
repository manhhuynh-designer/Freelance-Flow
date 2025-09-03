// File mới: src/ai/analytics/business-intelligence-helpers.ts
import type { AppData, Task, Quote, CollaboratorQuote, Client, QuoteColumn } from '@/lib/types';
import { DateRange } from 'react-day-picker';
import { i18n } from '@/lib/i18n';
import { analyzeBusinessAction } from '@/app/actions/ai-actions';

// Helper: derive the "paid date" for a main quote.
// Priority: explicit quote.paidDate -> earliest paid payment.date -> undefined
function getMainQuotePaidDate(q?: Quote): string | undefined {
  if (!q) return undefined;
  const anyQ = q as any;
  if (anyQ.paidDate) return anyQ.paidDate as string;
  const pays = anyQ.payments as any[] | undefined;
  if (Array.isArray(pays) && pays.length > 0) {
    const paid = pays
      .filter(p => p && p.status === 'paid' && p.date)
      .map(p => new Date(p.date as string).getTime())
      .sort((a, b) => a - b);
    if (paid.length > 0) return new Date(paid[0]).toISOString();
  }
  return undefined;
}

// --- STAGE 1: LOCAL CALCULATION HELPERS ---

/**
 * Tính toán các chỉ số tài chính cốt lõi: Doanh thu, Chi phí, và Lợi nhuận
 * Dựa trên các giao dịch đã được thanh toán trong khoảng thời gian đã chọn.
 */
export function calculateFinancialSummary(appData: AppData, dateRange: { from?: Date; to?: Date }) {
  // Helper: safe date parsing
  const toDate = (d?: string | Date) => (d ? new Date(d) : undefined);
  const inRange = (d?: string | Date) => {
    const dt = toDate(d);
    if (!dt) return false;
    const from = dateRange.from ? new Date(dateRange.from) : undefined;
    const to = dateRange.to ? new Date(dateRange.to) : undefined;
    
    // Normalize dates to start/end of day for proper comparison
    if (from) {
      from.setHours(0, 0, 0, 0);
    }
    if (to) {
      to.setHours(23, 59, 59, 999);
    }
    
    // Normalize check date to ignore time
    const checkDate = new Date(dt);
    checkDate.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
    
    console.log(`📊 FinancialSummary inRange: ${d} -> ${checkDate.toISOString()} vs [${from?.toISOString()} to ${to?.toISOString()}]`);
    
    if (from && checkDate < from) {
      console.log(`   ❌ Before range start`);
      return false;
    }
    if (to && checkDate > to) {
      console.log(`   ❌ After range end`);
      return false;
    }
    console.log(`   ✅ In range`);
    return true;
  };

  // For this summary, prioritize payment dates; fallback to task deadline only when missing
  const tasksAll = (appData.tasks || []).filter(t => !t?.deletedAt && t?.status !== 'archived');

  // Index helpers for quick lookups
    const quoteById = new Map<string, Quote>((appData.quotes || []).map(q => [q.id, q]));
    const collabQuoteById = new Map<string, CollaboratorQuote>((appData.collaboratorQuotes || []).map(cq => [cq.id, cq]));

  // Compute quote totals exactly like TaskDetailsDialog (unitPrice with rowFormula support)
  const calcRowVal = (item: any, column: QuoteColumn, allCols: QuoteColumn[]): number => {
    try {
      if (column.rowFormula) {
        const rowVals: Record<string, number> = {};
        allCols.forEach(c => {
          if (c.type === 'number' && c.id !== column.id) {
            const val = c.id === 'unitPrice' ? Number(item.unitPrice) || 0 : Number(item.customFields?.[c.id]) || 0;
            rowVals[c.id] = val;
          }
        });
        let expr = column.rowFormula;
        Object.entries(rowVals).forEach(([cid, val]) => { expr = expr.replaceAll(cid, String(val)); });
        // eslint-disable-next-line no-eval
        const result = eval(expr);
        return !isNaN(result) ? Number(result) : 0;
      }
      if (column.id === 'unitPrice') return Number(item.unitPrice) || 0;
      return Number(item.customFields?.[column.id]) || 0;
    } catch { return 0; }
  };

  const computeQuoteTotal = (q?: Quote): number => {
    if (!q?.sections) return 0;
    const cols = (q.columns || [{ id: 'description', name: 'Description', type: 'text' }, { id: 'unitPrice', name: 'Unit Price', type: 'number', calculation: { type: 'sum' } }] as QuoteColumn[]);
    const unitCol = cols.find(c => c.id === 'unitPrice');
    if (!unitCol) return 0;
    return q.sections.reduce((acc, sec) => acc + (sec.items?.reduce((ia, it) => ia + calcRowVal(it, unitCol, cols), 0) || 0), 0);
  };

  const computeCollabQuoteTotal = (cq?: CollaboratorQuote): number => {
    if (!cq) return 0;
    if (!cq.sections || cq.sections.length === 0) {
      return (cq as any)?.total || 0;
    }
    const cols = (cq.columns || [{ id: 'description', name: 'Description', type: 'text' }, { id: 'unitPrice', name: 'Unit Price', type: 'number', calculation: { type: 'sum' } }] as QuoteColumn[]);
    const unitCol = cols.find(c => c.id === 'unitPrice');
    if (!unitCol) return (cq as any)?.total || 0;
    const computed = cq.sections.reduce((acc, sec) => acc + (sec.items?.reduce((ia, it) => ia + calcRowVal(it, unitCol, cols), 0) || 0), 0);
    // Fallback to stored total if computed is 0 (e.g., custom columns without unitPrice)
    return computed > 0 ? computed : ((cq as any)?.total || 0);
  };

  // Sum only PAID payments that fall within the selected date range.
  // If a payment has no explicit date, fallback to quote.paidDate; if still missing, caller can control via task deadline check elsewhere.
  const sumPaidPayments = (q: Quote, totalHint?: number, fallbackDate?: string | Date): number => {
    const payments = (q as any).payments as any[] | undefined;
    const total = typeof totalHint === 'number' ? totalHint : computeQuoteTotal(q);
    
    // If has payment entries, only count those marked as 'paid' AND whose date is in range (prefer payment entry date, then quote.paidDate, then fallbackDate)
    if (Array.isArray(payments) && payments.length > 0) {
      return payments.reduce((s, p) => {
        if (!p || p.status !== 'paid') return s;
        const pd = p.date || (q as any).paidDate || fallbackDate;
        if (!inRange(pd)) return s;
        if (String(p.amountType || '') === 'percent') {
          const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
          return s + (total * pct / 100);
        }
        const amt = Number(p.amount || 0);
        return s + (amt > 0 ? amt : 0);
      }, 0);
    }
    
    // If has explicit amountPaid field, use it only when paidDate (or fallbackDate) is in range
    if (typeof (q as any).amountPaid === 'number') {
      const pd = (q as any).paidDate || fallbackDate;
      if (inRange(pd)) {
        return (q as any).amountPaid || 0;
      }
      return 0;
    }
    
    // If quote has explicit status 'paid', assume full amount only when paidDate (or fallback) in range
    if ((q as any).status === 'paid') {
      const pd = (q as any).paidDate || fallbackDate;
      if (inRange(pd)) return total;
    }
    
    // DEFAULT: If no payment data exists, assume "Chưa thanh toán" = 0 revenue
    // Revenue only counts when explicitly marked as paid
    return 0;
  };

  // Revenue per spec: Include tasks that have paid payments (even if not done yet - like deposits)
  // This allows counting revenue from deposits/advance payments
  const revenue = tasksAll.reduce((sum, t) => {
    // Don't include archived tasks, but include all other statuses if they have payments
    if (t.status === 'archived') return sum;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) return sum;
    const total = computeQuoteTotal(q);
    // prioritize payment dates; fallback to task deadline
    const received = sumPaidPayments(q, total, t.deadline);
    
    // Debug log for payment date filtering
    if (received > 0) {
      const payments = (q as any).payments as any[] | undefined;
      const paymentDates = payments?.map(p => ({ 
        date: p.date || (q as any).paidDate || t.deadline, 
        status: p.status,
        amount: p.amount 
      })) || [];
      console.log(`💰 Task "${t.name}" (${t.status}) revenue: ${received}, payment dates:`, paymentDates);
    }
    
    return sum + (received || 0);
  }, 0);

  // Costs CTV: bỏ điều kiện trạng thái payment. Dùng paidDate của task (suy ra từ quote chính) hoặc deadline của task;
  // số tiền lấy amountPaid nếu có, ngược lại lấy full total của CTV quote.
  const collaboratorCosts = tasksAll.reduce((sum, t) => {
    const links = t.collaboratorQuotes || [];
    const sub = links.reduce((s, link) => {
      const cq = collabQuoteById.get(link.quoteId);
      if (!cq) return s;
      const total = computeCollabQuoteTotal(cq);
      const amount = typeof (cq as any).amountPaid === 'number' ? (cq as any).amountPaid : total;
      if (amount <= 0) return s;
      const taskPaidDate = t.quoteId ? getMainQuotePaidDate(quoteById.get(t.quoteId)) : undefined;
      const pd = taskPaidDate || t.deadline || t.endDate || t.startDate;
      if (!inRange(pd)) return s;
      return s + amount;
    }, 0);
    return sum + sub;
  }, 0);

  // Fixed costs for the selected date range
    const calculateFixedCosts = () => {
        if (!appData?.fixedCosts || appData.fixedCosts.length === 0) return 0;

        // Use the same date range logic as the component
        let fromDate: Date, toDate: Date;
        
        if (dateRange?.from && dateRange?.to) {
            fromDate = new Date(dateRange.from);
            toDate = new Date(dateRange.to);
        } else {
            // Default to current month if no date range selected
            const now = new Date();
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
            toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        // Calculate exact number of days in the selected range (inclusive)
        const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        return appData.fixedCosts.reduce((total, cost) => {
            if (!cost.isActive) return total;

            const startDate = new Date(cost.startDate);
            const endDate = cost.endDate ? new Date(cost.endDate) : null;

            // Check if cost applies to the selected range
            if (startDate > toDate || (endDate && endDate < fromDate)) {
                return total;
            }

            // Calculate daily rate based on frequency
            let dailyRate = 0;
            
            switch (cost.frequency) {
                case 'once':
                    // One-time cost applies if start date is in range
                    if (startDate >= fromDate && startDate <= toDate) {
                        return total + cost.amount;
                    }
                    return total;
                case 'weekly':
                    // Weekly cost = amount per week / 7 days
                    dailyRate = cost.amount / 7;
                    break;
                case 'monthly':
                    // Monthly cost = amount per month / 30.44 days (average)
                    dailyRate = cost.amount / 30.44;
                    break;
                case 'yearly':
                    // Yearly cost = amount per year / 365.25 days (average)
                    dailyRate = cost.amount / 365.25;
                    break;
            }

            // Calculate total cost for the selected range: daily rate × number of days
            const costForRange = dailyRate * rangeDays;
            return total + costForRange;
        }, 0);
    };

  const fixedCosts = calculateFixedCosts();
  const costs = collaboratorCosts + fixedCosts;
  
  // This aligns with the new payment status logic
  const profit = revenue - costs;

  console.log('📊 Financial Summary Debug:', {
    tasksConsidered: tasksAll.length,
    completedTasks: tasksAll.filter(t => t.status === 'done').length,
        revenue,
  collaboratorCosts,
        // Sum only paid payments within range. Priority:
        // payment.date -> collaboratorQuote.paidDate -> mainQuote.paidDate/earliest paid payment -> task dates
        profit
    });

  return { revenue, costs, profit };
}
/**
 * Phân tích cơ cấu doanh thu theo khách hàng.
 */
export function calculateRevenueBreakdown(appData: AppData, dateRange: { from?: Date; to?: Date }): { name: string; value: number }[] {
  const toDate = (d?: string | Date) => (d ? new Date(d) : undefined);
  const inRange = (d?: string | Date) => {
    const dt = toDate(d);
    if (!dt) return false;
    const from = dateRange.from ? new Date(dateRange.from) : undefined;
    const to = dateRange.to ? new Date(dateRange.to) : undefined;
    if (from && dt < from) return false;
    if (to && dt > to) return false;
    return true;
  };
  const getTaskDate = (t: Task) => t.endDate || t.deadline || t.startDate;
        // collaboratorQuote.paidDate -> mainQuote.paidDate/earliest paid payment -> task dates
  const clientById = new Map<string, Client>((appData.clients || []).map(c => [c.id, c]));
  const quoteById = new Map<string, Quote>((appData.quotes || []).map(q => [q.id, q]));
  
  // Get translation helper
  const T = i18n[appData?.appSettings?.language || 'en'];

  // Group revenue by client for tasks in range (paid amounts from done tasks only)
  const computeQuoteTotal = (q2?: Quote): number => {
    if (!q2?.sections) return (q2 as any)?.total || 0;
    const cols = (q2.columns || [{ id: 'description', name: 'Description', type: 'text' }, { id: 'unitPrice', name: 'Unit Price', type: 'number', calculation: { type: 'sum' } }] as QuoteColumn[]);
    const unitCol = cols.find(c => c.id === 'unitPrice');
    if (!unitCol) return 0;
    return q2.sections.reduce((acc, sec) => acc + (sec.items?.reduce((ia, it) => {
      try {
        if (unitCol.rowFormula) {
          const rowVals: Record<string, number> = {};
          cols.forEach(c => {
            if (c.type === 'number' && c.id !== unitCol.id) {
              const val = c.id === 'unitPrice' ? Number(it.unitPrice) || 0 : Number(it.customFields?.[c.id]) || 0;
              rowVals[c.id] = val;
            }
          });
          let expr = unitCol.rowFormula as string;
          Object.entries(rowVals).forEach(([cid, val]) => { expr = expr.replaceAll(cid, String(val)); });
          // eslint-disable-next-line no-eval
          const r = eval(expr);
          return ia + (!isNaN(r) ? Number(r) : 0);
        }
        return ia + (Number(it.unitPrice) || 0);
      } catch { return ia; }
    }, 0) || 0), 0);
  };
  const totalsByClient = new Map<string, number>();
  for (const t of appData.tasks || []) {
    if (t.deletedAt || t.status === 'archived') continue;
    if (t.status !== 'done') continue;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    let amount = 0;
    if (q) {
      const payments = (q as any).payments as any[] | undefined;
      if (Array.isArray(payments) && payments.length > 0) {
        amount = payments.reduce((s, p) => {
          if (!p || p.status !== 'paid') return s;
          // Enhanced fallback chain for payment date
          const pd = p.date || (q as any).paidDate || t.deadline || t.endDate || t.startDate;
          if (!inRange(pd)) return s;
          const totalComputed = computeQuoteTotal(q);
          const inc = p.amountType === 'percent'
            ? (totalComputed * Math.max(0, Math.min(100, p.percent ?? 0)) / 100)
            : (p.amount || 0);
          return s + (inc || 0);
        }, 0);
      } else if (typeof (q as any).amountPaid === 'number') {
        // Enhanced fallback for direct amountPaid
        const pd = (q as any).paidDate || t.deadline || t.endDate || t.startDate;
        amount = inRange(pd) ? ((q as any).amountPaid || 0) : 0;
      } else if ((q as any).status === 'paid') {
        // If quote marked as paid with no explicit payments, count full total on paidDate (or task date)
        const pd = (q as any).paidDate || t.deadline || t.endDate || t.startDate;
        const total = computeQuoteTotal(q);
        amount = inRange(pd) ? total : 0;
      } else if (q.total && q.total > 0) {
        // Fallback: use quote total if no payment info but task is done
        const pd = t.endDate || t.deadline || t.startDate;
        amount = inRange(pd) ? (q.total || 0) : 0;
      }
    }
    // Only include if amount determined by a payment/completion falling in range
    if (amount > 0) {
      const key = t.clientId || 'unknown';
      totalsByClient.set(key, (totalsByClient.get(key) || 0) + amount);
    }
  }

  // Map to display shape with client names
  const result = Array.from(totalsByClient.entries()).map(([clientId, value]) => {
    const name = clientById.get(clientId)?.name || T.unknownClient;
    return { name, value };
  });

  // Sort desc by value for nicer charts
  result.sort((a, b) => b.value - a.value);
  return result;
}

/**
 * Calculate detailed task breakdown for revenue and costs
 */
export function calculateTaskDetails(appData: AppData, dateRange: { from?: Date; to?: Date }) {
  const toDate = (d?: string | Date) => (d ? new Date(d) : undefined);
  const inRange = (d?: string | Date) => {
    const dt = toDate(d);
    if (!dt) return false;
    const from = dateRange.from ? new Date(dateRange.from) : undefined;
    const to = dateRange.to ? new Date(dateRange.to) : undefined;
    
    // Normalize dates to start/end of day for proper comparison
    if (from) {
      from.setHours(0, 0, 0, 0);
    }
    if (to) {
      to.setHours(23, 59, 59, 999);
    }
    
    // Normalize check date to ignore time
    const checkDate = new Date(dt);
    checkDate.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
    
    console.log(`📅 inRange check: ${d} -> ${checkDate.toISOString()} vs [${from?.toISOString()} to ${to?.toISOString()}]`);
    
    if (from && checkDate < from) {
      console.log(`   ❌ Before range start`);
      return false;
    }
    if (to && checkDate > to) {
      console.log(`   ❌ After range end`);
      return false;
    }
    console.log(`   ✅ In range`);
    return true;
  };
  const getTaskDate = (t: Task) => t.endDate || t.deadline || t.startDate;

  const clientById = new Map<string, Client>((appData.clients || []).map(c => [c.id, c]));
  const collaboratorById = new Map<string, any>((appData.collaborators || []).map(c => [c.id, c]));
  const quoteById = new Map<string, Quote>((appData.quotes || []).map(q => [q.id, q]));
  const collabQuoteById = new Map<string, any>((appData.collaboratorQuotes || []).map(cq => [cq.id, cq]));
  
  // Get translation helper
  const T = i18n[appData?.appSettings?.language || 'en'];

  const revenueItems: any[] = [];
  const costItems: any[] = [];

  console.log('🔍 calculateTaskDetails Debug:', {
    totalTasks: appData.tasks?.length || 0,
    nonArchivedTasks: (appData.tasks || []).filter(t => !t.deletedAt && t.status !== 'archived').length,
    collaboratorQuotes: appData.collaboratorQuotes?.length || 0,
    dateRange,
    selectedPeriod: dateRange.from ? `${dateRange.from.toISOString().split('T')[0]} to ${dateRange.to?.toISOString().split('T')[0]}` : 'all-time'
  });

  // Add detailed period check
  const testDate = new Date('2024-08-27'); // Animation task paidDate
  console.log('🗓️ Test date 2024-08-27 inRange:', inRange(testDate));

  // Revenue items from tasks - include any non-archived task that has PAID payments in range
  for (const t of appData.tasks || []) {
    if (t.deletedAt || t.status === 'archived') continue;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (q) {
      // Compute quote total for percent payments and fallback paths (status=paid without explicit payments)
      const computeQuoteTotal = (q2?: Quote): number => {
        if (!q2?.sections) return (q2 as any)?.total || 0;
        const cols = (q2.columns || [{ id: 'description', name: 'Description', type: 'text' }, { id: 'unitPrice', name: 'Unit Price', type: 'number', calculation: { type: 'sum' } }] as QuoteColumn[]);
        const unitCol = cols.find(c => c.id === 'unitPrice');
        if (!unitCol) return 0;
        return q2.sections.reduce((acc, sec) => acc + (sec.items?.reduce((ia, it) => {
          try {
            if (unitCol.rowFormula) {
              const rowVals: Record<string, number> = {};
              cols.forEach(c => {
                if (c.type === 'number' && c.id !== unitCol.id) {
                  const val = c.id === 'unitPrice' ? Number(it.unitPrice) || 0 : Number(it.customFields?.[c.id]) || 0;
                  rowVals[c.id] = val;
                }
              });
              let expr = unitCol.rowFormula as string;
              Object.entries(rowVals).forEach(([cid, val]) => { expr = expr.replaceAll(cid, String(val)); });
              // eslint-disable-next-line no-eval
              const r = eval(expr);
              return ia + (!isNaN(r) ? Number(r) : 0);
            }
            return ia + (Number(it.unitPrice) || 0);
          } catch { return ia; }
        }, 0) || 0), 0);
      };

      let amount = 0;
      const payments = (q as any).payments as any[] | undefined;
      if (Array.isArray(payments) && payments.length > 0) {
        amount = payments.reduce((s, p) => {
          if (!p || p.status !== 'paid') return s;
          const pd = p.date || (q as any).paidDate || t.deadline || t.endDate || t.startDate;
          if (!inRange(pd)) return s;
          const totalComputed = computeQuoteTotal(q);
          const inc = p.amountType === 'percent'
            ? (totalComputed * Math.max(0, Math.min(100, p.percent ?? 0)) / 100)
            : (p.amount || 0);
          return s + (inc || 0);
        }, 0);
      } else if (typeof (q as any).amountPaid === 'number') {
        const pd = (q as any).paidDate || t.deadline || t.endDate || t.startDate;
        amount = inRange(pd) ? ((q as any).amountPaid || 0) : 0;
      } else if ((q as any).status === 'paid') {
        // Fallback: if quote is marked as fully paid, include total when paid date (or task deadline) is in range
        const pd = (q as any).paidDate || t.deadline || t.endDate || t.startDate;
        const total = computeQuoteTotal(q);
        amount = inRange(pd) ? total : 0;
      }

      if (amount > 0) {
        revenueItems.push({
          id: t.id,
          name: t.name,
          clientName: clientById.get(t.clientId)?.name || T.unknownClient,
          amount,
          type: 'revenue'
        });
      }
    }
  }

  // Cost items from collaborator quotes - NEW SPEC: ignore payment structures/status entirely.
  // For each collaborator quote linked to a task: amount = amountPaid || computedTotal (fallback to stored total);
  // date = mainQuote.paidDate (or earliest paid payment) || task.deadline || task.endDate || task.startDate.
  for (const t of (appData.tasks || [])) {
    if (t.deletedAt || t.status === 'archived') continue;
    const links = t.collaboratorQuotes || [];
    if (!links.length) continue;
    const taskPaidDate = t.quoteId ? getMainQuotePaidDate(quoteById.get(t.quoteId)) : undefined;
    const costDate = taskPaidDate || t.deadline || t.endDate || t.startDate;
    for (const link of links) {
      const cq = collabQuoteById.get(link.quoteId);
      if (!cq) continue;
      // robust total
      let total = 0;
      if (cq.sections && cq.sections.length > 0) {
        const cols = (cq.columns || [{ id: 'description', name: 'Description', type: 'text' }, { id: 'unitPrice', name: 'Unit Price', type: 'number', calculation: { type: 'sum' } }] as QuoteColumn[]);
        const unitCol = cols.find(c => c.id === 'unitPrice');
        if (unitCol) {
          total = cq.sections.reduce((acc: number, sec: any) => acc + (sec.items?.reduce((ia: number, it: any) => {
            try {
              if ((unitCol as any).rowFormula) {
                const rowVals: Record<string, number> = {};
                cols.forEach(c => {
                  if (c.type === 'number' && c.id !== unitCol.id) {
                    const val = c.id === 'unitPrice' ? Number((it as any).unitPrice) || 0 : Number((it as any).customFields?.[c.id]) || 0;
                    rowVals[c.id] = val;
                  }
                });
                let expr = (unitCol as any).rowFormula as string;
                Object.entries(rowVals).forEach(([cid, val]) => { expr = expr.replaceAll(cid, String(val)); });
                // eslint-disable-next-line no-eval
                const r = eval(expr);
                return ia + (!isNaN(r) ? Number(r) : 0);
              }
              return ia + (Number((it as any).unitPrice) || 0);
            } catch { return ia; }
          }, 0) || 0), 0);
        }
      }
      if (total <= 0) total = (cq as any)?.total || 0;
      const amount = typeof (cq as any).amountPaid === 'number' ? (cq as any).amountPaid : total;
      if (amount > 0 && inRange(costDate)) {
        const collaborator = collaboratorById.get(link.collaboratorId);
        costItems.push({
          id: `${t.id}-${link.quoteId}`,
          name: `${t.name} (${collaborator?.name || 'Unknown'})`,
          clientName: clientById.get(t.clientId)?.name || T.unknownClient,
          amount,
          type: 'cost'
        });
      }
    }
  }

  console.log('🎯 Final results:', {
    revenueItems: revenueItems.length,
    costItems: costItems.length
  });

  // Only collaborator cost items are included; general expenses are excluded by new spec

  return {
    revenueItems: revenueItems.sort((a, b) => b.amount - a.amount),
    costItems: costItems.sort((a, b) => b.amount - a.amount)
  };
}
// --- STAGE 2: AI-POWERED ANALYSIS ---

/**
 * Chuẩn bị context và gọi AI với vai trò là một cố vấn tài chính.
 */
export async function getAIBusinessAnalysis(financialContext: any, appData: AppData, settings: { apiKey: string; modelName: string; language: string }) {
    console.log("Calling analyzeBusinessAction with:", { ...settings, financialContext: true, appData: true });

    try {
        const response = await analyzeBusinessAction({
            apiKey: settings.apiKey,
            modelName: settings.modelName,
            language: settings.language as 'en' | 'vi',
            appDataSnapshot: appData,
            financialContext: financialContext
        });

        if (response.success && response.insights) {
            return {
                summary: response.summary, // Pass through summary from server if it exists
                recommendations: response.insights.map((i: any) => i.suggestion),
                insights: response.insights,
                raw: response.raw,
            };
        } else {
            console.error("AI Analysis server action failed:", response.error);
            return {
                summary: "AI Analysis failed.",
                recommendations: [response.error || "An unknown error occurred."],
                insights: [],
            };
        }
    } catch (error) {
        console.error("Error calling AI Analysis server action:", error);
        return {
            summary: "AI Analysis failed due to network or server error.",
            recommendations: ["Please try again later."],
            insights: [],
        };
    }
}

// Additional metrics per spec
export function calculateAdditionalFinancials(appData: AppData, dateRange: { from?: Date; to?: Date }) {
  const toDate = (d?: string | Date) => (d ? new Date(d) : undefined);
  const inRange = (d?: string | Date) => {
    const dt = toDate(d);
    if (!dt) return false;
    const from = dateRange.from ? new Date(dateRange.from) : undefined;
    const to = dateRange.to ? new Date(dateRange.to) : undefined;
    if (from && dt < from) return false;
    if (to && dt > to) return false;
    return true;
  };
  const getTaskDate = (t: Task) => t.endDate || t.deadline || t.startDate;

  const quoteById = new Map<string, Quote>((appData.quotes || []).map(q => [q.id, q]));
  const computeQuoteTotal = (q?: Quote): number => {
    if (!q?.sections) return 0;
    const cols = (q.columns || [{ id: 'description', name: 'Description', type: 'text' }, { id: 'unitPrice', name: 'Unit Price', type: 'number', calculation: { type: 'sum' } }] as QuoteColumn[]);
    const unitCol = cols.find(c => c.id === 'unitPrice');
    if (!unitCol) return 0;
    return q.sections.reduce((acc, sec) => acc + (sec.items?.reduce((ia, it) => ia + (unitCol ? (unitCol.rowFormula ? (() => { try { let expr = unitCol.rowFormula as any; const rowVals: Record<string, number> = {}; cols.forEach(c => { if (c.type === 'number' && c.id !== unitCol.id) { const val = c.id === 'unitPrice' ? Number(it.unitPrice) || 0 : Number(it.customFields?.[c.id]) || 0; rowVals[c.id] = val; } }); Object.entries(rowVals).forEach(([cid, val]) => { expr = (expr as string).replaceAll(cid, String(val)); }); // eslint-disable-next-line no-eval
      const r = eval(expr as string); return !isNaN(r) ? Number(r) : 0; } catch { return 0; } })() : Number(it.unitPrice) || 0) : 0), 0) || 0), 0);
  };

  const sumRemainingPayments = (q: Quote, totalHint?: number): number => {
    const payments = (q as any).payments as any[] | undefined;
    const total = typeof totalHint === 'number' ? totalHint : computeQuoteTotal(q);
    
    console.log(`🔮 Future revenue calc for quote ${q.id}: total=${total}`);
    
    // If no payment data exists, entire amount is future revenue
    if (!Array.isArray(payments) || payments.length === 0) {
      console.log(`   → No payments, future revenue: ${total}`);
      return total;
    }
    
    // Calculate total paid amount
    const totalPaid = payments.reduce((s, p) => {
      if (!p || p.status !== 'paid') return s;
      if (String(p.amountType || '') === 'percent') {
        const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
        return s + (total * pct / 100);
      }
      const amt = Number(p.amount || 0);
      return s + (amt > 0 ? amt : 0);
    }, 0);
    
    // Future revenue = remaining unpaid amount
    const remaining = Math.max(0, total - totalPaid);
    console.log(`   → Total paid: ${totalPaid}, remaining future: ${remaining}`);
    return remaining;
  };

  const tasksInRange = (appData.tasks || []).filter(t => !t.deletedAt && t.status !== 'archived' && inRange(getTaskDate(t)));

  // Future revenue: tasks with any status except archived - calculate remaining unpaid amounts
  const futureRevenue = tasksInRange.reduce((sum, t) => {
    if (t.status === 'archived' || t.status === 'onhold') return sum; // exclude on-hold from future revenue
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) return sum;
    const total = computeQuoteTotal(q);
    const remaining = sumRemainingPayments(q, total);
    console.log(`🔮 Task "${t.name}" (${t.status}) future revenue: ${remaining}`);
    return sum + remaining;
  }, 0);

  // Lost revenue: tasks on-hold -> take full quote total
  const lostRevenue = tasksInRange.reduce((sum, t) => {
    if (t.status !== 'onhold') return sum;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) return sum;
    const total = computeQuoteTotal(q);
    return sum + total;
  }, 0);

  return { futureRevenue, lostRevenue };
}

/**
 * Calculate task details for future revenue and lost revenue
 */
export function calculateAdditionalTaskDetails(appData: AppData, dateRange: { from?: Date; to?: Date }) {
  const toDate = (d?: string | Date) => (d ? new Date(d) : undefined);
  const inRange = (d?: string | Date) => {
    const dt = toDate(d);
    if (!dt) return false;
    const from = dateRange.from ? new Date(dateRange.from) : undefined;
    const to = dateRange.to ? new Date(dateRange.to) : undefined;
    if (from && dt < from) return false;
    if (to && dt > to) return false;
    return true;
  };
  const getTaskDate = (t: Task) => t.endDate || t.deadline || t.startDate;

  const clientById = new Map<string, Client>((appData.clients || []).map(c => [c.id, c]));
  const quoteById = new Map<string, Quote>((appData.quotes || []).map(q => [q.id, q]));
  
  // Get translation helper
  const T = i18n[appData?.appSettings?.language || 'en'];

  const computeQuoteTotal = (q: Quote): number => {
    const cols = (q.columns || [{ id: 'description', name: 'Description', type: 'text' }, { id: 'unitPrice', name: 'Unit Price', type: 'number', calculation: { type: 'sum' } }] as QuoteColumn[]);
    const unitCol = cols.find(c => c.id === 'unitPrice');
    if (!unitCol) return 0;
    return q.sections.reduce((acc, sec) => acc + (sec.items?.reduce((ia, it) => ia + (unitCol ? (unitCol.rowFormula ? (() => { try { let expr = unitCol.rowFormula as any; const rowVals: Record<string, number> = {}; cols.forEach(c => { if (c.type === 'number' && c.id !== unitCol.id) { const val = c.id === 'unitPrice' ? Number(it.unitPrice) || 0 : Number(it.customFields?.[c.id]) || 0; rowVals[c.id] = val; } }); Object.entries(rowVals).forEach(([cid, val]) => { expr = (expr as string).replaceAll(cid, String(val)); }); const r = eval(expr as string); return !isNaN(r) ? Number(r) : 0; } catch { return 0; } })() : Number(it.unitPrice) || 0) : 0), 0) || 0), 0);
  };

  const sumRemainingPayments = (q: Quote, totalHint?: number): number => {
    const payments = (q as any).payments as any[] | undefined;
    const total = typeof totalHint === 'number' ? totalHint : computeQuoteTotal(q);
    
    if (!Array.isArray(payments) || payments.length === 0) {
      return total; // Future revenue for quotes without payment data
    }
    
    // Calculate total paid amount
    const totalPaid = payments.reduce((s, p) => {
      if (!p || p.status !== 'paid') return s;
      if (String(p.amountType || '') === 'percent') {
        const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
        return s + (total * pct / 100);
      }
      const amt = Number(p.amount || 0);
      return s + (amt > 0 ? amt : 0);
    }, 0);
    
    // Return remaining unpaid amount
    return Math.max(0, total - totalPaid);
  };

  const tasksInRange = (appData.tasks || []).filter(t => !t.deletedAt && t.status !== 'archived' && inRange(getTaskDate(t)));

  const futureRevenueItems: any[] = [];
  const lostRevenueItems: any[] = [];

  // Future revenue items: all tasks except archived with remaining unpaid amounts
  for (const t of tasksInRange) {
    if (t.status === 'archived' || t.status === 'onhold') continue; // exclude on-hold from future revenue list
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) continue;
    
    const total = computeQuoteTotal(q);
    const remainingAmount = sumRemainingPayments(q, total);
    
    if (remainingAmount > 0) {
      futureRevenueItems.push({
        id: t.id,
        name: t.name,
        clientName: clientById.get(t.clientId)?.name || T.unknownClient,
        amount: remainingAmount,
        type: 'future-revenue',
        status: t.status
      });
    }
  }

  // Lost revenue items: tasks on-hold
  for (const t of tasksInRange) {
    if (t.status !== 'onhold') continue;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) continue;
    
    const total = computeQuoteTotal(q);
    if (total > 0) {
      lostRevenueItems.push({
        id: t.id,
        name: t.name,
        clientName: clientById.get(t.clientId)?.name || T.unknownClient,
        amount: total,
        type: 'lost-revenue',
        status: t.status
      });
    }
  }

  return {
    futureRevenueItems: futureRevenueItems.sort((a, b) => b.amount - a.amount),
    lostRevenueItems: lostRevenueItems.sort((a, b) => b.amount - a.amount)
  };
}

/**
 * Calculate fixed cost details for the dialog
 */
export function calculateFixedCostDetails(appData: AppData, dateRange: { from?: Date; to?: Date }) {
  const fixedCostItems: Array<{
    id: string;
    name: string;
    amount: number;
    frequency: string;
    type: 'fixed-cost';
    startDate?: string;
    endDate?: string;
  }> = [];

  if (!appData?.fixedCosts || appData.fixedCosts.length === 0) {
    return { fixedCostItems, totalFixedCosts: 0 };
  }

  // Use the same date range logic as the financial summary
  let rangeFromDate: Date, rangeToDate: Date;
  
  if (dateRange?.from && dateRange?.to) {
    rangeFromDate = new Date(dateRange.from);
    rangeToDate = new Date(dateRange.to);
  } else {
    // Default to current month if no date range selected
    const now = new Date();
    rangeFromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    rangeToDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  // Calculate exact number of days in the selected range (inclusive)
  const rangeDays = Math.ceil((rangeToDate.getTime() - rangeFromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  let totalFixedCosts = 0;

  appData.fixedCosts.forEach(cost => {
    if (!cost.isActive) return;

    const startDate = new Date(cost.startDate);
    const endDate = cost.endDate ? new Date(cost.endDate) : null;

    // Check if cost applies to the selected range
    if (startDate > rangeToDate || (endDate && endDate < rangeFromDate)) {
      return;
    }

    // Calculate daily rate and total for this range
    let dailyRate = 0;
    let costForRange = 0;
    
    switch (cost.frequency) {
      case 'once':
        // One-time cost applies if start date is in range
        if (startDate >= rangeFromDate && startDate <= rangeToDate) {
          costForRange = cost.amount;
        }
        break;
      case 'weekly':
        dailyRate = cost.amount / 7;
        costForRange = dailyRate * rangeDays;
        break;
      case 'monthly':
        dailyRate = cost.amount / 30.44;
        costForRange = dailyRate * rangeDays;
        break;
      case 'yearly':
        dailyRate = cost.amount / 365.25;
        costForRange = dailyRate * rangeDays;
        break;
    }

    if (costForRange > 0) {
      totalFixedCosts += costForRange;
      fixedCostItems.push({
        id: cost.id,
        name: cost.name,
        amount: costForRange,
        frequency: cost.frequency,
        type: 'fixed-cost',
        startDate: cost.startDate,
        endDate: cost.endDate
      });
    }
  });

  return {
    fixedCostItems: fixedCostItems.sort((a, b) => b.amount - a.amount),
    totalFixedCosts
  };
}

/**
 * NEW: Calculate monthly financial breakdown for charts
 */
export function calculateMonthlyFinancials(appData: AppData, dateRange: { from?: Date; to?: Date }): { monthYear: string; revenue: number; costs: number; profit: number }[] {
  // If no range provided, compute across ALL available dates
  const useAllTime = !dateRange.from || !dateRange.to;

  const toDate = (d?: string | Date) => (d ? new Date(d) : undefined);
  
  const tasksAll = (appData.tasks || []).filter(t => !t?.deletedAt && t?.status !== 'archived');
  const quoteById = new Map<string, Quote>((appData.quotes || []).map(q => [q.id, q]));
  const collabQuoteById = new Map<string, CollaboratorQuote>((appData.collaboratorQuotes || []).map(cq => [cq.id, cq]));

  const monthlyMap = new Map<string, { revenue: number; costs: number }>();

  // Helper to ensure month key exists
  const ensureMonth = (key: string) => {
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, { revenue: 0, costs: 0 });
    }
  };

  // 1. Process Revenue (align with Financial Summary: include PAID payments from any non-archived task)
  tasksAll.forEach(t => {
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) return;

    const payments = (q as any).payments as any[] | undefined;
    if (Array.isArray(payments) && payments.length > 0) {
      payments.forEach(p => {
        if (p && p.status === 'paid') {
          // Fallback chain: payment date -> quote paid date -> task deadline -> task end date -> task start date
          const paymentDate = toDate(p.date || (q as any).paidDate || t.deadline || t.endDate || t.startDate);
          if (paymentDate && (useAllTime || (dateRange.from && dateRange.to && paymentDate >= dateRange.from && paymentDate <= dateRange.to))) {
            const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            ensureMonth(monthKey);
            const total = q.total || 0; // fallback to total if not calculated.
            const amount = p.amountType === 'percent'
              ? (total * (p.percent ?? 0) / 100)
              : (p.amount || 0);
            monthlyMap.get(monthKey)!.revenue += amount;
          }
        }
      });
    } else if (typeof (q as any).amountPaid === 'number') {
      // Handle quotes with direct amountPaid (fallback even if no paidDate)
      const paymentDate = toDate((q as any).paidDate || t.deadline || t.endDate || t.startDate);
      if (paymentDate && (useAllTime || (dateRange.from && dateRange.to && paymentDate >= dateRange.from && paymentDate <= dateRange.to))) {
        const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        ensureMonth(monthKey);
        monthlyMap.get(monthKey)!.revenue += (q as any).amountPaid;
      }
    }
  });

  // 2. Process Costs (Collaborator, Fixed) — General expenses removed per new spec
  // 2a. Collaborator Costs (align with Financial Summary: only PAID collaborator payments; include all non-archived tasks)
   tasksAll.forEach(t => {
    const links = t.collaboratorQuotes || [];
    links.forEach(link => {
      const cq = collabQuoteById.get(link.quoteId);
      if (!cq) return;

      const mainQuotePaidDate = t.quoteId ? getMainQuotePaidDate(quoteById.get(t.quoteId)) : undefined;
      const paymentDate = toDate(mainQuotePaidDate || t.deadline || t.endDate || t.startDate);
      if (!paymentDate) return;
      if (useAllTime || (dateRange.from && dateRange.to && paymentDate >= dateRange.from && paymentDate <= dateRange.to)) {
        const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        ensureMonth(monthKey);
        const amount = typeof (cq as any).amountPaid === 'number' ? (cq as any).amountPaid : ((cq as any).total ?? 0);
        monthlyMap.get(monthKey)!.costs += amount;
      }
    });
  });

  // 2b. (removed) General Expenses

  // 2c. Fixed Costs
    // For fixed costs, if no range is provided, compute across each cost's active months
    const start = useAllTime ? undefined : new Date(dateRange.from!);
    const end = useAllTime ? undefined : new Date(dateRange.to!);

    const addMonthlyCost = (year: number, monthIndex: number, amount: number) => {
        const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        ensureMonth(monthKey);
        monthlyMap.get(monthKey)!.costs += amount;
    };

    if (!useAllTime && start && end) {
      let current = new Date(start);
      current.setDate(1);
      while (current <= end) {
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        ensureMonth(monthKey);
        
        const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();

        (appData.fixedCosts || []).forEach(cost => {
            if (cost.isActive) {
                const costStart = new Date(cost.startDate);
                const costEnd = cost.endDate ? new Date(cost.endDate) : end;
                if(costStart <= end && costEnd && costEnd >= start) {
                    let monthlyCost = 0;
                    switch(cost.frequency) {
                        case 'once':
                            if (costStart.getFullYear() === current.getFullYear() && costStart.getMonth() === current.getMonth()) {
                                monthlyCost = cost.amount;
                            }
                            break;
                        case 'monthly':
                            monthlyCost = cost.amount;
                            break;
                        case 'weekly':
                            monthlyCost = (cost.amount / 7) * daysInMonth;
                            break;
                        case 'yearly':
                            monthlyCost = cost.amount / 12;
                            break;
                    }
                    monthlyMap.get(monthKey)!.costs += monthlyCost;
                }
            }
        });

        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // All-time: iterate per fixed cost active period months
      (appData.fixedCosts || []).forEach(cost => {
        if (!cost.isActive) return;
        const startDate = new Date(cost.startDate);
        const endDate = cost.endDate ? new Date(cost.endDate) : new Date();
        const iter = new Date(startDate);
        iter.setDate(1);
        while (iter <= endDate) {
          const daysInMonth = new Date(iter.getFullYear(), iter.getMonth() + 1, 0).getDate();
          let monthlyCost = 0;
          switch (cost.frequency) {
            case 'once':
              if (startDate.getFullYear() === iter.getFullYear() && startDate.getMonth() === iter.getMonth()) {
                monthlyCost = cost.amount;
              }
              break;
            case 'monthly':
              monthlyCost = cost.amount;
              break;
            case 'weekly':
              monthlyCost = (cost.amount / 7) * daysInMonth;
              break;
            case 'yearly':
              monthlyCost = cost.amount / 12;
              break;
          }
          addMonthlyCost(iter.getFullYear(), iter.getMonth(), monthlyCost);
          iter.setMonth(iter.getMonth() + 1);
        }
      });
    }


  // 3. Finalize and Sort
  const result = Array.from(monthlyMap.entries()).map(([monthYear, data]) => ({
    monthYear,
    ...data,
    profit: data.revenue - data.costs,
  }));

  result.sort((a, b) => a.monthYear.localeCompare(b.monthYear));

  return result;
}