import { Task, Client, Category, StatusColors } from "@/lib/types";
import { subDays, differenceInDays, startOfDay, format, addDays } from 'date-fns';

export type PieChartDatum = { name: string; value: number; fill: string };
export type PieChartData = PieChartDatum[];

export type TrendChartDataPoint = {
  date: string; // YYYY-MM-DD
  count: number;
  taskNames: string[];
  compareCount?: number;
};

const COLORS_FALLBACK = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560"]; 

export type GroupBy = 'status' | 'client' | 'category';

function getGroupKey(task: Task, groupBy: GroupBy): string | undefined {
  switch (groupBy) {
    case 'status': return task.status;
    case 'client': return task.clientId;
    case 'category': return task.categoryId;
    default: return undefined;
  }
}

export function calculatePieChartData(
  tasks: Task[],
  groupBy: GroupBy,
  clients: Client[],
  categories: Category[],
  statusColors: StatusColors,
  excludedStatuses: Set<string>
): PieChartData {
  const counts: Record<string, number> = {};
  const filtered = tasks.filter(t => !excludedStatuses.has(t.status));
  filtered.forEach(task => {
    const key = getGroupKey(task, groupBy);
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });
  // Ensure all status ids appear even if zero when grouping by status
  if (groupBy === 'status') {
    Object.keys(statusColors || {}).forEach(id => {
      if (!(id in counts)) counts[id] = 0;
    });
  }
  const getName = (id: string) => {
    if (groupBy === 'client') return clients.find(c => c.id === id)?.name || 'Unknown';
    if (groupBy === 'category') return categories.find(c => c.id === id)?.name || 'Unknown';
    return id;
  };
  return Object.entries(counts)
    .map(([id, value], index) => ({
      name: getName(id),
      value,
      fill: groupBy === 'status'
        ? (statusColors as any)[id] || COLORS_FALLBACK[index % COLORS_FALLBACK.length]
        : COLORS_FALLBACK[index % COLORS_FALLBACK.length],
    }))
    .sort((a, b) => b.value - a.value);
}

export function calculateTrendForPeriod(tasks: Task[], startDate: Date, endDate: Date): TrendChartDataPoint[] {
  const trendMap: Record<string, { count: number; taskNames: string[] }> = {};
  const daysCount = differenceInDays(endDate, startDate) + 1;
  for (let i = 0; i < daysCount; i++) {
    const date = startOfDay(addDays(startDate, i));
    const key = format(date, 'yyyy-MM-dd');
    trendMap[key] = { count: 0, taskNames: [] };
  }
  tasks.forEach(task => {
    const created = task.createdAt ? new Date(task.createdAt) : (task.startDate ? new Date(task.startDate) : undefined);
    if (!created) return;
    const day = startOfDay(created);
    if (day < startDate || day > endDate) return;
    const key = format(day, 'yyyy-MM-dd');
    if (trendMap[key]) {
      trendMap[key].count += 1;
      trendMap[key].taskNames.push(task.name);
    }
  });
  return Object.entries(trendMap).map(([date, data]) => ({ date, count: data.count, taskNames: data.taskNames })).sort((a, b) => a.date.localeCompare(b.date));
}

export function getComparisonDateRanges(currentRange: { from: Date; to: Date }) {
  const { from, to } = currentRange;
  const days = differenceInDays(to, from);
  const prevTo = subDays(from, 1);
  const prevFrom = subDays(prevTo, days);
  return { current: { from, to }, previous: { from: prevFrom, to: prevTo } };
}
