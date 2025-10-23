import React, { useState, useMemo, useCallback } from "react";
import { Calendar, Clock, TrendingUp, X } from "lucide-react";
import { todayPacificDateString } from "../../utils/date";

const QUICK_PRESETS = [
  { id: "today", label: "Today", icon: Clock },
  { id: "thisWeek", label: "This Week", icon: Calendar },
  { id: "thisMonth", label: "This Month", icon: Calendar },
  { id: "thisYear", label: "This Year", icon: Calendar },
  { id: "last30", label: "Last 30 Days", icon: TrendingUp },
  { id: "last90", label: "Last 90 Days", icon: TrendingUp },
  { id: "custom", label: "Custom Range", icon: Calendar },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

/**
 * TimeRangeFilter - Universal time-based filtering component
 *
 * Features:
 * - Quick preset buttons (Today, This Week, etc.)
 * - Custom date range picker
 * - Day-of-week selector for recurring patterns
 * - Comparison mode (compare to previous period)
 * - Beginner vs Power User modes
 *
 * @param {Object} props
 * @param {Function} props.onChange - Callback when filter changes: ({ startDate, endDate, selectedDays, comparisonEnabled, preset })
 * @param {String} props.mode - 'beginner' | 'power' (default: 'power')
 * @param {Boolean} props.showDaySelector - Show day-of-week selector (default: false)
 * @param {Boolean} props.showComparison - Show comparison toggle (default: false)
 * @param {String} props.defaultPreset - Default preset ID (default: 'thisMonth')
 */
const TimeRangeFilter = ({
  onChange,
  mode = "power",
  showDaySelector = false,
  showComparison = false,
  defaultPreset = "thisMonth",
}) => {
  const getPresetDates = useCallback((presetId) => {
    const now = new Date();
    const pacificNow = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
    );

    switch (presetId) {
      case "today": {
        const today = todayPacificDateString();
        return { startDate: today, endDate: today };
      }
      case "thisWeek": {
        const dayOfWeek = pacificNow.getDay();
        const startOfWeek = new Date(pacificNow);
        startOfWeek.setDate(pacificNow.getDate() - dayOfWeek);
        return {
          startDate: startOfWeek.toISOString().split("T")[0],
          endDate: todayPacificDateString(),
        };
      }
      case "thisMonth": {
        const startOfMonth = new Date(
          pacificNow.getFullYear(),
          pacificNow.getMonth(),
          1
        );
        return {
          startDate: startOfMonth.toISOString().split("T")[0],
          endDate: todayPacificDateString(),
        };
      }
      case "thisYear": {
        const startOfYear = new Date(pacificNow.getFullYear(), 0, 1);
        return {
          startDate: startOfYear.toISOString().split("T")[0],
          endDate: todayPacificDateString(),
        };
      }
      case "last30": {
        const thirtyDaysAgo = new Date(pacificNow);
        thirtyDaysAgo.setDate(pacificNow.getDate() - 30);
        return {
          startDate: thirtyDaysAgo.toISOString().split("T")[0],
          endDate: todayPacificDateString(),
        };
      }
      case "last90": {
        const ninetyDaysAgo = new Date(pacificNow);
        ninetyDaysAgo.setDate(pacificNow.getDate() - 90);
        return {
          startDate: ninetyDaysAgo.toISOString().split("T")[0],
          endDate: todayPacificDateString(),
        };
      }
      default:
        return null;
    }
  }, []);

  const [activePreset, setActivePreset] = useState(defaultPreset);
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
    if (activePreset === "custom") {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    return getPresetDates(activePreset);
  }, [activePreset, customStartDate, customEndDate, getPresetDates]);

  const handlePresetClick = useCallback(
    (presetId) => {
      setActivePreset(presetId);
      if (presetId !== "custom") {
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
    [
      getPresetDates,
      onChange,
      selectedDays,
      comparisonEnabled,
      showDaySelector,
      showComparison,
    ]
  );

  const handleCustomDateChange = useCallback(
    (type, value) => {
      if (type === "start") {
        setCustomStartDate(value);
        if (onChange && activePreset === "custom") {
          onChange({
            startDate: value,
            endDate: customEndDate,
            selectedDays: showDaySelector ? selectedDays : null,
            comparisonEnabled: showComparison ? comparisonEnabled : false,
            preset: "custom",
          });
        }
      } else {
        setCustomEndDate(value);
        if (onChange && activePreset === "custom") {
          onChange({
            startDate: customStartDate,
            endDate: value,
            selectedDays: showDaySelector ? selectedDays : null,
            comparisonEnabled: showComparison ? comparisonEnabled : false,
            preset: "custom",
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
    (dayValue) => {
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
    [
      selectedDays,
      onChange,
      currentDates,
      comparisonEnabled,
      showComparison,
      activePreset,
    ]
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
  }, [
    comparisonEnabled,
    onChange,
    currentDates,
    selectedDays,
    showDaySelector,
    activePreset,
  ]);

  const dateRangeSummary = useMemo(() => {
    if (!currentDates) return "";
    const start = new Date(currentDates.startDate);
    const end = new Date(currentDates.endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  }, [currentDates]);

  // Beginner mode: Large buttons, simplified
  if (mode === "beginner") {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-blue-600" />
          Select Time Period
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {QUICK_PRESETS.filter((p) => p.id !== "custom").map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${
                  activePreset === preset.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md"
                }`}
              >
                <Icon
                  size={32}
                  className={activePreset === preset.id ? "text-white" : "text-blue-500"}
                />
                <span className="font-medium text-base">{preset.label}</span>
              </button>
            );
          })}
        </div>
        {currentDates && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Selected:</span>{" "}
              {new Date(currentDates.startDate).toLocaleDateString()} -{" "}
              {new Date(currentDates.endDate).toLocaleDateString()} (
              {dateRangeSummary})
            </p>
          </div>
        )}
      </div>
    );
  }

  // Power user mode: Compact, feature-rich
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Quick Presets */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Select
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm ${
                    activePreset === preset.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <Icon size={14} />
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range (shown when custom is selected) */}
        {activePreset === "custom" && (
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => handleCustomDateChange("start", e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => handleCustomDateChange("end", e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Day of Week Selector */}
      {showDaySelector && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Days of Week
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                onClick={() => handleDayToggle(day.value)}
                className={`px-3 py-1.5 rounded-lg border transition-all text-xs ${
                  selectedDays.includes(day.value)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {day.short}
              </button>
            ))}
            {selectedDays.length === 0 && (
              <p className="text-red-600 text-xs">Select at least one day</p>
            )}
          </div>
        </div>
      )}

      {/* Comparison Mode Toggle */}
      {showComparison && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={comparisonEnabled}
              onChange={handleComparisonToggle}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Compare to previous period
            </span>
          </label>
        </div>
      )}

      {/* Summary */}
      {currentDates && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              <span className="font-semibold text-gray-800">Range:</span>{" "}
              {new Date(currentDates.startDate).toLocaleDateString()} -{" "}
              {new Date(currentDates.endDate).toLocaleDateString()}
            </span>
            <span className="font-semibold text-blue-600">{dateRangeSummary}</span>
          </div>
          {showDaySelector && selectedDays.length > 0 && (
            <div className="mt-1 text-xs text-gray-600">
              <span className="font-semibold text-gray-800">Days:</span>{" "}
              {selectedDays
                .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.short)
                .join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeRangeFilter;
