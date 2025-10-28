import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Database,
  Download,
  FileText,
  HardDrive,
  Home,
  ListChecks,
  Upload,
  PlugZap,
  Printer,
  RefreshCcw,
  ShieldAlert,
  Utensils,
  Users,
  Wifi,
  AlertTriangle,
  Clock,
} from "lucide-react";
import Donations from "../../components/Donations";
import { useAppContext } from "../../context/useAppContext";
import GuestBatchUpload from "../../components/GuestBatchUpload";
import AttendanceBatchUpload from "../../components/AttendanceBatchUpload";
import OverviewDashboard from "../../components/admin/OverviewDashboard";
import MealReport from "../../components/admin/MealReport";
import MonthlySummaryReport from "../../components/admin/MonthlySummaryReport";
import Analytics from "./Analytics";
import SupabaseSyncToggle from "../../components/SupabaseSyncToggle";
import Selectize from "../../components/Selectize";
import { animated as Animated } from "@react-spring/web";
import { useFadeInUp, SpringIcon } from "../../utils/animations";
import { todayPacificDateString } from "../../utils/date";
import { isSupabaseProxyAvailable } from "../../supabaseProxyClient";
import { getBicycleServiceCount } from "../../utils/bicycles";

const formatPacificDate = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const SYNC_TABLES = [
  { key: "guests", label: "Guests" },
  { key: "meal_attendance", label: "Meals" },
  { key: "shower_reservations", label: "Showers" },
  { key: "laundry_bookings", label: "Laundry" },
  { key: "bicycle_repairs", label: "Bicycles" },
  { key: "donations", label: "Donations" },
];

const STALE_SYNC_THRESHOLD_MS = 1000 * 60 * 60 * 6; // 6 hours

const EXPORT_CATEGORY_ORDER = [
  "Board briefing",
  "Operations & audits",
  "Case management",
];

const Dashboard = () => {
  const {
    getDateRangeMetrics,
    getTodayMetrics,
    exportDataAsCSV,
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
    itemGivenRecords,
    haircutRecords,
    holidayRecords,
    bicycleRecords,
    donationRecords,
    resetAllData,
    supabaseConfigured,
    supabaseEnabled,
  } = useAppContext();

  const [activeSection, setActiveSection] = useState("overview");

  const defaultStartDate = useMemo(() => {
    const today = new Date();
    const sevenAgo = new Date(today);
    sevenAgo.setDate(today.getDate() - 7);
    return formatPacificDate(sevenAgo);
  }, []);

  const defaultEndDate = useMemo(() => todayPacificDateString(), []);

  const [metricsExportRange, setMetricsExportRange] = useState(() => ({
    start: defaultStartDate,
    end: defaultEndDate,
  }));

  const [selectedExportGuest, setSelectedExportGuest] = useState("");
  const [viewMode, setViewMode] = useState("interactive");
  const [exportWizardStep, setExportWizardStep] = useState(1);
  const [selectedExportDataset, setSelectedExportDataset] = useState(null);

  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const relativeTimeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat("en", { numeric: "auto" }),
    [],
  );

  const formatRelativeSyncTime = (timestamp) => {
    if (!timestamp) return "No sync yet";
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return "In progress";

    const thresholds = [
      { limit: 60 * 1000, unit: "second", divisor: 1000 },
      { limit: 60 * 60 * 1000, unit: "minute", divisor: 60 * 1000 },
      { limit: 24 * 60 * 60 * 1000, unit: "hour", divisor: 60 * 60 * 1000 },
    ];

    const match =
      thresholds.find((entry) => diffMs < entry.limit) ||
      {
        unit: "day",
        divisor: 24 * 60 * 60 * 1000,
      };

    const relativeValue = -Math.max(1, Math.round(diffMs / match.divisor));
    return relativeTimeFormatter.format(relativeValue, match.unit);
  };

  const exportDatasetOptions = useMemo(
    () => [
      {
        id: "guests",
        label: "Guest roster",
        icon: Users,
        category: "Operations & audits",
        description: "Full directory of registered guests with contact details, housing status, and IDs.",
      },
      {
        id: "services",
        label: "Service history",
        icon: ClipboardList,
        category: "Operations & audits",
        description: "Meals, showers, laundry, bicycles, haircuts, and holiday services in one CSV.",
      },
      {
        id: "metrics",
        label: "Daily metrics",
        icon: BarChart3,
        category: "Board briefing",
        description: "Board-friendly totals for a selected window—pair with Monthly Summary for presentations.",
        requires: ["dateRange"],
      },
      {
        id: "donations",
        label: "Donations log",
        icon: FileText,
        category: "Operations & audits",
        description: "All recorded donations including donor, item, trays, and weight entries.",
      },
      {
        id: "supplies",
        label: "Supplies given",
        icon: FileText,
        category: "Operations & audits",
        description: "Summary of items issued to guests—ideal for pantry audits.",
      },
      {
        id: "guest-history",
        label: "Single guest timeline",
        icon: Users,
        category: "Case management",
        description: "Pull a single guest's service history for case management or referrals.",
        requires: ["guestSelection"],
      },
    ],
    [],
  );

  const selectedDatasetConfig = useMemo(() => {
    if (!selectedExportDataset) return null;
    return (
      exportDatasetOptions.find((option) => option.id === selectedExportDataset) ||
      null
    );
  }, [exportDatasetOptions, selectedExportDataset]);

  const groupedExportOptions = useMemo(() => {
    const grouped = exportDatasetOptions.reduce((acc, option) => {
      const bucket = option.category || "Other";
      if (!acc[bucket]) acc[bucket] = [];
      acc[bucket].push(option);
      return acc;
    }, {});

    const orderedGroups = EXPORT_CATEGORY_ORDER.filter((category) =>
      grouped[category],
    ).map((category) => ({
      category,
      options: grouped[category],
    }));

    if (grouped.Other) {
      orderedGroups.push({ category: "Other", options: grouped.Other });
    }

    return orderedGroups;
  }, [exportDatasetOptions]);

  const selectedGuestRecord = useMemo(() => {
    if (!selectedExportGuest) return null;
    return guests.find((g) => String(g.id) === String(selectedExportGuest)) || null;
  }, [guests, selectedExportGuest]);

  const datasetRequirementsMet = useMemo(() => {
    if (!selectedDatasetConfig) return false;

    if (selectedDatasetConfig.id === "metrics") {
      const { start, end } = metricsExportRange;
      if (!start || !end) return false;
      return new Date(start) <= new Date(end);
    }

    if (selectedDatasetConfig.id === "guest-history") {
      return Boolean(selectedExportGuest && selectedGuestRecord);
    }

    return true;
  }, [
    selectedDatasetConfig,
    metricsExportRange,
    selectedExportGuest,
    selectedGuestRecord,
  ]);

  const supabaseProxyEnabled = isSupabaseProxyAvailable;

  const syncSnapshot = useMemo(() => {
    if (typeof window === "undefined") {
      return { breakdown: [], mostRecent: null, stale: [], recordsTouched: 0 };
    }

    const syncEnabledFlag = supabaseEnabled ? 1 : 0;
    const datasetSignals = {
      guests: guests?.length || 0,
      meals: mealRecords?.length || 0,
      showers: showerRecords?.length || 0,
      laundry: laundryRecords?.length || 0,
      bicycles: bicycleRecords?.length || 0,
      donations: donationRecords?.length || 0,
    };

    const breakdown = SYNC_TABLES.map(({ key, label }) => {
      const raw = window.localStorage.getItem(`hopes-corner-${key}-lastSync`);
      const timestamp = raw ? Number(raw) : 0;
      return { key, label, timestamp };
    });

    const timestamps = breakdown
      .map((item) => item.timestamp)
      .filter((value) => Number.isFinite(value) && value > 0);
    const mostRecent = timestamps.length ? Math.max(...timestamps) : null;
    const stale = breakdown.filter(
      (item) =>
        item.timestamp && Date.now() - item.timestamp > STALE_SYNC_THRESHOLD_MS,
    );

    const recordsTouched = Object.values(datasetSignals).reduce(
      (sum, value) => sum + value,
      0,
    );

    return { breakdown, mostRecent, stale, recordsTouched, syncEnabledFlag };
  }, [
    supabaseEnabled,
    guests?.length,
    mealRecords?.length,
    showerRecords?.length,
    laundryRecords?.length,
    bicycleRecords?.length,
    donationRecords?.length,
  ]);

  const printableSnapshot = useMemo(() => {
    const todayMetrics = getTodayMetrics ? getTodayMetrics() : null;
    const endDate = todayPacificDateString();

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date();
    monthStart.setDate(1);

    const formatDate = (date) => formatPacificDate(date);

    const datasetSignals = {
      meals: mealRecords?.length || 0,
      rvMeals: rvMealRecords?.length || 0,
      shelterMeals: shelterMealRecords?.length || 0,
      unitedEffortMeals: unitedEffortMealRecords?.length || 0,
      extraMeals: extraMealRecords?.length || 0,
      dayWorkerMeals: dayWorkerMealRecords?.length || 0,
      lunchBags: lunchBagRecords?.length || 0,
      showers: showerRecords?.length || 0,
      laundry: laundryRecords?.length || 0,
      haircuts: haircutRecords?.length || 0,
      holidays: holidayRecords?.length || 0,
      bicycles: bicycleRecords?.length || 0,
    };
    const dataTouchPoints = Object.values(datasetSignals).reduce(
      (sum, value) => sum + value,
      0,
    );

    const weekMetrics = getDateRangeMetrics
      ? getDateRangeMetrics(formatDate(weekStart), endDate)
      : null;
    const monthMetrics = getDateRangeMetrics
      ? getDateRangeMetrics(formatDate(monthStart), endDate)
      : null;

    return {
      today: todayMetrics,
      week: weekMetrics,
      month: monthMetrics,
      dataTouchPoints,
    };
  }, [
    getTodayMetrics,
    getDateRangeMetrics,
    mealRecords?.length,
    rvMealRecords?.length,
    shelterMealRecords?.length,
    unitedEffortMealRecords?.length,
    extraMealRecords?.length,
    dayWorkerMealRecords?.length,
    lunchBagRecords?.length,
    showerRecords?.length,
    laundryRecords?.length,
    haircutRecords?.length,
    holidayRecords?.length,
    bicycleRecords?.length,
  ]);

  const printableRows = useMemo(() => {
    const today = printableSnapshot.today || {};
    const week = printableSnapshot.week || {};
    const month = printableSnapshot.month || {};

    const getValue = (source, key) => {
      if (!source || typeof source !== "object") return 0;
      const value = source[key];
      return Number.isFinite(value) ? value : 0;
    };

    return [
      {
        metric: "Meals served",
        today: getValue(today, "mealsServed"),
        week: getValue(week, "mealsServed"),
        month: getValue(month, "mealsServed"),
      },
      {
        metric: "Showers completed",
        today: getValue(today, "showersBooked"),
        week: getValue(week, "showersBooked"),
        month: getValue(month, "showersBooked"),
      },
      {
        metric: "Laundry loads",
        today: getValue(today, "laundryLoads"),
        week: getValue(week, "laundryLoads"),
        month: getValue(month, "laundryLoads"),
      },
      {
        metric: "Haircuts",
        today: getValue(today, "haircuts"),
        week: getValue(week, "haircuts"),
        month: getValue(month, "haircuts"),
      },
      {
        metric: "Holiday services",
        today: getValue(today, "holidays"),
        week: getValue(week, "holidays"),
        month: getValue(month, "holidays"),
      },
      {
        metric: "Bicycle repairs",
        today: getValue(today, "bicycles"),
        week: getValue(week, "bicycles"),
        month: getValue(month, "bicycles"),
      },
    ];
  }, [printableSnapshot]);

  const exportGuests = () => {
    const guestsForExport = guests.map((guest) => ({
      Guest_ID: guest.guestId,
      "First Name": guest.firstName || "",
      "Last Name": guest.lastName || "",
      "Preferred Name": guest.preferredName || "",
      Name: guest.name,
      "Housing Status": guest.housingStatus,
      Location: guest.location || "",
      Age: guest.age || "",
      Gender: guest.gender || "",
      Phone: guest.phone || "",
      "Birth Date": guest.birthdate || "",
      "Registration Date": new Date(guest.createdAt).toLocaleDateString(),
    }));

    exportDataAsCSV(
      guestsForExport,
      `hopes-corner-guests-${todayPacificDateString()}.csv`,
    );
  };

  const exportServiceData = () => {
    const allServices = [
      ...mealRecords.map((record) => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: "Meal",
        "Guest ID": record.guestId,
        "Guest Name":
          guests.find((g) => g.id === record.guestId)?.name || "Unknown",
        Quantity: record.count,
        "Laundry Type": "-",
        "Time Slot": "-",
      })),
      ...dayWorkerMealRecords.map((record) => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: "Day Worker Meal",
        "Guest ID": "-",
        "Guest Name": "-",
        Quantity: record.count,
        "Laundry Type": "-",
        "Time Slot": "-",
      })),
      ...showerRecords.map((record) => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: "Shower",
        "Guest ID": record.guestId,
        "Guest Name":
          guests.find((g) => g.id === record.guestId)?.name || "Unknown",
        Quantity: 1,
        "Laundry Type": "-",
        "Time Slot": record.time,
      })),
      ...laundryRecords.map((record) => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: "Laundry",
        "Guest ID": record.guestId,
        "Guest Name":
          guests.find((g) => g.id === record.guestId)?.name || "Unknown",
        Quantity: 1,
        "Laundry Type": record.laundryType,
        "Time Slot": record.time,
      })),
      ...(haircutRecords || []).map((record) => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: "Haircut",
        "Guest ID": record.guestId,
        "Guest Name":
          guests.find((g) => g.id === record.guestId)?.name || "Unknown",
        Quantity: 1,
        "Laundry Type": "-",
        "Time Slot": "-",
      })),
      ...(holidayRecords || []).map((record) => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: "Holiday",
        "Guest ID": record.guestId,
        "Guest Name":
          guests.find((g) => g.id === record.guestId)?.name || "Unknown",
        Quantity: 1,
        "Laundry Type": "-",
        "Time Slot": "-",
      })),
      ...(bicycleRecords || []).map((record) => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: "Bicycle Repair",
        "Guest ID": record.guestId,
        "Guest Name":
          guests.find((g) => g.id === record.guestId)?.name || "Unknown",
        Quantity: 1,
        "Laundry Type": "-",
        "Time Slot": "-",
        "Repair Type": record.repairType || "-",
        "Repair Status": record.status || "-",
        Notes: record.notes ? record.notes.replace(/\n/g, " ") : "-",
      })),
    ];

    exportDataAsCSV(
      allServices,
      `hopes-corner-services-${todayPacificDateString()}.csv`,
    );
  };

  const exportSuppliesData = () => {
    const rows = (itemGivenRecords || []).map((r) => ({
      Date: new Date(r.date).toLocaleDateString(),
      Item: r.item.replace("_", " "),
      "Guest ID": r.guestId,
      "Guest Name": guests.find((g) => g.id === r.guestId)?.name || "Unknown",
    }));
    exportDataAsCSV(
      rows,
      `hopes-corner-supplies-${todayPacificDateString()}.csv`,
    );
  };

  const exportGuestMetrics = (guestIdValue) => {
    if (!guestIdValue) {
      toast.error("Please select a guest to export");
      return;
    }

    const target = guests.find((g) => String(g.id) === String(guestIdValue));
    if (!target) {
      toast.error("Guest not found in roster");
      return;
    }

    const guestKey = String(target.id);
    const meals = mealRecords.filter((r) => String(r.guestId) === guestKey);
    const showers = showerRecords.filter((r) => String(r.guestId) === guestKey);
    const laundry = laundryRecords.filter(
      (r) => String(r.guestId) === guestKey,
    );

    const rows = [
      ...meals.map((r) => ({
        Date: new Date(r.date).toLocaleDateString(),
        Service: "Meal",
        Quantity: r.count,
      })),
      ...showers.map((r) => ({
        Date: new Date(r.date).toLocaleDateString(),
        Service: "Shower",
        Time: r.time || "-",
      })),
      ...laundry.map((r) => ({
        Date: new Date(r.date).toLocaleDateString(),
        Service: "Laundry",
        Type: r.laundryType || "-",
        Time: r.time || "-",
      })),
    ];

    if (rows.length === 0) {
      toast.error("No service history found for this guest");
      return;
    }

    const filenameId = target.guestId || target.id;
    exportDataAsCSV(rows, `guest-${filenameId}-services.csv`);
    toast.success(`Exported service history for ${target.name || "guest"}`);
    setSelectedExportGuest("");
  };

  const exportMetricsData = () => {
    const { start, end } = metricsExportRange;

    if (!start || !end) {
      toast.error("Please choose both a start and end date");
      return;
    }

    if (new Date(start) > new Date(end)) {
      toast.error("Start date must be before the end date");
      return;
    }

    const periodMetrics = getDateRangeMetrics(start, end);

    if (!periodMetrics || !Array.isArray(periodMetrics.dailyBreakdown)) {
      toast.error("No metrics available for the selected range");
      return;
    }

    const metricsData = periodMetrics.dailyBreakdown.map((day) => ({
      Date: day.date,
      "Meals Served": day.meals,
      "Showers Taken": day.showers,
      "Laundry Loads": day.laundry,
    }));

    if (metricsData.length === 0) {
      toast.error("No daily breakdown records to export");
      return;
    }

    exportDataAsCSV(metricsData, `hopes-corner-metrics-${start}-to-${end}.csv`);
    toast.success("Metrics export created");
  };

  const exportDonations = () => {
    const rows = (donationRecords || []).map((r) => ({
      Date: new Date(r.date).toLocaleDateString(),
      Type: r.type,
      Item: r.itemName,
      Trays: r.trays,
      "Weight (lbs)": r.weightLbs,
      Donor: r.donor,
    }));
    exportDataAsCSV(
      rows,
      `hopes-corner-donations-${todayPacificDateString()}.csv`,
    );
  };

  const applyMetricsRangePreset = (days) => {
    const endDate = todayPacificDateString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    setMetricsExportRange({
      start: formatPacificDate(startDate),
      end: endDate,
    });
  };

  const headerAnim = useFadeInUp();
  const overviewGridAnim = useFadeInUp();
  const monthGridAnim = useFadeInUp();
  const yearGridAnim = useFadeInUp();
  const sections = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "meal-report", label: "Meal Report", icon: Utensils },
    { id: "monthly-summary", label: "Monthly Summary", icon: ClipboardList },
    { id: "batch-upload", label: "Batch Upload", icon: Upload },
    { id: "donations", label: "Donations", icon: FileText },
    { id: "export", label: "Data Export", icon: Download },
    { id: "system", label: "System", icon: ShieldAlert },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverviewSection();
      case "analytics":
        return renderAnalyticsSection();
      case "meal-report":
        return renderMealReportSection();
      case "monthly-summary":
        return renderMonthlySummarySection();
      case "batch-upload":
        return renderBatchUploadSection();
      case "export":
        return renderExportSection();
      case "donations":
        return renderDonationsSection();
      case "system":
        return renderSystemSection();
      default:
        return renderOverviewSection();
    }
  };

  const renderAnalyticsSection = () => (
    <div className="space-y-6">
      <Analytics />
    </div>
  );

  const renderOverviewSection = () => (
    <OverviewDashboard
      overviewGridAnim={overviewGridAnim}
      monthGridAnim={monthGridAnim}
      yearGridAnim={yearGridAnim}
    />
  );

  const renderMealReportSection = () => (
    <div className="space-y-6">
      <MealReport />
    </div>
  );

  const renderMonthlySummarySection = () => (
    <div className="space-y-6">
      <MonthlySummaryReport />
    </div>
  );

  const renderBatchUploadSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Upload size={20} className="text-purple-600" /> Batch Guest Upload
        </h2>
        <p className="text-gray-600 mb-4">
          Upload multiple guests at once using a CSV file. This feature is
          restricted to admin users.
        </p>
        <GuestBatchUpload />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Upload size={20} className="text-green-600" /> Batch Attendance
          Upload
        </h2>
        <p className="text-gray-600 mb-4">
          Import legacy attendance data from another program using a CSV file.
          Supports all service types including meals, showers, laundry, and
          more.
        </p>
        <AttendanceBatchUpload />
      </div>
    </div>
  );

  const handleDatasetSelect = (datasetId) => {
    setSelectedExportDataset(datasetId);
    setExportWizardStep(2);
  };

  const handleResetWizard = () => {
    setSelectedExportDataset(null);
    setExportWizardStep(1);
  };

  const renderWizardDatasetChooser = () => (
    <div className="space-y-6">
      {groupedExportOptions.map(({ category, options }) => (
        <div key={category} className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {category}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => {
              const OptionIcon = option.icon;
              const isActive = selectedExportDataset === option.id;
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => handleDatasetSelect(option.id)}
                  className={`relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                    isActive
                      ? "border-purple-400 bg-purple-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-purple-200"
                  }`}
                >
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-purple-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <OptionIcon size={20} />
                  </span>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {option.label}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">
                      {option.description}
                    </p>
                  </div>
                  {option.requires?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {option.requires.includes("dateRange") && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                          <Clock size={12} />
                          Needs date window
                        </span>
                      )}
                      {option.requires.includes("guestSelection") && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                          <Users size={12} />
                          Pick a guest
                        </span>
                      )}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <ListChecks size={16} className="text-slate-500" />
        All exports download as CSV files ready for Excel, Google Sheets, or Airtable.
      </div>
    </div>
  );

  const renderWizardConfigurator = () => {
    if (!selectedDatasetConfig) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Select an export set to configure options.
        </div>
      );
    }

    const requires = selectedDatasetConfig.requires || [];

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {selectedDatasetConfig.category}
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {selectedDatasetConfig.label}
            </h3>
            <p className="text-sm text-slate-600">
              {selectedDatasetConfig.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExportWizardStep(1)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-purple-200 hover:text-purple-600"
          >
            Change export
          </button>
        </div>

        {requires.includes("dateRange") && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Choose reporting window
                </p>
                <p className="text-xs text-slate-600">
                  This sets the inclusive range used for the daily metrics CSV.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyMetricsRangePreset(7)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-600"
                >
                  Last 7 days
                </button>
                <button
                  type="button"
                  onClick={() => applyMetricsRangePreset(30)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-600"
                >
                  Last 30 days
                </button>
                <button
                  type="button"
                  onClick={() => applyMetricsRangePreset(90)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-600"
                >
                  Last 90 days
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Start date</span>
                <input
                  type="date"
                  value={metricsExportRange.start}
                  max={metricsExportRange.end || todayPacificDateString()}
                  onChange={(e) =>
                    setMetricsExportRange((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>End date</span>
                <input
                  type="date"
                  value={metricsExportRange.end}
                  min={metricsExportRange.start}
                  max={todayPacificDateString()}
                  onChange={(e) =>
                    setMetricsExportRange((prev) => ({
                      ...prev,
                      end: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </label>
            </div>
          </div>
        )}

        {requires.includes("guestSelection") && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="text-sm font-semibold text-slate-800">
              Select guest
            </label>
            <Selectize
              options={guests.map((g) => {
                const parts = [g.name, g.preferredName, g.firstName, g.lastName]
                  .map((part) => (part || "").trim())
                  .filter(Boolean);
                const searchFields = new Set(
                  [...parts, g.guestId, g.email].filter(Boolean).map(String),
                );
                const searchText = Array.from(searchFields)
                  .join(" ")
                  .toLowerCase();
                const displayName =
                  g.name || parts[0] || g.guestId || "Unknown";
                return {
                  value: String(g.id),
                  label: `${displayName} (${g.guestId || "-"})`,
                  searchText,
                };
              })}
              value={selectedExportGuest}
              onChange={(val) => setSelectedExportGuest(val || "")}
              placeholder="Search guest by name or ID…"
              size="sm"
              searchable
              className="flex-1"
            />
            {selectedGuestRecord ? (
              <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <div className="font-semibold text-emerald-700">
                  {selectedGuestRecord.name ||
                    selectedGuestRecord.preferredName ||
                    "Guest"}
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedGuestRecord.guestId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 font-medium">
                      <Users size={12} />
                      {selectedGuestRecord.guestId}
                    </span>
                  )}
                  {selectedGuestRecord.housingStatus && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 font-medium">
                      Housing: {selectedGuestRecord.housingStatus}
                    </span>
                  )}
                  {selectedGuestRecord.phone && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 font-medium">
                      Phone: {selectedGuestRecord.phone}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Choose a guest to unlock export.
              </div>
            )}
          </div>
        )}

        {requires.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            This export uses the complete dataset currently stored on the device.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setExportWizardStep(1)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-600"
          >
            Back to datasets
          </button>
          <button
            type="button"
            onClick={() => setExportWizardStep(3)}
            disabled={!datasetRequirementsMet}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
              datasetRequirementsMet
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            Continue to review
          </button>
        </div>
      </div>
    );
  };

  const renderWizardSummary = () => {
    if (!selectedDatasetConfig) {
      return renderWizardDatasetChooser();
    }

    const summaryItems = [];

    switch (selectedDatasetConfig.id) {
      case "guests":
        summaryItems.push({
          label: "Guests on device",
          value: numberFormatter.format(guests?.length || 0),
        });
        break;
      case "services": {
        const totalServices =
          (mealRecords?.length || 0) +
          (dayWorkerMealRecords?.length || 0) +
          (showerRecords?.length || 0) +
          (laundryRecords?.length || 0) +
          (haircutRecords?.length || 0) +
          (holidayRecords?.length || 0) +
          (bicycleRecords?.length || 0);
        summaryItems.push({
          label: "Service rows",
          value: numberFormatter.format(totalServices),
        });
        break;
      }
      case "metrics":
        summaryItems.push({
          label: "Reporting window",
          value: `${metricsExportRange.start || "—"} → ${
            metricsExportRange.end || "—"
          }`,
        });
        break;
      case "donations":
        summaryItems.push({
          label: "Donations logged",
          value: numberFormatter.format(donationRecords?.length || 0),
        });
        break;
      case "supplies":
        summaryItems.push({
          label: "Items given records",
          value: numberFormatter.format(itemGivenRecords?.length || 0),
        });
        break;
      case "guest-history":
        summaryItems.push({
          label: "Selected guest",
          value: selectedGuestRecord
            ? selectedGuestRecord.name ||
              selectedGuestRecord.preferredName ||
              selectedGuestRecord.guestId ||
              "Guest"
            : "Pick a guest",
        });
        break;
      default:
        break;
    }

    const staleCount = syncSnapshot.stale.length;

    const handleExport = () => {
      if (!datasetRequirementsMet) return;
      switch (selectedDatasetConfig.id) {
        case "guests":
          exportGuests();
          break;
        case "services":
          exportServiceData();
          break;
        case "metrics":
          exportMetricsData();
          break;
        case "donations":
          exportDonations();
          break;
        case "supplies":
          exportSuppliesData();
          break;
        case "guest-history":
          exportGuestMetrics(selectedExportGuest);
          break;
        default:
          break;
      }
    };

    return (
      <div className="space-y-5">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-purple-600" />
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {selectedDatasetConfig.label}
              </div>
              <p className="text-xs text-slate-600">
                {selectedDatasetConfig.description}
              </p>
            </div>
          </div>
          {summaryItems.length > 0 && (
            <dl className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
              {summaryItems.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <dt className="text-[11px] uppercase tracking-wide text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity size={14} />
            {numberFormatter.format(syncSnapshot.recordsTouched)} records tracked
            across synced datasets
            {staleCount > 0
              ? `. ${staleCount} ${
                  staleCount === 1 ? "dataset is" : "datasets are"
                } overdue for sync.`
              : "."}
          </div>
        </div>

        {selectedDatasetConfig.id === "guest-history" && selectedGuestRecord && (
          <div className="space-y-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <div className="text-sm font-semibold">
              {selectedGuestRecord.name ||
                selectedGuestRecord.preferredName ||
                "Guest"}
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedGuestRecord.guestId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-xs font-medium text-emerald-700">
                  <Users size={12} />
                  ID {selectedGuestRecord.guestId}
                </span>
              )}
              {selectedGuestRecord.housingStatus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-xs font-medium text-emerald-700">
                  Housing: {selectedGuestRecord.housingStatus}
                </span>
              )}
              {selectedGuestRecord.phone && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-xs font-medium text-emerald-700">
                  Phone: {selectedGuestRecord.phone}
                </span>
              )}
            </div>
          </div>
        )}

        {!datasetRequirementsMet && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            Provide the required selections above to enable the export button.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setExportWizardStep(2)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-600"
          >
            Back to settings
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleResetWizard}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-600"
            >
              Reset wizard
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!datasetRequirementsMet}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
                datasetRequirementsMet
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderExportWizard = () => {
    const wizardSteps = [
      { id: 1, label: "Pick dataset", icon: ListChecks },
      { id: 2, label: "Configure", icon: Activity },
      { id: 3, label: "Review & export", icon: ArrowRight },
    ];

    const effectiveStep =
      exportWizardStep > 1 && !selectedDatasetConfig ? 1 : exportWizardStep;

    let content;
    if (effectiveStep === 1) {
      content = renderWizardDatasetChooser();
    } else if (effectiveStep === 2) {
      content = renderWizardConfigurator();
    } else {
      content = renderWizardSummary();
    }

    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {wizardSteps.map((step) => {
              const Icon = step.icon;
              const status =
                step.id < effectiveStep
                  ? "complete"
                  : step.id === effectiveStep
                  ? "active"
                  : "upcoming";

              const badgeClasses =
                status === "complete"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : status === "active"
                  ? "border-purple-300 bg-purple-50 text-purple-700"
                  : "border-slate-200 bg-white text-slate-500";

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${badgeClasses}`}
                >
                  <Icon size={14} />
                  {step.label}
                </div>
              );
            })}
          </div>
          <div className="h-1 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{
                width: `${(effectiveStep / wizardSteps.length) * 100}%`,
              }}
            />
          </div>
        </div>
        {content}
      </div>
    );
  };

  const renderPrintableView = () => {
    const lastSyncRelative = formatRelativeSyncTime(syncSnapshot.mostRecent);
    const lastSyncAbsolute = syncSnapshot.mostRecent
      ? `${formatPacificDate(new Date(syncSnapshot.mostRecent))} · ${new Date(
          syncSnapshot.mostRecent,
        ).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Los_Angeles",
        })}`
      : "Not yet synced";
    const hasStale = syncSnapshot.stale.length > 0;
    const staleLabels = syncSnapshot.stale.map((item) => item.label).join(", ");

    const handlePrint = () => {
      if (typeof window !== "undefined") {
        window.print();
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Printable service snapshot · {todayPacificDateString()}
            </h3>
            <p className="text-sm text-slate-600">
              Designed for morning briefings, board packets, or quick handouts.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:text-purple-600"
          >
            <Printer size={16} />
            Print / Save PDF
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Activity size={16} className="text-purple-600" />
              Data touch points
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {numberFormatter.format(printableSnapshot.dataTouchPoints || 0)}
            </div>
            <p className="text-xs text-slate-500">
              Total service records captured across the current month.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Clock size={16} className="text-blue-500" />
              Last Supabase sync
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {lastSyncRelative}
            </div>
            <p className="text-xs text-slate-500">{lastSyncAbsolute}</p>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Wifi size={16} className="text-emerald-500" />
              Sync channel
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {supabaseEnabled ? "Realtime + backups" : "Local only"}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <PlugZap size={14} className="text-slate-500" />
              {supabaseProxyEnabled
                ? "Routing requests through Firebase proxy"
                : "Direct Supabase connection in use"}
            </div>
            {hasStale ? (
              <p className="text-xs text-amber-600">
                {syncSnapshot.stale.length} dataset
                {syncSnapshot.stale.length === 1 ? "" : "s"} require attention.
              </p>
            ) : (
              <p className="text-xs text-emerald-600">All datasets fresh.</p>
            )}
          </div>
        </div>

        {hasStale && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Stale datasets: {staleLabels || "Unknown"}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">
                  Metric
                </th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">
                  Today
                </th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">
                  Past 7 days
                </th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">
                  Month to date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {printableRows.map((row) => (
                <tr key={row.metric} className="align-top">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {row.metric}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {numberFormatter.format(row.today || 0)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {numberFormatter.format(row.week || 0)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {numberFormatter.format(row.month || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          Tip: Pair this sheet with the Monthly Summary section for charts and
          narrative context.
        </p>
      </div>
    );
  };

  const renderExportSection = () => (
    <div className="space-y-6">
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <FileText size={18} /> Data export studio
            </h2>
            <p className="text-sm text-slate-600">
              Step through curated exports or switch to a printable snapshot.
            </p>
          </div>
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setViewMode("interactive")}
              className={`rounded-full px-3 py-1.5 transition ${
                viewMode === "interactive"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "hover:text-purple-600"
              }`}
            >
              Wizard
            </button>
            <button
              type="button"
              onClick={() => setViewMode("printable")}
              className={`rounded-full px-3 py-1.5 transition ${
                viewMode === "printable"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "hover:text-purple-600"
              }`}
            >
              Printable
            </button>
          </div>
        </div>

        {viewMode === "interactive" ? renderExportWizard() : renderPrintableView()}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <span>
          Need charts and commentary? The Monthly Summary tab assembles the board-ready report.
        </span>
        <button
          type="button"
          onClick={() => setActiveSection("monthly-summary")}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:text-purple-600"
        >
          <BarChart3 size={16} />
          Open Monthly Summary
        </button>
      </div>
    </div>
  );

  const renderDonationsSection = () => (
    <div className="space-y-6">
      <Donations />
    </div>
  );

  const renderSystemHealthBanner = () => {
    const hasStaleTables = syncSnapshot.stale.length > 0;
    const staleLabels = syncSnapshot.stale.map((item) => item.label).join(", ");
    const lastSyncRelative = formatRelativeSyncTime(syncSnapshot.mostRecent);
    const lastSyncAbsolute = syncSnapshot.mostRecent
      ? `${formatPacificDate(new Date(syncSnapshot.mostRecent))} · ${new Date(
          syncSnapshot.mostRecent,
        ).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Los_Angeles",
        })}`
      : "No sync recorded";

    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Activity size={16} className="text-gray-600" /> System health
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {supabaseEnabled ? "Supabase sync active" : "Supabase sync standby"}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                hasStaleTables
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  hasStaleTables ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              {hasStaleTables ? "Attention needed" : "All synced"}
            </div>
          </div>
          <p className="text-xs text-gray-600">
            {hasStaleTables
              ? `${syncSnapshot.stale.length} dataset${syncSnapshot.stale.length === 1 ? "" : "s"} need attention: ${staleLabels}`
              : "All monitored datasets synced within the last six hours."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <Clock size={14} /> Last sync
            </div>
            <div className="mt-1.5 text-sm font-semibold text-gray-900">
              {lastSyncRelative}
            </div>
            <div className="text-xs text-gray-400">{lastSyncAbsolute}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <Wifi size={14} /> Sync channel
            </div>
            <div className="mt-1.5 text-sm font-semibold text-gray-900">
              {supabaseEnabled ? "Realtime + backups" : "Local device"}
            </div>
            <div className="text-xs text-gray-400">
              {supabaseProxyEnabled ? "Firebase proxy" : "Direct connection"}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <ListChecks size={14} /> Records tracked
            </div>
            <div className="mt-1.5 text-sm font-semibold text-gray-900">
              {numberFormatter.format(syncSnapshot.recordsTouched)}
            </div>
            <div className="text-xs text-gray-400">
              {hasStaleTables ? "Review needed" : "Fresh"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [resetOptions, setResetOptions] = useState({
    local: true,
    supabase: false,
    keepGuests: false,
  });
  const [isResetting, setIsResetting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const localCounts = useMemo(
    () => ({
      guests: guests?.length || 0,
      meals: mealRecords?.length || 0,
      rvMeals: rvMealRecords?.length || 0,
      shelterMeals: shelterMealRecords?.length || 0,
      ueMeals: unitedEffortMealRecords?.length || 0,
      extraMeals: extraMealRecords?.length || 0,
      dayWorkerMeals: dayWorkerMealRecords?.length || 0,
      lunchBags: lunchBagRecords?.length || 0,
      showers: showerRecords?.length || 0,
      laundry: laundryRecords?.length || 0,
      items: itemGivenRecords?.length || 0,
      haircuts: haircutRecords?.length || 0,
      holidays: holidayRecords?.length || 0,
      bicycles:
        bicycleRecords?.reduce(
          (total, record) => total + getBicycleServiceCount(record),
          0,
        ) || 0,
      donations: donationRecords?.length || 0,
    }),
    [
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
      itemGivenRecords,
      haircutRecords,
      holidayRecords,
      bicycleRecords,
      donationRecords,
    ],
  );
  const renderSystemSection = () => {
    const scopeParts = [];
    if (resetOptions.local) scopeParts.push("local data");
    if (resetOptions.supabase) scopeParts.push("cloud data");
    const scopeSummary =
      scopeParts.length > 0 ? scopeParts.join(" + ") : "No data sets selected";
    const guestSummary = resetOptions.keepGuests
      ? "Guest directory will be preserved."
      : "Guest directory will be cleared as well.";
    const resetDisabled =
      isResetting || (!resetOptions.local && !resetOptions.supabase);

    const impactList = [
      { label: "Meals", value: localCounts.meals },
      { label: "RV Meals", value: localCounts.rvMeals },
      { label: "Shelter Meals", value: localCounts.shelterMeals },
      { label: "United Effort Meals", value: localCounts.ueMeals },
      { label: "Extra Meals", value: localCounts.extraMeals },
      { label: "Day Worker Meals", value: localCounts.dayWorkerMeals },
      { label: "Lunch Bags", value: localCounts.lunchBags },
      { label: "Showers", value: localCounts.showers },
      { label: "Laundry", value: localCounts.laundry },
      { label: "Items Given", value: localCounts.items },
      { label: "Haircuts", value: localCounts.haircuts },
      { label: "Holidays", value: localCounts.holidays },
      { label: "Bicycles", value: localCounts.bicycles },
      { label: "Donations", value: localCounts.donations },
    ];

    return (
      <div className="space-y-6">
        {renderSystemHealthBanner()}

        <SupabaseSyncToggle supabaseConfigured={supabaseConfigured} />

        <div className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white rounded-2xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                <ShieldAlert size={16} className="text-white" /> High-impact
                admin
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Reset database</h2>
                <p className="text-sm text-rose-50 mt-2 max-w-2xl">
                  Clear out demo or stale records in one action. Choose the
                  scope below, review what will be deleted, and confirm with the
                  safety prompt. This cannot be undone.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                  <Cloud size={14} className="text-white" /> Cloud sync:{" "}
                  {supabaseConfigured ? "enabled" : "disabled"}
                </span>
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                  <Database size={14} className="text-white" /> Scope:{" "}
                  {scopeSummary}
                </span>
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1">
                  <ClipboardList size={14} className="text-white" />{" "}
                  {guestSummary}
                </span>
              </div>
            </div>
            <div className="min-w-[220px] bg-white/10 border border-white/25 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <HardDrive size={18} className="text-white" /> Local totals
              </div>
              <div className="text-3xl font-bold leading-none">
                {localCounts.guests}
                {resetOptions.keepGuests ? "" : "+"}
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                {resetOptions.keepGuests
                  ? "Guests stay in the system; services reset to zero."
                  : "Guests and related service history will be removed."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-500" /> Step 1
                    · Choose what to reset
                  </h3>
                  <p className="text-sm text-gray-500">
                    Tick the areas you want to clear. Cloud data is only
                    available when Supabase sync is configured.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs rounded-full px-3 py-1 bg-rose-50 text-rose-600">
                  <RefreshCcw size={14} /> Pending scope
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label
                  className={`group relative flex items-start gap-3 rounded-xl border ${resetOptions.local ? "border-rose-200 bg-rose-50" : "border-gray-200 bg-white"} p-4 shadow-sm transition`}
                >
                  <input
                    className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500"
                    type="checkbox"
                    checked={resetOptions.local}
                    onChange={(e) =>
                      setResetOptions((o) => ({
                        ...o,
                        local: e.target.checked,
                      }))
                    }
                  />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">Local storage</p>
                    <p className="text-xs text-gray-500">
                      Clears data saved on this device, including services,
                      donations, and queue info.
                    </p>
                  </div>
                </label>

                <label
                  className={`group relative flex items-start gap-3 rounded-xl border ${resetOptions.supabase && supabaseConfigured ? "border-rose-200 bg-rose-50" : "border-gray-200 bg-white"} p-4 shadow-sm transition ${!supabaseConfigured ? "opacity-60 cursor-not-allowed" : ""}`}
                  title={
                    !supabaseConfigured
                      ? "Configure Supabase credentials to reset cloud tables"
                      : ""
                  }
                >
                  <input
                    className="mt-1 h-4 w-4 text-rose-500 focus:ring-rose-500"
                    type="checkbox"
                    disabled={!supabaseConfigured}
                    checked={resetOptions.supabase && supabaseConfigured}
                    onChange={(e) =>
                      setResetOptions((o) => ({
                        ...o,
                        supabase: e.target.checked && supabaseConfigured,
                      }))
                    }
                  />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">
                      Supabase tables
                    </p>
                    <p className="text-xs text-gray-500">
                      Deletes synced records in the cloud to match this reset.
                    </p>
                  </div>
                </label>

                <label
                  className={`group relative flex items-start gap-3 rounded-xl border ${resetOptions.keepGuests ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"} p-4 shadow-sm transition`}
                >
                  <input
                    className="mt-1 h-4 w-4 text-emerald-500 focus:ring-emerald-500"
                    type="checkbox"
                    checked={resetOptions.keepGuests}
                    onChange={(e) =>
                      setResetOptions((o) => ({
                        ...o,
                        keepGuests: e.target.checked,
                      }))
                    }
                  />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">
                      Keep guest profiles
                    </p>
                    <p className="text-xs text-gray-500">
                      Preserve names and contact info while clearing service
                      history.
                    </p>
                  </div>
                </label>
              </div>

              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  Quick presets
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setResetOptions({
                        local: true,
                        supabase: false,
                        keepGuests: false,
                      })
                    }
                    className="px-3 py-2 text-xs font-semibold rounded-full border border-gray-200 hover:border-rose-300 hover:text-rose-600 transition"
                  >
                    Local only
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setResetOptions({
                        local: false,
                        supabase: true,
                        keepGuests: false,
                      })
                    }
                    disabled={!supabaseConfigured}
                    className={`px-3 py-2 text-xs font-semibold rounded-full border ${supabaseConfigured ? "border-gray-200 hover:border-rose-300 hover:text-rose-600 transition" : "border-gray-100 text-gray-400 cursor-not-allowed"}`}
                  >
                    Cloud only
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setResetOptions({
                        local: true,
                        supabase: true,
                        keepGuests: true,
                      })
                    }
                    disabled={!supabaseConfigured}
                    className={`px-3 py-2 text-xs font-semibold rounded-full border ${supabaseConfigured ? "border-gray-200 hover:border-rose-300 hover:text-rose-600 transition" : "border-gray-100 text-gray-400 cursor-not-allowed"}`}
                  >
                    Everything · keep guests
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ClipboardList size={18} className="text-rose-500" /> Step 2
                    · Review impact
                  </h3>
                  <p className="text-sm text-gray-500">
                    Once you confirm, these counts reset to zero for the
                    selected scope.
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  Snapshot only
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    Guests on device
                  </span>
                  <span className="text-2xl font-semibold text-gray-900">
                    {localCounts.guests}
                  </span>
                  <span className="text-xs text-gray-500">{guestSummary}</span>
                </div>
                {impactList.map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-gray-100 bg-white p-3"
                  >
                    <div className="text-sm font-medium text-gray-700">
                      {label}
                    </div>
                    <div className="text-xl font-semibold text-gray-900">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600">
                  Double-check you have exported any reports you want to keep.
                  Resets affect both web and kiosk experiences.
                </p>
                <button
                  type="button"
                  disabled={resetDisabled}
                  onClick={() => setIsConfirmOpen(true)}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold shadow-sm transition ${resetDisabled ? "bg-rose-200 text-white cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700 text-white"}`}
                >
                  <AlertTriangle size={16} />{" "}
                  {isResetting ? "Resetting…" : "Proceed to confirm"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" /> Safety
                checklist
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs">
                    1
                  </span>
                  Export required CSVs or reports for bookkeeping.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs">
                    2
                  </span>
                  Confirm all staff are informed—service queues will be cleared
                  instantly.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs">
                    3
                  </span>
                  If Supabase sync is enabled, double-check you truly want to
                  wipe the cloud backup.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-xs">
                    4
                  </span>
                  Prepare to re-import guests if you plan to start fresh from a
                  CSV template.
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCcw size={18} className="text-blue-500" /> After the
                reset
              </h3>
              <p className="text-sm text-gray-600">
                You can begin logging new data immediately. Reconnect kiosks or
                satellite devices so they sync with the cleared database.
                Consider adding a reminder to export fresh baseline reports once
                operations resume.
              </p>
            </div>
          </div>
        </div>

        {isConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => !isResetting && setIsConfirmOpen(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-xl border border-rose-100 w-[95%] max-w-lg p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle size={20} />
                <div>
                  <h4 className="text-lg font-semibold">
                    Type RESET to finalize
                  </h4>
                  <p className="text-sm text-gray-600">
                    This action removes the selected records immediately. There
                    is no undo. If Supabase sync is enabled, double-check you
                    truly want to wipe the cloud backup.
                  </p>
                </div>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-900 space-y-2">
                <div className="font-semibold uppercase tracking-wide text-xs">
                  What will happen
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {resetOptions.local && (
                    <li>
                      Local storage on this device will be cleared for services,
                      donations, supplies, and schedules
                      {resetOptions.keepGuests
                        ? ", keeping guest profiles"
                        : ", including guest profiles"}
                      .
                    </li>
                  )}
                  {resetOptions.supabase && (
                    <li>
                      Supabase tables (meals, showers, laundry, donations,
                      supplies, bicycles, holidays, haircuts, and extras) will
                      be deleted to match.
                    </li>
                  )}
                  {!resetOptions.local && !resetOptions.supabase && (
                    <li>
                      No data sets selected. Close to adjust your options.
                    </li>
                  )}
                </ul>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Safety phrase
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="RESET"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setIsConfirmOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isResetting || confirmText !== "RESET"}
                  onClick={async () => {
                    setIsResetting(true);
                    try {
                      await resetAllData(resetOptions);
                      toast.success("Database reset complete");
                      setIsConfirmOpen(false);
                      setConfirmText("");
                    } catch (e) {
                      toast.error(
                        "Reset failed: " + (e?.message || "Unknown error"),
                      );
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold shadow-sm transition ${isResetting || confirmText !== "RESET" ? "bg-rose-200 text-white cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700 text-white"}`}
                >
                  <AlertTriangle size={16} />{" "}
                  {isResetting ? "Resetting…" : "Confirm reset"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Animated.div style={headerAnim} className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <BarChart3 /> Admin Dashboard
        </h1>
        <p className="text-gray-500">
          Overview of guest check-in metrics and system administration
        </p>
      </Animated.div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 mb-6">
        <nav className="flex flex-wrap gap-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <SpringIcon>
                  <Icon size={16} />
                </SpringIcon>
                <span className="hidden sm:inline">{section.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {renderSectionContent()}
    </div>
  );
};

export default Dashboard;
