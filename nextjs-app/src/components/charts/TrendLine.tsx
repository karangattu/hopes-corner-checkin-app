'use client';

import React, { useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download } from 'lucide-react';
import { CHART_GRID_STYLE, CHART_TOOLTIP_STYLE, SERVICE_COLORS } from './ChartTheme';
import { formatDateForDisplay } from '@/utils/date';

const METRIC_COLORS: Record<string, string> = {
  meals: '#22c55e',
  showers: '#3b82f6',
  laundry: '#a855f7',
  haircuts: '#f43f5e',
  holidays: '#f59e0b',
  bicycles: '#06b6d4',
  ...SERVICE_COLORS,
};

const METRIC_LABELS: Record<string, string> = {
  meals: 'Meals',
  showers: 'Showers',
  laundry: 'Laundry',
  haircuts: 'Haircuts',
  holidays: 'Holiday',
  bicycles: 'Bicycle',
};

interface DayData {
  date: string;
  [key: string]: number | string | undefined;
}

interface ChartDataPoint extends DayData {
  fullDate: string;
}

// Move tooltip outside to avoid React Compiler error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrendLineTooltip({ active, payload, metrics }: { active?: boolean; payload?: any[]; metrics: string[] }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as ChartDataPoint;

  return (
    <div style={CHART_TOOLTIP_STYLE.contentStyle} className="p-3">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {formatDateForDisplay(data.fullDate)}
      </p>
      <div className="space-y-1 text-sm">
        {metrics.map((metric) => {
          const color = METRIC_COLORS[metric] || '#6b7280';
          const label = METRIC_LABELS[metric] || metric;
          const value = data[metric] ?? 0;
          return (
            <p key={metric} style={{ color }} className="font-medium">
              {label}: {value}
            </p>
          );
        })}
      </div>
    </div>
  );
}

interface TrendLineProps {
  days: DayData[];
  metrics?: string[];
  onExport?: () => void;
  title?: string;
}

export function TrendLine({
  days,
  metrics = ['meals', 'showers', 'laundry'],
  onExport,
  title = '30-Day Activity Trend',
}: TrendLineProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    return [...(days || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [days]);

  const chartData: ChartDataPoint[] = sorted.map((day) => ({
    ...day,
    date: formatDateForDisplay(day.date, { month: 'short', day: 'numeric' }),
    fullDate: day.date,
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
        <p>No trend data available</p>
      </div>
    );
  }

  // Create tooltip renderer that captures metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => (
    <TrendLineTooltip {...props} metrics={metrics} />
  );

  return (
    <div
      ref={chartRef}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-72 relative group"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {onExport && (
          <button
            onClick={onExport}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg p-2 shadow-sm"
            title="Download as PNG"
          >
            <Download size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={chartData}>
          <CartesianGrid {...CHART_GRID_STYLE} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fill: '#9ca3af', fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={renderTooltip} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          {metrics.map((metric) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={METRIC_COLORS[metric] || '#6b7280'}
              strokeWidth={2}
              dot={{ r: 2 }}
              name={METRIC_LABELS[metric] || metric}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendLine;
