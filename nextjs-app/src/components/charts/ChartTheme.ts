/**
 * Shared chart theme configuration for Recharts components
 */

// Color palette for charts (object form for named access)
export const CHART_COLORS = {
  primary: '#3b82f6',    // Blue
  secondary: '#10b981',  // Emerald  
  tertiary: '#8b5cf6',   // Violet
  quaternary: '#f59e0b', // Amber
  danger: '#ef4444',     // Red
  success: '#22c55e',    // Green
  warning: '#f97316',    // Orange
  info: '#06b6d4',       // Cyan
  pink: '#ec4899',       // Pink
  indigo: '#6366f1',     // Indigo
};

// Color palette as array for indexed access (e.g., in pie charts)
export const CHART_COLOR_PALETTE: string[] = [
  '#3b82f6',  // Blue
  '#10b981',  // Emerald
  '#f59e0b',  // Amber
  '#ef4444',  // Red
  '#8b5cf6',  // Violet
  '#ec4899',  // Pink
  '#06b6d4',  // Cyan
  '#84cc16',  // Lime
  '#f97316',  // Orange
  '#6366f1',  // Indigo
];

// Meal type specific colors
export const MEAL_TYPE_COLORS: Record<string, string> = {
  guest: '#3b82f6',       // Blue
  rv: '#f59e0b',          // Amber
  shelter: '#10b981',     // Emerald
  unitedEffort: '#8b5cf6', // Violet
  united_effort: '#8b5cf6', // Violet (snake_case)
  extras: '#ec4899',      // Pink
  extra: '#ec4899',       // Pink (singular)
  dayWorker: '#f97316',   // Orange
  day_worker: '#f97316',  // Orange (snake_case)
  lunchBags: '#6366f1',   // Indigo
  lunch_bag: '#6366f1',   // Indigo (snake_case)
};

export const MEAL_TYPE_LABELS: Record<string, string> = {
  guest: 'Guest Meals',
  rv: 'RV Meals',
  shelter: 'Shelter Meals',
  unitedEffort: 'United Effort',
  united_effort: 'United Effort',
  extras: 'Extra Meals',
  extra: 'Extra Meals',
  dayWorker: 'Day Worker',
  day_worker: 'Day Worker',
  lunchBags: 'Lunch Bags',
  lunch_bag: 'Lunch Bags',
};

// Service type colors
export const SERVICE_COLORS: Record<string, string> = {
  meals: '#3b82f6',     // Blue
  showers: '#06b6d4',   // Cyan  
  laundry: '#8b5cf6',   // Violet
  bicycles: '#f59e0b',  // Amber
  haircuts: '#f97316',  // Orange
  holidays: '#ec4899',  // Pink
};

// Chart grid and axis styling
export const CHART_GRID_STYLE = {
  stroke: '#e5e7eb',
  strokeDasharray: '3 3',
};

export const CHART_AXIS_STYLE = {
  stroke: '#9ca3af',
  fontSize: 12,
  tickLine: false,
  axisLine: { stroke: '#e5e7eb' },
};

// Tooltip styling
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },
  labelStyle: {
    color: '#374151',
    fontWeight: 600,
    marginBottom: '4px',
  },
};

// Legend styling
export const CHART_LEGEND_STYLE = {
  wrapperStyle: {
    paddingTop: '16px',
  },
  iconType: 'circle' as const,
  iconSize: 10,
};

// Gradient definitions for area charts
export const createGradient = (id: string, color: string) => ({
  id,
  x1: '0',
  y1: '0',
  x2: '0',
  y2: '1',
  stops: [
    { offset: '5%', color, opacity: 0.3 },
    { offset: '95%', color, opacity: 0 },
  ],
});

// Animation config
export const CHART_ANIMATION = {
  duration: 500,
  easing: 'ease-out' as const,
};

// Chart wrapper styling for dark mode support
export const CHART_WRAPPER_CLASSES = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4';

// Metric card color schemes
export const METRIC_CARD_COLORS = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20',
    border: 'border-blue-200/60 dark:border-blue-700/60',
    text: 'text-blue-700 dark:text-blue-300',
    value: 'text-blue-900 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-800/50',
    progress: 'bg-blue-100 dark:bg-blue-800/50',
    bar: 'bg-gradient-to-r from-blue-500 to-blue-600',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-100/50 dark:from-green-900/20 dark:to-emerald-800/20',
    border: 'border-green-200/60 dark:border-green-700/60',
    text: 'text-green-700 dark:text-green-300',
    value: 'text-green-900 dark:text-green-100',
    icon: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-800/50',
    progress: 'bg-green-100 dark:bg-green-800/50',
    bar: 'bg-gradient-to-r from-green-500 to-emerald-500',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-violet-100/50 dark:from-purple-900/20 dark:to-violet-800/20',
    border: 'border-purple-200/60 dark:border-purple-700/60',
    text: 'text-purple-700 dark:text-purple-300',
    value: 'text-purple-900 dark:text-purple-100',
    icon: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-800/50',
    progress: 'bg-purple-100 dark:bg-purple-800/50',
    bar: 'bg-gradient-to-r from-purple-500 to-violet-500',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-100/50 dark:from-amber-900/20 dark:to-yellow-800/20',
    border: 'border-amber-200/60 dark:border-amber-700/60',
    text: 'text-amber-700 dark:text-amber-300',
    value: 'text-amber-900 dark:text-amber-100',
    icon: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-800/50',
    progress: 'bg-amber-100 dark:bg-amber-800/50',
    bar: 'bg-gradient-to-r from-amber-500 to-yellow-500',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-50 to-sky-100/50 dark:from-cyan-900/20 dark:to-sky-800/20',
    border: 'border-cyan-200/60 dark:border-cyan-700/60',
    text: 'text-cyan-700 dark:text-cyan-300',
    value: 'text-cyan-900 dark:text-cyan-100',
    icon: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-800/50',
    progress: 'bg-cyan-100 dark:bg-cyan-800/50',
    bar: 'bg-gradient-to-r from-cyan-500 to-sky-500',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50 to-rose-100/50 dark:from-pink-900/20 dark:to-rose-800/20',
    border: 'border-pink-200/60 dark:border-pink-700/60',
    text: 'text-pink-700 dark:text-pink-300',
    value: 'text-pink-900 dark:text-pink-100',
    icon: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-100 dark:bg-pink-800/50',
    progress: 'bg-pink-100 dark:bg-pink-800/50',
    bar: 'bg-gradient-to-r from-pink-500 to-rose-500',
  },
};

export type MetricCardColor = keyof typeof METRIC_CARD_COLORS;
