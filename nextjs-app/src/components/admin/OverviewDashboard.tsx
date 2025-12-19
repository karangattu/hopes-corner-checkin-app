'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Utensils,
  Target,
  TrendingUp,
  Save,
  X,
  Calendar,
  Scissors,
  Gift,
  Bike,
  ShowerHead,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';
import { MetricCard, MetricGrid } from '../charts/MetricCard';
import type { MetricCardColor } from '../charts/ChartTheme';

// Default targets for the service metrics
const DEFAULT_TARGETS = {
  monthlyMeals: 1500,
  yearlyMeals: 18000,
  monthlyShowers: 300,
  yearlyShowers: 3600,
  monthlyLaundry: 200,
  yearlyLaundry: 2400,
  monthlyBicycles: 50,
  yearlyBicycles: 600,
  monthlyHaircuts: 100,
  yearlyHaircuts: 1200,
  monthlyHolidays: 80,
  yearlyHolidays: 960,
};

type Targets = typeof DEFAULT_TARGETS;
type TargetKey = keyof Targets;

interface TargetField {
  key: TargetKey;
  label: string;
}

// Target field configuration
const TARGET_FIELD_GROUPS: { monthly: TargetField[]; yearly: TargetField[] } = {
  monthly: [
    { key: 'monthlyMeals', label: 'Meals' },
    { key: 'monthlyShowers', label: 'Showers' },
    { key: 'monthlyLaundry', label: 'Laundry' },
    { key: 'monthlyBicycles', label: 'Bicycle Repairs' },
    { key: 'monthlyHaircuts', label: 'Haircuts' },
    { key: 'monthlyHolidays', label: 'Holiday Services' },
  ],
  yearly: [
    { key: 'yearlyMeals', label: 'Meals' },
    { key: 'yearlyShowers', label: 'Showers' },
    { key: 'yearlyLaundry', label: 'Laundry' },
    { key: 'yearlyBicycles', label: 'Bicycle Repairs' },
    { key: 'yearlyHaircuts', label: 'Haircuts' },
    { key: 'yearlyHolidays', label: 'Holiday Services' },
  ],
};

interface ServiceMetrics {
  mealsServed: number;
  showersBooked: number;
  laundryLoads: number;
  bicycles: number;
  haircuts: number;
  holidays: number;
}

interface OverviewDashboardProps {
  monthMetrics: ServiceMetrics;
  yearMetrics: ServiceMetrics;
  targets?: Partial<Targets>;
  onTargetsUpdate?: (targets: Targets) => void;
}

// Helper to format targets for editing
const formatTargetsForEditing = (targets: Partial<Targets> = {}): Record<TargetKey, string> => {
  const result = {} as Record<TargetKey, string>;
  for (const key of Object.keys(DEFAULT_TARGETS) as TargetKey[]) {
    const value = targets[key] ?? DEFAULT_TARGETS[key];
    result[key] = value === undefined || value === null ? '' : value.toString();
  }
  return result;
};

// Helper to parse targets for saving
const parseTargetsForSaving = (targets: Record<TargetKey, string>): Targets => {
  const result = {} as Targets;
  for (const key of Object.keys(DEFAULT_TARGETS) as TargetKey[]) {
    const value = targets[key];
    if (value === '' || value === null || value === undefined) {
      result[key] = 0;
    } else {
      const numericValue = parseInt(value, 10);
      result[key] = Number.isNaN(numericValue) ? 0 : numericValue;
    }
  }
  return result;
};

export function OverviewDashboard({
  monthMetrics,
  yearMetrics,
  targets = DEFAULT_TARGETS,
  onTargetsUpdate,
}: OverviewDashboardProps) {
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  
  // Calculate formatted targets based on props - derived state, no effect needed
  const formattedTargets = useMemo(() => formatTargetsForEditing(targets), [targets]);
  
  const [tempTargets, setTempTargets] = useState<Record<TargetKey, string>>(formattedTargets);

  // Handle target changes
  const handleTargetChange = useCallback((field: TargetKey, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setTempTargets((prev) => ({
      ...prev,
      [field]: sanitized,
    }));
  }, []);

  const saveTargets = useCallback(() => {
    const parsedTargets = parseTargetsForSaving(tempTargets);
    onTargetsUpdate?.(parsedTargets);
    setIsEditingTargets(false);
  }, [tempTargets, onTargetsUpdate]);

  const cancelEdit = useCallback(() => {
    setTempTargets(formattedTargets);
    setIsEditingTargets(false);
  }, [formattedTargets]);

  const handleToggleEditor = useCallback(() => {
    if (!isEditingTargets) {
      setTempTargets(formattedTargets);
      setIsEditingTargets(true);
    } else {
      setIsEditingTargets(false);
    }
  }, [isEditingTargets, formattedTargets]);

  // Get merged targets with defaults
  const currentTargets = useMemo(() => ({
    ...DEFAULT_TARGETS,
    ...targets,
  }), [targets]);

  // Metric card configurations - use LucideIcon type
  const metricConfigs: Array<{
    title: string;
    icon: LucideIcon;
    monthKey: keyof ServiceMetrics;
    monthTargetKey: TargetKey;
    yearTargetKey: TargetKey;
    colorClass: MetricCardColor;
  }> = [
    {
      title: 'Meals',
      icon: Utensils,
      monthKey: 'mealsServed',
      monthTargetKey: 'monthlyMeals',
      yearTargetKey: 'yearlyMeals',
      colorClass: 'green',
    },
    {
      title: 'Showers',
      icon: ShowerHead,
      monthKey: 'showersBooked',
      monthTargetKey: 'monthlyShowers',
      yearTargetKey: 'yearlyShowers',
      colorClass: 'blue',
    },
    {
      title: 'Laundry',
      icon: WashingMachine,
      monthKey: 'laundryLoads',
      monthTargetKey: 'monthlyLaundry',
      yearTargetKey: 'yearlyLaundry',
      colorClass: 'purple',
    },
    {
      title: 'Bicycles',
      icon: Bike,
      monthKey: 'bicycles',
      monthTargetKey: 'monthlyBicycles',
      yearTargetKey: 'yearlyBicycles',
      colorClass: 'cyan',
    },
    {
      title: 'Haircuts',
      icon: Scissors,
      monthKey: 'haircuts',
      monthTargetKey: 'monthlyHaircuts',
      yearTargetKey: 'yearlyHaircuts',
      colorClass: 'amber',
    },
    {
      title: 'Holiday',
      icon: Gift,
      monthKey: 'holidays',
      monthTargetKey: 'monthlyHolidays',
      yearTargetKey: 'yearlyHolidays',
      colorClass: 'pink',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header with Target Management */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/50 dark:border-emerald-700/50 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-900/20 dark:via-gray-800 dark:to-blue-900/20 p-8 shadow-lg">
        {/* Decorative background elements */}
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-32 translate-x-32 rounded-full bg-gradient-to-br from-emerald-200/30 to-blue-200/30 dark:from-emerald-600/10 dark:to-blue-600/10 blur-3xl" />
        <div className="absolute left-0 bottom-0 h-48 w-48 translate-y-24 -translate-x-24 rounded-full bg-gradient-to-tr from-blue-200/30 to-emerald-200/30 dark:from-blue-600/10 dark:to-emerald-600/10 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 p-3 shadow-lg">
                <TrendingUp size={24} className="text-white" />
              </div>
              Dashboard Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm md:text-base">
              Monitor daily operations and track progress toward your goals
            </p>
          </div>
          {onTargetsUpdate && (
            <button
              onClick={handleToggleEditor}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 w-fit font-semibold shadow-md hover:shadow-lg ${
                isEditingTargets
                  ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
              }`}
              type="button"
            >
              <Target size={18} />
              {isEditingTargets ? 'Hide Editor' : 'Edit Targets'}
            </button>
          )}
        </div>
      </div>

      {/* Inline Target Editor */}
      {isEditingTargets && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-900 dark:text-blue-200">
              <Target size={20} />
              Edit Monthly & Yearly Targets
            </h2>
            <button
              onClick={cancelEdit}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded transition-colors"
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-4">Monthly Targets</h3>
              <div className="space-y-3">
                {TARGET_FIELD_GROUPS.monthly.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label htmlFor={key} className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {label}
                    </label>
                    <input
                      id={key}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tempTargets[key] ?? ''}
                      onChange={(e) => handleTargetChange(key, e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-4">Yearly Targets</h3>
              <div className="space-y-3">
                {TARGET_FIELD_GROUPS.yearly.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label htmlFor={key} className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {label}
                    </label>
                    <input
                      id={key}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tempTargets[key] ?? ''}
                      onChange={(e) => handleTargetChange(key, e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-blue-200 dark:border-blue-700">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={saveTargets}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              type="button"
            >
              <Save size={16} />
              Save Targets
            </button>
          </div>
        </div>
      )}

      {/* Monthly Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
          <div className="bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-800/50 dark:to-green-800/50 rounded-lg p-2">
            <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          Monthly Progress
        </h2>
        <MetricGrid>
          {metricConfigs.map((config) => (
            <MetricCard
              key={`month-${config.monthKey}`}
              title={config.title}
              icon={config.icon}
              value={monthMetrics[config.monthKey]}
              target={currentTargets[config.monthTargetKey]}
              colorScheme={config.colorClass}
            />
          ))}
        </MetricGrid>
      </div>

      {/* Yearly Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-800/50 dark:to-indigo-800/50 rounded-lg p-2">
            <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          Yearly Progress
        </h2>
        <MetricGrid>
          {metricConfigs.map((config) => (
            <MetricCard
              key={`year-${config.monthKey}`}
              title={config.title}
              icon={config.icon}
              value={yearMetrics[config.monthKey]}
              target={currentTargets[config.yearTargetKey]}
              colorScheme={config.colorClass}
            />
          ))}
        </MetricGrid>
      </div>
    </div>
  );
}

export default OverviewDashboard;
