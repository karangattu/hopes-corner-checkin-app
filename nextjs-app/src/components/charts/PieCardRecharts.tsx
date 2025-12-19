'use client';

import React, { useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Download, LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

interface PieDataItem {
  name: string;
  value: number;
  fill?: string;
}

interface PieCardRechartsProps {
  title: string;
  subtitle?: string;
  data: PieDataItem[];
  icon?: LucideIcon;
  iconColor?: string;
}

interface LabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  value?: number;
  name?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

/**
 * PieCardRecharts - Reusable pie chart card with export functionality
 */
export const PieCardRecharts: React.FC<PieCardRechartsProps> = ({
  title,
  subtitle,
  data,
  icon: Icon,
  iconColor = 'text-blue-600',
}) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.fill || COLORS[index % COLORS.length],
  }));

  const handleExportChart = async () => {
    try {
      // Dynamic import for html2canvas (only when needed)
      const html2canvas = (await import('html2canvas')).default;
      
      if (!chartRef.current) {
        toast.error('Chart not found');
        return;
      }

      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Chart downloaded as PNG!');
    } catch (error) {
      console.error('Error exporting chart:', error);
      toast.error('Failed to export chart');
    }
  };

  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0];
    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800">{item.name}</p>
        <p className="text-sm text-gray-600">
          {item.value.toLocaleString()} ({percentage}%)
        </p>
      </div>
    );
  };

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
    value,
    name,
  }: LabelProps) => {
    // Guard against undefined values
    if (cx === undefined || cy === undefined || midAngle === undefined || 
        outerRadius === undefined || percent === undefined) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is >= 5% to avoid cluttering
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${name ?? ''}: ${value ?? 0} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div
      ref={chartRef}
      data-chart-container
      className="bg-white border rounded-lg p-4 h-80 relative group"
      style={{ minHeight: '320px' }}
    >
      <button
        onClick={handleExportChart}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm z-10"
        title="Download as PNG"
      >
        <Download size={16} className="text-gray-600" />
      </button>

      <div className="mb-2 flex items-center gap-2">
        {Icon && <Icon size={20} className={iconColor} />}
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="85%" minHeight={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieCardRecharts;
