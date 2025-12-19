'use client';

import React, { useMemo, useCallback, useState } from 'react';
import {
  Download,
  Calendar,
  Droplets,
  Info,
  ChevronDown,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMealsStore } from '@/lib/stores/useMealsStore';
import { useServicesStore } from '@/lib/stores/useServicesStore';
import { useGuestsStore } from '@/lib/stores/useGuestsStore';
import { LAUNDRY_STATUS } from '@/lib/constants';
import { isBicycleStatusCountable } from '@/lib/utils/bicycles';
import { exportDataAsCSV } from '@/lib/utils/export';
import type { MealRecord, Guest } from '@/lib/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ColumnDefinition {
  key: string;
  label: string;
  description: string | null;
  align: 'left' | 'right';
  headerBg: string;
  cellBg: string;
  totalCellBg: string;
  bodyClass: string;
  totalBodyClass: string;
  isNumeric: boolean;
}

const MEAL_COLUMN_DEFINITIONS: ColumnDefinition[] = [
  {
    key: 'month',
    label: 'Month',
    description: null,
    align: 'left',
    headerBg: '',
    cellBg: '',
    totalCellBg: '',
    bodyClass: 'font-semibold text-gray-900',
    totalBodyClass: 'font-semibold text-gray-900',
    isNumeric: false,
  },
  {
    key: 'mondayMeals',
    label: 'Monday',
    description: 'Hot guest meals served during the Monday dining service.',
    align: 'right',
    headerBg: 'bg-gray-100',
    cellBg: 'bg-gray-100',
    totalCellBg: 'bg-gray-100',
    bodyClass: 'tabular-nums',
    totalBodyClass: 'tabular-nums font-semibold text-gray-900',
    isNumeric: true,
  },
  {
    key: 'wednesdayMeals',
    label: 'Wednesday',
    description: 'Hot guest meals served during the Wednesday meal service.',
    align: 'right',
    headerBg: 'bg-gray-100',
    cellBg: 'bg-gray-100',
    totalCellBg: 'bg-gray-100',
    bodyClass: 'tabular-nums',
    totalBodyClass: 'tabular-nums font-semibold text-gray-900',
    isNumeric: true,
  },
  {
    key: 'saturdayMeals',
    label: 'Saturday',
    description: 'Saturday hot meals for in-person buffet service.',
    align: 'right',
    headerBg: 'bg-gray-100',
    cellBg: 'bg-gray-100',
    totalCellBg: 'bg-gray-100',
    bodyClass: 'tabular-nums',
    totalBodyClass: 'tabular-nums font-semibold text-gray-900',
    isNumeric: true,
  },
  {
    key: 'uniqueGuests',
    label: 'Unique Guests',
    description: 'Number of unique guests who received meals this month.',
    align: 'right',
    headerBg: 'bg-emerald-50',
    cellBg: 'bg-emerald-50',
    totalCellBg: 'bg-emerald-50',
    bodyClass: 'tabular-nums',
    totalBodyClass: 'tabular-nums font-semibold text-gray-900',
    isNumeric: true,
  },
  {
    key: 'newGuests',
    label: 'New Guests',
    description: 'Number of guests who received their first meal ever this month.',
    align: 'right',
    headerBg: 'bg-sky-50',
    cellBg: 'bg-sky-50',
    totalCellBg: 'bg-sky-50',
    bodyClass: 'tabular-nums',
    totalBodyClass: 'tabular-nums font-semibold text-gray-900',
    isNumeric: true,
  },
  {
    key: 'fridayMeals',
    label: 'Friday',
    description: 'Friday coffee and breakfast meals served to guests.',
    align: 'right',
    headerBg: 'bg-blue-50',
    cellBg: 'bg-blue-50',
    totalCellBg: 'bg-blue-50',
    bodyClass: 'tabular-nums',
    totalBodyClass: 'tabular-nums font-semibold text-gray-900',
    isNumeric: true,
  },
  {
    key: 'rvMeals',
    label: 'RV Meals',
    description: 'Meals delivered to the RV community.',
    align: 'right',
    headerBg: 'bg-orange-50',
    cellBg: 'bg-orange-50',
    totalCellBg: 'bg-orange-50',
    bodyClass: 'tabular-nums',
    totalBodyClass: 'tabular-nums font-semibold text-gray-900',
    isNumeric: true,
  },
  {
    key: 'extraMeals',
    label: 'Extra Meals',
    description: 'Additional hot meals plated beyond the scheduled guest count.',
    align: 'right',
    headerBg: 'bg-white',
    cellBg: 'bg-white',
    totalCellBg: 'bg-white',
    bodyClass: 'tabular-nums',
    totalBodyClass: 'tabular-nums font-semibold text-gray-900',
    isNumeric: true,
  },
  {
    key: 'totalHotMeals',
    label: 'TOTAL HOT MEALS',
    description: 'All hot meals served across all programs.',
    align: 'right',
    headerBg: 'bg-white',
    cellBg: 'bg-white',
    totalCellBg: 'bg-white',
    bodyClass: 'tabular-nums font-semibold text-gray-900',
    totalBodyClass: 'tabular-nums font-semibold text-gray-900',
    isNumeric: true,
  },
];

const MEAL_COLUMN_MAP = MEAL_COLUMN_DEFINITIONS.reduce((acc, column) => {
  acc[column.key] = column;
  return acc;
}, {} as Record<string, ColumnDefinition>);

const MEAL_DETAIL_COLUMN_KEYS = [
  'mondayMeals', 'wednesdayMeals', 'fridayMeals', 'saturdayMeals',
  'uniqueGuests', 'newGuests', 'rvMeals', 'extraMeals', 'totalHotMeals',
];

const formatNumber = (value: number | null | undefined): string => {
  if (value == null) return '0';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString();
};

const formatAverage = (value: number, decimals = 1): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0.0';
  return numeric.toFixed(decimals);
};

const buildCellClass = (
  column: ColumnDefinition,
  { isTotal }: { isTotal?: boolean } = {}
): string => {
  const alignmentClass = column.align === 'right' ? 'text-right' : 'text-left';
  const bgClass = isTotal
    ? column.totalCellBg ?? column.cellBg
    : column.cellBg;
  const bodyClass = isTotal
    ? column.totalBodyClass || `${column.bodyClass || ''} font-semibold text-gray-900`
    : column.bodyClass || '';

  return [
    'border border-gray-300 px-3 py-2',
    alignmentClass,
    bgClass,
    bodyClass,
  ].filter(Boolean).join(' ');
};

interface ColumnTooltipProps {
  label: string;
  description: string;
}

const ColumnTooltip: React.FC<ColumnTooltipProps> = ({ label, description }) => (
  <div className="relative inline-flex group">
    <button
      type="button"
      className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:text-gray-600"
      aria-label={`Explain ${label}`}
    >
      <Info size={14} aria-hidden="true" />
    </button>
    <div className="pointer-events-none absolute bottom-full right-0 z-20 hidden w-64 mb-2 rounded-md border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-xl group-hover:block">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="mt-1">{description}</p>
    </div>
  </div>
);

interface TooltipHeaderProps {
  column: ColumnDefinition;
}

const TooltipHeader: React.FC<TooltipHeaderProps> = ({ column }) => {
  const alignment = column.align === 'right' ? 'justify-end' : 'justify-start';
  const textAlignment = column.align === 'right' ? 'text-right' : 'text-left';
  const headerClasses = [
    'border border-gray-300 px-3 py-2 font-semibold text-gray-900',
    column.headerBg,
    textAlignment,
  ].filter(Boolean).join(' ');

  return (
    <th scope="col" className={headerClasses}>
      <div className={`flex items-center gap-1 ${alignment}`}>
        <span>{column.label}</span>
        {column.description ? (
          <ColumnTooltip label={column.label} description={column.description} />
        ) : null}
      </div>
    </th>
  );
};

interface MonthlyMealData {
  month: string;
  mondayMeals: number;
  wednesdayMeals: number;
  saturdayMeals: number;
  fridayMeals: number;
  uniqueGuests: number;
  newGuests: number;
  rvMeals: number;
  extraMeals: number;
  totalHotMeals: number;
  [key: string]: string | number;
}

interface ShowerLaundryRow {
  month: string;
  programDays: number;
  showerServiceDays: number;
  laundryServiceDays: number;
  showersProvided: number;
  participantsAdult: number;
  participantsSenior: number;
  participantsChild: number;
  totalParticipants: number;
  newGuests: number;
  laundryLoadsProcessed: number;
  onsiteLaundryLoads: number;
  offsiteLaundryLoads: number;
  unduplicatedLaundryUsers: number;
  laundryAdult: number;
  laundrySenior: number;
  laundryChild: number;
  newLaundryGuests: number;
  avgShowersPerDay: number;
  avgLaundryLoadsPerDay: number;
  isYearToDate: boolean;
}

interface BicycleRow {
  month: string;
  newBikes: number;
  services: number;
  total: number;
  isYearToDate: boolean;
}

/**
 * MonthlySummaryReport - Comprehensive monthly meal statistics table
 */
const MonthlySummaryReport: React.FC = () => {
  const { mealRecords, rvMealRecords, extraMealRecords } = useMealsStore();
  const { showerRecords, laundryRecords, bicycleRecords } = useServicesStore();
  const { guests } = useGuestsStore();

  const [showColumnGuide, setShowColumnGuide] = useState(false);
  const columnGuideId = 'monthly-summary-column-guide';

  const reportMetadata = useMemo(() => {
    const now = new Date();
    return {
      reportYear: now.getFullYear(),
      currentMonth: now.getMonth(),
    };
  }, []);

  const { reportYear, currentMonth } = reportMetadata;

  // Helper: Get day of week from date string (0=Sunday, 1=Monday, ..., 6=Saturday)
  const getDayOfWeek = useCallback((dateString: string): number | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.getDay();
  }, []);

  // Helper: Filter records by year, month, and optionally specific days
  const filterRecords = useCallback(
    (records: MealRecord[], year: number, month: number, daysOfWeek: number[] | null = null): MealRecord[] => {
      return records.filter((record) => {
        if (!record.date) return false;
        const date = new Date(record.date);
        const recordYear = date.getFullYear();
        const recordMonth = date.getMonth();

        if (recordYear !== year || recordMonth !== month) return false;

        if (daysOfWeek) {
          const dayOfWeek = getDayOfWeek(record.date);
          return dayOfWeek !== null && daysOfWeek.includes(dayOfWeek);
        }

        return true;
      });
    },
    [getDayOfWeek]
  );

  // Helper: Sum quantities from filtered records
  const sumQuantities = (records: MealRecord[]): number => {
    return records.reduce((sum, record) => sum + (record.count || 0), 0);
  };

  const normalizeRepairTypes = useCallback((record: { repairTypes?: string[] | null; repairType?: string | null }): string[] => {
    if (!record) return [];
    const rawTypes = Array.isArray(record.repairTypes)
      ? record.repairTypes
      : record.repairType
        ? [record.repairType]
        : [];
    return rawTypes
      .map((type) => (type == null ? '' : String(type).trim()))
      .filter((type) => type.length > 0);
  }, []);

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const months: MonthlyMealData[] = [];
    const effectiveLastMonth = Math.min(Math.max(currentMonth, 0), MONTH_NAMES.length - 1);

    for (let month = 0; month <= effectiveLastMonth; month++) {
      const monthName = MONTH_NAMES[month];

      const mondayMeals = sumQuantities(filterRecords(mealRecords, reportYear, month, [1]));
      const wednesdayMeals = sumQuantities(filterRecords(mealRecords, reportYear, month, [3]));
      const saturdayMeals = sumQuantities(filterRecords(mealRecords, reportYear, month, [6]));
      const fridayMeals = sumQuantities(filterRecords(mealRecords, reportYear, month, [5]));
      const rvMeals = sumQuantities(filterRecords(rvMealRecords, reportYear, month));
      const extraMeals = sumQuantities(filterRecords(extraMealRecords, reportYear, month));

      const totalHotMeals = mondayMeals + wednesdayMeals + saturdayMeals + fridayMeals + rvMeals + extraMeals;

      // Calculate unique guests
      const monthMealRecords = filterRecords(mealRecords, reportYear, month);
      const uniqueGuestIds = new Set(
        monthMealRecords.map((record) => record.guestId).filter(Boolean)
      );
      const uniqueGuests = uniqueGuestIds.size;

      // Calculate new guests
      const allMealRecordsSorted = [...mealRecords].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const firstMealByGuest = new Map<string, Date>();
      allMealRecordsSorted.forEach((record) => {
        if (record.guestId && !firstMealByGuest.has(record.guestId)) {
          firstMealByGuest.set(record.guestId, new Date(record.date));
        }
      });

      let newGuests = 0;
      uniqueGuestIds.forEach((guestId) => {
        if (!guestId) return;
        const firstMealDate = firstMealByGuest.get(guestId);
        if (firstMealDate) {
          const firstYear = firstMealDate.getFullYear();
          const firstMonth = firstMealDate.getMonth();
          if (firstYear === reportYear && firstMonth === month) {
            newGuests++;
          }
        }
      });

      months.push({
        month: monthName,
        mondayMeals,
        wednesdayMeals,
        saturdayMeals,
        fridayMeals,
        uniqueGuests,
        newGuests,
        rvMeals,
        extraMeals,
        totalHotMeals,
      });
    }

    // Calculate YTD unique guests
    const allYearUniqueGuestIds = new Set<string>();
    mealRecords.forEach((record) => {
      if (record.date && record.guestId) {
        const date = new Date(record.date);
        if (date.getFullYear() === reportYear && date.getMonth() <= effectiveLastMonth) {
          allYearUniqueGuestIds.add(record.guestId);
        }
      }
    });

    const totals: MonthlyMealData = {
      month: 'Year to Date',
      mondayMeals: months.reduce((sum, m) => sum + m.mondayMeals, 0),
      wednesdayMeals: months.reduce((sum, m) => sum + m.wednesdayMeals, 0),
      saturdayMeals: months.reduce((sum, m) => sum + m.saturdayMeals, 0),
      fridayMeals: months.reduce((sum, m) => sum + m.fridayMeals, 0),
      uniqueGuests: allYearUniqueGuestIds.size,
      newGuests: months.reduce((sum, m) => sum + m.newGuests, 0),
      rvMeals: months.reduce((sum, m) => sum + m.rvMeals, 0),
      extraMeals: months.reduce((sum, m) => sum + m.extraMeals, 0),
      totalHotMeals: months.reduce((sum, m) => sum + m.totalHotMeals, 0),
    };

    return { months, totals };
  }, [mealRecords, rvMealRecords, extraMealRecords, filterRecords, reportYear, currentMonth]);

  // Summary insights
  const summaryInsights = useMemo(() => {
    const months = monthlyData.months || [];
    if (months.length === 0) return [];

    const ytdHotMeals = monthlyData.totals.totalHotMeals;
    const averageHotMeals = Math.round(ytdHotMeals / months.length || 0);
    const topMonth = months.reduce(
      (best, current) => (current.totalHotMeals > best.totalHotMeals ? current : best),
      months[0]
    );

    return [
      {
        title: 'YTD Hot Meals',
        value: formatNumber(ytdHotMeals),
        context: `${months.length} month${months.length === 1 ? '' : 's'} recorded`,
        description: 'Total hot meals served across all programs so far this calendar year.',
      },
      {
        title: 'Average Hot Meals / Month',
        value: formatNumber(averageHotMeals),
        context: `Peak month: ${topMonth.month} (${formatNumber(topMonth.totalHotMeals)} meals)`,
        description: 'Helps planning for staffing, food ordering, and volunteer shifts.',
      },
      {
        title: 'Unique Guests YTD',
        value: formatNumber(monthlyData.totals.uniqueGuests),
        context: `${formatNumber(monthlyData.totals.newGuests)} new guests this year`,
        description: 'Individual people served at least once this year.',
      },
    ];
  }, [monthlyData]);

  // Bicycle summary
  const bicycleSummary = useMemo(() => {
    const rows: BicycleRow[] = MONTH_NAMES.map((monthName, monthIndex) => {
      const recordsForMonth = (bicycleRecords || []).filter((record) => {
        if (!record?.date) return false;
        const date = new Date(record.date);
        return (
          date.getFullYear() === reportYear &&
          date.getMonth() === monthIndex &&
          isBicycleStatusCountable(record.status)
        );
      });

      let newBikes = 0;
      let services = 0;
      recordsForMonth.forEach((record) => {
        const types = normalizeRepairTypes(record);
        if (types.length === 0) return;
        types.forEach((type) => {
          if (type.toLowerCase() === 'new bicycle') {
            newBikes += 1;
          } else {
            services += 1;
          }
        });
      });

      return {
        month: monthName,
        newBikes,
        services,
        total: newBikes + services,
        isYearToDate: monthIndex <= currentMonth,
      };
    });

    const yearToDateRows = rows.filter((row) => row.isYearToDate);
    const totals = yearToDateRows.reduce(
      (acc, row) => ({
        newBikes: acc.newBikes + row.newBikes,
        services: acc.services + row.services,
        total: acc.total + row.total,
      }),
      { newBikes: 0, services: 0, total: 0 }
    );

    return { rows, totals };
  }, [bicycleRecords, normalizeRepairTypes, reportYear, currentMonth]);

  // Shower & Laundry summary
  const showerLaundrySummary = useMemo(() => {
    const guestMap = new Map<string, Guest>();
    (guests || []).forEach((guest) => {
      if (!guest) return;
      const candidateIds = [guest.id, guest.guestId].filter((value) => value != null);
      candidateIds.forEach((value) => {
        guestMap.set(String(value), guest);
      });
    });

    const categorizeAge = (guestId: string | null): 'adult' | 'senior' | 'child' => {
      if (!guestId) return 'adult';
      const guest = guestMap.get(String(guestId));
      const rawAge = (guest?.age ?? '').toString().toLowerCase();

      if (rawAge.includes('senior')) return 'senior';
      if (rawAge.includes('child')) return 'child';
      return 'adult';
    };

    const completedLaundryStatuses = new Set([
      LAUNDRY_STATUS.DONE,
      LAUNDRY_STATUS.PICKED_UP,
      LAUNDRY_STATUS.RETURNED,
      LAUNDRY_STATUS.OFFSITE_PICKED_UP,
    ].map((value) => value.toString().toLowerCase()));

    type ProcessedRecord = {
      guestId: string | null;
      date: Date;
      monthIndex: number;
      laundryType?: string;
    };

    const completedShowerRecords: ProcessedRecord[] = (showerRecords || []).reduce(
      (acc: ProcessedRecord[], record) => {
        if (!record?.date) return acc;
        const date = new Date(record.date);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== reportYear) return acc;
        const status = (record.status || '').toString().toLowerCase();
        if (status && status !== 'done') return acc;
        acc.push({
          guestId: record.guestId || null,
          date,
          monthIndex: date.getMonth(),
        });
        return acc;
      },
      []
    );

    const completedLaundryRecords: ProcessedRecord[] = (laundryRecords || []).reduce(
      (acc: ProcessedRecord[], record) => {
        if (!record?.date) return acc;
        const date = new Date(record.date);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== reportYear) return acc;
        const status = (record.status || '').toString().toLowerCase();
        if (!completedLaundryStatuses.has(status)) return acc;
        acc.push({
          guestId: record.guestId || null,
          date,
          monthIndex: date.getMonth(),
          laundryType: record.laundryType,
        });
        return acc;
      },
      []
    );

    const rows: ShowerLaundryRow[] = [];
    const ytdGuestSet = new Set<string>();
    const ytdLaundrySet = new Set<string>();
    let runningNewGuests = 0;
    let runningNewLaundryGuests = 0;

    const guestFirstMonth = new Map<string, number>();
    const allRecords = [...completedShowerRecords, ...completedLaundryRecords];
    allRecords.forEach((record) => {
      if (!record.guestId) return;
      const existing = guestFirstMonth.get(record.guestId);
      if (existing == null || record.monthIndex < existing) {
        guestFirstMonth.set(record.guestId, record.monthIndex);
      }
    });

    const laundryGuestFirstMonth = new Map<string, number>();
    completedLaundryRecords.forEach((record) => {
      if (!record.guestId) return;
      const existing = laundryGuestFirstMonth.get(record.guestId);
      if (existing == null || record.monthIndex < existing) {
        laundryGuestFirstMonth.set(record.guestId, record.monthIndex);
      }
    });

    const totalsAccumulator = {
      programDays: 0,
      showersProvided: 0,
      laundryLoadsProcessed: 0,
      onsiteLaundryLoads: 0,
      offsiteLaundryLoads: 0,
      showerServiceDays: 0,
      laundryServiceDays: 0,
    };

    const ytdParticipantAgeSets = { adult: new Set<string>(), senior: new Set<string>(), child: new Set<string>() };
    const ytdLaundryAgeSets = { adult: new Set<string>(), senior: new Set<string>(), child: new Set<string>() };

    MONTH_NAMES.forEach((monthName, monthIndex) => {
      const showersForMonth = completedShowerRecords.filter((r) => r.monthIndex === monthIndex);
      const laundryForMonth = completedLaundryRecords.filter((r) => r.monthIndex === monthIndex);
      const combinedForMonth = [...showersForMonth, ...laundryForMonth];

      const programDaysSet = new Set(combinedForMonth.map((r) => r.date.toISOString().slice(0, 10)));
      const showerServiceDaysSet = new Set(showersForMonth.map((r) => r.date.toISOString().slice(0, 10)));
      const laundryServiceDaysSet = new Set(laundryForMonth.map((r) => r.date.toISOString().slice(0, 10)));

      const monthGuestSet = new Set<string>();
      combinedForMonth.forEach((r) => { if (r.guestId) monthGuestSet.add(r.guestId); });

      const participantsCounts = { adult: 0, senior: 0, child: 0 };
      monthGuestSet.forEach((guestId) => {
        const bucket = categorizeAge(guestId);
        participantsCounts[bucket] += 1;
      });

      const laundryGuestSet = new Set<string>();
      laundryForMonth.forEach((r) => { if (r.guestId) laundryGuestSet.add(r.guestId); });

      const laundryCounts = { adult: 0, senior: 0, child: 0 };
      laundryGuestSet.forEach((guestId) => {
        const bucket = categorizeAge(guestId);
        laundryCounts[bucket] += 1;
      });

      const onsiteLaundryLoads = laundryForMonth.filter((r) => r.laundryType === 'onsite').length;
      const offsiteLaundryLoads = laundryForMonth.filter((r) => r.laundryType === 'offsite').length;

      const isYearToDate = monthIndex <= currentMonth;
      const newGuestsThisMonth = [...monthGuestSet].filter((gId) => guestFirstMonth.get(gId) === monthIndex).length;
      const newLaundryGuestsThisMonth = [...laundryGuestSet].filter((gId) => laundryGuestFirstMonth.get(gId) === monthIndex).length;

      if (isYearToDate) {
        monthGuestSet.forEach((gId) => {
          ytdGuestSet.add(gId);
          const bucket = categorizeAge(gId);
          ytdParticipantAgeSets[bucket].add(gId);
        });
        laundryGuestSet.forEach((gId) => {
          ytdLaundrySet.add(gId);
          const bucket = categorizeAge(gId);
          ytdLaundryAgeSets[bucket].add(gId);
        });
        runningNewGuests += newGuestsThisMonth;
        runningNewLaundryGuests += newLaundryGuestsThisMonth;

        totalsAccumulator.programDays += programDaysSet.size;
        totalsAccumulator.showersProvided += showersForMonth.length;
        totalsAccumulator.laundryLoadsProcessed += laundryForMonth.length;
        totalsAccumulator.onsiteLaundryLoads += onsiteLaundryLoads;
        totalsAccumulator.offsiteLaundryLoads += offsiteLaundryLoads;
        totalsAccumulator.showerServiceDays += showerServiceDaysSet.size;
        totalsAccumulator.laundryServiceDays += laundryServiceDaysSet.size;
      }

      const showerServiceDays = showerServiceDaysSet.size;
      const laundryServiceDays = laundryServiceDaysSet.size;

      rows.push({
        month: monthName,
        programDays: programDaysSet.size,
        showerServiceDays,
        laundryServiceDays,
        showersProvided: showersForMonth.length,
        participantsAdult: participantsCounts.adult,
        participantsSenior: participantsCounts.senior,
        participantsChild: participantsCounts.child,
        totalParticipants: participantsCounts.adult + participantsCounts.senior + participantsCounts.child,
        newGuests: newGuestsThisMonth,
        laundryLoadsProcessed: laundryForMonth.length,
        onsiteLaundryLoads,
        offsiteLaundryLoads,
        unduplicatedLaundryUsers: laundryGuestSet.size,
        laundryAdult: laundryCounts.adult,
        laundrySenior: laundryCounts.senior,
        laundryChild: laundryCounts.child,
        newLaundryGuests: newLaundryGuestsThisMonth,
        avgShowersPerDay: showerServiceDays > 0 ? showersForMonth.length / showerServiceDays : 0,
        avgLaundryLoadsPerDay: laundryServiceDays > 0 ? laundryForMonth.length / laundryServiceDays : 0,
        isYearToDate,
      });
    });

    const totals: ShowerLaundryRow = {
      month: 'Year to Date',
      programDays: totalsAccumulator.programDays,
      showerServiceDays: totalsAccumulator.showerServiceDays,
      laundryServiceDays: totalsAccumulator.laundryServiceDays,
      showersProvided: totalsAccumulator.showersProvided,
      participantsAdult: ytdParticipantAgeSets.adult.size,
      participantsSenior: ytdParticipantAgeSets.senior.size,
      participantsChild: ytdParticipantAgeSets.child.size,
      totalParticipants: ytdParticipantAgeSets.adult.size + ytdParticipantAgeSets.senior.size + ytdParticipantAgeSets.child.size,
      newGuests: runningNewGuests,
      laundryLoadsProcessed: totalsAccumulator.laundryLoadsProcessed,
      onsiteLaundryLoads: totalsAccumulator.onsiteLaundryLoads,
      offsiteLaundryLoads: totalsAccumulator.offsiteLaundryLoads,
      unduplicatedLaundryUsers: ytdLaundrySet.size,
      laundryAdult: ytdLaundryAgeSets.adult.size,
      laundrySenior: ytdLaundryAgeSets.senior.size,
      laundryChild: ytdLaundryAgeSets.child.size,
      newLaundryGuests: runningNewLaundryGuests,
      avgShowersPerDay: totalsAccumulator.showerServiceDays > 0 ? totalsAccumulator.showersProvided / totalsAccumulator.showerServiceDays : 0,
      avgLaundryLoadsPerDay: totalsAccumulator.laundryServiceDays > 0 ? totalsAccumulator.laundryLoadsProcessed / totalsAccumulator.laundryServiceDays : 0,
      isYearToDate: true,
    };

    return { rows, totals };
  }, [guests, laundryRecords, showerRecords, reportYear, currentMonth]);

  // Export handlers
  const handleExportCSV = () => {
    const csvData = [
      ...monthlyData.months.map((row) => ({
        Month: row.month,
        Monday: row.mondayMeals,
        Wednesday: row.wednesdayMeals,
        Friday: row.fridayMeals,
        Saturday: row.saturdayMeals,
        'Unique Guests': row.uniqueGuests,
        'New Guests': row.newGuests,
        'RV Meals': row.rvMeals,
        'Extra Meals': row.extraMeals,
        'TOTAL HOT MEALS': row.totalHotMeals,
      })),
      {
        Month: monthlyData.totals.month,
        Monday: monthlyData.totals.mondayMeals,
        Wednesday: monthlyData.totals.wednesdayMeals,
        Friday: monthlyData.totals.fridayMeals,
        Saturday: monthlyData.totals.saturdayMeals,
        'Unique Guests': monthlyData.totals.uniqueGuests,
        'New Guests': monthlyData.totals.newGuests,
        'RV Meals': monthlyData.totals.rvMeals,
        'Extra Meals': monthlyData.totals.extraMeals,
        'TOTAL HOT MEALS': monthlyData.totals.totalHotMeals,
      },
    ];

    exportDataAsCSV(csvData, `meals-monthly-report-${reportYear}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Meals monthly report exported to CSV');
  };

  const handleExportBicycleCSV = () => {
    const csvData = [
      ...bicycleSummary.rows.map((row) => ({
        Month: row.month,
        'New Bikes': row.newBikes,
        'Bike Services': row.services,
        Total: row.total,
      })),
      {
        Month: 'Year to Date',
        'New Bikes': bicycleSummary.totals.newBikes,
        'Bike Services': bicycleSummary.totals.services,
        Total: bicycleSummary.totals.total,
      },
    ];

    exportDataAsCSV(csvData, `bicycle-summary-${reportYear}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Bicycle services summary exported to CSV');
  };

  const handleExportShowerLaundryCSV = () => {
    const csvData = [
      ...showerLaundrySummary.rows.map((row) => ({
        Month: row.month,
        'Program Days': row.programDays,
        'Showers Provided': row.showersProvided,
        'Avg Showers/Day': Number(row.avgShowersPerDay.toFixed(2)),
        'New Guests': row.newGuests,
        'Total Participants': row.totalParticipants,
        'Laundry Loads': row.laundryLoadsProcessed,
        'On-site Loads': row.onsiteLaundryLoads,
        'Off-site Loads': row.offsiteLaundryLoads,
        'Avg Laundry/Day': Number(row.avgLaundryLoadsPerDay.toFixed(2)),
        'Unique Laundry Users': row.unduplicatedLaundryUsers,
      })),
      {
        Month: showerLaundrySummary.totals.month,
        'Program Days': showerLaundrySummary.totals.programDays,
        'Showers Provided': showerLaundrySummary.totals.showersProvided,
        'Avg Showers/Day': Number(showerLaundrySummary.totals.avgShowersPerDay.toFixed(2)),
        'New Guests': showerLaundrySummary.totals.newGuests,
        'Total Participants': showerLaundrySummary.totals.totalParticipants,
        'Laundry Loads': showerLaundrySummary.totals.laundryLoadsProcessed,
        'On-site Loads': showerLaundrySummary.totals.onsiteLaundryLoads,
        'Off-site Loads': showerLaundrySummary.totals.offsiteLaundryLoads,
        'Avg Laundry/Day': Number(showerLaundrySummary.totals.avgLaundryLoadsPerDay.toFixed(2)),
        'Unique Laundry Users': showerLaundrySummary.totals.unduplicatedLaundryUsers,
      },
    ];

    exportDataAsCSV(csvData, `shower-laundry-summary-${reportYear}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Shower & laundry summary exported to CSV');
  };

  const ytdShowerLaundryRows = showerLaundrySummary.rows.filter((row) => row.isYearToDate);
  const showerLaundryRowsToRender = ytdShowerLaundryRows.length > 0 ? ytdShowerLaundryRows : showerLaundrySummary.rows;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Monthly Summary Report - {reportYear}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive breakdown of meals by month and type
              </p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            Export Meals CSV
          </button>
        </div>

        {summaryInsights.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {summaryInsights.map((insight) => (
              <div
                key={insight.title}
                className="rounded-lg border border-blue-100 bg-blue-50/70 p-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <Lightbulb size={16} />
                  <span>{insight.title}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{insight.value}</p>
                <p className="mt-1 text-xs text-gray-600">{insight.context}</p>
                <p className="mt-2 text-sm text-gray-700">{insight.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Meals Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600">
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-900">
                  Month
                </th>
                {MEAL_DETAIL_COLUMN_KEYS.map((columnKey) => (
                  <TooltipHeader key={columnKey} column={MEAL_COLUMN_MAP[columnKey]} />
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyData.months.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <th
                    scope="row"
                    className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900"
                  >
                    {row.month}
                  </th>
                  {MEAL_DETAIL_COLUMN_KEYS.map((columnKey) => {
                    const columnMeta = MEAL_COLUMN_MAP[columnKey];
                    return (
                      <td key={`${row.month}-${columnKey}`} className={buildCellClass(columnMeta)}>
                        {formatNumber(row[columnKey] as number)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-gray-200 font-semibold text-gray-900">
                <th scope="row" className="border border-gray-300 px-3 py-2 text-left">
                  {monthlyData.totals.month}
                </th>
                {MEAL_DETAIL_COLUMN_KEYS.map((columnKey) => {
                  const columnMeta = MEAL_COLUMN_MAP[columnKey];
                  return (
                    <td key={`totals-${columnKey}`} className={buildCellClass(columnMeta, { isTotal: true })}>
                      {formatNumber(monthlyData.totals[columnKey] as number)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Column Guide */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowColumnGuide((prev) => !prev)}
            aria-expanded={showColumnGuide}
            aria-controls={columnGuideId}
            className="inline-flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-left text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <Info size={16} />
              Column Guide
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform ${showColumnGuide ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
          {showColumnGuide && (
            <div
              id={columnGuideId}
              className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white"
            >
              {MEAL_COLUMN_DEFINITIONS.filter((col) => col.description).map((column) => (
                <div key={column.key} className="flex items-start gap-3 p-4">
                  <div className={`mt-1 h-5 w-5 flex-shrink-0 rounded border border-gray-300 ${column.cellBg || 'bg-gray-100'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{column.label}</p>
                    <p className="mt-1 text-sm text-gray-700">{column.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Calculation Notes:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>TOTAL HOT MEALS:</strong> Sum of all meal types</li>
            <li><strong>Unique Guests:</strong> Individual people served per month</li>
            <li><strong>New Guests:</strong> First-time visitors that month</li>
          </ul>
        </div>
      </div>

      {/* Bicycle Services Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-sky-600" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bicycle Services Summary</h3>
              <p className="text-sm text-gray-600">
                Year-to-date breakdown of new bicycles and services in {reportYear}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportBicycleCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">Month</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-emerald-50">New Bikes</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-sky-50">Services</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900">Total</th>
              </tr>
            </thead>
            <tbody>
              {bicycleSummary.rows.filter((r) => r.isYearToDate).map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">{row.month}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50 tabular-nums">
                    {row.newBikes.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-sky-50 tabular-nums">
                    {row.services.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
                    {row.total.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td className="border border-gray-300 px-3 py-2 text-gray-900">Year to Date</td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50 tabular-nums">
                  {bicycleSummary.totals.newBikes.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-sky-50 tabular-nums">
                  {bicycleSummary.totals.services.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">
                  {bicycleSummary.totals.total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Shower & Laundry Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Droplets className="text-amber-600" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Shower & Laundry Services Summary</h3>
              <p className="text-sm text-gray-600">
                Participant trends and laundry loads through YTD {reportYear}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportShowerLaundryCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600">
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-900" rowSpan={2}>
                  Month
                </th>
                <th className="border border-gray-300 px-3 py-3 text-center font-semibold text-amber-800 bg-yellow-50" colSpan={4}>
                  Shower Program
                </th>
                <th className="border border-gray-300 px-3 py-3 text-center font-semibold text-purple-800 bg-purple-50" colSpan={4}>
                  Laundry Services
                </th>
              </tr>
              <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="border border-gray-200 px-2 py-2 text-center">Days</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Showers</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Avg/Day</th>
                <th className="border border-gray-200 px-2 py-2 text-center bg-emerald-50">Participants</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Loads</th>
                <th className="border border-gray-200 px-2 py-2 text-center">On-site</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Off-site</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Users</th>
              </tr>
            </thead>
            <tbody>
              {showerLaundryRowsToRender.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <th scope="row" className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">
                    {row.month}
                  </th>
                  <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{row.programDays}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{row.showersProvided}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{formatAverage(row.avgShowersPerDay)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50 tabular-nums font-semibold">
                    {row.totalParticipants}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50 tabular-nums">{row.laundryLoadsProcessed}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50 tabular-nums">{row.onsiteLaundryLoads}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50 tabular-nums">{row.offsiteLaundryLoads}</td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50 tabular-nums font-semibold">
                    {row.unduplicatedLaundryUsers}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-semibold text-gray-900">
                <th scope="row" className="border border-gray-300 px-3 py-2 text-left">{showerLaundrySummary.totals.month}</th>
                <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{showerLaundrySummary.totals.programDays}</td>
                <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{showerLaundrySummary.totals.showersProvided}</td>
                <td className="border border-gray-300 px-3 py-2 text-right tabular-nums">{formatAverage(showerLaundrySummary.totals.avgShowersPerDay)}</td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50 tabular-nums">{showerLaundrySummary.totals.totalParticipants}</td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50 tabular-nums">{showerLaundrySummary.totals.laundryLoadsProcessed}</td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50 tabular-nums">{showerLaundrySummary.totals.onsiteLaundryLoads}</td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50 tabular-nums">{showerLaundrySummary.totals.offsiteLaundryLoads}</td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50 tabular-nums">{showerLaundrySummary.totals.unduplicatedLaundryUsers}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryReport;
