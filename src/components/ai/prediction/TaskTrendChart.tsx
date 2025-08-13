"use client";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TrendChartDataPoint } from './task-analytics.helpers';
import { format } from 'date-fns';
import { useDashboard } from '../../../contexts/dashboard-context';

interface Props { mainData: TrendChartDataPoint[]; compareData?: TrendChartDataPoint[]; mainLabel: string; compareLabel?: string; }

const CustomTooltip = ({ active, payload, label, T }: any) => {
  if (active && payload && payload.length) {
    const main = payload.find((p: any) => p.dataKey === 'count') || payload[0];
    const compare = payload.find((p: any) => p.dataKey === 'compareCount');
    const taskNames: string[] = main?.payload?.taskNames || [];
    return (
      <div className="bg-background border p-2 rounded-md shadow-lg">
  <p className="font-bold">{T?.dateLabel || 'Date'}: {label}</p>
        {main && <p className="font-medium text-[#8884d8]">{main.name}: {main.value}</p>}
        {compare && <p className="text-xs text-[#82ca9d]">{compare.name}: {compare.value}</p>}
        {!!taskNames.length && (
          <div className="mt-2 border-t pt-1">
            <p className="text-xs font-semibold">{T?.tasksCreated || 'Tasks Created:'}</p>
            <ul className="list-disc list-inside text-xs max-w-[220px]">
              {taskNames.slice(0, 5).map((n, i) => <li key={i}>{n}</li>)}
              {taskNames.length > 5 && <li>{(T?.andMore || '...and {count} more').replace('{count}', String(taskNames.length - 5))}</li>}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const TaskTrendChart = ({ mainData, compareData, mainLabel, compareLabel }: Props) => {
  const { T } = useDashboard() as any;
  const combined = mainData.map(md => {
    const point: any = { ...md };
    if (compareData) {
      const match = compareData.find(cd => cd.date === md.date);
      point.compareCount = match ? match.count : 0;
    }
    return point;
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={combined}>
        <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" tickFormatter={str => { try { return format(new Date(str), 'dd/MM'); } catch { return str; } }} />
        <YAxis allowDecimals={false} />
  <Tooltip content={<CustomTooltip T={T} />} />
        <Legend />
        <Line type="monotone" dataKey="count" name={mainLabel} stroke="#8884d8" />
  {compareData && <Line type="monotone" dataKey="compareCount" name={compareLabel || T?.previousPeriod || 'Previous'} stroke="#82ca9d" strokeDasharray="5 5" />}
      </LineChart>
    </ResponsiveContainer>
  );
};
