'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import { todayPacificDateString } from '@/utils/date';

const QUICK_PRESETS = [
  { id: 'today', label: 'Today', icon: Clock },
  { id: 'thisWeek', label: 'This Week', icon: Calendar },
  { id: 'thisMonth', label: 'This Month', icon: Calendar },
  { id: 'thisYear', label: 'This Year', icon: Calendar },
  { id: 'last30', label: 'Last 30 Days', icon: TrendingUp },
  { id: 'last90', label: 'Last 90 Days', icon: TrendingUp },
  { id: 'custom', label: 'Custom Range', icon: Calendar },
] as const;

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const;

type PresetId = typeof QUICK_PRESETS[number]['id'];

interface TimeRangeFilterOutput {
  startDate: string;
  endDate: string;
  selectedDays: number[] | null;
  comparisonEnabled: boolean;
  preset: PresetId;
}

interface TimeRangeFilterProps {
  onChange?: (filter: TimeRangeFilterOutput) => void;
  mode?: 'beginner' | 'power';
  showDaySelector?: boolean;
  showComparison?: boolean;
  defaultPreset?: PresetId;
}

export function TimeRangeFilter({
  onChange,
  mode = 'power',
  showDaySelector = false,
  showComparison = false,
  defaultPreset = 'thisMonth',
}: TimeRangeFilterProps) {
  const getPresetDates = useCallback((presetId: PresetId): { startDate: string; endDate: string } | null => {
    const now = new Date();
    const pacificNow = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    );

    switch (presetId) {
      case 'today': {
        const today = todayPacificDateString();
        return { startDate: today, endDate: today };
      }
      case 'thisWeek': {
        const dayOfWeek = pacificNow.getDay();
        const startOfWeek = new Date(pacificNow);
        startOfWeek.setDate(pacificNow.getDate() - dayOfWeek);
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: todayPacificDateString(),
        };
      }
      case 'thisMonth': {
        const startOfMonth = new Date(
          pacificNow.getFullYear(),
          pacificNow.getMonth(),
          1
        );
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: todayPacificDateString(),
        };
      }
      case 'thisYear': {
        const startOfYear = new Date(pacificNow.getFullYear(), 0, 1);
        return {
          startDate: startOfYear.toISOString().split('T')[0],
          endDate: todayPacificDateString(),
        };
      }
      case 'last30': {
        const thirtyDaysAgo = new Date(pacificNow);
        thirtyDaysAgo.setDate(pacificNow.getDate() - 30);
        return {
          startDate: thirtyDaysAgo.toISOString().split('T')[0],
          endDate: todayPacificDateString(),
        };
      }
      case 'last90': {
        const ninetyDaysAgo = new Date(pacificNow);
        ninetyDaysAgo.setDate(pacificNow.getDate() - 90);
        return {
          startDate: ninetyDaysAgo.toISOString().split('T')[0],
          endDate: todayPacificDateString(),
        };
      }
      default:
        return null;
    }
  }, []);

  const [activePreset, setActivePreset] = useState<PresetId>(defaultPreset);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const dates = getPresetDates(defaultPreset);
    return dates ? dates.startDate : todayPacificDateString();
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const dates = getPresetDates(defaultPreset);
    return dates ? dates.endDate : todayPacificDateString();
  });
  const [selectedDays, setSelectedDays] = useState([1, 3, 5, 6]); // Mon, Wed, Fri, Sat
  const [comparisonEnabled, setComparisonEnabled] = useState(false);

  const currentDates = useMemo(() => {
    if (activePreset === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return getPresetDates(activePreset);
  }, [activePreset, customStartDate, customEndDate, getPresetDates]);

  const handlePresetClick = useCallback(
    (presetId: PresetId) => {
      setActivePreset(presetId);
      if (presetId !== 'custom') {
        const dates = getPresetDates(presetId);
        if (dates && onChange) {
          onChange({
            startDate: dates.startDate,
            endDate: dates.endDate,
            selectedDays: showDaySelector ? selectedDays : null,
            comparisonEnabled: showComparison ? comparisonEnabled : false,
            preset: presetId,
          });
        }
      }
    },
    [getPresetDates, onChange, selectedDays, comparisonEnabled, showDaySelector, showComparison]
  );

  const handleCustomDateChange = useCallback(
    (type: 'start' | 'end', value: string) => {
      if (type === 'start') {
        setCustomStartDate(value);
        if (onChange && activePreset === 'custom') {
          onChange({
            startDate: value,
            endDate: customEndDate,
            selectedDays: showDaySelector ? selectedDays : null,
            comparisonEnabled: showComparison ? comparisonEnabled : false,
            preset: 'custom',
          });
        }
      } else {
        setCustomEndDate(value);
        if (onChange && activePreset === 'custom') {
          onChange({
            startDate: customStartDate,
            endDate: value,
            selectedDays: showDaySelector ? selectedDays : null,
            comparisonEnabled: showComparison ? comparisonEnabled : false,
            preset: 'custom',
          });
        }
      }
    },
    [
      customStartDate,
      customEndDate,
      activePreset,
      onChange,
      selectedDays,
      comparisonEnabled,
      showDaySelector,
      showComparison,
    ]
  );

  const handleDayToggle = useCallback(
    (dayValue: number) => {
      const newSelectedDays = selectedDays.includes(dayValue)
        ? selectedDays.filter((d) => d !== dayValue)
        : [...selectedDays, dayValue].sort((a, b) => a - b);

      setSelectedDays(newSelectedDays);
      if (onChange && currentDates) {
        onChange({
          ...currentDates,
          selectedDays: newSelectedDays,
          comparisonEnabled: showComparison ? comparisonEnabled : false,
          preset: activePreset,
        });
      }
    },
    [selectedDays, onChange, currentDates, comparisonEnabled, showComparison, activePreset]
  );

  const handleComparisonToggle = useCallback(() => {
    const newValue = !comparisonEnabled;
    setComparisonEnabled(newValue);
    if (onChange && currentDates) {
      onChange({
        ...currentDates,
        selectedDays: showDaySelector ? selectedDays : null,
        comparisonEnabled: newValue,
        preset: activePreset,
      });
    }
  }, [comparisonEnabled, onChange, currentDates, selectedDays, showDaySelector, activePreset]);

  const dateRangeSummary = useMemo(() => {
    if (!currentDates) return '';
    const start = new Date(currentDates.startDate);
    const end = new Date(currentDates.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }, [currentDates]);

  // Beginner mode: Large buttons, simplified
  if (mode === 'beginner') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-blue-600" />
          Select Time Period
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {QUICK_PRESETS.filter((p) => p.id !== 'custom').map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  activePreset === preset.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <Icon
                  size={32}
                  className={activePreset === preset.id ? 'text-white' : 'text-blue-500'}
                />
                <span className="font-medium text-base">{preset.label}</span>
              </button>
            );
          })}
        </div>
        {currentDates && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              <span className="font-semibold">Selected:</span>{' '}
              {new Date(currentDates.startDate).toLocaleDateString()} -{' '}
              {new Date(currentDates.endDate).toLocaleDateString()} ({dateRangeSummary})
            </p>
          </div>
        )}
      </div>
    );
  }

  // Power user mode: Compact, feature-rich
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Quick Presets */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Select
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  activePreset === preset.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        {activePreset === 'custom' && (
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        {/* Day Selector */}
        {showDaySelector && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Days of Week
            </label>
            <div className="flex gap-1">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  onClick={() => handleDayToggle(day.value)}
                  className={`w-9 h-9 text-xs font-medium rounded-lg border transition-colors ${
                    selectedDays.includes(day.value)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                  title={day.label}
                >
                  {day.short[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comparison Toggle */}
        {showComparison && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="comparison"
              checked={comparisonEnabled}
              onChange={handleComparisonToggle}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="comparison" className="text-sm text-gray-700 dark:text-gray-300">
              Compare to previous period
            </label>
          </div>
        )}
      </div>

      {/* Date Summary */}
      {currentDates && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing data from{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {new Date(currentDates.startDate).toLocaleDateString()}
            </span>{' '}
            to{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {new Date(currentDates.endDate).toLocaleDateString()}
            </span>{' '}
            ({dateRangeSummary})
          </p>
        </div>
      )}
    </div>
  );
}

export default TimeRangeFilter;
