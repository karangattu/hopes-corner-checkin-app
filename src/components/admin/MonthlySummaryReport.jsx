import React, { useMemo, useCallback, useState } from "react";
import { useAppContext } from "../../context/useAppContext";
import {
  Download,
  Calendar,
  ShowerHead,
  Info,
  ChevronDown,
  Lightbulb,
} from "lucide-react";
import toast from "react-hot-toast";
import { LAUNDRY_STATUS } from "../../context/constants";
import { isBicycleStatusCountable } from "../../utils/bicycles";
import TrendLineRecharts from "../charts/TrendLineRecharts";

const MONTH_NAMES = [
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
];

const MEAL_COLUMN_DEFINITIONS = [
  {
    key: "month",
    label: "Month",
    description: null,
    align: "left",
    headerBg: "",
    cellBg: "",
    totalCellBg: "",
    bodyClass: "font-heading font-medium text-gray-900",
    totalBodyClass: "font-heading font-semibold text-gray-900",
    isNumeric: false,
  },
  {
    key: "mondayMeals",
    label: "Monday",
    description:
      "Hot guest meals served during the Monday dining service. Counts reflect meals served, not unique guests.",
    align: "right",
    headerBg: "bg-gray-100",
    cellBg: "bg-gray-100",
    totalCellBg: "bg-gray-100",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "wednesdayMeals",
    label: "Wednesday",
    description:
      "Hot guest meals served during the Wednesday meal service. Counts reflect meals served, not unique guests.",
    align: "right",
    headerBg: "bg-gray-100",
    cellBg: "bg-gray-100",
    totalCellBg: "bg-gray-100",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "saturdayMeals",
    label: "Saturday",
    description:
      "Saturday hot meals for in-person buffet service. Counts reflect meals served, not unique guests.",
    align: "right",
    headerBg: "bg-gray-100",
    cellBg: "bg-gray-100",
    totalCellBg: "bg-gray-100",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "uniqueGuests",
    label: "Unique Guests",
    description:
      "Number of unique guests who received meals this month, counting each person once regardless of how many meals they received.",
    align: "right",
    headerBg: "bg-emerald-50",
    cellBg: "bg-emerald-50",
    totalCellBg: "bg-emerald-50",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "newGuests",
    label: "New Guests",
    description:
      "Number of guests who received their first meal ever this month, helping track program growth and new guest intake.",
    align: "right",
    headerBg: "bg-sky-50",
    cellBg: "bg-sky-50",
    totalCellBg: "bg-sky-50",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "proxyPickups",
    label: "Proxy Pickups",
    description:
      "Meals picked up by a different guest on behalf of the intended guest (proxy/alternative pickups). Counts reflect the number of meals picked up by proxies, not unique guests.",
    align: "right",
    headerBg: "bg-amber-50",
    cellBg: "bg-amber-50",
    totalCellBg: "bg-amber-50",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "fridayMeals",
    label: "Friday",
    description:
      "Friday coffee and breakfast meals served to guests. Counts reflect meals served, not unique guests.",
    align: "right",
    headerBg: "bg-blue-50",
    cellBg: "bg-blue-50",
    totalCellBg: "bg-blue-50",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "dayWorkerMeals",
    label: "Day Worker Center",
    description:
      "Meals prepared for the Day Worker Center in Mountain View. These meals are delivered offsite.",
    align: "right",
    headerBg: "bg-white",
    cellBg: "bg-white",
    totalCellBg: "bg-white",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "extraMeals",
    label: "Extra Meals",
    description:
      "Additional hot meals plated beyond the scheduled guest count (seconds, volunteers, late arrivals).",
    align: "right",
    headerBg: "bg-white",
    cellBg: "bg-white",
    totalCellBg: "bg-white",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "rvWedSat",
    label: "RV Wed+Sat",
    description:
      "Meals delivered to the RV community on the Wednesday and Saturday outreach routes.",
    align: "right",
    headerBg: "bg-orange-50",
    cellBg: "bg-orange-50",
    totalCellBg: "bg-orange-50",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "rvMonThu",
    label: "RV Mon+Thu",
    description:
      "Meals delivered to the RV community on the Monday and Thursday outreach routes.",
    align: "right",
    headerBg: "bg-orange-50",
    cellBg: "bg-orange-50",
    totalCellBg: "bg-orange-50",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "lunchBags",
    label: "Lunch Bags",
    description:
      "Take-away lunch bags distributed for guests in addition to their hot meal.",
    align: "right",
    headerBg: "bg-purple-50",
    cellBg: "bg-purple-50",
    totalCellBg: "bg-purple-50",
    bodyClass: "font-metric",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "totalHotMeals",
    label: "TOTAL HOT MEALS",
    description:
      "All hot meals served: weekday guest meals, Day Worker, Extra, RV, Shelter, and United Effort meals (lunch bags excluded).",
    align: "right",
    headerBg: "bg-white",
    cellBg: "bg-white",
    totalCellBg: "bg-white",
    bodyClass: "font-metric font-semibold text-gray-900",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "totalWithLunchBags",
    label: "Total w/ Lunch Bags",
    description:
      "TOTAL HOT MEALS plus lunch bags. Shows the complete count of meals we are making.",
    align: "right",
    headerBg: "bg-white",
    cellBg: "bg-white",
    totalCellBg: "bg-white",
    bodyClass: "font-metric font-semibold text-gray-900",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
  {
    key: "onsiteHotMeals",
    label: "Onsite Hot Meals",
    description:
      "Guest meals served onsite on Mon/Wed/Fri/Sat plus extra meals served those same days.",
    align: "right",
    headerBg: "bg-white",
    cellBg: "bg-white",
    totalCellBg: "bg-white",
    bodyClass: "font-metric font-semibold text-gray-900",
    totalBodyClass: "font-metric font-semibold text-gray-900",
    isNumeric: true,
  },
];

const MEAL_COLUMN_MAP = MEAL_COLUMN_DEFINITIONS.reduce((acc, column) => {
  acc[column.key] = column;
  return acc;
}, {});

const MEAL_TABLE_GROUPS = [
  {
    key: "onsite",
    title: "Onsite Guest Meals",
    subtitle: "Served onsite",
    headerClass: "bg-slate-50 text-slate-700",
    columns: [
      "mondayMeals",
      "wednesdayMeals",
      "fridayMeals",
      "saturdayMeals",
      "uniqueGuests",
      "newGuests",
      "proxyPickups",
      "onsiteHotMeals",
    ],
  },
  {
    key: "outreach",
    title: "Outreach & Partner",
    subtitle: "Meals delivered offsite",
    headerClass: "bg-orange-50 text-orange-800",
    columns: ["dayWorkerMeals", "rvWedSat", "rvMonThu"],
  },
  {
    key: "production",
    title: "Production Extras",
    subtitle: "Beyond plated hot meals",
    headerClass: "bg-purple-50 text-purple-800",
    columns: ["extraMeals", "lunchBags"],
  },
  {
    key: "totals",
    title: "Totals",
    subtitle: "YTD meal output",
    headerClass: "bg-gray-100 text-gray-700",
    columns: ["totalHotMeals", "totalWithLunchBags"],
  },
];

const MEAL_DETAIL_COLUMN_KEYS = MEAL_TABLE_GROUPS.flatMap((group) => group.columns);

const formatNumber = (value) => {
  if (value == null) return "0";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString();
};

const formatAverage = (value, decimals = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0.0";
  return numeric.toFixed(decimals);
};

const buildCellClass = (column, { isTotal } = {}) => {
  const alignmentClass = column.align === "right" ? "text-right" : "text-left";
  const bgClass = isTotal
    ? column.totalCellBg ?? column.cellBg
    : column.cellBg;
  const bodyClass = isTotal
    ? column.totalBodyClass || `${column.bodyClass || ""} font-semibold text-gray-900`
    : column.bodyClass || "";

  return [
    "border border-gray-300 px-3 py-2",
    alignmentClass,
    bgClass,
    bodyClass,
  ]
    .filter(Boolean)
    .join(" ");
};

const ColumnTooltip = ({ label, description }) => (
  <div className="relative inline-flex group">
    <button
      type="button"
      className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      aria-label={`Explain ${label}`}
    >
      <Info size={14} aria-hidden="true" />
    </button>
    <div className="pointer-events-none absolute bottom-full right-0 z-20 hidden w-64 mb-2 rounded-md border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-xl group-hover:block group-focus-within:block">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="mt-1">{description}</p>
    </div>
  </div>
);

const TooltipHeader = ({ column }) => {
  const alignment = column.align === "right" ? "justify-end" : "justify-start";
  const textAlignment = column.align === "right" ? "text-right" : "text-left";
  const headerClasses = [
    "border border-gray-300 px-3 py-2 font-semibold text-gray-900 font-heading",
    column.headerBg,
    textAlignment,
  ]
    .filter(Boolean)
    .join(" ");

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

const SummaryCard = ({ insight }) => (
  <div className="flex flex-1 flex-col justify-between gap-1.5 rounded-xl border border-gray-200 bg-white/80 p-3 shadow-sm">
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
      <Lightbulb size={12} className="text-amber-500 flex-shrink-0" aria-hidden="true" />
      <span className="truncate">{insight.title}</span>
    </div>
    <div>
      <p className="text-2xl font-semibold text-gray-900 leading-tight">{insight.value}</p>
      <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{insight.context}</p>
    </div>
    <p className="text-xs text-gray-600 leading-snug line-clamp-2">{insight.description}</p>
  </div>
);

/**
 * MonthlySummaryReport - Comprehensive monthly meal statistics table
 *
 * Displays a breakdown of meals by month and type for the current year, including:
 * - Weekday-specific guest meals (Mon/Wed/Sat/Fri)
 * - Special meal types (Day Worker, Extra, RV, Lunch Bags)
 * - Calculated totals and onsite meal counts
 */
const MonthlySummaryReport = () => {
  const {
    guests,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    exportDataAsCSV,
  } = useAppContext();

  const [showColumnGuide, setShowColumnGuide] = useState(false);
  const columnGuideId = "monthly-summary-column-guide";

  // Year selector state - allows viewing previous years' data
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Generate available years for the dropdown (current year back to 2023 or earliest data year)
  const availableYears = useMemo(() => {
    const years = [];
    const startYear = 2023; // Reasonable start year for data
    for (let year = currentYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  }, [currentYear]);

  const reportMetadata = useMemo(() => {
    const now = new Date();
    const isCurrentYear = selectedYear === currentYear;
    return {
      reportYear: selectedYear,
      // If viewing current year, only show up to current month. If viewing past year, show all 12 months.
      currentMonth: isCurrentYear ? now.getMonth() : 11,
    };
  }, [selectedYear, currentYear]);

  const reportYear = reportMetadata.reportYear;
  const currentMonth = reportMetadata.currentMonth;

  // Helper: Get day of week from date string (0=Sunday, 1=Monday, ..., 6=Saturday)
  const getDayOfWeek = useCallback((dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.getDay();
  }, []);

  // Helper: Filter records by year, month, and optionally specific days
  const filterRecords = useCallback(
    (records, year, month, daysOfWeek = null) => {
      return records.filter((record) => {
        if (!record.date) return false;
        const date = new Date(record.date);
        const recordYear = date.getFullYear();
        const recordMonth = date.getMonth(); // 0-indexed

        if (recordYear !== year || recordMonth !== month) return false;

        if (daysOfWeek) {
          const dayOfWeek = getDayOfWeek(record.date);
          return daysOfWeek.includes(dayOfWeek);
        }

        return true;
      });
    },
    [getDayOfWeek],
  );

  // Helper: Sum quantities from filtered records
  const sumQuantities = (records) => {
    return records.reduce((sum, record) => sum + (record.count || 0), 0);
  };

  const normalizeRepairTypes = useCallback((record) => {
    if (!record) return [];
    const rawTypes = Array.isArray(record.repairTypes)
      ? record.repairTypes
      : record.repairType
        ? [record.repairType]
        : [];
    return rawTypes
      .map((type) => (type == null ? "" : String(type).trim()))
      .filter((type) => type.length > 0);
  }, []);


  // Calculate monthly data for all months from January of the report year to the current month
  const monthlyData = useMemo(() => {
    const months = [];
    const effectiveLastMonth = Math.min(
      Math.max(currentMonth, 0),
      MONTH_NAMES.length - 1,
    );

    for (let month = 0; month <= effectiveLastMonth; month++) {
      const monthName = MONTH_NAMES[month];

      const mondayMeals = sumQuantities(
        filterRecords(mealRecords, reportYear, month, [1]),
      );
      const wednesdayMeals = sumQuantities(
        filterRecords(mealRecords, reportYear, month, [3]),
      );
      const saturdayMeals = sumQuantities(
        filterRecords(mealRecords, reportYear, month, [6]),
      );
      const fridayMeals = sumQuantities(
        filterRecords(mealRecords, reportYear, month, [5]),
      );

      const dayWorkerMeals = sumQuantities(
        filterRecords(dayWorkerMealRecords, reportYear, month),
      );
      const extraMeals = sumQuantities(
        filterRecords(extraMealRecords, reportYear, month),
      );

      const rvWedSat = sumQuantities(
        filterRecords(rvMealRecords, reportYear, month, [3, 6]),
      );
      const rvMonThu = sumQuantities(
        filterRecords(rvMealRecords, reportYear, month, [1, 4]),
      );

      const lunchBags = sumQuantities(
        filterRecords(lunchBagRecords, reportYear, month),
      );

      const shelterMeals = sumQuantities(
        filterRecords(shelterMealRecords, reportYear, month),
      );
      const unitedEffortMeals = sumQuantities(
        filterRecords(unitedEffortMealRecords, reportYear, month),
      );

      // Proxy pickups: meals where someone else picked up on behalf of the guest
      const proxyPickups = sumQuantities(
        filterRecords(mealRecords, reportYear, month).filter((r) => r.pickedUpByProxyId),
      );

      const totalHotMeals =
        mondayMeals +
        wednesdayMeals +
        saturdayMeals +
        fridayMeals +
        dayWorkerMeals +
        extraMeals +
        rvWedSat +
        rvMonThu +
        shelterMeals +
        unitedEffortMeals;

      const totalWithLunchBags = totalHotMeals + lunchBags;

      const onsiteMondayMeals =
        mondayMeals +
        sumQuantities(filterRecords(extraMealRecords, reportYear, month, [1]));
      const onsiteWednesdayMeals =
        wednesdayMeals +
        sumQuantities(filterRecords(extraMealRecords, reportYear, month, [3]));
      const onsiteSaturdayMeals =
        saturdayMeals +
        sumQuantities(filterRecords(extraMealRecords, reportYear, month, [6]));
      const onsiteFridayMeals =
        fridayMeals +
        sumQuantities(filterRecords(extraMealRecords, reportYear, month, [5]));
      const onsiteHotMeals =
        onsiteMondayMeals +
        onsiteWednesdayMeals +
        onsiteSaturdayMeals +
        onsiteFridayMeals;

      const monthMealRecords = filterRecords(mealRecords, reportYear, month);
      const uniqueGuestIds = new Set(
        monthMealRecords.map((record) => record.guestId).filter(Boolean)
      );
      const uniqueGuests = uniqueGuestIds.size;

      const allMealRecordsSorted = [...mealRecords].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      const firstMealByGuest = new Map();
      allMealRecordsSorted.forEach((record) => {
        if (record.guestId && !firstMealByGuest.has(record.guestId)) {
          firstMealByGuest.set(record.guestId, new Date(record.date));
        }
      });

      let newGuests = 0;
      uniqueGuestIds.forEach((guestId) => {
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
        uniqueGuests,
        newGuests,
        fridayMeals,
        dayWorkerMeals,
        extraMeals,
        rvWedSat,
        rvMonThu,
        lunchBags,
        proxyPickups,
        totalHotMeals,
        totalWithLunchBags,
        onsiteHotMeals,
      });
    }

    const allYearUniqueGuestIds = new Set();
    mealRecords.forEach((record) => {
      if (record.date && record.guestId) {
        const date = new Date(record.date);
        if (date.getFullYear() === reportYear && date.getMonth() <= effectiveLastMonth) {
          allYearUniqueGuestIds.add(record.guestId);
        }
      }
    });

    const totals = {
      month: "Year to Date",
      mondayMeals: months.reduce((sum, m) => sum + m.mondayMeals, 0),
      wednesdayMeals: months.reduce((sum, m) => sum + m.wednesdayMeals, 0),
      saturdayMeals: months.reduce((sum, m) => sum + m.saturdayMeals, 0),
      uniqueGuests: allYearUniqueGuestIds.size,
      newGuests: months.reduce((sum, m) => sum + m.newGuests, 0),
      fridayMeals: months.reduce((sum, m) => sum + m.fridayMeals, 0),
      dayWorkerMeals: months.reduce((sum, m) => sum + m.dayWorkerMeals, 0),
      extraMeals: months.reduce((sum, m) => sum + m.extraMeals, 0),
      rvWedSat: months.reduce((sum, m) => sum + m.rvWedSat, 0),
      rvMonThu: months.reduce((sum, m) => sum + m.rvMonThu, 0),
      lunchBags: months.reduce((sum, m) => sum + m.lunchBags, 0),
      proxyPickups: months.reduce((sum, m) => sum + (m.proxyPickups || 0), 0),
      totalHotMeals: months.reduce((sum, m) => sum + m.totalHotMeals, 0),
      totalWithLunchBags: months.reduce(
        (sum, m) => sum + m.totalWithLunchBags,
        0,
      ),
      onsiteHotMeals: months.reduce((sum, m) => sum + m.onsiteHotMeals, 0),
    };

    return { months, totals };
  }, [
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    filterRecords,
    reportYear,
    currentMonth,
  ]);

  const mealColumns = MEAL_COLUMN_DEFINITIONS;

  const summaryInsights = useMemo(() => {
    const months = monthlyData.months || [];
    if (months.length === 0) {
      return [];
    }

    const ytdHotMeals = monthlyData.totals.totalHotMeals;
    const averageHotMeals = Math.round(ytdHotMeals / months.length || 0);
    const topMonth = months.reduce((best, current) =>
      current.totalHotMeals > best.totalHotMeals ? current : best,
    months[0]);
    const lunchBagCount = monthlyData.totals.lunchBags;
    const totalMealsWithLunch = monthlyData.totals.totalWithLunchBags;
    const lunchBagShare =
      totalMealsWithLunch > 0
        ? Math.round((lunchBagCount / totalMealsWithLunch) * 100)
        : 0;

    const ytdProxyPickups = monthlyData.totals.proxyPickups || 0;
    const lastMonthPickups = months[months.length - 1]?.proxyPickups || 0;
    const prevMonthPickups = months.length > 1 ? months[months.length - 2]?.proxyPickups || 0 : 0;
    const proxyChange = lastMonthPickups - prevMonthPickups;
    const proxyPercent = prevMonthPickups > 0 ? Math.round((proxyChange / prevMonthPickups) * 100) : (proxyChange > 0 ? 100 : 0);
    const proxyContext = `Last month: ${formatNumber(lastMonthPickups)} (${proxyChange === 0 ? 'no change' : proxyChange > 0 ? `up ${proxyPercent}% vs previous month` : `down ${Math.abs(proxyPercent)}% vs previous month`})`;
    return [
      {
        title: "YTD Hot Meals",
        value: formatNumber(ytdHotMeals),
        context: `${months.length} month${months.length === 1 ? "" : "s"} recorded`,
        description:
          "Total hot meals served across all programs so far this calendar year.",
      },
      {
        title: "Average Hot Meals / Month",
        value: formatNumber(averageHotMeals),
        context: `Peak month: ${topMonth.month} (${formatNumber(topMonth.totalHotMeals)} meals)`,
        description: "Helps planning for staffing, food ordering, and volunteer shifts.",
      },
      {
        title: "Lunch Bag Share",
        value: `${lunchBagShare}%`,
        context: `${formatNumber(lunchBagCount)} lunch bags year-to-date`,
        description:
          "Portion of all meals that Volunteers pack every shift.",
      },
      {
        title: "Proxy Pickups",
        value: formatNumber(ytdProxyPickups),
        context: proxyContext,
        description:
          "Number of meals picked up by a different guest (proxy pickup). Use this to monitor trends in proxy pickups.",
      },
    ];
  }, [monthlyData]);

  const bicycleSummary = useMemo(() => {
    const rows = MONTH_NAMES.map((monthName, monthIndex) => {
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
          if (type.toLowerCase() === "new bicycle") {
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
      { newBikes: 0, services: 0, total: 0 },
    );

    return {
      rows,
      totals,
    };
  }, [
    bicycleRecords,
    normalizeRepairTypes,
    reportYear,
    currentMonth,
  ]);

  const showerLaundrySummary = useMemo(() => {
    const guestMap = new Map();
    (guests || []).forEach((guest) => {
      if (!guest) return;
      const candidateIds = [
        guest.id,
        guest.guestId,
        guest.externalId,
        guest.docId,
      ].filter((value) => value != null);
      candidateIds.forEach((value) => {
        guestMap.set(String(value), guest);
      });
    });

    const categorizeAge = (guestId) => {
      if (!guestId) return "adult";
      const guest = guestMap.get(String(guestId));
      const rawAge = (
        guest?.age ??
        guest?.ageGroup ??
        guest?.age_group ??
        guest?.ageCategory ??
        ""
      )
        .toString()
        .toLowerCase();

      if (rawAge.includes("senior")) return "senior";
      if (rawAge.includes("child")) return "child";
      return "adult";
    };

    const completedLaundryStatuses = new Set(
      [
        LAUNDRY_STATUS?.DONE,
        LAUNDRY_STATUS?.PICKED_UP,
        LAUNDRY_STATUS?.RETURNED,
        LAUNDRY_STATUS?.OFFSITE_PICKED_UP,
      ]
        .filter(Boolean)
        .map((value) => value.toString().toLowerCase()),
    );

    const completedShowerRecords = (showerRecords || []).reduce(
      (acc, record) => {
        if (!record?.date) return acc;
        const date = new Date(record.date);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== reportYear) {
          return acc;
        }
        const status = (record.status || "").toString().toLowerCase();
        if (status !== "done") return acc;
        acc.push({
          guestId: record.guestId != null ? String(record.guestId) : null,
          date,
          monthIndex: date.getMonth(),
        });
        return acc;
      },
      [],
    );

    const completedLaundryRecords = (laundryRecords || []).reduce(
      (acc, record) => {
        if (!record?.date) return acc;
        const date = new Date(record.date);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== reportYear) {
          return acc;
        }
        const status = (record.status || "").toString().toLowerCase();
        if (!completedLaundryStatuses.has(status)) return acc;
        acc.push({
          guestId: record.guestId != null ? String(record.guestId) : null,
          date,
          monthIndex: date.getMonth(),
          laundryType: record.laundryType,
        });
        return acc;
      },
      [],
    );

    const laundryGuestFirstMonth = new Map();
    completedLaundryRecords.forEach((record) => {
      if (!record.guestId) return;
      const existing = laundryGuestFirstMonth.get(record.guestId);
      if (existing == null || record.monthIndex < existing) {
        laundryGuestFirstMonth.set(record.guestId, record.monthIndex);
      }
    });

    const allServiceRecords = [
      ...completedShowerRecords,
      ...completedLaundryRecords,
    ];

    const guestFirstMonth = new Map();
    allServiceRecords.forEach((record) => {
      if (!record.guestId) return;
      const existing = guestFirstMonth.get(record.guestId);
      if (existing == null || record.monthIndex < existing) {
        guestFirstMonth.set(record.guestId, record.monthIndex);
      }
    });

    const rows = [];
    const ytdGuestSet = new Set();
    const ytdLaundrySet = new Set();
    const ytdParticipantAgeSets = {
      adult: new Set(),
      senior: new Set(),
      child: new Set(),
    };
    const ytdLaundryAgeSets = {
      adult: new Set(),
      senior: new Set(),
      child: new Set(),
    };

    let runningNewGuests = 0;
    let runningNewLaundryGuests = 0;

    const totalsAccumulator = {
      programDays: 0,
      showersProvided: 0,
      laundryLoadsProcessed: 0,
      onsiteLaundryLoads: 0,
      offsiteLaundryLoads: 0,
      showerServiceDays: 0,
      laundryServiceDays: 0,
    };

    MONTH_NAMES.forEach((monthName, monthIndex) => {
      const showersForMonth = completedShowerRecords.filter(
        (record) => record.monthIndex === monthIndex,
      );
      const laundryForMonth = completedLaundryRecords.filter(
        (record) => record.monthIndex === monthIndex,
      );
      const combinedForMonth = [...showersForMonth, ...laundryForMonth];

      const programDaysSet = new Set(
        combinedForMonth.map((record) =>
          record.date.toISOString().slice(0, 10),
        ),
      );
      const showerServiceDaysSet = new Set(
        showersForMonth.map((record) =>
          record.date.toISOString().slice(0, 10),
        ),
      );
      const laundryServiceDaysSet = new Set(
        laundryForMonth.map((record) =>
          record.date.toISOString().slice(0, 10),
        ),
      );
      const showerServiceDays = showerServiceDaysSet.size;
      const laundryServiceDays = laundryServiceDaysSet.size;

      const monthGuestSet = new Set();
      combinedForMonth.forEach((record) => {
        if (record.guestId) {
          monthGuestSet.add(record.guestId);
        }
      });

      const participantsCounts = {
        adult: 0,
        senior: 0,
        child: 0,
      };
      monthGuestSet.forEach((guestId) => {
        const bucket = categorizeAge(guestId);
        participantsCounts[bucket] += 1;
      });

      const laundryGuestSet = new Set();
      laundryForMonth.forEach((record) => {
        if (record.guestId) {
          laundryGuestSet.add(record.guestId);
        }
      });
      const laundryCounts = {
        adult: 0,
        senior: 0,
        child: 0,
      };
      laundryGuestSet.forEach((guestId) => {
        const bucket = categorizeAge(guestId);
        laundryCounts[bucket] += 1;
      });

      // Count onsite vs offsite laundry
      const onsiteLaundryLoads = laundryForMonth.filter(
        (record) => record.laundryType === "onsite",
      ).length;
      const offsiteLaundryLoads = laundryForMonth.filter(
        (record) => record.laundryType === "offsite",
      ).length;

      const isYearToDate = monthIndex <= currentMonth;
      const newGuestsThisMonth = [...monthGuestSet].filter(
        (guestId) => guestFirstMonth.get(guestId) === monthIndex,
      ).length;
      const newLaundryGuestsThisMonth = [...laundryGuestSet].filter(
        (guestId) => laundryGuestFirstMonth.get(guestId) === monthIndex,
      ).length;

      if (isYearToDate) {
        monthGuestSet.forEach((guestId) => {
          ytdGuestSet.add(guestId);
          const bucket = categorizeAge(guestId);
          ytdParticipantAgeSets[bucket].add(guestId);
        });
        laundryGuestSet.forEach((guestId) => {
          ytdLaundrySet.add(guestId);
          const bucket = categorizeAge(guestId);
          ytdLaundryAgeSets[bucket].add(guestId);
        });
        runningNewGuests += newGuestsThisMonth;
        runningNewLaundryGuests += newLaundryGuestsThisMonth;

        totalsAccumulator.programDays += programDaysSet.size;
        totalsAccumulator.showersProvided += showersForMonth.length;
        totalsAccumulator.laundryLoadsProcessed += laundryForMonth.length;
        totalsAccumulator.onsiteLaundryLoads += onsiteLaundryLoads;
        totalsAccumulator.offsiteLaundryLoads += offsiteLaundryLoads;
        totalsAccumulator.showerServiceDays += showerServiceDays;
        totalsAccumulator.laundryServiceDays += laundryServiceDays;
      }

      const avgShowersPerDay =
        showerServiceDays > 0
          ? showersForMonth.length / showerServiceDays
          : 0;
      const avgLaundryLoadsPerDay =
        laundryServiceDays > 0
          ? laundryForMonth.length / laundryServiceDays
          : 0;

      rows.push({
        month: monthName,
        programDays: programDaysSet.size,
        showerServiceDays,
        laundryServiceDays,
        showersProvided: showersForMonth.length,
        participantsAdult: participantsCounts.adult,
        participantsSenior: participantsCounts.senior,
        participantsChild: participantsCounts.child,
        totalParticipants:
          participantsCounts.adult +
          participantsCounts.senior +
          participantsCounts.child,
        newGuests: newGuestsThisMonth,
        ytdTotalUnduplicatedGuests: ytdGuestSet.size,
        laundryLoadsProcessed: laundryForMonth.length,
        onsiteLaundryLoads,
        offsiteLaundryLoads,
        unduplicatedLaundryUsers: laundryGuestSet.size,
        laundryAdult: laundryCounts.adult,
        laundrySenior: laundryCounts.senior,
        laundryChild: laundryCounts.child,
        newLaundryGuests: newLaundryGuestsThisMonth,
        avgShowersPerDay,
        avgLaundryLoadsPerDay,
        ytdNewGuestsLaundry: runningNewLaundryGuests,
        ytdTotalUnduplicatedLaundryUsers: ytdLaundrySet.size,
        isYearToDate,
      });
    });

    const totals = {
      month: "Year to Date",
      programDays: totalsAccumulator.programDays,
      showerServiceDays: totalsAccumulator.showerServiceDays,
      laundryServiceDays: totalsAccumulator.laundryServiceDays,
      showersProvided: totalsAccumulator.showersProvided,
      participantsAdult: ytdParticipantAgeSets.adult.size,
      participantsSenior: ytdParticipantAgeSets.senior.size,
      participantsChild: ytdParticipantAgeSets.child.size,
      totalParticipants:
        ytdParticipantAgeSets.adult.size +
        ytdParticipantAgeSets.senior.size +
        ytdParticipantAgeSets.child.size,
      newGuests: runningNewGuests,
      ytdTotalUnduplicatedGuests: ytdGuestSet.size,
      laundryLoadsProcessed: totalsAccumulator.laundryLoadsProcessed,
      onsiteLaundryLoads: totalsAccumulator.onsiteLaundryLoads,
      offsiteLaundryLoads: totalsAccumulator.offsiteLaundryLoads,
      unduplicatedLaundryUsers: ytdLaundrySet.size,
      laundryAdult: ytdLaundryAgeSets.adult.size,
      laundrySenior: ytdLaundryAgeSets.senior.size,
      laundryChild: ytdLaundryAgeSets.child.size,
      avgShowersPerDay:
        totalsAccumulator.showerServiceDays > 0
          ? totalsAccumulator.showersProvided / totalsAccumulator.showerServiceDays
          : 0,
      avgLaundryLoadsPerDay:
        totalsAccumulator.laundryServiceDays > 0
          ?
              totalsAccumulator.laundryLoadsProcessed /
              totalsAccumulator.laundryServiceDays
          : 0,
      newLaundryGuests: runningNewLaundryGuests,
      ytdNewGuestsLaundry: runningNewLaundryGuests,
      ytdTotalUnduplicatedLaundryUsers: ytdLaundrySet.size,
    };

    return {
      rows,
      totals,
    };
  }, [guests, laundryRecords, showerRecords, reportYear, currentMonth]);

  // Export data to CSV
  const handleExportCSV = () => {
    const csvData = [
      ...monthlyData.months.map((row) => ({
        Month: row.month,
        Monday: row.mondayMeals,
        Wednesday: row.wednesdayMeals,
        Friday: row.fridayMeals,
        Saturday: row.saturdayMeals,
        "Unique Guests": row.uniqueGuests,
        "New Guests": row.newGuests,
        "Proxy Pickups": row.proxyPickups || 0,
        "Onsite Hot Meals": row.onsiteHotMeals,
        "Day Worker Center": row.dayWorkerMeals,
        "Extra Meals": row.extraMeals,
        "RV Wed+Sat": row.rvWedSat,
        "RV Mon+Thu": row.rvMonThu,
        "Lunch Bags": row.lunchBags,
        "TOTAL HOT MEALS": row.totalHotMeals,
        "Total w/ Lunch Bags": row.totalWithLunchBags,
      })),

      // Add totals row
      {
        Month: monthlyData.totals.month,
        Monday: monthlyData.totals.mondayMeals,
        Wednesday: monthlyData.totals.wednesdayMeals,
        Friday: monthlyData.totals.fridayMeals,
        Saturday: monthlyData.totals.saturdayMeals,
        "Unique Guests": monthlyData.totals.uniqueGuests,
        "New Guests": monthlyData.totals.newGuests,
        "Proxy Pickups": monthlyData.totals.proxyPickups || 0,
        "Onsite Hot Meals": monthlyData.totals.onsiteHotMeals,
        "Day Worker Center": monthlyData.totals.dayWorkerMeals,
        "Extra Meals": monthlyData.totals.extraMeals,
        "RV Wed+Sat": monthlyData.totals.rvWedSat,
        "RV Mon+Thu": monthlyData.totals.rvMonThu,
        "Lunch Bags": monthlyData.totals.lunchBags,
        "TOTAL HOT MEALS": monthlyData.totals.totalHotMeals,
        "Total w/ Lunch Bags": monthlyData.totals.totalWithLunchBags,
      },
    ];

    exportDataAsCSV(
      csvData,
      `meals-monthly-report-${reportYear}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success("Meals monthly report exported to CSV");
  };

  const handleExportBicycleCSV = () => {
    const csvData = [
      ...bicycleSummary.rows.map((row) => ({
        Month: row.month,
        "New Bikes": row.newBikes,
        "Bike Services": row.services,
        Total: row.total,
      })),
      {
        Month: "Year to Date",
        "New Bikes": bicycleSummary.totals.newBikes,
        "Bike Services": bicycleSummary.totals.services,
        Total: bicycleSummary.totals.total,
      },
    ];

    exportDataAsCSV(
      csvData,
      `bicycle-summary-${reportYear}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success("Bicycle services summary exported to CSV");
  };

  const handleExportShowerLaundryCSV = () => {
    const csvData = [
      ...showerLaundrySummary.rows.map((row) => ({
        Month: row.month,
        "Program Days in Month": row.programDays,
        "Shower Service Days": row.showerServiceDays,
        "Laundry Service Days": row.laundryServiceDays,
        "Showers Provided": row.showersProvided,
        "Average Showers per Program Day": Number(
          row.avgShowersPerDay.toFixed(2),
        ),
        "Participants: Adult": row.participantsAdult,
        "Participants: Senior": row.participantsSenior,
        "Participants: Child": row.participantsChild,
        "Total Participants": row.totalParticipants,
        "New Guests This Month": row.newGuests,
        "YTD Total Unduplicated Guests": row.ytdTotalUnduplicatedGuests,
        "Laundry Loads Processed": row.laundryLoadsProcessed,
        "On-site Laundry Loads": row.onsiteLaundryLoads,
        "Off-site Laundry Loads": row.offsiteLaundryLoads,
        "Average Laundry Loads per Program Day": Number(
          row.avgLaundryLoadsPerDay.toFixed(2),
        ),
        "Unduplicated Laundry Users": row.unduplicatedLaundryUsers,
        "Laundry Users: Adult": row.laundryAdult,
        "Laundry Users: Senior": row.laundrySenior,
        "Laundry Users: Child": row.laundryChild,
        "New Laundry Guests This Month": row.newLaundryGuests,
      })),
      {
        Month: showerLaundrySummary.totals.month,
        "Program Days in Month": showerLaundrySummary.totals.programDays,
        "Shower Service Days": showerLaundrySummary.totals.showerServiceDays,
        "Laundry Service Days": showerLaundrySummary.totals.laundryServiceDays,
        "Showers Provided": showerLaundrySummary.totals.showersProvided,
        "Average Showers per Program Day": Number(
          showerLaundrySummary.totals.avgShowersPerDay.toFixed(2),
        ),
        "Participants: Adult": showerLaundrySummary.totals.participantsAdult,
        "Participants: Senior": showerLaundrySummary.totals.participantsSenior,
        "Participants: Child": showerLaundrySummary.totals.participantsChild,
        "Total Participants": showerLaundrySummary.totals.totalParticipants,
        "New Guests This Month": showerLaundrySummary.totals.newGuests,
        "YTD Total Unduplicated Guests":
          showerLaundrySummary.totals.ytdTotalUnduplicatedGuests,
        "Laundry Loads Processed":
          showerLaundrySummary.totals.laundryLoadsProcessed,
        "On-site Laundry Loads": showerLaundrySummary.totals.onsiteLaundryLoads,
        "Off-site Laundry Loads": showerLaundrySummary.totals.offsiteLaundryLoads,
        "Average Laundry Loads per Program Day": Number(
          showerLaundrySummary.totals.avgLaundryLoadsPerDay.toFixed(2),
        ),
        "Unduplicated Laundry Users":
          showerLaundrySummary.totals.unduplicatedLaundryUsers,
        "Laundry Users: Adult": showerLaundrySummary.totals.laundryAdult,
        "Laundry Users: Senior": showerLaundrySummary.totals.laundrySenior,
        "Laundry Users: Child": showerLaundrySummary.totals.laundryChild,
        "New Laundry Guests This Month":
          showerLaundrySummary.totals.newLaundryGuests,
      },
    ];

    exportDataAsCSV(
      csvData,
      `shower-laundry-summary-${reportYear}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success("Shower & laundry summary exported to CSV");
  };

  const ytdShowerLaundryRows = showerLaundrySummary.rows.filter(
    (row) => row.isYearToDate,
  );
  const upcomingShowerLaundryRows = showerLaundrySummary.rows.filter(
    (row) => !row.isYearToDate,
  );
  const showerLaundryRowsToRender =
    ytdShowerLaundryRows.length > 0
      ? ytdShowerLaundryRows
      : showerLaundrySummary.rows;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 font-heading">
                Monthly Summary Report for Meals - {reportYear}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive breakdown of meals by month and type
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="year-selector" className="text-sm font-medium text-gray-700">
                Year:
              </label>
              <select
                id="year-selector"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              Meals Monthly Report
            </button>
          </div>
        </div>

        {summaryInsights.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summaryInsights.map((insight) => (
              <SummaryCard key={insight.title} insight={insight} />
            ))}
          </div>
        )}

        {/* Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-[0.75rem] uppercase tracking-wide text-gray-600">
                <th
                  rowSpan={2}
                  className="border border-gray-300 px-3 py-3 text-left font-heading text-sm font-semibold text-gray-900"
                >
                  Month
                </th>
                {MEAL_TABLE_GROUPS.map((group) => (
                  <th
                    key={group.key}
                    colSpan={group.columns.length}
                    className={`border border-gray-300 px-3 py-3 text-center font-heading text-sm font-semibold ${group.headerClass}`}
                  >
                    <div>{group.title}</div>
                    <div className="mt-1 text-[11px] font-normal leading-4 text-gray-600">
                      {group.subtitle}
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-white text-xs uppercase tracking-wide text-gray-500">
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
                    className="border border-gray-300 px-3 py-2 text-left font-heading font-semibold text-gray-900"
                  >
                    {row.month}
                  </th>
                  {MEAL_DETAIL_COLUMN_KEYS.map((columnKey) => {
                    const columnMeta = MEAL_COLUMN_MAP[columnKey];
                    return (
                      <td
                        key={`${row.month}-${columnKey}`}
                        data-column={columnKey}
                        className={buildCellClass(columnMeta)}
                      >
                        {formatNumber(row[columnKey])}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-gray-200 font-semibold text-gray-900">
                <th
                  scope="row"
                  className="border border-gray-300 px-3 py-2 text-left"
                >
                  {monthlyData.totals.month}
                </th>
                {MEAL_DETAIL_COLUMN_KEYS.map((columnKey) => {
                  const columnMeta = MEAL_COLUMN_MAP[columnKey];
                  return (
                    <td
                      key={`totals-${columnKey}`}
                      data-column={columnKey}
                      className={buildCellClass(columnMeta, { isTotal: true })}
                    >
                      {formatNumber(monthlyData.totals[columnKey])}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowColumnGuide((previous) => !previous)}
            aria-expanded={showColumnGuide}
            aria-controls={columnGuideId}
            className="inline-flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-left text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <span className="flex items-center gap-2">
              <Info size={16} aria-hidden="true" />
              Column Guide
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform ${showColumnGuide ? "rotate-180" : "rotate-0"}`}
              aria-hidden="true"
            />
          </button>
          {showColumnGuide ? (
            <div
              id={columnGuideId}
              className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white"
            >
              {mealColumns
                .filter((column) => column.description)
                .map((column) => (
                  <div key={column.key} className="flex items-start gap-3 p-4">
                    <div
                      className={`mt-1 h-5 w-5 flex-shrink-0 rounded border border-gray-300 ${column.cellBg || "bg-gray-100"}`}
                      aria-hidden="true"
                    ></div>
                    <div>
                      <p className="font-heading text-sm font-semibold text-gray-900">
                        {column.label}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {column.description}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
        </div>

        {/* Notes */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Calculation Notes:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <strong>TOTAL HOT MEALS:</strong> Sum of all meal types except
              lunch bags
            </li>
            <li>
              <strong>Total w/ Lunch Bags:</strong> TOTAL HOT MEALS + Lunch Bags
            </li>
            <li>
              <strong>Onsite Hot Meals:</strong> Guest meals + Extra meals on
              Mon/Wed/Sat/Fri only
            </li>
            <li>
              <strong>RV Meals:</strong> Split by service days (Mon+Thu and
              Wed+Sat)
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-sky-600" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Bicycle Services Summary
              </h3>
              <p className="text-sm text-gray-600">
                Year-to-date breakdown of new bicycles and service types
                provided in {reportYear}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportBicycleCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            <Download size={16} />
            Export Bicycle CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">
                  Month
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-emerald-50">
                  New Bikes
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-sky-50">
                  Bike Services
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {bicycleSummary.rows.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">
                    {row.month}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50">
                    {row.newBikes.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-sky-50">
                    {row.services.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {row.total.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td className="border border-gray-300 px-3 py-2 text-gray-900">
                  Year to Date
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50">
                  {bicycleSummary.totals.newBikes.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-sky-50">
                  {bicycleSummary.totals.services.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {bicycleSummary.totals.total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <ShowerHead className="text-amber-600" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Shower & Laundry Services Summary
              </h3>
              <p className="text-sm text-gray-600">
                Participant trends and laundry loads from January through YTD{" "}
                {reportYear}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportShowerLaundryCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Download size={16} />
            Export Shower & Laundry CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-[0.75rem] uppercase tracking-wide text-gray-600">
                <th
                  className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-900"
                  rowSpan={2}
                >
                  Month
                </th>
                <th
                  className="border border-gray-300 px-3 py-3 text-center font-semibold text-amber-800 bg-yellow-50"
                  colSpan={5}
                >
                  Shower Program
                </th>
                <th
                  className="border border-gray-300 px-3 py-3 text-center font-semibold text-purple-800 bg-purple-50"
                  colSpan={6}
                >
                  Laundry Services
                </th>
              </tr>
              <tr className="bg-gray-50 text-[0.7rem] uppercase tracking-wide text-gray-500">
                <th className="border border-gray-200 px-2 py-2 text-center">Program Days</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Showers</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Avg / Day</th>
                <th className="border border-gray-200 px-2 py-2 text-center">New Guests</th>
                <th className="border border-gray-200 px-2 py-2 text-center bg-emerald-50">Participants</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Loads</th>
                <th className="border border-gray-200 px-2 py-2 text-center">On-site</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Off-site</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Avg / Day</th>
                <th className="border border-gray-200 px-2 py-2 text-center">Unique Users</th>
                <th className="border border-gray-200 px-2 py-2 text-center">New Laundry Guests</th>
              </tr>
            </thead>
            <tbody>
              {showerLaundryRowsToRender.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <th
                    scope="row"
                    className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900"
                  >
                    {row.month}
                  </th>
                  <td
                    data-column="program-days"
                    className="border border-gray-300 px-3 py-2 text-right"
                  >
                    {row.programDays.toLocaleString()}
                  </td>
                  <td
                    data-column="showers"
                    className="border border-gray-300 px-3 py-2 text-right"
                  >
                    {row.showersProvided.toLocaleString()}
                  </td>
                  <td
                    data-column="avg-showers"
                    className="border border-gray-300 px-3 py-2 text-right"
                  >
                    {formatAverage(row.avgShowersPerDay)}
                  </td>
                  <td
                    data-column="new-guests"
                    className="border border-gray-300 px-3 py-2 text-right"
                  >
                    {row.newGuests.toLocaleString()}
                  </td>
                  <td
                    data-column="participants"
                    className="border border-gray-300 px-3 py-2 text-right bg-emerald-50"
                  >
                    <div className="font-semibold text-gray-900">
                      {row.totalParticipants.toLocaleString()}
                    </div>
                    <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-gray-600">
                      <div>Adult · {row.participantsAdult.toLocaleString()}</div>
                      <div>Senior · {row.participantsSenior.toLocaleString()}</div>
                      <div>Child · {row.participantsChild.toLocaleString()}</div>
                    </div>
                  </td>
                  <td
                    data-column="laundry-loads"
                    className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                  >
                    {row.laundryLoadsProcessed.toLocaleString()}
                  </td>
                  <td
                    data-column="onsite-laundry"
                    className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                  >
                    {row.onsiteLaundryLoads.toLocaleString()}
                  </td>
                  <td
                    data-column="offsite-laundry"
                    className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                  >
                    {row.offsiteLaundryLoads.toLocaleString()}
                  </td>
                  <td
                    data-column="avg-laundry"
                    className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                  >
                    {formatAverage(row.avgLaundryLoadsPerDay)}
                  </td>
                  <td
                    data-column="laundry-unique-users"
                    className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                  >
                    <div className="font-semibold text-gray-900">
                      {row.unduplicatedLaundryUsers.toLocaleString()}
                    </div>
                    <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-gray-700">
                      <div>Adult · {row.laundryAdult.toLocaleString()}</div>
                      <div>Senior · {row.laundrySenior.toLocaleString()}</div>
                      <div>Child · {row.laundryChild.toLocaleString()}</div>
                    </div>
                  </td>
                  <td
                    data-column="new-laundry-guests"
                    className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                  >
                    {row.newLaundryGuests.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-semibold text-gray-900">
                <th
                  scope="row"
                  className="border border-gray-300 px-3 py-2 text-left"
                >
                  {showerLaundrySummary.totals.month}
                </th>
                <td
                  data-column="program-days"
                  className="border border-gray-300 px-3 py-2 text-right"
                >
                  {showerLaundrySummary.totals.programDays.toLocaleString()}
                </td>
                <td
                  data-column="showers"
                  className="border border-gray-300 px-3 py-2 text-right"
                >
                  {showerLaundrySummary.totals.showersProvided.toLocaleString()}
                </td>
                <td
                  data-column="avg-showers"
                  className="border border-gray-300 px-3 py-2 text-right"
                >
                  {formatAverage(showerLaundrySummary.totals.avgShowersPerDay)}
                </td>
                <td
                  data-column="new-guests"
                  className="border border-gray-300 px-3 py-2 text-right"
                >
                  {showerLaundrySummary.totals.newGuests.toLocaleString()}
                </td>
                <td
                  data-column="participants"
                  className="border border-gray-300 px-3 py-2 text-right bg-emerald-50"
                >
                  <div className="font-semibold text-gray-900">
                    {showerLaundrySummary.totals.totalParticipants.toLocaleString()}
                  </div>
                  <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-gray-700">
                    <div>Adult · {showerLaundrySummary.totals.participantsAdult.toLocaleString()}</div>
                    <div>Senior · {showerLaundrySummary.totals.participantsSenior.toLocaleString()}</div>
                    <div>Child · {showerLaundrySummary.totals.participantsChild.toLocaleString()}</div>
                  </div>
                </td>
                <td
                  data-column="laundry-loads"
                  className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                >
                  {showerLaundrySummary.totals.laundryLoadsProcessed.toLocaleString()}
                </td>
                <td
                  data-column="onsite-laundry"
                  className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                >
                  {showerLaundrySummary.totals.onsiteLaundryLoads.toLocaleString()}
                </td>
                <td
                  data-column="offsite-laundry"
                  className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                >
                  {showerLaundrySummary.totals.offsiteLaundryLoads.toLocaleString()}
                </td>
                <td
                  data-column="avg-laundry"
                  className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                >
                  {formatAverage(showerLaundrySummary.totals.avgLaundryLoadsPerDay)}
                </td>
                <td
                  data-column="laundry-unique-users"
                  className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                >
                  <div className="font-semibold text-gray-900">
                    {showerLaundrySummary.totals.unduplicatedLaundryUsers.toLocaleString()}
                  </div>
                  <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-gray-700">
                    <div>Adult · {showerLaundrySummary.totals.laundryAdult.toLocaleString()}</div>
                    <div>Senior · {showerLaundrySummary.totals.laundrySenior.toLocaleString()}</div>
                    <div>Child · {showerLaundrySummary.totals.laundryChild.toLocaleString()}</div>
                  </div>
                </td>
                <td
                  data-column="new-laundry-guests"
                  className="border border-gray-300 px-3 py-2 text-right bg-purple-50"
                >
                  {showerLaundrySummary.totals.newLaundryGuests.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
          {upcomingShowerLaundryRows.length > 0 ? (
            <p className="mt-3 text-xs text-gray-500">
              Upcoming months ({upcomingShowerLaundryRows
                .map((row) => row.month)
                .join(", ")}) will populate as data is recorded.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryReport;
