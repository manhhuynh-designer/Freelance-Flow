// File mới: src/ai/analytics/business-intelligence-helpers.ts
import type { AppData, Task, Quote, CollaboratorQuote, Client, QuoteColumn } from '@/lib/types';
import { DateRange } from 'react-day-picker';
import { i18n } from '@/lib/i18n';

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
    if (from && dt < from) return false;
    if (to && dt > to) return false;
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
    if (!cq?.sections) return 0;
    const cols = (cq.columns || [{ id: 'description', name: 'Description', type: 'text' }, { id: 'unitPrice', name: 'Unit Price', type: 'number', calculation: { type: 'sum' } }] as QuoteColumn[]);
    const unitCol = cols.find(c => c.id === 'unitPrice');
    if (!unitCol) return 0;
    return cq.sections.reduce((acc, sec) => acc + (sec.items?.reduce((ia, it) => ia + calcRowVal(it, unitCol, cols), 0) || 0), 0);
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

  // Costs CTV per spec: only count PAID collaborator amounts, similar to revenue logic
  const collaboratorCosts = tasksAll.reduce((sum, t) => {
    if (t.status !== 'done' && t.status !== 'inprogress') return sum;
    const links = t.collaboratorQuotes || [];
    const sub = links.reduce((s, link) => {
      const cq = collabQuoteById.get(link.quoteId);
      if (!cq) return s;
      const total = computeCollabQuoteTotal(cq);
      
        // Check if collaborator quote has payment status - only count if paid and within date range
        const payments = (cq as any).payments as any[] | undefined;
        let paidAmount = 0;
        
        if (Array.isArray(payments) && payments.length > 0) {
          // Sum only paid payments within range, prefer payment entry date, then cq.paidDate, then task.deadline
          paidAmount = payments.reduce((ps, p) => {
            if (!p || p.status !== 'paid') return ps;
            const pd = p.date || (cq as any).paidDate || t.deadline;
            if (!inRange(pd)) return ps;
            if (String(p.amountType || '') === 'percent') {
              const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
              return ps + (total * pct / 100);
            }
            const amt = Number(p.amount || 0);
            return ps + (amt > 0 ? amt : 0);
          }, 0);
        } else if (typeof (cq as any).amountPaid === 'number') {
          // Fallback to legacy amountPaid field; include only if paid date (or task deadline) in range
          const pd = (cq as any).paidDate || t.deadline;
          paidAmount = inRange(pd) ? ((cq as any).amountPaid || 0) : 0;
        } else {
          // DEFAULT: If no payment data exists, assume "Chưa thanh toán" = 0 cost
          paidAmount = 0;
        }
        
        // Debug log for collaborator payment date filtering
        if (paidAmount > 0) {
          const paymentDates = payments?.map(p => ({ 
            date: p.date || (cq as any).paidDate || t.deadline, 
            status: p.status,
            amount: p.amount 
          })) || [{ date: (cq as any).paidDate || t.deadline, status: 'legacy', amount: (cq as any).amountPaid }];
          console.log(`💸 Task "${t.name}" collaborator cost: ${paidAmount}, payment dates:`, paymentDates);
        }      return s + paidAmount;
    }, 0);
    return sum + sub;
  }, 0);

  // 2. General expenses in range (already date-based)
    const expensesInRange = (appData.expenses || []).filter(e => inRange(e.date));
    const generalExpenses = expensesInRange.reduce((s, e) => s + (e.amount || 0), 0);

    // 3. Fixed costs for the selected date range
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
    const costs = collaboratorCosts + generalExpenses + fixedCosts;
  
  // Profit per spec: Revenue (paid amounts) - Costs (paid amounts)
  // This aligns with the new payment status logic
  const profit = revenue - costs;

  console.log('📊 Financial Summary Debug:', {
    tasksConsidered: tasksAll.length,
    completedTasks: tasksAll.filter(t => t.status === 'done').length,
        revenue,
        collaboratorCosts,
        generalExpenses,
        fixedCosts,
        costs,
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

  const clientById = new Map<string, Client>((appData.clients || []).map(c => [c.id, c]));
  const quoteById = new Map<string, Quote>((appData.quotes || []).map(q => [q.id, q]));
  
  // Get translation helper
  const T = i18n[appData?.appSettings?.language || 'en'];

  // Group revenue by client for tasks in range (paid amounts from done tasks only)
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
          const pd = p.date || (q as any).paidDate || t.deadline;
          if (!inRange(pd)) return s;
          const inc = p.amountType === 'percent'
            ? ((q.total || 0) * Math.max(0, Math.min(100, p.percent ?? 0)) / 100)
            : (p.amount || 0);
          return s + (inc || 0);
        }, 0);
      } else if (typeof (q as any).amountPaid === 'number') {
        const pd = (q as any).paidDate || t.deadline;
        amount = inRange(pd) ? ((q as any).amountPaid || 0) : 0;
      }
    }
    // Only include if amount determined by a payment falling in range
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
    if (from && dt < from) return false;
    if (to && dt > to) return false;
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

  // Revenue items from tasks - paid amounts from done tasks only
  for (const t of appData.tasks || []) {
    if (t.deletedAt || t.status === 'archived') continue;
    if (t.status !== 'done') continue;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (q) {
      let amount = 0;
      const payments = (q as any).payments as any[] | undefined;
      if (Array.isArray(payments) && payments.length > 0) {
        amount = payments.reduce((s, p) => {
          if (!p || p.status !== 'paid') return s;
          const pd = p.date || (q as any).paidDate || t.deadline;
          if (!inRange(pd)) return s;
          const inc = p.amountType === 'percent'
            ? ((q.total || 0) * Math.max(0, Math.min(100, p.percent ?? 0)) / 100)
            : (p.amount || 0);
          return s + (inc || 0);
        }, 0);
      } else if (typeof (q as any).amountPaid === 'number') {
        const pd = (q as any).paidDate || t.deadline;
        amount = inRange(pd) ? ((q as any).amountPaid || 0) : 0;
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

  // Cost items from collaborator quotes - only include PAID amounts to align with costs logic
  if (t.status === 'done' || t.status === 'inprogress') {
      const collabLinks = t.collaboratorQuotes || [];
      for (const link of collabLinks) {
        const cq = collabQuoteById.get(link.quoteId);
        if (!cq) continue;
        
        const total = cq.total || 0;
        if (total <= 0) continue;
        
        // Check payment status - only include if paid
        const payments = (cq as any).payments as any[] | undefined;
        let paidAmount = 0;
        
        if (Array.isArray(payments) && payments.length > 0) {
          // Sum only paid payments in range (prefer payment entry date, then cq.paidDate, then task deadline)
          paidAmount = payments.reduce((ps, p) => {
            if (!p || p.status !== 'paid') return ps;
            const pd = p.date || (cq as any).paidDate || t.deadline;
            if (!inRange(pd)) return ps;
            if (String(p.amountType || '') === 'percent') {
              const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
              return ps + (total * pct / 100);
            }
            const amt = Number(p.amount || 0);
            return ps + (amt > 0 ? amt : 0);
          }, 0);
        } else if (typeof (cq as any).amountPaid === 'number') {
          // Fallback to legacy amountPaid field; include only if paid date (or task deadline) in range
          const pd = (cq as any).paidDate || t.deadline;
          paidAmount = inRange(pd) ? ((cq as any).amountPaid || 0) : 0;
        }
        
        // Only add to cost items if there's a paid amount
        if (paidAmount > 0) {
          const collaborator = collaboratorById.get(link.collaboratorId);
          costItems.push({
            id: `${t.id}-${link.quoteId}`,
            name: `${t.name} (${collaborator?.name || 'Unknown'})`,
            clientName: clientById.get(t.clientId)?.name || T.unknownClient,
            amount: paidAmount,
            type: 'cost'
          });
        }
      }
    }
  }

  // Alternative cost calculation if task links are empty (legacy fallback)
  // Check collaborator assignments by task completion
  if (costItems.length === 0) {
    for (const task of appData.tasks || []) {
      if (task.deletedAt || task.status === 'archived') continue;
      if (!inRange(getTaskDate(task))) continue;
      if (task.status !== 'done' && task.status !== 'inprogress') continue;
      
      const collaboratorIds = task.collaboratorIds || [];
      for (const collabId of collaboratorIds) {
        const relatedQuotes = (appData.collaboratorQuotes || []).filter(cq => 
          cq.collaboratorId === collabId && 
          cq.paidDate && inRange(cq.paidDate)
        );
        
        for (const cq of relatedQuotes) {
          const collaborator = collaboratorById.get(collabId);
          costItems.push({
            id: `${task.id}-alt-${cq.id}`,
            name: `${task.name} (${collaborator?.name || 'Unknown'})`,
            clientName: clientById.get(task.clientId)?.name || T.unknownClient,
            amount: cq.total,
            type: 'cost'
          });
        }
      }
    }
  }

  // Add general expenses to cost items
  const expensesInRange = (appData.expenses || []).filter(e => inRange(e.date));
  for (const expense of expensesInRange) {
    costItems.push({
      id: `expense-${expense.id}`,
      name: `${expense.name} (${expense.category})`,
      clientName: 'General Expense',
      amount: expense.amount,
      type: 'cost'
    });
  }

  return {
    revenueItems: revenueItems.sort((a, b) => b.amount - a.amount),
    costItems: costItems.sort((a, b) => b.amount - a.amount)
  };
}
// --- STAGE 2: AI-POWERED ANALYSIS ---

/**
 * Chuẩn bị context và gọi AI với vai trò là một cố vấn tài chính.
 */
export async function getAIBusinessAnalysis(financialContext: any, settings: { apiKey: string; modelName: string; language: string }) {
    // TODO: Implement logic to create prompt and call AI API
    console.log("AI Analysis called with:", financialContext, settings);
    return Promise.resolve({
      summary: "This is a mock AI analysis summary.",
      recommendations: ["Consider raising prices.", "Focus on marketing."]
    });
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
    if (t.status === 'archived') return sum;
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
    if (t.status === 'archived') continue;
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

  // 1. Process Revenue (from 'done' tasks with 'paid' payments)
  tasksAll.forEach(t => {
    if (t.status !== 'done') return;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) return;

    const payments = (q as any).payments as any[] | undefined;
    if (Array.isArray(payments)) {
      payments.forEach(p => {
        if (p && p.status === 'paid') {
          const paymentDate = toDate(p.date || (q as any).paidDate || t.deadline);
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
    } else if (typeof (q as any).amountPaid === 'number' && (q as any).paidDate) {
         const paymentDate = toDate((q as any).paidDate || t.deadline);
         if (paymentDate && (useAllTime || (dateRange.from && dateRange.to && paymentDate >= dateRange.from && paymentDate <= dateRange.to))) {
            const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            ensureMonth(monthKey);
            monthlyMap.get(monthKey)!.revenue += (q as any).amountPaid;
         }
    }
  });

  // 2. Process Costs (Collaborator, General, Fixed)
  // 2a. Collaborator Costs (from 'done'/'inprogress' tasks with 'paid' payments)
   tasksAll.forEach(t => {
    if (t.status !== 'done' && t.status !== 'inprogress') return;
    const links = t.collaboratorQuotes || [];
    links.forEach(link => {
      const cq = collabQuoteById.get(link.quoteId);
      if (!cq) return;

      const payments = (cq as any).payments as any[] | undefined;
  if (Array.isArray(payments)) {
        payments.forEach(p => {
           if (p && p.status === 'paid') {
              const paymentDate = toDate(p.date || (cq as any).paidDate || t.deadline);
       if (paymentDate && (useAllTime || (dateRange.from && dateRange.to && paymentDate >= dateRange.from && paymentDate <= dateRange.to))) {
                const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
                ensureMonth(monthKey);
                 const total = cq.total || 0;
                const amount = p.amountType === 'percent'
                  ? (total * (p.percent ?? 0) / 100)
                  : (p.amount || 0);
                monthlyMap.get(monthKey)!.costs += amount;
              }
           }
        });
  } else if (typeof (cq as any).amountPaid === 'number' && (cq as any).paidDate) {
     const paymentDate = toDate((cq as any).paidDate || t.deadline);
     if (paymentDate && (useAllTime || (dateRange.from && dateRange.to && paymentDate >= dateRange.from && paymentDate <= dateRange.to))) {
            const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            ensureMonth(monthKey);
            monthlyMap.get(monthKey)!.costs += (cq as any).amountPaid;
         }
      }
    });
  });

  // 2b. General Expenses
  (appData.expenses || []).forEach(expense => {
    const expenseDate = toDate(expense.date);
    if (expenseDate && (useAllTime || (dateRange.from && dateRange.to && expenseDate >= dateRange.from && expenseDate <= dateRange.to))) {
      const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      ensureMonth(monthKey);
      monthlyMap.get(monthKey)!.costs += expense.amount || 0;
    }
  });

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