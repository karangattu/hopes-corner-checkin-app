'use client';

import React, { useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, Bike } from 'lucide-react';
import { CHART_GRID_STYLE, CHART_TOOLTIP_STYLE, SERVICE_COLORS } from './ChartTheme';
import { formatDateForDisplay } from '@/utils/date';

interface DayData {
  date: string;
  bicycles?: number;
}

interface ChartDataPoint {
  date: string;
  fullDate: string;
  bicycles: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}

// Move tooltip outside to avoid React Compiler error
function BicyclesTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div style={CHART_TOOLTIP_STYLE.contentStyle} className="p-3">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {formatDateForDisplay(data.fullDate)}
      </p>
      <div className="space-y-1 text-sm">
        <p className="text-cyan-600 font-medium flex items-center gap-1">
          <Bike size={14} />
          Bicycles: {data.bicycles}
        </p>
      </div>
    </div>
  );
}

interface BicyclesChartProps {
  days: DayData[];
  onExport?: () => void;
}

export function BicyclesChart({ days = [], onExport }: BicyclesChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  if (!days || days.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
        <Bike size={32} className="mx-auto mb-2 opacity-50" />
        <p>No bicycle program data available for the selected date range</p>
      </div>
    );
  }

  // Filter data to only include days with activity
  const filteredDays = days.filter((day) => (day.bicycles || 0) > 0);

  if (filteredDays.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
        <Bike size={32} className="mx-auto mb-2 opacity-50" />
        <p>No bicycle activity for the selected date range</p>
      </div>
    );
  }

  const chartData: ChartDataPoint[] = filteredDays.map((day) => ({
    date: formatDateForDisplay(day.date, { month: 'short', day: 'numeric' }),
    fullDate: day.date,
    bicycles: day.bicycles || 0,
  }));

  // Calculate statistics
  const totalBicycles = chartData.reduce((sum, day) => sum + day.bicycles, 0);
  const averageBicycles = chartData.length > 0 ? (totalBicycles / chartData.length).toFixed(1) : '0';
  const peakDay = chartData.reduce(
    (max, day) => (day.bicycles > max.bicycles ? day : max),
    chartData[0]
  );
  const activeDays = chartData.filter((d) => d.bicycles > 0).length;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike size={20} className="text-cyan-600" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Bicycle Program
          </h3>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Download as PNG"
          >
            <Download size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Summary cards with statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 border border-cyan-200 dark:border-cyan-800">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total</div>
          <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-200">
            {totalBicycles}
          </div>
        </div>

        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3 border border-sky-200 dark:border-sky-800">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Daily Average
          </div>
          <div className="text-2xl font-bold text-sky-900 dark:text-sky-200">
            {averageBicycles}
          </div>
        </div>

        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 border border-teal-200 dark:border-teal-800">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Peak Day</div>
          <div className="text-2xl font-bold text-teal-900 dark:text-teal-200">
            {peakDay?.bicycles || 0}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Days with Activity
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
            {activeDays}
          </div>
        </div>
      </div>

      {/* Bar chart for daily breakdown */}
      <div ref={chartRef} className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid {...CHART_GRID_STYLE} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fill: '#9ca3af', fontSize: 12 }} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<BicyclesTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar
              dataKey="bicycles"
              name="Bicycle Repairs/Maintenance"
              fill={SERVICE_COLORS.bicycles}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default BicyclesChart;
