'use client';

import React, { useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Download } from 'lucide-react';
import { CHART_COLOR_PALETTE, CHART_TOOLTIP_STYLE } from './ChartTheme';

interface DonutCardProps {
  title: string;
  subtitle?: string;
  dataMap: Record<string, number>;
  onExport?: () => void;
}

interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutTooltip({ active, payload, chartData }: { active?: boolean; payload?: any[]; chartData: ChartDataItem[] }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';

  return (
    <div style={CHART_TOOLTIP_STYLE.contentStyle} className="p-3">
      <p className="font-semibold text-gray-800 dark:text-gray-200">{data.name}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {data.value} ({percentage}%)
      </p>
    </div>
  );
}

export function DonutCard({ title, subtitle, dataMap, onExport }: DonutCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData: ChartDataItem[] = Object.entries(dataMap || {}).map(([name, value]) => ({
    name,
    value,
  }));

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

  // Create tooltip renderer function that captures chartData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => (
    <DonutTooltip {...props} chartData={chartData} />
  );

  return (
    <div
      ref={chartRef}
      data-chart-container
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
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value, entry) => (
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {value}: {(entry.payload as ChartDataItem)?.value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DonutCard;
