'use client';

import React, { useRef } from 'react';
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
import { Download, ShowerHead, WashingMachine } from 'lucide-react';
import { SERVICE_COLORS, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE } from './ChartTheme';
import { formatDateForDisplay } from '@/utils/date';

interface DayData {
  date: string;
  fullDate?: string;
  showers?: number;
  laundry?: number;
}

interface ChartDataPoint {
  date: string;
  fullDate: string;
  showers: number;
  laundry: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}

// Move tooltip outside to avoid React Compiler error
function ShowerLaundryTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div style={CHART_TOOLTIP_STYLE.contentStyle} className="p-3">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {formatDateForDisplay(data.fullDate)}
      </p>
      <div className="space-y-1 text-sm">
        <p className="text-blue-600 font-medium flex items-center gap-1">
          <ShowerHead size={14} />
          Showers: {data.showers}
        </p>
        <p className="text-purple-600 font-medium flex items-center gap-1">
          <WashingMachine size={14} />
          Laundry: {data.laundry}
        </p>
      </div>
    </div>
  );
}

interface ShowerLaundryChartProps {
  days: DayData[];
  onExport?: () => void;
}

export function ShowerLaundryChart({ days = [], onExport }: ShowerLaundryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  if (!days || days.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
        <div className="flex items-center justify-center gap-4 mb-2">
          <ShowerHead size={32} className="opacity-50" />
          <WashingMachine size={32} className="opacity-50" />
        </div>
        <p>No shower or laundry data available for the selected date range</p>
      </div>
    );
  }

  // Filter data to only include days with activity
  const filteredDays = days.filter(
    (day) => (day.showers || 0) > 0 || (day.laundry || 0) > 0
  );

  if (filteredDays.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
        <div className="flex items-center justify-center gap-4 mb-2">
          <ShowerHead size={32} className="opacity-50" />
          <WashingMachine size={32} className="opacity-50" />
        </div>
        <p>No shower or laundry activity for the selected date range</p>
      </div>
    );
  }

  const chartData: ChartDataPoint[] = filteredDays.map((day) => ({
    date: formatDateForDisplay(day.date, { month: 'short', day: 'numeric' }),
    fullDate: day.date,
    showers: day.showers || 0,
    laundry: day.laundry || 0,
  }));

  // Calculate totals
  const totalShowers = chartData.reduce((sum, day) => sum + day.showers, 0);
  const totalLaundry = chartData.reduce((sum, day) => sum + day.laundry, 0);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <ShowerHead size={20} className="text-blue-600" />
            <WashingMachine size={20} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Showers & Laundry
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <ShowerHead size={18} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Showers Booked
            </span>
          </div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-200">
            {totalShowers}
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <WashingMachine size={18} className="text-purple-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Laundry Loads
            </span>
          </div>
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-200">
            {totalLaundry}
          </div>
        </div>
      </div>

      {/* Line chart for trends */}
      <div ref={chartRef} className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
            <Tooltip content={<ShowerLaundryTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="showers"
              name="Showers Booked"
              stroke={SERVICE_COLORS.showers}
              strokeWidth={3}
              dot={{ r: 4, fill: SERVICE_COLORS.showers }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="laundry"
              name="Laundry Loads"
              stroke={SERVICE_COLORS.laundry}
              strokeWidth={3}
              dot={{ r: 4, fill: SERVICE_COLORS.laundry }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ShowerLaundryChart;
