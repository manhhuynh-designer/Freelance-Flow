// File mới: src/ai/analytics/business-intelligence-helpers.ts
import type { AppData } from '@/lib/types';
import { DateRange } from 'react-day-picker';

// --- STAGE 1: LOCAL CALCULATION HELPERS ---

/**
 * Tính toán các chỉ số tài chính cốt lõi: Doanh thu, Chi phí, và Lợi nhuận
 * Dựa trên các giao dịch đã được thanh toán trong khoảng thời gian đã chọn.
 */
export function calculateFinancialSummary(appData: AppData, dateRange: { from?: Date; to?: Date }) {
    // TODO: Implement logic to filter quotes, collaboratorQuotes, expenses by dateRange and status
    // Placeholder values for now
    const revenue = 15000; 
    const costs = 8000;    
    const profit = revenue - costs;

    // Filter quotes based on paidDate within the dateRange
    const paidQuotesInRange = (appData.quotes || []).filter(q => {
      if (q.status !== 'paid' || !q.paidDate) return false;
      const paidDate = new Date(q.paidDate);
      const from = dateRange.from ? new Date(dateRange.from) : null;
      const to = dateRange.to ? new Date(dateRange.to) : null;
      if (from && paidDate < from) return false;
      if (to && paidDate > to) return false;
      return true;
    });

    // Filter collaborator quotes
    const paidCollaboratorQuotesInRange = (appData.collaboratorQuotes || []).filter(cq => {
        if (cq.paymentStatus !== 'paid' || !cq.paidDate) return false;
        const paidDate = new Date(cq.paidDate);
        const from = dateRange.from ? new Date(dateRange.from) : null;
        const to = dateRange.to ? new Date(dateRange.to) : null;
        if (from && paidDate < from) return false;
        if (to && paidDate > to) return false;
        return true;
    });

    // Filter expenses
    const expensesInRange = (appData.expenses || []).filter(e => {
        const expenseDate = new Date(e.date);
        const from = dateRange.from ? new Date(dateRange.from) : null;
        const to = dateRange.to ? new Date(dateRange.to) : null;
        if (from && expenseDate < from) return false;
        if (to && expenseDate > to) return false;
        return true;
    });

    const calculatedRevenue = paidQuotesInRange.reduce((sum, q) => sum + q.total, 0);
    const calculatedCosts = paidCollaboratorQuotesInRange.reduce((sum, cq) => sum + cq.total, 0) + expensesInRange.reduce((sum, e) => sum + e.amount, 0);
    const calculatedProfit = calculatedRevenue - calculatedCosts;

    return { revenue: calculatedRevenue, costs: calculatedCosts, profit: calculatedProfit };
}

/**
 * Phân tích cơ cấu doanh thu theo khách hàng.
 */
export function calculateRevenueBreakdown(appData: AppData, dateRange: { from?: Date; to?: Date }): { name: string; value: number }[] {
    // TODO: Implement logic to group revenue by client
    // Placeholder values for now
    return [{ name: 'Client A', value: 10000 }, { name: 'Client B', value: 5000 }]; 
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