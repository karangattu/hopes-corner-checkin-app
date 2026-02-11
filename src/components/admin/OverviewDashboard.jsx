import React, { useState, useMemo, useCallback } from "react";
import { LAUNDRY_STATUS } from "../../context/constants";
import {
  Utensils,
  ShowerHead,
  WashingMachine,
  Calendar,
  Target,
  TrendingUp,
  Save,
  X,
} from "lucide-react";
import { Scissors, Gift, Bike } from "lucide-react";
import { useAppContext } from "../../context/useAppContext";
import { useAuth } from "../../context/useAuth";
import { animated as Animated } from "@react-spring/web";
import { SpringIcon } from "../../utils/animations";
import DailyNotesSection from "../DailyNotesSection";
import {
  getBicycleServiceCount,
  isBicycleStatusCountable,
} from "../../utils/bicycles";

// Helper functions defined outside component to avoid hoisting issues
const calculateProgress = (current, target) => {
  if (!target) return 0;
  return Math.min((current / target) * 100, 100);
};

const getProgressColor = (progress) => {
  if (progress >= 90) return "text-green-600";
  if (progress >= 70) return "text-yellow-600";
  return "text-blue-600";
};

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

const formatTargetsForEditing = (targets = DEFAULT_TARGETS) =>
  Object.fromEntries(
    Object.entries(targets).map(([key, value]) => [
      key,
      value === undefined || value === null ? "" : value.toString(),
    ]),
  );

const parseTargetsForSaving = (targets) =>
  Object.fromEntries(
    Object.entries(targets).map(([key, value]) => {
      if (value === "" || value === null || value === undefined) {
        return [key, 0];
      }

      const numericValue = parseInt(value, 10);
      return [key, Number.isNaN(numericValue) ? 0 : numericValue];
    }),
  );

// MetricCard component defined outside to avoid hoisting issues
const MetricCard = ({ title, icon, value, target, colorClass = "blue" }) => {
  const progress = calculateProgress(value, target);
  const progressColor = getProgressColor(progress);

  const colorClasses = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100/50",
      border: "border-blue-200/60",
      text: "text-blue-700",
      value: "text-blue-900",
      icon: "text-blue-600",
      iconBg: "bg-blue-100",
      progress: "bg-blue-100",
      bar: "bg-gradient-to-r from-blue-500 to-blue-600",
      shadow: "shadow-blue-100/50",
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-100/50",
      border: "border-green-200/60",
      text: "text-green-700",
      value: "text-green-900",
      icon: "text-green-600",
      iconBg: "bg-green-100",
      progress: "bg-green-100",
      bar: "bg-gradient-to-r from-green-500 to-emerald-500",
      shadow: "shadow-green-100/50",
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-violet-100/50",
      border: "border-purple-200/60",
      text: "text-purple-700",
      value: "text-purple-900",
      icon: "text-purple-600",
      iconBg: "bg-purple-100",
      progress: "bg-purple-100",
      bar: "bg-gradient-to-r from-purple-500 to-violet-500",
      shadow: "shadow-purple-100/50",
    },
    sky: {
      bg: "bg-gradient-to-br from-sky-50 to-cyan-100/50",
      border: "border-sky-200/60",
      text: "text-sky-700",
      value: "text-sky-900",
      icon: "text-sky-600",
      iconBg: "bg-sky-100",
      progress: "bg-sky-100",
      bar: "bg-gradient-to-r from-sky-500 to-cyan-500",
      shadow: "shadow-sky-100/50",
    },
    yellow: {
      bg: "bg-gradient-to-br from-yellow-50 to-amber-100/50",
      border: "border-yellow-200/60",
      text: "text-yellow-700",
      value: "text-yellow-900",
      icon: "text-yellow-600",
      iconBg: "bg-yellow-100",
      progress: "bg-yellow-100",
      bar: "bg-gradient-to-r from-yellow-500 to-amber-500",
      shadow: "shadow-yellow-100/50",
    },
    pink: {
      bg: "bg-gradient-to-br from-pink-50 to-rose-100/50",
      border: "border-pink-200/60",
      text: "text-pink-700",
      value: "text-pink-900",
      icon: "text-pink-600",
      iconBg: "bg-pink-100",
      progress: "bg-pink-100",
      bar: "bg-gradient-to-r from-pink-500 to-rose-500",
      shadow: "shadow-pink-100/50",
    },
  };

  const colors = colorClasses[colorClass] || colorClasses.blue;
  const IconComponent = icon;

  return (
    <div
      className={`${colors.bg} rounded-2xl p-4 ${colors.border} border relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group`}
    >
      {/* Decorative gradient orb */}
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${colors.iconBg} opacity-40 blur-xl group-hover:opacity-60 transition-opacity`} />
      
      <div className="flex justify-between items-start mb-3 relative">
        <div className="flex-1">
          <h3 className={`${colors.text} font-semibold text-sm mb-1`}>{title}</h3>
          <p className={`text-3xl font-bold ${colors.value} tracking-tight`}>
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`${colors.iconBg} rounded-xl p-2.5 shadow-sm`}>
          <SpringIcon>
            <IconComponent className={colors.icon} size={22} strokeWidth={2.5} />
          </SpringIcon>
        </div>
      </div>

      {target && (
        <div className="space-y-2 relative">
          <div className="flex justify-between items-center text-xs">
            <span className={`${colors.text} font-medium`}>
              Target: {target.toLocaleString()}
            </span>
            <span className={`${progressColor} font-bold`}>{progress.toFixed(0)}%</span>
          </div>
          <div className={`w-full ${colors.progress} rounded-full h-2.5 overflow-hidden`}>
            <div
              className={`${colors.bar} h-2.5 rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const OverviewDashboard = ({
  monthGridAnim,
  yearGridAnim,
}) => {
  const {
    settings,
    updateSettings,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    haircutRecords,
    holidayRecords,
  } = useAppContext();
  const { user } = useAuth();

  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [tempTargets, setTempTargets] = useState(() =>
    formatTargetsForEditing(settings.targets ?? DEFAULT_TARGETS),
  );

  // Keep temp targets in sync when not actively editing
  React.useEffect(() => {
    if (!isEditingTargets) {
      setTempTargets(
        formatTargetsForEditing(settings.targets ?? DEFAULT_TARGETS),
      );
    }
  }, [settings.targets, isEditingTargets]);

  // Handle target changes (allow digits only, permit empty string during editing)
  const handleTargetChange = useCallback((field, value) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setTempTargets((prev) => ({
      ...prev,
      [field]: sanitized,
    }));
  }, []);

  const saveTargets = useCallback(() => {
    const parsedTargets = parseTargetsForSaving(tempTargets);
    updateSettings({ targets: parsedTargets });
    setIsEditingTargets(false);
  }, [tempTargets, updateSettings]);

  const cancelEdit = useCallback(() => {
    setTempTargets(
      formatTargetsForEditing(settings.targets ?? DEFAULT_TARGETS),
    );
    setIsEditingTargets(false);
  }, [settings.targets]);

  const handleToggleEditor = useCallback(() => {
    if (!isEditingTargets) {
      setTempTargets(
        formatTargetsForEditing(settings.targets ?? DEFAULT_TARGETS),
      );
      setIsEditingTargets(true);
    } else {
      setIsEditingTargets(false);
    }
  }, [isEditingTargets, settings.targets]);

  const completedLaundryStatuses = useMemo(
    () =>
      new Set([
        LAUNDRY_STATUS?.DONE,
        LAUNDRY_STATUS?.PICKED_UP,
        LAUNDRY_STATUS?.RETURNED,
        LAUNDRY_STATUS?.OFFSITE_PICKED_UP,
      ]),
    [],
  );

  const isLaundryCompleted = useCallback(
    (status) => completedLaundryStatuses.has(status),
    [completedLaundryStatuses],
  );

  const isCompletedBicycleStatus = useCallback(
    (status) => isBicycleStatusCountable(status),
    [],
  );

  // Calculate month and year metrics with progress tracking
  const { monthMetrics, yearMetrics } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Parse date safely - if it's a date-only string (YYYY-MM-DD), 
    // append T12:00:00 to ensure local timezone interpretation
    const parseDate = (date) => {
      if (!date) return null;
      const dateStr = typeof date === 'string' ? date : date.toISOString?.();
      if (!dateStr) return null;
      // If it's a date-only format (YYYY-MM-DD), parse it as local noon to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr + 'T12:00:00');
      }
      return new Date(dateStr);
    };

    const isCurrentMonth = (date) => {
      const d = parseDate(date);
      if (!d || isNaN(d.getTime())) return false;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    const isCurrentYear = (date) => {
      const d = parseDate(date);
      if (!d || isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear;
    };

    const monthMeals = [
      ...mealRecords,
      ...rvMealRecords,
      ...shelterMealRecords,
      ...unitedEffortMealRecords,
      ...extraMealRecords,
      ...dayWorkerMealRecords,
    ]
      .filter((r) => isCurrentMonth(r.date))
      .reduce((sum, r) => sum + (r.count || 0), 0);

    const yearMeals = [
      ...mealRecords,
      ...rvMealRecords,
      ...shelterMealRecords,
      ...unitedEffortMealRecords,
      ...extraMealRecords,
      ...dayWorkerMealRecords,
    ]
      .filter((r) => isCurrentYear(r.date))
      .reduce((sum, r) => sum + (r.count || 0), 0);

    const monthShowers = showerRecords.filter(
      (r) => isCurrentMonth(r.date) && r.status === "done",
    ).length;
    const yearShowers = showerRecords.filter(
      (r) => isCurrentYear(r.date) && r.status === "done",
    ).length;

    const monthLaundry = laundryRecords.filter(
      (r) => isCurrentMonth(r.date) && isLaundryCompleted(r.status),
    ).length;
    const yearLaundry = laundryRecords.filter(
      (r) => isCurrentYear(r.date) && isLaundryCompleted(r.status),
    ).length;

    const monthBicycles = bicycleRecords
      .filter(
        (r) => isCurrentMonth(r.date) && isCompletedBicycleStatus(r.status),
      )
      .reduce((sum, record) => sum + getBicycleServiceCount(record), 0);
    const yearBicycles = bicycleRecords
      .filter(
        (r) => isCurrentYear(r.date) && isCompletedBicycleStatus(r.status),
      )
      .reduce((sum, record) => sum + getBicycleServiceCount(record), 0);

    const monthHaircuts = haircutRecords.filter((r) =>
      isCurrentMonth(r.date),
    ).length;
    const yearHaircuts = haircutRecords.filter((r) =>
      isCurrentYear(r.date),
    ).length;

    const monthHolidays = holidayRecords.filter((r) =>
      isCurrentMonth(r.date),
    ).length;
    const yearHolidays = holidayRecords.filter((r) =>
      isCurrentYear(r.date),
    ).length;

    return {
      monthMetrics: {
        mealsServed: monthMeals,
        showersBooked: monthShowers,
        laundryLoads: monthLaundry,
        bicycles: monthBicycles,
        haircuts: monthHaircuts,
        holidays: monthHolidays,
      },
      yearMetrics: {
        mealsServed: yearMeals,
        showersBooked: yearShowers,
        laundryLoads: yearLaundry,
        bicycles: yearBicycles,
        haircuts: yearHaircuts,
        holidays: yearHolidays,
      },
    };
  }, [
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    haircutRecords,
    holidayRecords,
    isLaundryCompleted,
    isCompletedBicycleStatus,
  ]);

  const targetFieldGroups = {
    monthly: [
      { key: "monthlyMeals", label: "Meals" },
      { key: "monthlyShowers", label: "Showers" },
      { key: "monthlyLaundry", label: "Laundry" },
      { key: "monthlyBicycles", label: "Bicycle Repairs" },
      { key: "monthlyHaircuts", label: "Haircuts" },
      { key: "monthlyHolidays", label: "Holiday Services" },
    ],
    yearly: [
      { key: "yearlyMeals", label: "Meals" },
      { key: "yearlyShowers", label: "Showers" },
      { key: "yearlyLaundry", label: "Laundry" },
      { key: "yearlyBicycles", label: "Bicycle Repairs" },
      { key: "yearlyHaircuts", label: "Haircuts" },
      { key: "yearlyHolidays", label: "Holiday Services" },
    ],
  };

  return (
    <div className="space-y-8">
      {/* Header with Target Management */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-8 shadow-lg">
        {/* Decorative background elements */}
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-32 translate-x-32 rounded-full bg-gradient-to-br from-emerald-200/30 to-blue-200/30 blur-3xl" />
        <div className="absolute left-0 bottom-0 h-48 w-48 translate-y-24 -translate-x-24 rounded-full bg-gradient-to-tr from-blue-200/30 to-emerald-200/30 blur-3xl" />
        
        <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 p-3 shadow-lg">
                <TrendingUp size={24} className="text-white" />
              </div>
              Dashboard Overview
            </h1>
            <p className="text-gray-600 mt-2 text-sm md:text-base">
              Monitor daily operations and track progress toward your goals
            </p>
          </div>
          <button
            onClick={handleToggleEditor}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 w-fit font-semibold shadow-md hover:shadow-lg ${
              isEditingTargets
                ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
            }`}
            type="button"
          >
            <Target size={18} />
            {isEditingTargets ? "Hide Editor" : "Edit Targets"}
          </button>
        </div>
      </div>

      {/* Daily Notes - Compact view for admin dashboard */}
      <DailyNotesSection userId={user?.email} compact />

      {/* Inline Target Editor */}
      {isEditingTargets && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-900">
              <Target size={20} />
              Edit Monthly & Yearly Targets
            </h2>
            <button
              onClick={cancelEdit}
              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-100 rounded transition-colors"
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-blue-800 mb-4">
                Monthly Targets
              </h3>
              <div className="space-y-3">
                {targetFieldGroups.monthly.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label
                      htmlFor={key}
                      className="flex-1 text-sm font-medium text-gray-700"
                    >
                      {label}
                    </label>
                    <input
                      id={key}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tempTargets[key] ?? ""}
                      onChange={(e) => handleTargetChange(key, e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-blue-800 mb-4">
                Yearly Targets
              </h3>
              <div className="space-y-3">
                {targetFieldGroups.yearly.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label
                      htmlFor={key}
                      className="flex-1 text-sm font-medium text-gray-700"
                    >
                      {label}
                    </label>
                    <input
                      id={key}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={tempTargets[key] ?? ""}
                      onChange={(e) => handleTargetChange(key, e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-blue-200">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <div className="bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg p-2">
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          Monthly Progress
        </h2>
        <Animated.div
          style={monthGridAnim}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4"
        >
          <MetricCard
            title="Meals"
            icon={Utensils}
            value={monthMetrics.mealsServed}
            target={settings.targets?.monthlyMeals}
            period="month"
            colorClass="green"
          />
          <MetricCard
            title="Showers"
            icon={ShowerHead}
            value={monthMetrics.showersBooked}
            target={settings.targets?.monthlyShowers}
            period="month"
            colorClass="blue"
          />
          <MetricCard
            title="Laundry"
            icon={WashingMachine}
            value={monthMetrics.laundryLoads}
            target={settings.targets?.monthlyLaundry}
            period="month"
            colorClass="purple"
          />
          <MetricCard
            title="Bicycles"
            icon={Bike}
            value={monthMetrics.bicycles}
            target={settings.targets?.monthlyBicycles}
            period="month"
            colorClass="sky"
          />
          <MetricCard
            title="Haircuts"
            icon={Scissors}
            value={monthMetrics.haircuts}
            target={settings.targets?.monthlyHaircuts}
            period="month"
            colorClass="yellow"
          />
          <MetricCard
            title="Holiday"
            icon={Gift}
            value={monthMetrics.holidays}
            target={settings.targets?.monthlyHolidays}
            period="month"
            colorClass="pink"
          />
        </Animated.div>
      </div>

      {/* Yearly Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-2">
            <Calendar size={18} className="text-blue-600" />
          </div>
          Yearly Progress
        </h2>
        <Animated.div
          style={yearGridAnim}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4"
        >
          <MetricCard
            title="Meals"
            icon={Utensils}
            value={yearMetrics.mealsServed}
            target={settings.targets?.yearlyMeals}
            period="year"
            colorClass="green"
          />
          <MetricCard
            title="Showers"
            icon={ShowerHead}
            value={yearMetrics.showersBooked}
            target={settings.targets?.yearlyShowers}
            period="year"
            colorClass="blue"
          />
          <MetricCard
            title="Laundry"
            icon={WashingMachine}
            value={yearMetrics.laundryLoads}
            target={settings.targets?.yearlyLaundry}
            period="year"
            colorClass="purple"
          />
          <MetricCard
            title="Bicycles"
            icon={Bike}
            value={yearMetrics.bicycles}
            target={settings.targets?.yearlyBicycles}
            period="year"
            colorClass="sky"
          />
          <MetricCard
            title="Haircuts"
            icon={Scissors}
            value={yearMetrics.haircuts}
            target={settings.targets?.yearlyHaircuts}
            period="year"
            colorClass="yellow"
          />
          <MetricCard
            title="Holiday"
            icon={Gift}
            value={yearMetrics.holidays}
            target={settings.targets?.yearlyHolidays}
            period="year"
            colorClass="pink"
          />
        </Animated.div>
      </div>
    </div>
  );
};

export default OverviewDashboard;