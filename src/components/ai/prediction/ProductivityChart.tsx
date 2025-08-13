"use client";
import { BarChart, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from "recharts";
import { useDashboard } from "../../../contexts/dashboard-context";

interface ProductivityChartProps { 
  data: Array<{ date: string; workHours: number; pomodoros: number }>; 
}

export const ProductivityChart = ({ data }: ProductivityChartProps) => {
  const { T } = useDashboard() as any;
    // Transform data to show both metrics as stacked bars in hours
    const transformedData = data.map(item => ({
        date: item.date,
  [T?.focusTime || 'Focus Time']: item.pomodoros * 0.42,
  [T?.regularWork || 'Regular Work']: Math.max(0, item.workHours - (item.pomodoros * 0.42)),
        totalHours: item.workHours, // For tooltip
        totalPomodoros: item.pomodoros // For tooltip
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-background p-3 border border-border rounded-lg shadow-md">
                    <p className="font-medium">{`${T?.dateLabel || 'Date'}: ${label}`}</p>
                    <p className="text-primary">{`${T?.totalWork || 'Total Work'}: ${data.totalHours.toFixed(1)}h`}</p>
                    <p className="text-chart-2">{`${T?.focusTime || 'Focus Time'}: ${data[T?.focusTime || 'Focus Time'].toFixed(1)}h`}</p>
                    <p className="text-muted-foreground">{`${T?.pomodorosLabel || 'Pomodoros'}: ${data.totalPomodoros}`}</p>
                    <p className="text-muted-foreground">{`${T?.efficiency || 'Efficiency'}: ${data.totalHours > 0 ? ((data[T?.focusTime || 'Focus Time'] / data.totalHours) * 100).toFixed(0) : 0}%`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={transformedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(str) => {
                    // Convert YYYY-MM-DD to DD/MM format
                    const dateParts = str.split('-');
                    if (dateParts.length === 3) {
                      return `${dateParts[2]}/${dateParts[1]}`;
                    }
                    return str;
                  }} 
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  label={{ value: T?.hoursLabel || 'Hours', angle: -90, position: 'insideLeft' }} 
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey={T?.focusTime || 'Focus Time'} 
                  stackId="productivity"
                  fill="hsl(var(--chart-2))" 
                  name={T?.focusTime || 'Focus Time'}
                  radius={[0, 0, 4, 4]}
                />
                <Bar 
                  dataKey={T?.regularWork || 'Regular Work'} 
                  stackId="productivity"
                  fill="hsl(var(--primary))" 
                  name={T?.regularWork || 'Regular Work'}
                  radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
