'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
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
} from 'lucide-react';
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
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { pacificDateStringFrom } from '@/lib/utils/date';

// Types
interface Guest {
  id: string;
  guestId?: string;
  age?: string;
  [key: string]: unknown;
}

interface MealRecord {
  id: string;
  guestId?: string;
  date?: string | Date;
  count?: number;
  [key: string]: unknown;
}

interface MealReportProps {
  guests: Guest[];
  mealRecords: MealRecord[];
  rvMealRecords: MealRecord[];
  shelterMealRecords: MealRecord[];
  unitedEffortMealRecords: MealRecord[];
  extraMealRecords: MealRecord[];
  dayWorkerMealRecords: MealRecord[];
  lunchBagRecords: MealRecord[];
  exportDataAsCSV: (data: Record<string, unknown>[], filename: string) => void;
}

interface AgeGroups {
  'Adult 18-59': number;
  'Child 0-17': number;
  'Senior 60+': number;
  Unknown: number;
}

interface MonthData {
  month: string;
  year: number;
  monthIndex: number;
  guestMeals: number;
  extras: number;
  rvMeals: number;
  dayWorkerMeals: number;
  shelterMeals: number;
  unitedEffortMeals: number;
  lunchBags: number;
  totalMeals: number;
  uniqueGuestsPerServiceDay: number;
  uniqueGuests: number;
  validDaysCount: number;
  isCurrentMonth: boolean;
  ageGroups: AgeGroups;
}

interface DailyScatterPoint {
  timestamp: number;
  serviceIndex: number;
  dateLabel: string;
  weekdayLabel: string;
  totalMeals: number;
  guestMeals: number;
  extrasMeals: number;
  rvMeals: number;
  dayWorkerMeals: number;
  shelterMeals: number;
  unitedEffortMeals: number;
  uniqueGuests: number;
  color: string;
  categoryLabel: string;
  extrasShare: number;
}

// Constants
const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const MEAL_TYPE_OPTIONS = [
  { key: 'guest', label: 'Guest meals', description: 'Registered guests served on-site.' },
  { key: 'extras', label: 'Extra meals', description: 'Extra meals after service.' },
  { key: 'rv', label: 'RV meals', description: 'Meals delivered to RV communities.' },
  { key: 'dayWorker', label: 'Day Worker Center', description: 'Partner deliveries for day workers.' },
  { key: 'shelter', label: 'Shelter meals', description: 'Support sent to shelter guests.' },
  { key: 'unitedEffort', label: 'United Effort', description: 'Meals shared with United Effort org volunteers.' },
  { key: 'lunchBags', label: 'Lunch Bags', description: 'Bagged lunches distributed.' },
];

const MEAL_TYPE_DEFAULTS = MEAL_TYPE_OPTIONS.reduce((acc, option) => {
  acc[option.key] = true;
  return acc;
}, {} as Record<string, boolean>);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Helper functions
const getDateFromRecord = (record: MealRecord): Date | null => {
  if (!record.date) return null;
  return new Date(record.date);
};

const getDayOfWeek = (date: Date): number => date.getDay();

const isDateInMonth = (date: Date, year: number, month: number): boolean => {
  return date.getFullYear() === year && date.getMonth() === month;
};

const categorizeScatterPoint = (totalMeals: number, extrasShare: number) => {
  if (totalMeals >= 260) return { color: '#dc2626', label: 'Peak service day' };
  if (extrasShare >= 0.35) return { color: '#f97316', label: 'High extras mix' };
  if (extrasShare <= 0.1) return { color: '#2563eb', label: 'Guest-focused' };
  return { color: '#10b981', label: 'Balanced service' };
};

/**
 * MealReport - Comprehensive meal services analytics with charts and exports
 */
const MealReport: React.FC<MealReportProps> = ({
  guests,
  mealRecords,
  rvMealRecords,
  shelterMealRecords,
  unitedEffortMealRecords,
  extraMealRecords,
  dayWorkerMealRecords,
  lunchBagRecords,
  exportDataAsCSV,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedDays, setSelectedDays] = useState([1, 3, 5, 6]);
  const [comparisonMonths, setComparisonMonths] = useState(3);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'export'>('overview');
  const chartRef = useRef<HTMLDivElement>(null);
  const [mealTypeFilters, setMealTypeFilters] = useState(() => ({ ...MEAL_TYPE_DEFAULTS }));

  const enabledMealTypeCount = useMemo(
    () => MEAL_TYPE_OPTIONS.reduce((count, option) => (mealTypeFilters[option.key] ? count + 1 : count), 0),
    [mealTypeFilters]
  );

  const toggleMealType = useCallback((key: string) => {
    setMealTypeFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selectAllMealTypes = useCallback(() => {
    setMealTypeFilters({ ...MEAL_TYPE_DEFAULTS });
  }, []);

  const clearMealTypes = useCallback(() => {
    setMealTypeFilters(MEAL_TYPE_OPTIONS.reduce((acc, option) => ({ ...acc, [option.key]: false }), {}));
  }, []);

  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b)
    );
  };

  const shiftMonth = (offset: number) => {
    const newDate = new Date(selectedYear, selectedMonth + offset);
    setSelectedYear(newDate.getFullYear());
    setSelectedMonth(newDate.getMonth());
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  const calculateMealData = useMemo((): MonthData[] => {
    const results: MonthData[] = [];

    for (let monthOffset = 0; monthOffset <= comparisonMonths; monthOffset++) {
      const targetDate = new Date(selectedYear, selectedMonth - monthOffset);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const monthLabel = `${MONTHS[targetMonth]} ${targetYear}`;

      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      let validDaysCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(targetYear, targetMonth, day);
        if (selectedDays.includes(getDayOfWeek(date))) {
          validDaysCount++;
        }
      }

      const filterRecordsByDayAndMonth = (records: MealRecord[]) => {
        return records.filter((record) => {
          const date = getDateFromRecord(record);
          if (!date) return false;
          const dayOfWeek = getDayOfWeek(date);
          return isDateInMonth(date, targetYear, targetMonth) && selectedDays.includes(dayOfWeek);
        });
      };

      const sumCounts = (records: MealRecord[]) =>
        records.reduce((sum, r) => sum + (r.count || 0), 0);

      const monthMeals = mealTypeFilters.guest ? filterRecordsByDayAndMonth(mealRecords) : [];
      const monthExtraMeals = mealTypeFilters.extras ? filterRecordsByDayAndMonth(extraMealRecords) : [];
      const monthRvMeals = mealTypeFilters.rv ? filterRecordsByDayAndMonth(rvMealRecords) : [];
      const monthDayWorkerMeals = mealTypeFilters.dayWorker ? filterRecordsByDayAndMonth(dayWorkerMealRecords) : [];
      const monthShelterMeals = mealTypeFilters.shelter ? filterRecordsByDayAndMonth(shelterMealRecords) : [];
      const monthUnitedEffortMeals = mealTypeFilters.unitedEffort ? filterRecordsByDayAndMonth(unitedEffortMealRecords) : [];
      const monthLunchBags = mealTypeFilters.lunchBags ? filterRecordsByDayAndMonth(lunchBagRecords) : [];

      const guestMealsCount = sumCounts(monthMeals);
      const extraMealsCount = sumCounts(monthExtraMeals);
      const rvMealsCount = sumCounts(monthRvMeals);
      const dayWorkerMealsCount = sumCounts(monthDayWorkerMeals);
      const shelterMealsCount = sumCounts(monthShelterMeals);
      const unitedEffortMealsCount = sumCounts(monthUnitedEffortMeals);
      const lunchBagsCount = sumCounts(monthLunchBags);

      const uniqueGuestIds = new Set(
        [...monthMeals, ...monthRvMeals, ...monthShelterMeals, ...monthUnitedEffortMeals, ...monthExtraMeals, ...monthDayWorkerMeals, ...monthLunchBags]
          .map((r) => r.guestId)
          .filter(Boolean)
      );

      const ageGroups: AgeGroups = { 'Adult 18-59': 0, 'Child 0-17': 0, 'Senior 60+': 0, Unknown: 0 };

      uniqueGuestIds.forEach((guestId) => {
        const guest = guests.find((g) => String(g.id) === String(guestId) || g.guestId === guestId);
        if (guest?.age && ageGroups[guest.age as keyof AgeGroups] !== undefined) {
          ageGroups[guest.age as keyof AgeGroups] += 1;
        } else {
          ageGroups.Unknown += 1;
        }
      });

      const totalMealsServed = guestMealsCount + extraMealsCount + rvMealsCount + dayWorkerMealsCount + shelterMealsCount + unitedEffortMealsCount + lunchBagsCount;
      const uniqueGuestsPerServiceDay = validDaysCount ? uniqueGuestIds.size / validDaysCount : uniqueGuestIds.size;

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
        uniqueGuestsPerServiceDay,
        uniqueGuests: uniqueGuestIds.size,
        validDaysCount,
        isCurrentMonth: monthOffset === 0,
        ageGroups,
      });
    }

    return results.reverse();
  }, [selectedYear, selectedMonth, selectedDays, comparisonMonths, mealRecords, rvMealRecords, shelterMealRecords, unitedEffortMealRecords, extraMealRecords, dayWorkerMealRecords, lunchBagRecords, mealTypeFilters, guests]);

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
      { name: 'Guest Meals', value: currentMonthData.guestMeals, color: '#3b82f6' },
      { name: 'Extras', value: currentMonthData.extras, color: '#f97316' },
      { name: 'RV Meals', value: currentMonthData.rvMeals, color: '#a855f7' },
      { name: 'Day Worker', value: currentMonthData.dayWorkerMeals, color: '#22c55e' },
      { name: 'Shelter', value: currentMonthData.shelterMeals, color: '#ec4899' },
      { name: 'United Effort', value: currentMonthData.unitedEffortMeals, color: '#6366f1' },
    ].filter((item) => item.value > 0);
  }, [currentMonthData]);

  const ageGroupBreakdown = useMemo(() => {
    if (!currentMonthData) return [];
    const { ageGroups } = currentMonthData;
    return [
      { name: 'Adult 18-59', value: ageGroups['Adult 18-59'], color: '#3b82f6' },
      { name: 'Child 0-17', value: ageGroups['Child 0-17'], color: '#10b981' },
      { name: 'Senior 60+', value: ageGroups['Senior 60+'], color: '#f59e0b' },
      { name: 'Unknown', value: ageGroups.Unknown, color: '#9ca3af' },
    ].filter((item) => item.value > 0);
  }, [currentMonthData]);

  const selectedDayLabels = useMemo(
    () => selectedDays.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label).filter(Boolean),
    [selectedDays]
  );

  const dailyScatterData = useMemo((): DailyScatterPoint[] => {
    if (!calculateMealData.length) return [];
    const currentMonth = calculateMealData[calculateMealData.length - 1];
    if (!currentMonth) return [];

    const { year: targetYear, monthIndex: targetMonthIndex } = currentMonth;
    const daysInMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
    const points: DailyScatterPoint[] = [];
    let serviceIndex = 0;

    const recordsForDay = (records: MealRecord[], day: number) =>
      records.filter((record) => {
        const recordDate = getDateFromRecord(record);
        if (!recordDate) return false;
        return recordDate.getFullYear() === targetYear && recordDate.getMonth() === targetMonthIndex && recordDate.getDate() === day;
      });

    const sumCounts = (records: MealRecord[]) => records.reduce((sum, r) => sum + (r.count || 0), 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonthIndex, day);
      const dayOfWeek = getDayOfWeek(date);
      if (!selectedDays.includes(dayOfWeek)) continue;

      serviceIndex += 1;

      const dayMeals = mealTypeFilters.guest ? recordsForDay(mealRecords, day) : [];
      const dayExtraMeals = mealTypeFilters.extras ? recordsForDay(extraMealRecords, day) : [];
      const dayRvMeals = mealTypeFilters.rv ? recordsForDay(rvMealRecords, day) : [];
      const dayDayWorkerMeals = mealTypeFilters.dayWorker ? recordsForDay(dayWorkerMealRecords, day) : [];
      const dayShelterMeals = mealTypeFilters.shelter ? recordsForDay(shelterMealRecords, day) : [];
      const dayUnitedEffortMeals = mealTypeFilters.unitedEffort ? recordsForDay(unitedEffortMealRecords, day) : [];

      const guestMealsTotal = sumCounts(dayMeals);
      const rvMealsTotal = sumCounts(dayRvMeals);
      const shelterMealsTotal = sumCounts(dayShelterMeals);
      const unitedEffortMealsTotal = sumCounts(dayUnitedEffortMeals);
      const extraMealsTotal = sumCounts(dayExtraMeals);
      const dayWorkerMealsTotal = sumCounts(dayDayWorkerMeals);

      const totalMeals = guestMealsTotal + rvMealsTotal + shelterMealsTotal + unitedEffortMealsTotal + extraMealsTotal + dayWorkerMealsTotal;
      const extrasShare = totalMeals ? extraMealsTotal / totalMeals : 0;

      const uniqueGuests = new Set(
        [...dayMeals, ...dayRvMeals, ...dayShelterMeals, ...dayUnitedEffortMeals].map((r) => r.guestId).filter(Boolean)
      ).size;

      const { color, label } = categorizeScatterPoint(totalMeals, extrasShare);

      points.push({
        timestamp: date.getTime(),
        serviceIndex,
        dateLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weekdayLabel: date.toLocaleDateString(undefined, { weekday: 'long' }),
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
  }, [calculateMealData, selectedDays, mealRecords, rvMealRecords, shelterMealRecords, unitedEffortMealRecords, extraMealRecords, dayWorkerMealRecords, mealTypeFilters]);

  const exportCSV = () => {
    if (calculateMealData.length === 0) {
      toast.error('No data to export');
      return;
    }
    if (enabledMealTypeCount === 0) {
      toast.error('Select at least one meal category before exporting.');
      return;
    }

    const current = calculateMealData[calculateMealData.length - 1];
    const { year: targetYear, monthIndex: targetMonth } = current;
    const exportData: Record<string, unknown>[] = [];
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const dayOfWeek = getDayOfWeek(date);
      if (!selectedDays.includes(dayOfWeek)) continue;

      const dateStr = pacificDateStringFrom(date);
      const dayName = DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label || date.toLocaleDateString('en-US', { weekday: 'long' });

      const filterRecordsByDate = (records: MealRecord[]) =>
        records.filter((record) => {
          const recordDate = getDateFromRecord(record);
          if (!recordDate) return false;
          return pacificDateStringFrom(recordDate) === dateStr;
        });

      const sumCounts = (records: MealRecord[]) => records.reduce((sum, r) => sum + (r.count || 0), 0);

      const dayMeals = mealTypeFilters.guest ? filterRecordsByDate(mealRecords) : [];
      const dayExtraMeals = mealTypeFilters.extras ? filterRecordsByDate(extraMealRecords) : [];
      const dayRvMeals = mealTypeFilters.rv ? filterRecordsByDate(rvMealRecords) : [];
      const dayDayWorkerMeals = mealTypeFilters.dayWorker ? filterRecordsByDate(dayWorkerMealRecords) : [];
      const dayShelterMeals = mealTypeFilters.shelter ? filterRecordsByDate(shelterMealRecords) : [];
      const dayUnitedEffortMeals = mealTypeFilters.unitedEffort ? filterRecordsByDate(unitedEffortMealRecords) : [];
      const dayLunchBags = mealTypeFilters.lunchBags ? filterRecordsByDate(lunchBagRecords) : [];

      const guestMealsTotal = sumCounts(dayMeals);
      const extraMealsTotal = sumCounts(dayExtraMeals);
      const rvMealsTotal = sumCounts(dayRvMeals);
      const dayWorkerMealsTotal = sumCounts(dayDayWorkerMeals);
      const shelterMealsTotal = sumCounts(dayShelterMeals);
      const unitedEffortMealsTotal = sumCounts(dayUnitedEffortMeals);
      const lunchBagsTotal = sumCounts(dayLunchBags);

      exportData.push({
        Date: date.toLocaleDateString(),
        'Day of Week': dayName,
        'Guest Meals': guestMealsTotal,
        'Extra Meals': extraMealsTotal,
        'RV Meals': rvMealsTotal,
        'Day Worker Meals': dayWorkerMealsTotal,
        'Shelter Meals': shelterMealsTotal,
        'United Effort Meals': unitedEffortMealsTotal,
        'Lunch Bags': lunchBagsTotal,
        'Total Meals': guestMealsTotal + extraMealsTotal + rvMealsTotal + dayWorkerMealsTotal + shelterMealsTotal + unitedEffortMealsTotal + lunchBagsTotal,
      });
    }

    const filename = `meal-report-${MONTHS[targetMonth]}-${targetYear}-${selectedDays.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label?.substring(0, 3)).join('-')}.csv`;
    exportDataAsCSV(exportData, filename);
    toast.success('Meal report exported successfully!');
  };

  const isCurrentMonth = selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth();

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: MonthData }> }) => {
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
          <p className="text-indigo-600">United Effort: {data.unitedEffortMeals}</p>
          <p className="font-semibold text-gray-800 mt-2 pt-2 border-t">Total: {data.totalMeals}</p>
          <p className="text-gray-600">Unique Guests: {data.uniqueGuests}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen space-y-4 pb-8">
      {/* Compact Header with Month Navigator */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 shadow-sm">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-gradient-to-br from-blue-200/30 to-indigo-200/30 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5 shadow-md">
              <Utensils size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Meal Services Report</h1>
              <p className="text-xs text-gray-600">Track and analyze meal operations</p>
            </div>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-2 rounded-xl border border-blue-200/50 bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95 shadow-md"
              title="Previous month"
            >
              <ChevronLeft size={24} strokeWidth={3} />
            </button>
            <div className="text-center px-2">
              <div className="text-sm font-bold text-blue-900">
                {MONTHS[selectedMonth]} {selectedYear}
              </div>
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              disabled={isCurrentMonth}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95 shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              title="Next month"
            >
              <ChevronRight size={24} strokeWidth={3} />
            </button>
            <div className="h-6 w-px bg-blue-200" />
            <button
              type="button"
              onClick={goToCurrentMonth}
              disabled={isCurrentMonth}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Day Selection */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-600">
            <Calendar size={14} className="text-blue-600" />
            Service Days:
          </span>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                  selectedDays.includes(day.value)
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {day.short}
              </button>
            ))}
          </div>
          {selectedDays.length === 0 && (
            <span className="text-xs font-medium text-red-600">Select at least one day</span>
          )}
        </div>
      </div>

      {/* Meal Categories */}
      <details className="rounded-xl border border-gray-200 bg-white shadow-sm group">
        <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <span className="flex items-center gap-2">
            <Utensils size={16} className="text-blue-600" />
            Meal Categories ({enabledMealTypeCount}/{MEAL_TYPE_OPTIONS.length} selected)
          </span>
          <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="border-t border-gray-100 p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={selectAllMealTypes}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:border-blue-200 hover:text-blue-600"
            >
              <Circle size={10} /> All
            </button>
            <button
              type="button"
              onClick={clearMealTypes}
              disabled={enabledMealTypeCount === 0}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:border-blue-200 hover:text-blue-600 disabled:text-gray-400"
            >
              <RotateCcw size={10} /> Clear all
            </button>
          </div>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {MEAL_TYPE_OPTIONS.map((option) => {
              const isActive = Boolean(mealTypeFilters[option.key]);
              return (
                <label
                  key={option.key}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all cursor-pointer ${
                    isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => toggleMealType(option.key)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-700 truncate">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </details>

      {selectedDays.length > 0 && currentMonthData && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="rounded-lg bg-blue-100 p-2 flex-shrink-0">
                <Utensils size={18} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Meals</p>
                <p className="text-xl font-bold text-gray-900 truncate" data-testid="meal-total-value">
                  {currentMonthData.totalMeals.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="rounded-lg bg-emerald-100 p-2 flex-shrink-0">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Guests/Day</p>
                <p className="text-xl font-bold text-gray-900 truncate">
                  {Math.round(currentMonthData.uniqueGuestsPerServiceDay).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="rounded-lg bg-purple-100 p-2 flex-shrink-0">
                <Users size={18} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Guests</p>
                <p className="text-xl font-bold text-gray-900 truncate">
                  {currentMonthData.uniqueGuests.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="rounded-lg bg-amber-100 p-2 flex-shrink-0">
                <Calendar size={18} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Days</p>
                <p className="text-xl font-bold text-gray-900 truncate">{currentMonthData.validDaysCount}</p>
              </div>
            </div>
          </div>

          {/* Month Comparison */}
          {previousMonthData && (
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-600 p-2">
                  <BarChart3 size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-900">vs {previousMonthData.month}: </span>
                  <span className="text-sm text-gray-700">
                    {(() => {
                      const delta = currentMonthData.totalMeals - previousMonthData.totalMeals;
                      const magnitude = Math.abs(delta);
                      const percentChange = previousMonthData.totalMeals
                        ? ((delta / previousMonthData.totalMeals) * 100).toFixed(1)
                        : '0.0';
                      if (delta === 0) return 'No change';
                      return (
                        <>
                          <span className={`font-bold ${delta > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {delta > 0 ? '+' : ''}{magnitude.toLocaleString()} meals
                          </span>{' '}
                          (<span className={`font-semibold ${delta > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {delta > 0 ? '+' : ''}{percentChange}%
                          </span>)
                        </>
                      );
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'overview' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <PieChart size={16} />
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'trends' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 size={16} />
              Trends
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'export' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Download size={16} />
              Export
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Meal Type Breakdown */}
              {mealTypeBreakdown.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                    <Package size={18} className="text-orange-600" />
                    Meal Distribution
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <RePieChart>
                      <Pie
                        data={mealTypeBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${(name ?? '').toString().split(' ')[0]}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
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
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {mealTypeBreakdown.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-medium text-gray-700 truncate">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 ml-1">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Age Group Breakdown */}
              {ageGroupBreakdown.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
                    <Users size={18} className="text-blue-600" />
                    Age Demographics
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <RePieChart>
                      <Pie
                        data={ageGroupBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${(name ?? '').toString().split(' ')[0]}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
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
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {ageGroupBreakdown.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-medium text-gray-700 truncate">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 ml-1">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Service Volume */}
              {dailyScatterData.length > 0 && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <h2 className="mb-2 text-xl font-bold text-gray-900">Service Day Trends</h2>
                  <p className="mb-6 text-sm text-gray-600">
                    Compare meal volume trends across different service days throughout the month.
                  </p>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={dailyScatterData} margin={{ top: 16, right: 24, bottom: 60, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        label={{ value: 'Service Date', position: 'insideBottom', offset: -35 }}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Total Meals Served', angle: -90, position: 'insideLeft', offset: 10 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload as DailyScatterPoint;
                            return (
                              <div className="rounded-lg border-2 border-gray-300 bg-white p-4 shadow-xl">
                                <p className="mb-2 font-bold text-gray-900">{data.weekdayLabel}, {data.dateLabel}</p>
                                <div className="space-y-1 text-sm">
                                  <p className="font-semibold text-blue-700">Total Meals: {data.totalMeals}</p>
                                  <p className="text-gray-600">Unique Guests: {data.uniqueGuests}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line type="monotone" dataKey="totalMeals" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5, fill: '#3b82f6' }} name="Total Meals" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-6">
              {/* Comparison Period Selector */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">Historical Comparison Period</label>
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
                </div>
                <div ref={chartRef} className="bg-white p-4">
                  <ResponsiveContainer width="100%" height={450}>
                    <ComposedChart data={calculateMealData} margin={{ top: 16, right: 40, bottom: 80, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: 'Total Meals', angle: -90, position: 'insideLeft', offset: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'Guests/Day', angle: -90, position: 'insideRight', offset: -5 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar yAxisId="left" dataKey="guestMeals" stackId="a" fill="#3b82f6" name="Guest Meals" />
                      <Bar yAxisId="left" dataKey="extras" stackId="a" fill="#f97316" name="Extras" />
                      <Bar yAxisId="left" dataKey="rvMeals" stackId="a" fill="#a855f7" name="RV Meals" />
                      <Bar yAxisId="left" dataKey="dayWorkerMeals" stackId="a" fill="#22c55e" name="Day Worker" />
                      <Bar yAxisId="left" dataKey="shelterMeals" stackId="a" fill="#ec4899" name="Shelter" />
                      <Bar yAxisId="left" dataKey="unitedEffortMeals" stackId="a" fill="#6366f1" name="United Effort" />
                      <Line yAxisId="right" type="monotone" dataKey="uniqueGuestsPerServiceDay" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} name="Guests/Day" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary Table */}
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
                        <th className="px-4 py-3 text-right font-bold">Guest</th>
                        <th className="px-4 py-3 text-right font-bold">Extras</th>
                        <th className="px-4 py-3 text-right font-bold">RV</th>
                        <th className="px-4 py-3 text-right font-bold">Day Worker</th>
                        <th className="px-4 py-3 text-right font-bold">Shelter</th>
                        <th className="px-4 py-3 text-right font-bold">United Effort</th>
                        <th className="px-4 py-3 text-right font-bold">Total</th>
                        <th className="px-4 py-3 text-right font-bold">Guests/Day</th>
                        <th className="px-4 py-3 text-right font-bold">Unique</th>
                        <th className="px-4 py-3 text-right font-bold">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateMealData.map((data, index) => (
                        <tr key={index} className={`border-b transition ${data.isCurrentMonth ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-3">{data.month}</td>
                          <td className="px-4 py-3 text-right">{data.guestMeals}</td>
                          <td className="px-4 py-3 text-right">{data.extras}</td>
                          <td className="px-4 py-3 text-right">{data.rvMeals}</td>
                          <td className="px-4 py-3 text-right">{data.dayWorkerMeals}</td>
                          <td className="px-4 py-3 text-right">{data.shelterMeals}</td>
                          <td className="px-4 py-3 text-right">{data.unitedEffortMeals}</td>
                          <td className="px-4 py-3 text-right font-semibold">{data.totalMeals}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{Math.round(data.uniqueGuestsPerServiceDay || 0)}</td>
                          <td className="px-4 py-3 text-right text-green-700">{data.uniqueGuests}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{data.validDaysCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="mx-auto max-w-2xl">
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Download size={32} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Export Meal Data</h2>
                  <p className="mt-2 text-gray-600">Download meal records as CSV for reporting and analysis</p>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                    <p className="mb-4 text-sm font-bold uppercase tracking-wide text-blue-800">Export Details</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Period:</span>
                        <span className="font-semibold text-gray-900">{MONTHS[selectedMonth]} {selectedYear}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Days:</span>
                        <span className="font-semibold text-gray-900">{selectedDayLabels.join(', ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Total Records:</span>
                        <span className="font-semibold text-gray-900">{currentMonthData.validDaysCount} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Total Meals:</span>
                        <span className="font-semibold text-blue-700">{currentMonthData.totalMeals.toLocaleString()}</span>
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

                  <p className="text-center text-xs text-gray-500">CSV includes date, day of week, meal types, and totals</p>
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
