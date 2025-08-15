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

    // Pick a representative date per task for filtering (endDate > deadline > startDate)
    const getTaskDate = (t: Task) => t.endDate || t.deadline || t.startDate;

    // Filter tasks in selected range, ignore archived/deleted
    const tasksInRange = (appData.tasks || []).filter(t => {
        if (t.deletedAt) return false;
        if (t.status === 'archived') return false;
        return inRange(getTaskDate(t));
    });

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

  const sumPaidPayments = (q: Quote, totalHint?: number): number => {
    const payments = (q as any).payments as any[] | undefined;
    const total = typeof totalHint === 'number' ? totalHint : computeQuoteTotal(q);
    
    // If has payment entries, only count those marked as 'paid'
    if (Array.isArray(payments) && payments.length > 0) {
      return payments.reduce((s, p) => {
        if (!p || p.status !== 'paid') return s;
        if (String(p.amountType || '') === 'percent') {
          const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
          return s + (total * pct / 100);
        }
        const amt = Number(p.amount || 0);
        return s + (amt > 0 ? amt : 0);
      }, 0);
    }
    
    // If has explicit amountPaid field, use it
    if (typeof (q as any).amountPaid === 'number') {
      return (q as any).amountPaid || 0;
    }
    
    // If quote has explicit status 'paid', assume full amount
    if ((q as any).status === 'paid') {
      return total;
    }
    
    // DEFAULT: If no payment data exists, assume "Chưa thanh toán" = 0 revenue
    // Revenue only counts when explicitly marked as paid
    return 0;
  };

  // Revenue per spec: tasks with status 'done' AND payments marked paid; count paid amounts only
  const revenue = tasksInRange.reduce((sum, t) => {
    if (t.status !== 'done') return sum;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) return sum;
    const total = computeQuoteTotal(q);
    const received = sumPaidPayments(q, total);
    return sum + (received || 0);
  }, 0);

  // Costs CTV per spec: only count PAID collaborator amounts, similar to revenue logic
  const collaboratorCosts = tasksInRange.reduce((sum, t) => {
    if (t.status !== 'done' && t.status !== 'inprogress') return sum;
    const links = t.collaboratorQuotes || [];
    const sub = links.reduce((s, link) => {
      const cq = collabQuoteById.get(link.quoteId);
      if (!cq) return s;
      const total = computeCollabQuoteTotal(cq);
      
      // Check if collaborator quote has payment status - only count if paid
      const payments = (cq as any).payments as any[] | undefined;
      let paidAmount = 0;
      
      if (Array.isArray(payments) && payments.length > 0) {
        // Sum only paid payments
        paidAmount = payments.reduce((ps, p) => {
          if (!p || p.status !== 'paid') return ps;
          if (String(p.amountType || '') === 'percent') {
            const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
            return ps + (total * pct / 100);
          }
          const amt = Number(p.amount || 0);
          return ps + (amt > 0 ? amt : 0);
        }, 0);
      } else if (typeof (cq as any).amountPaid === 'number') {
        // Fallback to legacy amountPaid field
        paidAmount = (cq as any).amountPaid || 0;
      } else {
        // DEFAULT: If no payment data exists, assume "Chưa thanh toán" = 0 cost
        paidAmount = 0;
      }
      
      return s + paidAmount;
    }, 0);
    return sum + sub;
  }, 0);

    // 2. General expenses in range
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
        tasksInRange: tasksInRange.length,
        completedTasks: tasksInRange.filter(t => t.status === 'done').length,
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
    if (!inRange(getTaskDate(t))) continue;
    if (t.status !== 'done') continue;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    let amount = 0;
    if (q) {
      const payments = (q as any).payments as any[] | undefined;
      if (Array.isArray(payments) && payments.length > 0) {
        amount = payments.reduce((s, p) => {
          if (!p || p.status !== 'paid') return s;
          const inc = p.amountType === 'percent'
            ? ((q.total || 0) * Math.max(0, Math.min(100, p.percent ?? 0)) / 100)
            : (p.amount || 0);
          return s + (inc || 0);
        }, 0);
      } else if (typeof (q as any).amountPaid === 'number') {
        amount = (q as any).amountPaid || 0;
      }
    }
    const key = t.clientId || 'unknown';
    totalsByClient.set(key, (totalsByClient.get(key) || 0) + amount);
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
    if (!inRange(getTaskDate(t))) continue;
    if (t.status !== 'done') continue;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (q) {
      let amount = 0;
      const payments = (q as any).payments as any[] | undefined;
      if (Array.isArray(payments) && payments.length > 0) {
        amount = payments.reduce((s, p) => {
          if (!p || p.status !== 'paid') return s;
          const inc = p.amountType === 'percent'
            ? ((q.total || 0) * Math.max(0, Math.min(100, p.percent ?? 0)) / 100)
            : (p.amount || 0);
          return s + (inc || 0);
        }, 0);
      } else if (typeof (q as any).amountPaid === 'number') {
        amount = (q as any).amountPaid || 0;
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
          // Sum only paid payments
          paidAmount = payments.reduce((ps, p) => {
            if (!p || p.status !== 'paid') return ps;
            if (String(p.amountType || '') === 'percent') {
              const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
              return ps + (total * pct / 100);
            }
            const amt = Number(p.amount || 0);
            return ps + (amt > 0 ? amt : 0);
          }, 0);
        } else if (typeof (cq as any).amountPaid === 'number') {
          // Fallback to legacy amountPaid field
          paidAmount = (cq as any).amountPaid || 0;
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

  const sumScheduledPayments = (q: Quote, totalHint?: number): number => {
    const payments = (q as any).payments as any[] | undefined;
    const total = typeof totalHint === 'number' ? totalHint : computeQuoteTotal(q);
    
    // Only count if there are explicit scheduled payment entries
    if (!Array.isArray(payments) || payments.length === 0) {
      // DEFAULT: If no payment data exists, assume "Chưa thanh toán" = treat as future revenue
      // This means tasks without payment status are considered as potential future revenue
      return total;
    }
    
    // If has payment entries, only count those marked as 'scheduled'
    return payments.reduce((s, p) => {
      if (!p || p.status !== 'scheduled') return s;
      if (String(p.amountType || '') === 'percent') {
        const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
        return s + (total * pct / 100);
      }
      const amt = Number(p.amount || 0);
      return s + (amt > 0 ? amt : 0);
    }, 0);
  };

  const tasksInRange = (appData.tasks || []).filter(t => !t.deletedAt && t.status !== 'archived' && inRange(getTaskDate(t)));

  // Future revenue: tasks with status in (todo, inprogress, done) AND payment entries scheduled
  const allowedStatuses: Task['status'][] = ['todo', 'inprogress', 'done'];
  const futureRevenue = tasksInRange.reduce((sum, t) => {
    if (!allowedStatuses.includes(t.status)) return sum;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) return sum;
    const total = computeQuoteTotal(q);
    return sum + sumScheduledPayments(q, total);
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

  const sumScheduledPayments = (q: Quote, totalHint?: number): number => {
    const payments = (q as any).payments as any[] | undefined;
    const total = typeof totalHint === 'number' ? totalHint : computeQuoteTotal(q);
    
    if (!Array.isArray(payments) || payments.length === 0) {
      return total; // Future revenue for quotes without payment data
    }
    
    return payments.reduce((s, p) => {
      if (!p || p.status !== 'scheduled') return s;
      if (String(p.amountType || '') === 'percent') {
        const pct = Math.max(0, Math.min(100, Number(p.percent || 0)));
        return s + (total * pct / 100);
      }
      const amt = Number(p.amount || 0);
      return s + (amt > 0 ? amt : 0);
    }, 0);
  };

  const tasksInRange = (appData.tasks || []).filter(t => !t.deletedAt && t.status !== 'archived' && inRange(getTaskDate(t)));

  const futureRevenueItems: any[] = [];
  const lostRevenueItems: any[] = [];

  // Future revenue items: tasks with status in (todo, inprogress, done) AND scheduled payments
  const allowedStatuses: Task['status'][] = ['todo', 'inprogress', 'done'];
  for (const t of tasksInRange) {
    if (!allowedStatuses.includes(t.status)) continue;
    const q = t.quoteId ? quoteById.get(t.quoteId) : undefined;
    if (!q) continue;
    
    const total = computeQuoteTotal(q);
    const scheduledAmount = sumScheduledPayments(q, total);
    
    if (scheduledAmount > 0) {
      futureRevenueItems.push({
        id: t.id,
        name: t.name,
        clientName: clientById.get(t.clientId)?.name || T.unknownClient,
        amount: scheduledAmount,
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