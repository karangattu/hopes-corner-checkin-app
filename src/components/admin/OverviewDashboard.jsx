import React, { useState, useMemo, useCallback } from "react";
import { LAUNDRY_STATUS } from "../../context/constants";
import {
  Users,
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
import PieCardRecharts from "../charts/PieCardRecharts";
import StackedBarCardRecharts from "../charts/StackedBarCardRecharts";
import OnsiteMealDemographics from "./OnsiteMealDemographics";
import { animated as Animated } from "@react-spring/web";
import { SpringIcon } from "../../utils/animations";
import { getBicycleServiceCount } from "../../utils/bicycles";

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
      bg: "bg-blue-50",
      border: "border-blue-100",
      text: "text-blue-800",
      value: "text-blue-900",
      icon: "text-blue-500",
      progress: "bg-blue-200",
      bar: "bg-blue-500",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-100",
      text: "text-green-800",
      value: "text-green-900",
      icon: "text-green-500",
      progress: "bg-green-200",
      bar: "bg-green-500",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-100",
      text: "text-purple-800",
      value: "text-purple-900",
      icon: "text-purple-500",
      progress: "bg-purple-200",
      bar: "bg-purple-500",
    },
    sky: {
      bg: "bg-sky-50",
      border: "border-sky-100",
      text: "text-sky-800",
      value: "text-sky-900",
      icon: "text-sky-500",
      progress: "bg-sky-200",
      bar: "bg-sky-500",
    },
    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-100",
      text: "text-yellow-800",
      value: "text-yellow-900",
      icon: "text-yellow-500",
      progress: "bg-yellow-200",
      bar: "bg-yellow-500",
    },
    pink: {
      bg: "bg-pink-50",
      border: "border-pink-100",
      text: "text-pink-800",
      value: "text-pink-900",
      icon: "text-pink-500",
      progress: "bg-pink-200",
      bar: "bg-pink-500",
    },
  };

  const colors = colorClasses[colorClass] || colorClasses.blue;
  const IconComponent = icon;

  return (
    <div
      className={`${colors.bg} rounded-lg p-4 ${colors.border} border relative overflow-hidden`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className={`${colors.text} font-medium text-sm mb-1`}>{title}</h3>
          <p className={`text-2xl font-bold ${colors.value}`}>
            {value.toLocaleString()}
          </p>
        </div>
        <SpringIcon>
          <IconComponent className={colors.icon} size={20} />
        </SpringIcon>
      </div>

      {target && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className={colors.text}>
              Target: {target.toLocaleString()}
            </span>
            <span className={progressColor}>{progress.toFixed(0)}%</span>
          </div>
          <div className={`w-full ${colors.progress} rounded-full h-2`}>
            <div
              className={`${colors.bar} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const OverviewDashboard = ({
  overviewGridAnim,
  monthGridAnim,
  yearGridAnim,
}) => {
  const {
    getTodayMetrics,
    guests,
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

  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [tempTargets, setTempTargets] = useState(() =>
    formatTargetsForEditing(settings.targets ?? DEFAULT_TARGETS),
  );

  // Date range filters for demographic visualizations
  const [demographicsStartDate, setDemographicsStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [demographicsEndDate, setDemographicsEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });

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

  // Helper function to check if guest's creation date falls within the filter range
  const isGuestInDateRange = useCallback((guest, startDate, endDate) => {
    // If guest has no createdAt, use start of year (2025-01-01)
    const guestDate = guest.createdAt
      ? new Date(guest.createdAt).toISOString().split("T")[0]
      : `${new Date().getFullYear()}-01-01`;

    return guestDate >= startDate && guestDate <= endDate;
  }, []);

  const todayMetrics = getTodayMetrics();

  // Filter guests by date range
  const filteredGuestsForDemographics = useMemo(() => {
    return guests.filter((guest) =>
      isGuestInDateRange(guest, demographicsStartDate, demographicsEndDate),
    );
  }, [guests, demographicsStartDate, demographicsEndDate, isGuestInDateRange]);

  // Calculate housing status breakdown
  const housingStatusCounts = useMemo(() => {
    return filteredGuestsForDemographics.reduce((acc, guest) => {
      const status = guest.housingStatus || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [filteredGuestsForDemographics]);

  // Calculate age group breakdown
  const ageGroupCounts = useMemo(() => {
    return filteredGuestsForDemographics.reduce((acc, guest) => {
      const age = guest.age || "Unknown";
      acc[age] = (acc[age] || 0) + 1;
      return acc;
    }, {});
  }, [filteredGuestsForDemographics]);

  // Calculate gender breakdown
  const genderCounts = useMemo(() => {
    return filteredGuestsForDemographics.reduce((acc, guest) => {
      const gender = guest.gender || "Unknown";
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});
  }, [filteredGuestsForDemographics]);

  // Calculate location breakdown
  const locationCounts = useMemo(() => {
    return filteredGuestsForDemographics.reduce((acc, guest) => {
      const location = guest.location || "Unknown";
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});
  }, [filteredGuestsForDemographics]);

  // Calculate Age Group by City (cross-tabulation)
  const ageGroupByCity = useMemo(() => {
    return filteredGuestsForDemographics.reduce((acc, guest) => {
      const city = guest.location || "Unknown";
      const ageGroup = guest.age || "Unknown";

      if (!acc[city]) {
        acc[city] = {};
      }
      acc[city][ageGroup] = (acc[city][ageGroup] || 0) + 1;

      return acc;
    }, {});
  }, [filteredGuestsForDemographics]);

  // Calculate Housing Status by City (cross-tabulation)
  const housingStatusByCity = useMemo(() => {
    return filteredGuestsForDemographics.reduce((acc, guest) => {
      const city = guest.location || "Unknown";
      const status = guest.housingStatus || "Unknown";

      if (!acc[city]) {
        acc[city] = {};
      }
      acc[city][status] = (acc[city][status] || 0) + 1;

      return acc;
    }, {});
  }, [filteredGuestsForDemographics]);

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

  const isCompletedBicycleStatus = useCallback((status) => {
    const normalized = (status || "").toString().toLowerCase();
    return (
      !status ||
      normalized === "done" ||
      normalized === "completed" ||
      normalized === "ready" ||
      normalized === "finished"
    );
  }, []);

  // Calculate month and year metrics with progress tracking
  const { monthMetrics, yearMetrics } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const isCurrentMonth = (date) => {
      const d = new Date(date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    const isCurrentYear = (date) => {
      const d = new Date(date);
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor daily operations and track progress toward your goals
          </p>
        </div>
        <button
          onClick={handleToggleEditor}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors w-fit ${
            isEditingTargets
              ? "bg-gray-600 text-white hover:bg-gray-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          type="button"
        >
          <Target size={16} />
          {isEditingTargets ? "Hide Editor" : "Edit Targets"}
        </button>
      </div>

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

      {/* Today's Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={18} />
          Today's Activity
        </h2>
        <Animated.div
          style={overviewGridAnim}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-blue-800 font-medium text-sm">
                  Guests Registered
                </h3>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {guests.length}
                </p>
              </div>
              <SpringIcon>
                <Users className="text-blue-500" size={20} />
              </SpringIcon>
            </div>
            <div className="text-sm text-blue-700 max-h-24 overflow-y-auto pr-1">
              {Object.entries(housingStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span>{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Guests by Housing Status
            </h3>
            <PieCardRecharts
              title="Guests"
              subtitle="Housing Status"
              dataMap={housingStatusCounts}
            />
          </div>

          <div className="hidden sm:flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Guests by Age Group
            </h3>
            <PieCardRecharts
              title="Demographics"
              subtitle="Age Groups"
              dataMap={ageGroupCounts}
            />
          </div>

          <div className="hidden sm:flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Guests by Gender
            </h3>
            <PieCardRecharts
              title="Demographics"
              subtitle="Gender"
              dataMap={genderCounts}
            />
          </div>

          <div className="hidden sm:flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Guests by City
            </h3>
            <PieCardRecharts
              title="Demographics"
              subtitle="Location"
              dataMap={locationCounts}
            />
          </div>

          <MetricCard
            title="Today's Meals"
            icon={Utensils}
            value={todayMetrics.mealsServed}
            colorClass="green"
          />

          <MetricCard
            title="Today's Showers"
            icon={ShowerHead}
            value={todayMetrics.showersBooked}
            colorClass="blue"
          />
        </Animated.div>
      </div>

      {/* Demographics Date Range Filter */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Filter Demographics by Date Range
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="demo-start-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date
            </label>
            <input
              id="demo-start-date"
              type="date"
              value={demographicsStartDate}
              onChange={(e) => setDemographicsStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="demo-end-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              End Date
            </label>
            <input
              id="demo-end-date"
              type="date"
              value={demographicsEndDate}
              onChange={(e) => setDemographicsEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Showing {filteredGuestsForDemographics.length} guest(s) in selected
          date range
        </p>
      </div>

      {/* Cross-Tabulated Demographics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={18} />
          Demographics by City
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StackedBarCardRecharts
            title="Age Group by City"
            subtitle="Distribution of age groups across cities"
            crossTabData={ageGroupByCity}
          />
          <StackedBarCardRecharts
            title="Housing Status by City"
            subtitle="Distribution of housing status across cities"
            crossTabData={housingStatusByCity}
          />
        </div>
      </div>

      <OnsiteMealDemographics />

      {/* Monthly Progress */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={18} />
          Monthly Progress
        </h2>
        <Animated.div
          style={monthGridAnim}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
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
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={18} />
          Yearly Progress
        </h2>
        <Animated.div
          style={yearGridAnim}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
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
