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
  LabelList,
} from 'recharts';
import { Download } from 'lucide-react';
import { CHART_COLOR_PALETTE, CHART_GRID_STYLE, CHART_TOOLTIP_STYLE } from './ChartTheme';

interface CrossTabData {
  [category: string]: {
    [subcategory: string]: number;
  };
}

interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}

// Move tooltip outside to avoid React Compiler error
function StackedBarTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={CHART_TOOLTIP_STYLE.contentStyle} className="p-3">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.fill }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    </div>
  );
}

interface StackedBarCardProps {
  title: string;
  subtitle?: string;
  crossTabData: CrossTabData;
  onExport?: () => void;
}

export function StackedBarCard({ title, subtitle, crossTabData, onExport }: StackedBarCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const categories = Object.keys(crossTabData || {});
  const allSubcategories = new Set<string>();

  categories.forEach((category) => {
    Object.keys(crossTabData[category] || {}).forEach((subcat) => {
      allSubcategories.add(subcat);
    });
  });

  const subcategoriesArray = Array.from(allSubcategories);

  const chartData: ChartDataPoint[] = categories.map((category) => {
    const dataPoint: ChartDataPoint = { name: category };
    subcategoriesArray.forEach((subcat) => {
      dataPoint[subcat] = crossTabData[category]?.[subcat] || 0;
    });
    return dataPoint;
  });

  if (chartData.length === 0) {
    return (
      <div
        ref={chartRef}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-80 relative"
        style={{ minHeight: '320px' }}
      >
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-80 relative group"
      style={{ minHeight: '320px' }}
    >
      {onExport && (
        <button
          onClick={onExport}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg p-2 shadow-sm z-10"
          title="Download as PNG"
        >
          <Download size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
      )}

      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>

      <ResponsiveContainer width="100%" height="85%" minHeight={250}>
        <BarChart data={chartData}>
          <CartesianGrid {...CHART_GRID_STYLE} />
          <XAxis
            dataKey="name"
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
          <Tooltip content={<StackedBarTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="square" />
          {subcategoriesArray.map((subcat, index) => (
            <Bar
              key={subcat}
              dataKey={subcat}
              stackId="a"
              fill={CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]}
            >
              <LabelList
                dataKey={subcat}
                position="center"
                style={{ fill: 'white', fontSize: '12px', fontWeight: 'bold' }}
                formatter={(value) => (Number(value) > 0 ? value : '')}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default StackedBarCard;
