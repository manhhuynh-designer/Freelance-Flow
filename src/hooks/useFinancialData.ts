'use client';

import { useMemo } from 'react';
import type { Task, Client, Quote, AppData } from '@/lib/types';

interface FinancialData {
  totalIncome: number;
  totalPendingIncome: number;
  totalExpectedIncome: number;
  monthlyIncome: { month: string; income: number }[];
  clientIncome: { clientId: string; clientName: string; income: number }[];
  taskPricing: { taskId: string; taskName: string; price: number; status: string }[];
  averageTaskPrice: number;
  incomeByStatus: Record<string, number>;
  profitMargins: { taskId: string; cost: number; revenue: number; margin: number }[];
}

export function useFinancialData(appData: AppData): FinancialData {
  return useMemo(() => {
    const tasks = appData?.tasks || [];
    const clients = appData?.clients || [];
    const quotes = appData?.quotes || [];

    // Calculate total income from completed tasks
    const completedTasks = tasks.filter(task => task.status === 'done');
    const totalIncome = completedTasks.reduce((sum, task) => {
      const quote = quotes.find(q => q.id === task.quoteId);
      return sum + (quote?.total || 0);
    }, 0);

    // Calculate pending income from in-progress tasks
    const pendingTasks = tasks.filter(task => 
      task.status === 'inprogress' || task.status === 'todo'
    );
    const totalPendingIncome = pendingTasks.reduce((sum, task) => {
      const quote = quotes.find(q => q.id === task.quoteId);
      return sum + (quote?.total || 0);
    }, 0);

    // Total expected income (completed + pending)
    const totalExpectedIncome = totalIncome + totalPendingIncome;

    // Monthly income breakdown
    const monthlyIncomeMap = new Map<string, number>();
    completedTasks.forEach(task => {
      const month = new Date(task.deadline).toISOString().slice(0, 7); // YYYY-MM
      const quote = quotes.find(q => q.id === task.quoteId);
      const currentIncome = monthlyIncomeMap.get(month) || 0;
      monthlyIncomeMap.set(month, currentIncome + (quote?.total || 0));
    });
    
    const monthlyIncome = Array.from(monthlyIncomeMap.entries()).map(([month, income]) => ({
      month,
      income
    }));

    // Client income breakdown
    const clientIncomeMap = new Map<string, number>();
    completedTasks.forEach(task => {
      const client = clients.find(c => c.id === task.clientId);
      const quote = quotes.find(q => q.id === task.quoteId);
      const currentIncome = clientIncomeMap.get(task.clientId) || 0;
      clientIncomeMap.set(task.clientId, currentIncome + (quote?.total || 0));
    });

    const clientIncome = Array.from(clientIncomeMap.entries()).map(([clientId, income]) => {
      const client = clients.find(c => c.id === clientId);
      return {
        clientId,
        clientName: client?.name || 'Unknown Client',
        income
      };
    });

    // Task pricing information
    const taskPricing = tasks.map(task => {
      const quote = quotes.find(q => q.id === task.quoteId);
      return {
        taskId: task.id,
        taskName: task.name,
        price: quote?.total || 0,
        status: task.status
      };
    });

    // Average task price
    const totalTaskPrice = taskPricing.reduce((sum, task) => sum + task.price, 0);
    const averageTaskPrice = tasks.length > 0 ? totalTaskPrice / tasks.length : 0;

    // Income by status
    const incomeByStatus = tasks.reduce((acc, task) => {
      const quote = quotes.find(q => q.id === task.quoteId);
      const price = quote?.total || 0;
      acc[task.status] = (acc[task.status] || 0) + price;
      return acc;
    }, {} as Record<string, number>);

    // Profit margins (simplified - assuming 70% profit margin for now)
    const profitMargins = tasks.map(task => {
      const quote = quotes.find(q => q.id === task.quoteId);
      const revenue = quote?.total || 0;
      const cost = revenue * 0.3; // Assume 30% cost
      const margin = ((revenue - cost) / revenue) * 100;
      
      return {
        taskId: task.id,
        cost,
        revenue,
        margin: isNaN(margin) ? 0 : margin
      };
    });

    return {
      totalIncome,
      totalPendingIncome,
      totalExpectedIncome,
      monthlyIncome,
      clientIncome,
      taskPricing,
      averageTaskPrice,
      incomeByStatus,
      profitMargins
    };
  }, [appData]);
}

// Export financial context for AI
export function getFinancialContext(financialData: FinancialData): string {
  const {
    totalIncome,
    totalPendingIncome,
    totalExpectedIncome,
    monthlyIncome,
    clientIncome,
    averageTaskPrice,
    incomeByStatus
  } = financialData;

  const topClients = clientIncome
    .sort((a, b) => b.income - a.income)
    .slice(0, 5);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthIncome = monthlyIncome.find(m => m.month === currentMonth)?.income || 0;

  return `
FINANCIAL SUMMARY:
- Total Income (Completed): $${totalIncome.toLocaleString()}
- Pending Income (In-progress): $${totalPendingIncome.toLocaleString()}
- Total Expected Income: $${totalExpectedIncome.toLocaleString()}
- Average Task Price: $${averageTaskPrice.toLocaleString()}
- This Month Income: $${thisMonthIncome.toLocaleString()}

INCOME BY STATUS:
${Object.entries(incomeByStatus)
  .map(([status, income]) => `- ${status}: $${income.toLocaleString()}`)
  .join('\n')}

TOP CLIENTS BY INCOME:
${topClients
  .map((client, i) => `${i + 1}. ${client.clientName}: $${client.income.toLocaleString()}`)
  .join('\n')}

RECENT MONTHLY INCOME:
${monthlyIncome
  .slice(-6) // Last 6 months
  .map(m => `- ${m.month}: $${m.income.toLocaleString()}`)
  .join('\n')}
  `;
}
