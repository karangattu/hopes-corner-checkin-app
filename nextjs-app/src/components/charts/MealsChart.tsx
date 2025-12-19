'use client';

import React, { useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Download, Utensils } from 'lucide-react';
import { 
  MEAL_TYPE_COLORS, 
  MEAL_TYPE_LABELS,
  CHART_GRID_STYLE,
  CHART_TOOLTIP_STYLE,
} from './ChartTheme';

interface MealDataPoint {
  date: string;
  fullDate?: string;
  guest?: number;
  rv?: number;
  shelter?: number;
  unitedEffort?: number;
  extras?: number;
  dayWorker?: number;
  lunchBags?: number;
  mealsByType?: Record<string, number>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MealDataPoint }>;
  selectedMealTypes: string[];
}

// Move CustomTooltip outside component to avoid React Compiler error
function MealsChartTooltip({ active, payload, selectedMealTypes }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const dayData = payload[0].payload;

  return (
    <div style={CHART_TOOLTIP_STYLE.contentStyle} className="p-3">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {dayData.fullDate || dayData.date}
      </p>
      <div className="space-y-1 text-sm">
        {selectedMealTypes.map((type) => {
          const value = dayData.mealsByType?.[type] || dayData[type as keyof MealDataPoint] as number || 0;
          return (
            <p
              key={type}
              style={{ color: MEAL_TYPE_COLORS[type] }}
              className="font-medium"
            >
              {MEAL_TYPE_LABELS[type]}: {value}
            </p>
          );
        })}
      </div>
    </div>
  );
}

interface MealsChartProps {
  data: MealDataPoint[];
  selectedMealTypes?: string[];
  chartType?: 'area' | 'bar';
  onExport?: () => void;
  title?: string;
}

export function MealsChart({
  data,
  selectedMealTypes = ['guest', 'rv', 'shelter', 'unitedEffort', 'extras', 'dayWorker', 'lunchBags'],
  chartType = 'area',
  onExport,
  title = 'Meals Served',
}: MealsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
        <Utensils size={32} className="mx-auto mb-2 opacity-50" />
        <p>No meal data available for the selected date range</p>
      </div>
    );
  }

  // Calculate totals for the period
  const totals = selectedMealTypes.reduce((acc, type) => {
    acc[type] = data.reduce((sum, day) => {
      const value = day.mealsByType?.[type] || day[type as keyof MealDataPoint] as number || 0;
      return sum + value;
    }, 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div ref={chartRef} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils size={20} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {selectedMealTypes.map((type) => (
          <div
            key={type}
            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
          >
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              {MEAL_TYPE_LABELS[type]}
            </div>
            <div
              className="text-lg font-semibold"
              style={{ color: MEAL_TYPE_COLORS[type] }}
            >
              {totals[type]?.toLocaleString() || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<MealsChartTooltip selectedMealTypes={selectedMealTypes} />} />
              <Legend />
              {selectedMealTypes.map((type) => (
                <Bar
                  key={type}
                  dataKey={type}
                  fill={MEAL_TYPE_COLORS[type]}
                  name={MEAL_TYPE_LABELS[type]}
                  stackId="meals"
                />
              ))}
            </BarChart>
          ) : (
            <AreaChart data={data}>
              <defs>
                {selectedMealTypes.map((type) => (
                  <linearGradient key={type} id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={MEAL_TYPE_COLORS[type]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={MEAL_TYPE_COLORS[type]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<MealsChartTooltip selectedMealTypes={selectedMealTypes} />} />
              <Legend />
              {selectedMealTypes.map((type) => (
                <Area
                  key={type}
                  type="monotone"
                  dataKey={type}
                  stroke={MEAL_TYPE_COLORS[type]}
                  fill={`url(#gradient-${type})`}
                  name={MEAL_TYPE_LABELS[type]}
                  stackId="meals"
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default MealsChart;
