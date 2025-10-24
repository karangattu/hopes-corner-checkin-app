import React, { useState, useCallback, useMemo } from "react";
import { useAppContext } from "../../context/useAppContext";
import TimeRangeFilter from "../../components/analytics/TimeRangeFilter";
import TimeSeriesChart from "../../components/charts/TimeSeriesChart";
import MealsChart from "../../components/charts/MealsChart";
import ShowerLaundryChart from "../../components/charts/ShowerLaundryChart";
import BicyclesChart from "../../components/charts/BicyclesChart";
import HaircutsChart from "../../components/charts/HaircutsChart";
import HolidaysChart from "../../components/charts/HolidaysChart";
import DonationsChart from "../../components/charts/DonationsChart";
import PieCardRecharts from "../../components/charts/PieCardRecharts";
import StackedBarCardRecharts from "../../components/charts/StackedBarCardRecharts";
import {
  BarChart3,
  Utensils,
  ShowerHead,
  WashingMachine,
  Bike,
  Scissors,
  Gift,
  Heart,
  Users,
  Zap,
  Settings,
  TrendingUp,
} from "lucide-react";
import { todayPacificDateString } from "../../utils/date";

/**
 * Analytics - Unified analytics and reporting page
 *
 * Consolidates all reporting features into a single, intuitive interface
 * with consistent time-based filtering and beginner/power user modes
 */
const Analytics = () => {
  const { getUniversalTimeRangeMetrics, guests, settings } = useAppContext();

  // UI Mode: 'beginner' | 'power'
  const [uiMode, setUiMode] = useState("power");

  // Active view: 'overview' | 'trends' | 'demographics' | 'specialized'
  const [activeView, setActiveView] = useState("overview");

  // Time filter state
  const [timeFilter, setTimeFilter] = useState({
    startDate: (() => {
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return firstOfMonth.toISOString().split("T")[0];
    })(),
    endDate: todayPacificDateString(),
    selectedDays: null,
    comparisonEnabled: false,
    preset: "thisMonth",
  });

  // Selected programs for filtering
  const [selectedPrograms, setSelectedPrograms] = useState([
    "meals",
    "showers",
    "laundry",
    "bicycles",
    "haircuts",
    "holidays",
  ]);

  // Selected meal types
  const [selectedMealTypes] = useState([
    "guest",
    "rv",
    "shelter",
    "unitedEffort",
    "extras",
    "dayWorker",
    "lunchBags",
  ]);

  // Handle time filter changes
  const handleTimeFilterChange = useCallback((filter) => {
    setTimeFilter(filter);
  }, []);

  // Handle program toggle
  const toggleProgram = useCallback((program) => {
    setSelectedPrograms((prev) =>
      prev.includes(program)
        ? prev.filter((p) => p !== program)
        : [...prev, program],
    );
  }, []);

  // Calculate metrics based on current filters
  const metrics = useMemo(() => {
    const result = getUniversalTimeRangeMetrics(
      timeFilter.startDate,
      timeFilter.endDate,
      {
        programs: selectedPrograms,
        selectedDays: timeFilter.selectedDays,
        includeComparison: timeFilter.comparisonEnabled,
      },
    );

    return result;
  }, [timeFilter, selectedPrograms, getUniversalTimeRangeMetrics]);

  // Calculate demographics
  const demographics = useMemo(() => {
    const housingCounts = {};
    const ageCounts = {};
    const genderCounts = {};
    const locationCounts = {};

    guests.forEach((guest) => {
      const housing = guest.housingStatus || "Unknown";
      const age = guest.age || "Unknown";
      const gender = guest.gender || "Unknown";
      const location = guest.location || "Unknown";

      housingCounts[housing] = (housingCounts[housing] || 0) + 1;
      ageCounts[age] = (ageCounts[age] || 0) + 1;
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    return {
      housingCounts,
      ageCounts,
      genderCounts,
      locationCounts,
    };
  }, [guests]);

  // Program list configuration
  const programs = [
    { id: "meals", label: "Meals", icon: Utensils, color: "blue" },
    { id: "showers", label: "Showers", icon: ShowerHead, color: "sky" },
    { id: "laundry", label: "Laundry", icon: WashingMachine, color: "purple" },
    { id: "bicycles", label: "Bicycles", icon: Bike, color: "green" },
    { id: "haircuts", label: "Haircuts", icon: Scissors, color: "yellow" },
    { id: "holidays", label: "Holidays", icon: Gift, color: "pink" },
  ];

  // Views configuration
  const views = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "demographics", label: "Demographics", icon: Users },
    { id: "specialized", label: "Specialized Reports", icon: Settings },
  ];

  // Render program selector
  const renderProgramSelector = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Select Programs
      </label>
      <div className="flex flex-wrap gap-2">
        {programs.map((program) => {
          const Icon = program.icon;
          return (
            <button
              key={program.id}
              onClick={() => toggleProgram(program.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                selectedPrograms.includes(program.id)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              <Icon size={16} />
              {program.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Render overview view
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {selectedPrograms.includes("meals") && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Utensils size={18} />
              <span className="font-medium text-sm">Meals</span>
            </div>
            <p className="text-3xl font-bold text-blue-900">
              {metrics.totals.mealsServed}
            </p>
          </div>
        )}

        {selectedPrograms.includes("showers") && (
          <div className="bg-sky-50 rounded-lg p-4 border border-sky-200">
            <div className="flex items-center gap-2 text-sky-700 mb-2">
              <ShowerHead size={18} />
              <span className="font-medium text-sm">Showers</span>
            </div>
            <p className="text-3xl font-bold text-sky-900">
              {metrics.totals.showersBooked}
            </p>
          </div>
        )}

        {selectedPrograms.includes("laundry") && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 text-purple-700 mb-2">
              <WashingMachine size={18} />
              <span className="font-medium text-sm">Laundry</span>
            </div>
            <p className="text-3xl font-bold text-purple-900">
              {metrics.totals.laundryLoads}
            </p>
          </div>
        )}

        {selectedPrograms.includes("bicycles") && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <Bike size={18} />
              <span className="font-medium text-sm">Bicycles</span>
            </div>
            <p className="text-3xl font-bold text-green-900">
              {metrics.totals.bicycles}
            </p>
          </div>
        )}

        {selectedPrograms.includes("haircuts") && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <Scissors size={18} />
              <span className="font-medium text-sm">Haircuts</span>
            </div>
            <p className="text-3xl font-bold text-yellow-900">
              {metrics.totals.haircuts}
            </p>
          </div>
        )}

        {selectedPrograms.includes("holidays") && (
          <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
            <div className="flex items-center gap-2 text-pink-700 mb-2">
              <Gift size={18} />
              <span className="font-medium text-sm">Holidays</span>
            </div>
            <p className="text-3xl font-bold text-pink-900">
              {metrics.totals.holidays}
            </p>
          </div>
        )}
      </div>

      {/* Comparison to previous period */}
      {metrics.comparison && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            Compared to Previous Period
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(metrics.changes).map(([key, value]) => {
              if (value === 0) return null;
              const isPositive = value > 0;
              return (
                <div key={key} className="text-center">
                  <p className="text-xs text-blue-800 capitalize">{key}</p>
                  <p
                    className={`text-lg font-bold ${
                      isPositive ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          Showing data for{" "}
          <span className="font-semibold">{metrics.daysInRange}</span> day
          {metrics.daysInRange !== 1 ? "s" : ""} from{" "}
          <span className="font-semibold">
            {new Date(timeFilter.startDate).toLocaleDateString()}
          </span>{" "}
          to{" "}
          <span className="font-semibold">
            {new Date(timeFilter.endDate).toLocaleDateString()}
          </span>
        </p>
      </div>
    </div>
  );

  // Render trends view
  const renderTrends = () => (
    <div className="space-y-6">
      {selectedPrograms.includes("meals") && (
        <MealsChart
          days={metrics.dailyBreakdown}
          selectedMealTypes={selectedMealTypes}
        />
      )}

      {(selectedPrograms.includes("showers") ||
        selectedPrograms.includes("laundry")) && (
        <ShowerLaundryChart days={metrics.dailyBreakdown} />
      )}

      {selectedPrograms.includes("bicycles") && (
        <BicyclesChart days={metrics.dailyBreakdown} />
      )}

      {selectedPrograms.includes("haircuts") && (
        <HaircutsChart
          days={metrics.dailyBreakdown}
          target={settings.targets?.monthlyHaircuts}
        />
      )}

      {selectedPrograms.includes("holidays") && (
        <HolidaysChart
          days={metrics.dailyBreakdown}
          target={settings.targets?.monthlyHolidays}
        />
      )}
    </div>
  );

  // Render demographics view
  const renderDemographics = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} />
          Guest Demographics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PieCardRecharts
            title="Housing Status"
            subtitle="Current distribution"
            dataMap={demographics.housingCounts}
          />
          <PieCardRecharts
            title="Age Groups"
            subtitle="Age distribution"
            dataMap={demographics.ageCounts}
          />
          <PieCardRecharts
            title="Gender"
            subtitle="Gender distribution"
            dataMap={demographics.genderCounts}
          />
          <PieCardRecharts
            title="Location"
            subtitle="City distribution"
            dataMap={demographics.locationCounts}
          />
        </div>
      </div>
    </div>
  );

  // Render specialized reports view
  const renderSpecialized = () => (
    <div className="space-y-6">
      <DonationsChart
        startDate={timeFilter.startDate}
        endDate={timeFilter.endDate}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={28} />
            Analytics & Reports
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights and time-based visualizations
          </p>
        </div>

        {/* UI Mode Toggle */}
        <button
          onClick={() =>
            setUiMode(uiMode === "beginner" ? "power" : "beginner")
          }
          className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-400 transition-all"
        >
          {uiMode === "beginner" ? <Zap size={16} /> : <Settings size={16} />}
          {uiMode === "beginner"
            ? "Switch to Power Mode"
            : "Switch to Beginner Mode"}
        </button>
      </div>

      {/* Time Range Filter */}
      <TimeRangeFilter
        onChange={handleTimeFilterChange}
        mode={uiMode}
        showDaySelector={false}
        showComparison={uiMode === "power"}
        defaultPreset="thisMonth"
      />

      {/* Program Selector */}
      {renderProgramSelector()}

      {/* View Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2">
        <nav className="flex flex-wrap gap-1">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === view.id
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={16} />
                <span>{view.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeView === "overview" && renderOverview()}
        {activeView === "trends" && renderTrends()}
        {activeView === "demographics" && renderDemographics()}
        {activeView === "specialized" && renderSpecialized()}
      </div>
    </div>
  );
};

export default Analytics;
