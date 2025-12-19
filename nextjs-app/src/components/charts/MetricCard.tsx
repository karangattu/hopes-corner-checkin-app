'use client';

import React, { type ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { METRIC_CARD_COLORS, type MetricCardColor } from './ChartTheme';

interface MetricCardProps {
  title: string;
  value: number | string;
  target?: number;
  icon: LucideIcon;
  colorScheme?: MetricCardColor;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const calculateProgress = (current: number, target: number): number => {
  if (!target) return 0;
  return Math.min((current / target) * 100, 100);
};

const getProgressColor = (progress: number): string => {
  if (progress >= 90) return 'text-green-600 dark:text-green-400';
  if (progress >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-blue-600 dark:text-blue-400';
};

export function MetricCard({
  title,
  value,
  target,
  icon: Icon,
  colorScheme = 'blue',
  subtitle,
  trend,
  className = '',
}: MetricCardProps) {
  const colors = METRIC_CARD_COLORS[colorScheme];
  const numericValue = typeof value === 'number' ? value : parseInt(value as string, 10) || 0;
  const progress = target ? calculateProgress(numericValue, target) : 0;
  const progressColor = getProgressColor(progress);

  return (
    <div
      className={`${colors.bg} rounded-2xl p-4 ${colors.border} border relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group ${className}`}
    >
      {/* Decorative gradient orb */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-2xl opacity-60" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm font-medium ${colors.text}`}>{title}</span>
          <div className={`p-2 rounded-xl ${colors.iconBg} group-hover:scale-110 transition-transform`}>
            <Icon size={18} className={colors.icon} />
          </div>
        </div>

        {/* Value */}
        <div className={`text-3xl font-bold ${colors.value} mb-1`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>

        {/* Subtitle or trend */}
        {subtitle && (
          <p className={`text-xs ${colors.text} opacity-80`}>{subtitle}</p>
        )}

        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
            <span className="text-gray-500">vs last period</span>
          </div>
        )}

        {/* Progress bar */}
        {target && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={colors.text}>Target: {target.toLocaleString()}</span>
              <span className={progressColor}>{progress.toFixed(0)}%</span>
            </div>
            <div className={`h-2 ${colors.progress} rounded-full overflow-hidden`}>
              <div
                className={`h-full ${colors.bar} transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function MetricGrid({ children, columns = 3, className = '' }: MetricGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
}

export default MetricCard;
