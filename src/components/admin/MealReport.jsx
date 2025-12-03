import React, { useState, useMemo, useRef, useCallback } from "react";
import { useAppContext } from "../../context/useAppContext";
import {
  Download,
  Calendar,
  TrendingUp,
  Utensils,
  Users,
  BarChart3,
  PieChart,
  ChevronLeft,
  ChevronRight,
  FileText,
  Package,
  Circle,
  RotateCcw,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ScatterChart,
  Scatter,
  Cell,
  PieChart as RePieChart,
  Pie,
} from "recharts";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const MEAL_TYPE_OPTIONS = [
  {
    key: "guest",
    label: "Guest meals",
    description: "Registered guests served on-site.",
  },
  {
    key: "extras",
    label: "Extra meals",
    description: "Extra meals after service.",
  },
  {
    key: "rv",
    label: "RV meals",
    description: "Meals delivered to RV communities.",
  },
  {
    key: "dayWorker",
    label: "Day Worker Center",
    description: "Partner deliveries for day workers.",
  },
  {
    key: "shelter",
    label: "Shelter meals",
    description: "Support sent to shelter guests.",
  },
  {
    key: "unitedEffort",
    label: "United Effort",
    description: "Meals shared with United Effort org volunteers.",
  },
  {
    key: "lunchBags",
    label: "Lunch Bags",
    description: "Bagged lunches distributed.",
  },
];

const MEAL_TYPE_DEFAULTS = MEAL_TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.key] = true;
  return acc;
}, {});

const MealReport = () => {
  const {
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    exportDataAsCSV,
    guests,
  } = useAppContext();

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedDays, setSelectedDays] = useState([1, 3, 5, 6]);
  const [comparisonMonths, setComparisonMonths] = useState(3);
  const [activeTab, setActiveTab] = useState("overview"); // overview, trends, export
  const chartRef = useRef(null);
  const [mealTypeFilters, setMealTypeFilters] = useState(() => ({
    ...MEAL_TYPE_DEFAULTS,
  }));

  const enabledMealTypeCount = useMemo(
    () =>
      MEAL_TYPE_OPTIONS.reduce(
        (count, option) => (mealTypeFilters[option.key] ? count + 1 : count),
        0,
      ),
    [mealTypeFilters],
  );

  const toggleMealType = useCallback((key) => {
    setMealTypeFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const selectAllMealTypes = useCallback(() => {
    setMealTypeFilters({ ...MEAL_TYPE_DEFAULTS });
  }, []);

  const clearMealTypes = useCallback(() => {
    setMealTypeFilters(
      MEAL_TYPE_OPTIONS.reduce((acc, option) => {
        acc[option.key] = false;
        return acc;
      }, {}),
    );
  }, []);

  const months = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    [],
  );

  const toggleDay = (dayValue) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b),
    );
  };

  const shiftMonth = (offset) => {
    const newDate = new Date(selectedYear, selectedMonth + offset);
    setSelectedYear(newDate.getFullYear());
    setSelectedMonth(newDate.getMonth());
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  const getDateFromRecord = (record) => {
    if (!record.date) return null;
    return new Date(record.date);
  };

  const getDayOfWeek = (date) => {
    return date.getDay();
  };

  const isDateInMonth = (date, year, month) => {
    return date.getFullYear() === year && date.getMonth() === month;
  };

  const calculateMealData = useMemo(() => {
    const results = [];
    const monthNames = months;

    for (let monthOffset = 0; monthOffset <= comparisonMonths; monthOffset++) {
      const targetDate = new Date(selectedYear, selectedMonth - monthOffset);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const monthLabel = `${monthNames[targetMonth]} ${targetYear}`;

      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      let validDaysCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(targetYear, targetMonth, day);
        const dayOfWeek = getDayOfWeek(date);
        if (selectedDays.includes(dayOfWeek)) {
          validDaysCount++;
        }
      }

      const filterRecordsByDayAndMonth = (records) => {
        return records.filter((record) => {
          const date = getDateFromRecord(record);
          if (!date) return false;
          const dayOfWeek = getDayOfWeek(date);
          return (
            isDateInMonth(date, targetYear, targetMonth) &&
            selectedDays.includes(dayOfWeek)
          );
        });
      };

      const sumCounts = (records) =>
        records.reduce((sum, r) => sum + (r.count || 0), 0);

      const monthMeals = mealTypeFilters.guest
        ? filterRecordsByDayAndMonth(mealRecords)
        : [];
      const monthExtraMeals = mealTypeFilters.extras
        ? filterRecordsByDayAndMonth(extraMealRecords)
        : [];
      const monthRvMeals = mealTypeFilters.rv
        ? filterRecordsByDayAndMonth(rvMealRecords)
        : [];
      const monthDayWorkerMeals = mealTypeFilters.dayWorker
        ? filterRecordsByDayAndMonth(dayWorkerMealRecords)
        : [];
      const monthShelterMeals = mealTypeFilters.shelter
        ? filterRecordsByDayAndMonth(shelterMealRecords)
        : [];
      const monthUnitedEffortMeals = mealTypeFilters.unitedEffort
        ? filterRecordsByDayAndMonth(unitedEffortMealRecords)
        : [];
      const monthLunchBags = mealTypeFilters.lunchBags
        ? filterRecordsByDayAndMonth(lunchBagRecords)
        : [];

      const guestMealsCount = sumCounts(monthMeals);
      const extraMealsCount = sumCounts(monthExtraMeals);
      const rvMealsCount = sumCounts(monthRvMeals);
      const dayWorkerMealsCount = sumCounts(monthDayWorkerMeals);
      const shelterMealsCount = sumCounts(monthShelterMeals);
      const unitedEffortMealsCount = sumCounts(monthUnitedEffortMeals);
      const lunchBagsCount = sumCounts(monthLunchBags);

      const uniqueGuestIds = new Set(
        [
          ...monthMeals,
          ...monthRvMeals,
          ...monthShelterMeals,
          ...monthUnitedEffortMeals,
          ...monthExtraMeals,
          ...monthDayWorkerMeals,
          ...monthLunchBags,
        ]
          .map((r) => r.guestId)
          .filter(Boolean),
      );

      // Calculate Age Groups for Unique Guests
      const ageGroups = {
        "Adult 18-59": 0,
        "Child 0-17": 0,
        "Senior 60+": 0,
        Unknown: 0,
      };

      uniqueGuestIds.forEach((guestId) => {
        const guest = guests.find(
          (g) => String(g.id) === String(guestId) || g.guestId === guestId,
        );

        if (guest && guest.age) {
          if (ageGroups[guest.age] !== undefined) {
            ageGroups[guest.age] += 1;
          } else {
            ageGroups.Unknown += 1;
          }
        } else {
          ageGroups.Unknown += 1;
        }
      });

      const totalMealsServed =
        guestMealsCount +
        extraMealsCount +
        rvMealsCount +
        dayWorkerMealsCount +
        shelterMealsCount +
        unitedEffortMealsCount +
        lunchBagsCount;

      const avgMealsPerServiceDay = validDaysCount
        ? totalMealsServed / validDaysCount
        : totalMealsServed;

      results.push({
        month: monthLabel,
        year: targetYear,
        monthIndex: targetMonth,
        guestMeals: guestMealsCount,
        extras: extraMealsCount,
        rvMeals: rvMealsCount,
        dayWorkerMeals: dayWorkerMealsCount,
        shelterMeals: shelterMealsCount,
        unitedEffortMeals: unitedEffortMealsCount,
        lunchBags: lunchBagsCount,
        totalMeals: totalMealsServed,
        avgMealsPerServiceDay,
        uniqueGuests: uniqueGuestIds.size,
        validDaysCount,
        isCurrentMonth: monthOffset === 0,
        ageGroups,
      });
    }

    return results.reverse();
  }, [
    selectedYear,
    selectedMonth,
    selectedDays,
    comparisonMonths,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    mealTypeFilters,
    months,
    guests,
  ]);

  const currentMonthData = useMemo(() => {
    if (!calculateMealData.length) return null;
    return calculateMealData[calculateMealData.length - 1];
  }, [calculateMealData]);

  const previousMonthData = useMemo(() => {
    if (calculateMealData.length < 2) return null;
    return calculateMealData[calculateMealData.length - 2];
  }, [calculateMealData]);

  const mealTypeBreakdown = useMemo(() => {
    if (!currentMonthData) return [];
    return [
      {
        name: "Guest Meals",
        value: currentMonthData.guestMeals,
        color: "#3b82f6",
      },
      { name: "Extras", value: currentMonthData.extras, color: "#f97316" },
      { name: "RV Meals", value: currentMonthData.rvMeals, color: "#a855f7" },
      {
        name: "Day Worker",
        value: currentMonthData.dayWorkerMeals,
        color: "#22c55e",
      },
      {
        name: "Shelter",
        value: currentMonthData.shelterMeals,
        color: "#ec4899",
      },
      {
        name: "United Effort",
        value: currentMonthData.unitedEffortMeals,
        color: "#6366f1",
      },
      {
        name: "Lunch Bags",
        value: currentMonthData.lunchBags,
        color: "#14b8a6",
      },
    ].filter((item) => item.value > 0);
  }, [currentMonthData]);

  const ageGroupBreakdown = useMemo(() => {
    if (!currentMonthData) return [];
    const { ageGroups } = currentMonthData;
    return [
      {
        name: "Adult 18-59",
        value: ageGroups["Adult 18-59"],
        color: "#3b82f6",
      },
      { name: "Child 0-17", value: ageGroups["Child 0-17"], color: "#10b981" },
      { name: "Senior 60+", value: ageGroups["Senior 60+"], color: "#f59e0b" },
      { name: "Unknown", value: ageGroups.Unknown, color: "#9ca3af" },
    ].filter((item) => item.value > 0);
  }, [currentMonthData]);

  const selectedDayLabels = useMemo(
    () =>
      selectedDays
        .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
        .filter(Boolean),
    [selectedDays],
  );

  const categorizeScatterPoint = (totalMeals, extrasShare) => {
    if (totalMeals >= 260) {
      return { color: "#dc2626", label: "Peak service day" };
    }
    if (extrasShare >= 0.35) {
      return { color: "#f97316", label: "High extras mix" };
    }
    if (extrasShare <= 0.1) {
      return { color: "#2563eb", label: "Guest-focused" };
    }
    return { color: "#10b981", label: "Balanced service" };
  };

  const dailyScatterData = useMemo(() => {
    if (!calculateMealData.length) return [];
    const currentMonth = calculateMealData[calculateMealData.length - 1];
    if (!currentMonth) return [];

    const targetYear = currentMonth.year;
    const targetMonthIndex = currentMonth.monthIndex;
    if (
      typeof targetYear !== "number" ||
      typeof targetMonthIndex !== "number"
    ) {
      return [];
    }

    const daysInMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
    const points = [];
    let serviceIndex = 0;

    const recordsForDay = (records, day) =>
      records.filter((record) => {
        const recordDate = getDateFromRecord(record);
        if (!recordDate) return false;
        return (
          recordDate.getFullYear() === targetYear &&
          recordDate.getMonth() === targetMonthIndex &&
          recordDate.getDate() === day
        );
      });

    const sumCounts = (records) =>
      records.reduce((sum, record) => sum + (record.count || 0), 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonthIndex, day);
      const dayOfWeek = getDayOfWeek(date);
      if (!selectedDays.includes(dayOfWeek)) continue;

      serviceIndex += 1;

      const dayMeals = mealTypeFilters.guest
        ? recordsForDay(mealRecords, day)
        : [];
      const dayExtraMeals = mealTypeFilters.extras
        ? recordsForDay(extraMealRecords, day)
        : [];
      const dayRvMeals = mealTypeFilters.rv
        ? recordsForDay(rvMealRecords, day)
        : [];
      const dayDayWorkerMeals = mealTypeFilters.dayWorker
        ? recordsForDay(dayWorkerMealRecords, day)
        : [];
      const dayShelterMeals = mealTypeFilters.shelter
        ? recordsForDay(shelterMealRecords, day)
        : [];
      const dayUnitedEffortMeals = mealTypeFilters.unitedEffort
        ? recordsForDay(unitedEffortMealRecords, day)
        : [];

      const guestMealsTotal = sumCounts(dayMeals);
      const rvMealsTotal = sumCounts(dayRvMeals);
      const shelterMealsTotal = sumCounts(dayShelterMeals);
      const unitedEffortMealsTotal = sumCounts(dayUnitedEffortMeals);
      const extraMealsTotal = sumCounts(dayExtraMeals);
      const dayWorkerMealsTotal = sumCounts(dayDayWorkerMeals);

      const totalMeals =
        guestMealsTotal +
        rvMealsTotal +
        shelterMealsTotal +
        unitedEffortMealsTotal +
        extraMealsTotal +
        dayWorkerMealsTotal;

      const extrasShare = totalMeals ? extraMealsTotal / totalMeals : 0;

      const uniqueGuests = new Set(
        [
          ...dayMeals,
          ...dayRvMeals,
          ...dayShelterMeals,
          ...dayUnitedEffortMeals,
        ]
          .map((record) => record.guestId)
          .filter(Boolean),
      ).size;

      const { color, label } = categorizeScatterPoint(totalMeals, extrasShare);

      points.push({
        timestamp: date.getTime(),
        serviceIndex,
        dateLabel: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        weekdayLabel: date.toLocaleDateString(undefined, {
          weekday: "long",
        }),
        totalMeals,
        guestMeals: guestMealsTotal,
        extrasMeals: extraMealsTotal,
        rvMeals: rvMealsTotal,
        dayWorkerMeals: dayWorkerMealsTotal,
        shelterMeals: shelterMealsTotal,
        unitedEffortMeals: unitedEffortMealsTotal,
        uniqueGuests,
        color,
        categoryLabel: label,
        extrasShare,
      });
    }

    return points.sort((a, b) => a.timestamp - b.timestamp);
  }, [
    calculateMealData,
    selectedDays,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    mealTypeFilters,
  ]);


  const exportCSV = () => {
    if (calculateMealData.length === 0) {
      toast.error("No data to export");
      return;
    }

    if (enabledMealTypeCount === 0) {
      toast.error("Select at least one meal category before exporting.");
      return;
    }

    const currentMonthData = calculateMealData[calculateMealData.length - 1];
    const targetYear = currentMonthData.year;
    const targetMonth = currentMonthData.monthIndex;

    const exportData = [];
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const dayOfWeek = getDayOfWeek(date);

      if (!selectedDays.includes(dayOfWeek)) continue;

      const dateStr = date.toISOString().split("T")[0];
      const dayName =
        DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label ||
        date.toLocaleDateString("en-US", { weekday: "long" });

      const filterRecordsByDate = (records) => {
        return records.filter((record) => {
          const recordDate = getDateFromRecord(record);
          if (!recordDate) return false;
          return recordDate.toISOString().split("T")[0] === dateStr;
        });
      };

      const dayMeals = mealTypeFilters.guest
        ? filterRecordsByDate(mealRecords)
        : [];
      const dayExtraMeals = mealTypeFilters.extras
        ? filterRecordsByDate(extraMealRecords)
        : [];
      const dayRvMeals = mealTypeFilters.rv
        ? filterRecordsByDate(rvMealRecords)
        : [];
      const dayDayWorkerMeals = mealTypeFilters.dayWorker
        ? filterRecordsByDate(dayWorkerMealRecords)
        : [];
      const dayShelterMeals = mealTypeFilters.shelter
        ? filterRecordsByDate(shelterMealRecords)
        : [];
      const dayUnitedEffortMeals = mealTypeFilters.unitedEffort
        ? filterRecordsByDate(unitedEffortMealRecords)
        : [];
      const dayLunchBags = mealTypeFilters.lunchBags
        ? filterRecordsByDate(lunchBagRecords)
        : [];

      const guestMealsTotal = dayMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const extraMealsTotal = dayExtraMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const rvMealsTotal = dayRvMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const dayWorkerMealsTotal = dayDayWorkerMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const shelterMealsTotal = dayShelterMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const unitedEffortMealsTotal = dayUnitedEffortMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const lunchBagsTotal = dayLunchBags.reduce((sum, r) => sum + (r.count || 0), 0);

      exportData.push({
        Date: date.toLocaleDateString(),
        "Day of Week": dayName,
        "Guest Meals": guestMealsTotal,
        "Extra Meals": extraMealsTotal,
        "RV Meals": rvMealsTotal,
        "Day Worker Meals": dayWorkerMealsTotal,
        "Shelter Meals": shelterMealsTotal,
        "United Effort Meals": unitedEffortMealsTotal,
        "Lunch Bags": lunchBagsTotal,
        "Total Meals":
          guestMealsTotal +
          extraMealsTotal +
          rvMealsTotal +
          dayWorkerMealsTotal +
          shelterMealsTotal +
          unitedEffortMealsTotal +
          lunchBagsTotal,
      });
    }

    const filename = `meal-report-${months[targetMonth]}-${targetYear}-${selectedDays.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label.substring(0, 3)).join("-")}.csv`;
    exportDataAsCSV(exportData, filename);
    toast.success("Meal report exported successfully!");
  };

  const exportChart = async () => {
    if (!chartRef.current) {
      toast.error("Chart not found");
      return;
    }

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `meal-comparison-chart-${timestamp}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Chart downloaded as PNG!");
    } catch (error) {
      console.error("Error exporting chart:", error);
      toast.error("Failed to export chart");
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">{data.month}</p>
        <div className="space-y-1 text-sm">
          <p className="text-blue-600">Guest Meals: {data.guestMeals}</p>
          <p className="text-orange-600">Extras: {data.extras}</p>
          <p className="text-purple-600">RV Meals: {data.rvMeals}</p>
          <p className="text-green-600">Day Worker: {data.dayWorkerMeals}</p>
          <p className="text-pink-600">Shelter: {data.shelterMeals}</p>
          <p className="text-indigo-600">
            United Effort: {data.unitedEffortMeals}
          </p>
          {data.ageGroups && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Unique Guest Age Groups
              </p>
              <p className="text-blue-600">
                Adults: {data.ageGroups["Adult 18-59"]}
              </p>
              <p className="text-green-600">
                Children: {data.ageGroups["Child 0-17"]}
              </p>
              <p className="text-orange-600">
                Seniors: {data.ageGroups["Senior 60+"]}
              </p>
            </div>
          )}
          <p className="font-semibold text-gray-800 mt-2 pt-2 border-t">
            Total: {data.totalMeals}
          </p>
          <p className="text-gray-700">
            Avg Meals / Service Day:{" "}
            {Math.round(data.avgMealsPerServiceDay || 0)}
          </p>
          <p className="text-gray-600">Unique Guests: {data.uniqueGuests}</p>
          <p className="text-gray-500 text-xs mt-1">
            Days: {data.validDaysCount}
          </p>
        </div>
      </div>
    );
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">
          {point.weekdayLabel}, {point.dateLabel}
        </p>
        <div className="space-y-1 text-sm">
          <p>Total Meals: {point.totalMeals}</p>
          <p>Guest Meals: {point.guestMeals}</p>
          <p>Extras: {point.extrasMeals}</p>
          <p>RV Meals: {point.rvMeals}</p>
          <p>Day Worker: {point.dayWorkerMeals}</p>
          <p>Shelter: {point.shelterMeals}</p>
          <p>United Effort: {point.unitedEffortMeals}</p>
          <p>Unique Guests: {point.uniqueGuests}</p>
        </div>
      </div>
    );
  };

  const isCurrentMonth =
    selectedYear === currentDate.getFullYear() &&
    selectedMonth === currentDate.getMonth();

  return (
    <div className="min-h-screen space-y-6 pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-200/50 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8 shadow-lg">
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-32 translate-x-32 rounded-full bg-gradient-to-br from-blue-200/30 to-indigo-200/30 blur-3xl" />

        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <div className="rounded-2xl bg-blue-600 p-3 shadow-lg">
                <Utensils size={28} className="text-white" />
              </div>
              Meal Services Report
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Track, analyze, and optimize meal service operations
            </p>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-4 rounded-2xl border border-blue-300/50 bg-white/80 p-4 shadow-md backdrop-blur-sm">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition hover:bg-blue-200 hover:scale-110 active:scale-95"
              title="Previous month"
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>

            <div className="text-center">
              <div className="mb-1 text-lg font-bold text-blue-900">
                {months[selectedMonth]} {selectedYear}
              </div>
              <p className="text-xs font-medium text-blue-700">
                Viewing {selectedDayLabels.join(", ")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              disabled={isCurrentMonth}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 transition hover:bg-blue-200 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:scale-100"
              title="Next month"
            >
              <ChevronRight size={24} strokeWidth={2.5} />
            </button>

            <div className="h-8 w-px bg-blue-200" />

            <button
              type="button"
              onClick={goToCurrentMonth}
              disabled={isCurrentMonth}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Day Selection */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
          <Calendar size={16} className="text-blue-600" />
          Select Service Days
        </label>
        <div className="flex flex-wrap gap-3">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={`flex flex-col items-center rounded-xl border-2 px-6 py-3 transition-all ${selectedDays.includes(day.value)
                ? "border-blue-600 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg"
                : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                }`}
            >
              <span className="text-xs font-medium opacity-80">
                {day.short}
              </span>
              <span className="mt-1 text-sm font-bold">{day.label}</span>
            </button>
          ))}
        </div>
        {selectedDays.length === 0 && (
          <p className="mt-3 text-sm font-medium text-red-600">
            Please select at least one day
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
              <Utensils size={16} className="text-blue-600" /> Meal categories
              included
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Toggle which meal programs contribute to totals, charts, and
              exports.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAllMealTypes}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600"
            >
              <Circle size={12} /> Select all
            </button>
            <button
              type="button"
              onClick={clearMealTypes}
              disabled={enabledMealTypeCount === 0}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${enabledMealTypeCount === 0
                ? "border-gray-200 text-gray-400"
                : "border-gray-200 text-gray-600 hover:border-blue-200 hover:text-blue-600"
                }`}
            >
              <RotateCcw size={12} /> Clear all
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {MEAL_TYPE_OPTIONS.map((option) => {
            const isActive = Boolean(mealTypeFilters[option.key]);
            return (
              <label
                key={option.key}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${isActive
                  ? "border-blue-200 bg-blue-50/80 shadow-sm"
                  : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/60"
                  }`}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleMealType(option.key)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex flex-col text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">
                    {option.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>
            {enabledMealTypeCount} of {MEAL_TYPE_OPTIONS.length} meal categories
            selected
          </span>
          {enabledMealTypeCount === 0 && (
            <span className="inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-1 font-semibold text-red-600">
              <Circle size={10} className="text-red-500" /> Select at least one
              category to populate the report.
            </span>
          )}
        </div>
      </div>

      {selectedDays.length > 0 && currentMonthData && (
        <>
          {/* Stats Overview Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-blue-100/50 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-blue-100 p-3">
                    <Utensils size={24} className="text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total Meals
                  </span>
                </div>
                <p
                  className="mt-4 text-3xl font-bold text-gray-900"
                  data-testid="meal-total-value"
                >
                  {currentMonthData.totalMeals.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  This {months[selectedMonth]}
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-emerald-100/50 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-emerald-100 p-3">
                    <TrendingUp size={24} className="text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Avg / Day
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-gray-900">
                  {Math.round(
                    currentMonthData.avgMealsPerServiceDay,
                  ).toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-gray-600">Per service day</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-purple-100/50 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-purple-100 p-3">
                    <Users size={24} className="text-purple-600" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Unique Guests
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-gray-900">
                  {currentMonthData.uniqueGuests.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-gray-600">Served this month</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-amber-100/50 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-amber-100 p-3">
                    <Calendar size={24} className="text-amber-600" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Service Days
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold text-gray-900">
                  {currentMonthData.validDaysCount}
                </p>
                <p className="mt-1 text-sm text-gray-600">Days of operation</p>
              </div>
            </div>
          </div>

          {/* Month Comparison Info Card */}
          {previousMonthData && (
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-blue-600 p-3">
                  <BarChart3 size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    Month-over-Month Comparison
                  </h3>
                  <p className="mt-2 text-gray-700">
                    {(() => {
                      const delta =
                        currentMonthData.totalMeals -
                        previousMonthData.totalMeals;
                      const magnitude = Math.abs(delta);
                      const noun = magnitude === 1 ? "meal" : "meals";
                      const percentChange = previousMonthData.totalMeals
                        ? (
                          (delta / previousMonthData.totalMeals) *
                          100
                        ).toFixed(1)
                        : "0.0";

                      if (delta === 0) {
                        return `Meal count unchanged compared to ${previousMonthData.month}`;
                      }

                      return (
                        <>
                          Served{" "}
                          <span
                            className={`font-bold ${delta > 0 ? "text-emerald-700" : "text-red-700"}`}
                          >
                            {magnitude.toLocaleString()} {noun}{" "}
                            {delta > 0 ? "more" : "fewer"}
                          </span>{" "}
                          than {previousMonthData.month} (
                          <span
                            className={`font-semibold ${delta > 0 ? "text-emerald-700" : "text-red-700"}`}
                          >
                            {delta > 0 ? "+" : ""}
                            {percentChange}%
                          </span>
                          )
                        </>
                      );
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition ${activeTab === "overview"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              <PieChart size={18} />
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("trends")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition ${activeTab === "trends"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              <BarChart3 size={18} />
              Trends
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("export")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition ${activeTab === "export"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
                }`}
            >
              <Download size={18} />
              Export
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Meal Type Breakdown Pie Chart */}
              {mealTypeBreakdown.length > 0 && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
                    <Package size={22} className="text-orange-600" />
                    Meal Type Distribution
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={mealTypeBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {mealTypeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="mt-6 space-y-2">
                    {mealTypeBreakdown.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {item.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Age Group Breakdown Pie Chart */}
              {ageGroupBreakdown.length > 0 && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
                    <Users size={22} className="text-blue-600" />
                    Guest Age Demographics
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={ageGroupBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ageGroupBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="mt-6 space-y-2">
                    {ageGroupBreakdown.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {item.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Service Volume by Day of Week */}
              {dailyScatterData.length > 0 && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <h2 className="mb-2 text-xl font-bold text-gray-900">
                    Service Day Trends
                  </h2>
                  <p className="mb-6 text-sm text-gray-600">
                    Compare meal volume trends across different service days throughout the month.
                  </p>

                  {/* Legend for day colors */}
                  <div className="mb-4 flex flex-wrap gap-3">
                    {DAYS_OF_WEEK.filter(day => selectedDays.includes(day.value)).map((day) => {
                      const dayColor =
                        day.value === 1 ? "#3b82f6" : // Monday - Blue
                          day.value === 3 ? "#10b981" : // Wednesday - Green
                            day.value === 5 ? "#f59e0b" : // Friday - Amber
                              "#8b5cf6"; // Saturday - Purple

                      return (
                        <span
                          key={day.value}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700"
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: dayColor }}
                          />
                          {day.label}
                        </span>
                      );
                    })}
                  </div>

                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart
                      data={dailyScatterData}
                      margin={{ top: 16, right: 24, bottom: 60, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        label={{
                          value: "Service Date",
                          position: "insideBottom",
                          offset: -35,
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{
                          value: "Total Meals Served",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                        }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border-2 border-gray-300 bg-white p-4 shadow-xl">
                                <p className="mb-2 font-bold text-gray-900">
                                  {data.weekdayLabel}, {data.dateLabel}
                                </p>
                                <div className="space-y-1 text-sm">
                                  <p className="font-semibold text-blue-700">
                                    Total Meals: {data.totalMeals}
                                  </p>
                                  <p className="text-gray-600">
                                    Unique Guests: {data.uniqueGuests}
                                  </p>
                                  <div className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-500">
                                    <p>Guest: {data.guestMeals} | Extras: {data.extrasMeals}</p>
                                    {data.rvMeals > 0 && <p>RV: {data.rvMeals}</p>}
                                    {data.dayWorkerMeals > 0 && <p>Day Worker: {data.dayWorkerMeals}</p>}
                                    {data.shelterMeals > 0 && <p>Shelter: {data.shelterMeals}</p>}
                                    {data.unitedEffortMeals > 0 && <p>United Effort: {data.unitedEffortMeals}</p>}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Lines for each day of the week */}
                      {selectedDays.includes(1) && (
                        <Line
                          type="monotone"
                          dataKey={(entry) => entry.weekdayLabel === "Monday" ? entry.totalMeals : null}
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ r: 5, fill: "#3b82f6" }}
                          name="Monday"
                          connectNulls={false}
                        />
                      )}
                      {selectedDays.includes(3) && (
                        <Line
                          type="monotone"
                          dataKey={(entry) => entry.weekdayLabel === "Wednesday" ? entry.totalMeals : null}
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 5, fill: "#10b981" }}
                          name="Wednesday"
                          connectNulls={false}
                        />
                      )}
                      {selectedDays.includes(5) && (
                        <Line
                          type="monotone"
                          dataKey={(entry) => entry.weekdayLabel === "Friday" ? entry.totalMeals : null}
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={{ r: 5, fill: "#f59e0b" }}
                          name="Friday"
                          connectNulls={false}
                        />
                      )}
                      {selectedDays.includes(6) && (
                        <Line
                          type="monotone"
                          dataKey={(entry) => entry.weekdayLabel === "Saturday" ? entry.totalMeals : null}
                          stroke="#8b5cf6"
                          strokeWidth={2.5}
                          dot={{ r: 5, fill: "#8b5cf6" }}
                          name="Saturday"
                          connectNulls={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Summary stats by day of week */}
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {DAYS_OF_WEEK.filter(day => selectedDays.includes(day.value)).map((day) => {
                      const dayData = dailyScatterData.filter(d => d.weekdayLabel === day.label);
                      if (dayData.length === 0) return null;

                      const avgMeals = Math.round(
                        dayData.reduce((sum, d) => sum + d.totalMeals, 0) / dayData.length
                      );
                      const maxMeals = Math.max(...dayData.map(d => d.totalMeals));
                      const minMeals = Math.min(...dayData.map(d => d.totalMeals));

                      const dayColor =
                        day.value === 1 ? "blue" :
                          day.value === 3 ? "emerald" :
                            day.value === 5 ? "amber" :
                              "purple";

                      return (
                        <div key={day.value} className={`rounded-xl border-2 border-${dayColor}-200 bg-${dayColor}-50 p-3`}>
                          <p className={`text-xs font-bold uppercase tracking-wide text-${dayColor}-700`}>
                            {day.label}s
                          </p>
                          <p className={`mt-1 text-2xl font-bold text-${dayColor}-900`}>
                            {avgMeals}
                          </p>
                          <p className="mt-1 text-xs text-gray-600">
                            avg meals ({dayData.length} days)
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Range: {minMeals} - {maxMeals}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "trends" && (
            <div className="space-y-6">
              {/* Comparison Months Selector */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Historical Comparison Period
                </label>
                <select
                  value={comparisonMonths}
                  onChange={(e) => setComparisonMonths(Number(e.target.value))}
                  className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2 font-medium transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value={3}>Last 3 months</option>
                  <option value={6}>Last 6 months</option>
                  <option value={12}>Last 12 months</option>
                </select>
              </div>

              {/* Monthly Comparison Chart */}
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <TrendingUp size={18} className="text-green-600" />
                    Monthly Comparison
                  </h3>
                  <button
                    onClick={exportChart}
                    className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-sm text-blue-800 transition hover:bg-blue-200"
                  >
                    <Download size={14} />
                    Export Chart
                  </button>
                </div>

                <div ref={chartRef} className="bg-white p-4">
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart
                      data={calculateMealData}
                      margin={{ top: 16, right: 40, bottom: 40, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        label={{
                          value: "Month",
                          position: "insideBottom",
                          offset: -20,
                        }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 12 }}
                        label={{
                          value: "Total Meals",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                        }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                        label={{
                          value: "Avg Meals / Service Day",
                          angle: -90,
                          position: "insideRight",
                          offset: -5,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Bar
                        yAxisId="left"
                        dataKey="guestMeals"
                        stackId="a"
                        fill="#3b82f6"
                        name="Guest Meals"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="extras"
                        stackId="a"
                        fill="#f97316"
                        name="Extras"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="rvMeals"
                        stackId="a"
                        fill="#a855f7"
                        name="RV Meals"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="dayWorkerMeals"
                        stackId="a"
                        fill="#22c55e"
                        name="Day Worker"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="shelterMeals"
                        stackId="a"
                        fill="#ec4899"
                        name="Shelter"
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="unitedEffortMeals"
                        stackId="a"
                        fill="#6366f1"
                        name="United Effort"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgMealsPerServiceDay"
                        stroke="#0f172a"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Avg Meals / Service Day"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary Statistics Table */}
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <FileText size={18} className="text-gray-600" />
                  Summary Statistics
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left font-bold">Month</th>
                        <th className="px-4 py-3 text-right font-bold">
                          Guest
                        </th>
                        <th className="px-4 py-3 text-right font-bold">
                          Extras
                        </th>
                        <th className="px-4 py-3 text-right font-bold">RV</th>
                        <th className="px-4 py-3 text-right font-bold">
                          Day Worker
                        </th>
                        <th className="px-4 py-3 text-right font-bold">
                          Shelter
                        </th>
                        <th className="px-4 py-3 text-right font-bold">
                          United Effort
                        </th>
                        <th className="px-4 py-3 text-right font-bold">
                          Total
                        </th>
                        <th className="px-4 py-3 text-right font-bold">
                          Avg/Day
                        </th>
                        <th className="px-4 py-3 text-right font-bold">
                          Unique Guests
                        </th>
                        <th className="px-4 py-3 text-right font-bold">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateMealData.map((data, index) => (
                        <tr
                          key={index}
                          className={`border-b transition ${data.isCurrentMonth ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-4 py-3">{data.month}</td>
                          <td className="px-4 py-3 text-right">
                            {data.guestMeals}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {data.extras}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {data.rvMeals}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {data.dayWorkerMeals}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {data.shelterMeals}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {data.unitedEffortMeals}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {data.totalMeals}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {Math.round(data.avgMealsPerServiceDay || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-700">
                            {data.uniqueGuests}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {data.validDaysCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "export" && (
            <div className="mx-auto max-w-2xl">
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Download size={32} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Export Meal Data
                  </h2>
                  <p className="mt-2 text-gray-600">
                    Download meal records as CSV for reporting and analysis
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                    <p className="mb-4 text-sm font-bold uppercase tracking-wide text-blue-800">
                      Export Details
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Period:</span>
                        <span className="font-semibold text-gray-900">
                          {months[selectedMonth]} {selectedYear}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Days:</span>
                        <span className="font-semibold text-gray-900">
                          {selectedDayLabels.join(", ")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          Total Records:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {currentMonthData.validDaysCount} days
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          Total Meals:
                        </span>
                        <span className="font-semibold text-blue-700">
                          {currentMonthData.totalMeals.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={exportCSV}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:shadow-xl"
                  >
                    <Download size={20} />
                    Export {currentMonthData.validDaysCount} Service Days
                  </button>

                  <p className="text-center text-xs text-gray-500">
                    CSV includes date, day of week, meal types, and totals
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MealReport;
