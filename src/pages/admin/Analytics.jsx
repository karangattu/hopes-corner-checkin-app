import React, { useState, useCallback, useMemo } from "react";
import { useAppContext } from "../../context/useAppContext";
import TimeRangeFilter from "../../components/analytics/TimeRangeFilter";
import DateRangeNotes from "../../components/analytics/DateRangeNotes";
import TimeSeriesChart from "../../components/charts/TimeSeriesChart";
import MealsChart from "../../components/charts/MealsChart";
import ShowerLaundryChart from "../../components/charts/ShowerLaundryChart";
import BicyclesChart from "../../components/charts/BicyclesChart";
import HaircutsChart from "../../components/charts/HaircutsChart";
import HolidaysChart from "../../components/charts/HolidaysChart";
import DonationsChart from "../../components/charts/DonationsChart";
import StackedBarCardRecharts from "../../components/charts/StackedBarCardRecharts";
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from "../../context/constants";
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
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { todayPacificDateString } from "../../utils/date";

const CHANGE_LABEL_MAP = {
  meals: "Meals",
  showers: "Showers",
  laundry: "Laundry",
  haircuts: "Haircuts",
  holidays: "Holidays",
  bicycles: "Bicycles",
  donationWeightLbs: "Donation lbs",
  donationsLogged: "Donations",
  donationTrays: "Donation trays",
};

const toSafeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatWeightValue = (value) => {
  const numeric = toSafeNumber(value);
  const rounded = Math.round(numeric * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
};

const formatChangeValue = (key, value) => {
  if (key === "donationWeightLbs") {
    return formatWeightValue(value);
  }
  return `${value}`;
};

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
    "donations",
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

  // Demographic filters state
  const [demographicFilters, setDemographicFilters] = useState({
    housingStatus: [],
    ageGroups: [],
    gender: [],
    location: [],
  });
  
  // Whether filters panel is expanded
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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

  // Calculate demographics based on guests who used selected services in the date range
  const demographics = useMemo(() => {
    const housingCounts = {};
    const ageCounts = {};
    const genderCounts = {};
    const locationCounts = {};

    // Create a Set of active guest IDs for fast lookup
    const activeGuestIdSet = new Set(metrics.activeGuestIds || []);
    
    // Filter guests to only those who participated in selected programs during the date range
    let filteredGuests = activeGuestIdSet.size > 0
      ? guests.filter((guest) => activeGuestIdSet.has(guest.id))
      : [];
    
    // Apply demographic filters
    if (demographicFilters.housingStatus.length > 0) {
      filteredGuests = filteredGuests.filter((guest) =>
        demographicFilters.housingStatus.includes(guest.housingStatus || "Unknown")
      );
    }
    if (demographicFilters.ageGroups.length > 0) {
      filteredGuests = filteredGuests.filter((guest) =>
        demographicFilters.ageGroups.includes(guest.age || "Unknown")
      );
    }
    if (demographicFilters.gender.length > 0) {
      filteredGuests = filteredGuests.filter((guest) =>
        demographicFilters.gender.includes(guest.gender || "Unknown")
      );
    }
    if (demographicFilters.location.length > 0) {
      filteredGuests = filteredGuests.filter((guest) =>
        demographicFilters.location.includes(guest.location || "Unknown")
      );
    }

    filteredGuests.forEach((guest) => {
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
      totalActiveGuests: filteredGuests.length,
    };
  }, [guests, metrics.activeGuestIds, demographicFilters]);

  // Get unique locations from all active guests for the filter options
  const availableLocations = useMemo(() => {
    const activeGuestIdSet = new Set(metrics.activeGuestIds || []);
    const activeGuests = activeGuestIdSet.size > 0
      ? guests.filter((guest) => activeGuestIdSet.has(guest.id))
      : [];
    
    const locations = new Set();
    activeGuests.forEach((guest) => {
      const loc = guest.location || "Unknown";
      locations.add(loc);
    });
    
    return Array.from(locations).sort((a, b) => {
      // Put "Unknown" at the end
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return a.localeCompare(b);
    });
  }, [guests, metrics.activeGuestIds]);

  // Toggle a demographic filter value
  const toggleDemographicFilter = useCallback((category, value) => {
    setDemographicFilters((prev) => {
      const currentValues = prev[category];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [category]: newValues };
    });
  }, []);

  // Clear all demographic filters
  const clearDemographicFilters = useCallback(() => {
    setDemographicFilters({
      housingStatus: [],
      ageGroups: [],
      gender: [],
      location: [],
    });
  }, []);

  // Check if any demographic filters are active
  const hasActiveDemographicFilters = useMemo(() => {
    return (
      demographicFilters.housingStatus.length > 0 ||
      demographicFilters.ageGroups.length > 0 ||
      demographicFilters.gender.length > 0 ||
      demographicFilters.location.length > 0
    );
  }, [demographicFilters]);

  // Program list configuration
  const programs = [
    { id: "meals", label: "Meals", icon: Utensils, color: "blue" },
    { id: "showers", label: "Showers", icon: ShowerHead, color: "sky" },
    { id: "laundry", label: "Laundry", icon: WashingMachine, color: "purple" },
    { id: "bicycles", label: "Bicycles", icon: Bike, color: "green" },
    { id: "haircuts", label: "Haircuts", icon: Scissors, color: "yellow" },
    { id: "holidays", label: "Holidays", icon: Gift, color: "pink" },
    { id: "donations", label: "Donations", icon: Heart, color: "rose" },
  ];

  // Views configuration
  const views = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "demographics", label: "Demographics", icon: Users },
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
      {/* Daily Notes for this period */}
      <DateRangeNotes 
        startDate={timeFilter.startDate} 
        endDate={timeFilter.endDate}
      />
      
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

        {selectedPrograms.includes("donations") && (
          <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
            <div className="flex items-center gap-2 text-rose-700 mb-2">
              <Heart size={18} />
              <span className="font-medium text-sm">Donations</span>
            </div>
            <p className="text-3xl font-bold text-rose-900">
              {formatWeightValue(metrics.totals.donationWeightLbs)}
              <span className="text-base font-semibold text-rose-700 ml-1">
                lbs
              </span>
            </p>
            <p className="text-xs text-rose-700 mt-2">
              {metrics.totals.donationsLogged ?? 0} donations •{" "}
              {metrics.totals.donationTrays ?? 0} trays
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
              const label = CHANGE_LABEL_MAP[key];
              if (!label) return null;
              const magnitude = Math.abs(Number(value));
              if (magnitude < 0.01) return null;
              const isPositive = value > 0;
              const formattedValue = formatChangeValue(key, magnitude);
              return (
                <div key={key} className="text-center">
                  <p className="text-xs text-blue-800">{label}</p>
                  <p
                    className={`text-lg font-bold ${
                      isPositive ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {isPositive ? "+" : "-"}
                    {formattedValue}
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
      {/* Daily Notes for this period */}
      <DateRangeNotes 
        startDate={timeFilter.startDate} 
        endDate={timeFilter.endDate}
      />
      
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

      {selectedPrograms.includes("donations") && (
        <DonationsChart
          startDate={timeFilter.startDate}
          endDate={timeFilter.endDate}
        />
      )}
    </div>
  );

  // Render demographic filter pill
  const renderFilterPill = (category, value, label) => {
    const isActive = demographicFilters[category].includes(value);
    return (
      <button
        key={`${category}-${value}`}
        onClick={() => toggleDemographicFilter(category, value)}
        className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
          isActive
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        {label || value}
      </button>
    );
  };

  // Render demographics view
  const renderDemographics = () => (
    <div className="space-y-6">
      {/* Demographic Filters Panel */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <span className="font-medium text-gray-900">Demographic Filters</span>
            {hasActiveDemographicFilters && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {demographicFilters.housingStatus.length +
                  demographicFilters.ageGroups.length +
                  demographicFilters.gender.length +
                  demographicFilters.location.length}{" "}
                active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveDemographicFilters && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearDemographicFilters();
                }}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded flex items-center gap-1"
              >
                <X size={14} />
                Clear all
              </button>
            )}
            {filtersExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {filtersExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">
            {/* Housing Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Housing Status
              </label>
              <div className="flex flex-wrap gap-2">
                {HOUSING_STATUSES.map((status) => renderFilterPill("housingStatus", status, status))}
                {renderFilterPill("housingStatus", "Unknown", "Unknown")}
              </div>
            </div>

            {/* Age Groups Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age Groups
              </label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map((age) => renderFilterPill("ageGroups", age, age))}
                {renderFilterPill("ageGroups", "Unknown", "Unknown")}
              </div>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <div className="flex flex-wrap gap-2">
                {GENDERS.map((gender) => renderFilterPill("gender", gender, gender))}
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location ({availableLocations.length} available)
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableLocations.map((location) => renderFilterPill("location", location, location))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Summary (when collapsed) */}
      {!filtersExpanded && hasActiveDemographicFilters && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-blue-800 font-medium">Filtering by:</span>
            {demographicFilters.housingStatus.map((v) => (
              <span key={`active-housing-${v}`} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1">
                {v}
                <button onClick={() => toggleDemographicFilter("housingStatus", v)} className="hover:text-blue-900">
                  <X size={12} />
                </button>
              </span>
            ))}
            {demographicFilters.ageGroups.map((v) => (
              <span key={`active-age-${v}`} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1">
                {v}
                <button onClick={() => toggleDemographicFilter("ageGroups", v)} className="hover:text-green-900">
                  <X size={12} />
                </button>
              </span>
            ))}
            {demographicFilters.gender.map((v) => (
              <span key={`active-gender-${v}`} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center gap-1">
                {v}
                <button onClick={() => toggleDemographicFilter("gender", v)} className="hover:text-purple-900">
                  <X size={12} />
                </button>
              </span>
            ))}
            {demographicFilters.location.map((v) => (
              <span key={`active-location-${v}`} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center gap-1">
                {v}
                <button onClick={() => toggleDemographicFilter("location", v)} className="hover:text-yellow-900">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} />
          Guest Demographics
          <span className="ml-2 px-2 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
            {demographics.totalActiveGuests} active guests
          </span>
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Demographics of guests who used{" "}
          <span className="font-medium">
            {selectedPrograms.length === 7
              ? "any service"
              : selectedPrograms.join(", ")}
          </span>{" "}
          from{" "}
          <span className="font-medium">
            {new Date(timeFilter.startDate).toLocaleDateString()}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {new Date(timeFilter.endDate).toLocaleDateString()}
          </span>
          {hasActiveDemographicFilters && (
            <span className="text-blue-600 font-medium"> (filtered)</span>
          )}
        </p>

        {demographics.totalActiveGuests === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No guests found for the selected filters.</p>
            <p className="text-sm mt-2">
              {hasActiveDemographicFilters 
                ? "Try adjusting your demographic filters or expanding the date range."
                : "Try expanding the date range or selecting more programs."}
            </p>
            {hasActiveDemographicFilters && (
              <button
                onClick={clearDemographicFilters}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Clear demographic filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Simple tables for easy copying */}
            {[
              { title: "Housing Status", data: demographics.housingCounts, filterKey: "housingStatus" },
              { title: "Age Groups", data: demographics.ageCounts, filterKey: "ageGroups" },
              { title: "Gender", data: demographics.genderCounts, filterKey: "gender" },
              { title: "Location", data: demographics.locationCounts, filterKey: "location" },
            ].map(({ title, data, filterKey }) => {
              const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
              const total = entries.reduce((sum, [, count]) => sum + count, 0);
              const isFiltered = demographicFilters[filterKey].length > 0;
              return (
                <div key={title} className={`rounded-lg p-4 border ${isFiltered ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center justify-between">
                    <span className={isFiltered ? "text-blue-900" : ""}>{title}</span>
                    {isFiltered && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">filtered</span>
                    )}
                  </h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-1 font-medium text-gray-700">Category</th>
                        <th className="text-right py-1 font-medium text-gray-700">Count</th>
                        <th className="text-right py-1 font-medium text-gray-700">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(([label, count]) => (
                        <tr key={label} className="border-b border-gray-100">
                          <td className="py-1 text-gray-800">{label || "Unknown"}</td>
                          <td className="py-1 text-right text-gray-800">{count}</td>
                          <td className="py-1 text-right text-gray-600">
                            {total > 0 ? ((count / total) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-medium border-t border-gray-300">
                        <td className="py-1 text-gray-900">Total</td>
                        <td className="py-1 text-right text-gray-900">{total}</td>
                        <td className="py-1 text-right text-gray-600">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
      </div>
    </div>
  );
};

export default Analytics;
