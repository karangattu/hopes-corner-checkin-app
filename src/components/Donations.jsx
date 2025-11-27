import React, { useMemo, useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { todayPacificDateString } from "../utils/date";
import { formatProteinAndCarbsClipboardText } from "../utils/donationFormatting";
import { DENSITY_SERVINGS, MINIMAL_TYPES, calculateServings, deriveDonationDateKey as deriveDonationDateKeyUtil } from "../utils/donationUtils";
import {
  PackagePlus,
  Save,
  Download,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Sparkles,
  Scale,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileText,
  Clock,
  Users,
  Package,
  UtensilsCrossed,
  Copy,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { sanitizeString, isValidNumber } from "../utils/validation";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const formatPacificDateKey = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const parseDateKey = (dateKey) => {
  if (!dateKey || !DATE_ONLY_REGEX.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if ([year, month, day].some((segment) => Number.isNaN(segment))) return null;
  const utcMidday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(utcMidday.getTime())) return null;
  return utcMidday;
};

const getDateKeyNDaysBefore = (dateKey, daysBefore) => {
  const base = parseDateKey(dateKey);
  if (!base) return null;
  const shifted = new Date(base);
  shifted.setUTCDate(shifted.getUTCDate() - daysBefore);
  return formatPacificDateKey(shifted);
};

const shiftDateKey = (dateKey, offsetDays) => {
  const base = parseDateKey(dateKey);
  if (!base) return dateKey;
  const shifted = new Date(base);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return formatPacificDateKey(shifted);
};

const formatNumber = (value, options) =>
  Number(value || 0).toLocaleString(undefined, options);

// DENSITY_SERVINGS, MINIMAL_TYPES, calculateServings, deriveDonationDateKey
// moved to src/utils/donationUtils.js for reuse and to keep this file component-only
const deriveDonationDateKey = deriveDonationDateKeyUtil;

// moved to src/utils/donationFormatting.js to satisfy react-refresh only-export-components eslint rule

const Donations = () => {
  const {
    DONATION_TYPES,
    addDonation,
    getRecentDonations,
    exportDataAsCSV,
    donationRecords,
    setDonationRecords,
  } = useAppContext();

  const todayKey = todayPacificDateString();

  const [selectedDate, setSelectedDate] = useState(() => todayKey);
  const [activeTab, setActiveTab] = useState("log"); // log, analytics, export
  const [form, setForm] = useState({
    type: DONATION_TYPES?.[0] || "Protein",
    itemName: "",
    trays: "",
    weightLbs: "",
    density: "medium",
    donor: "",
    temperature: "",
  });
  const isMinimalType = useMemo(() => MINIMAL_TYPES.has(form.type), [form.type]);
  const [loading, setLoading] = useState(false);
  const [copiedBadgeVisible, setCopiedBadgeVisible] = useState(false);
  const copiedTimeoutRef = useRef(null);
  const [range, setRange] = useState(() => ({
    start: getDateKeyNDaysBefore(todayKey, 7) || todayKey,
    end: todayKey,
  }));

  const suggestions = useMemo(
    () => getRecentDonations(6),
    [getRecentDonations],
  );

  const dayRecords = useMemo(
    () =>
      (donationRecords || []).filter(
        (record) => deriveDonationDateKey(record) === selectedDate,
      ),
    [donationRecords, selectedDate],
  );

  const typeTotals = useMemo(() => {
    const totals = {};
    for (const type of DONATION_TYPES) totals[type] = 0;
    for (const record of dayRecords) {
      const type = record.type;
      if (totals[type] === undefined) totals[type] = 0;
      totals[type] += Number(record.weightLbs) || 0;
    }
    return totals;
  }, [dayRecords, DONATION_TYPES]);

  const selectedStats = useMemo(() => {
    let trays = 0;
    let weight = 0;
    let servings = 0;
    const donors = new Set();
    for (const record of dayRecords) {
      trays += Number(record.trays) || 0;
      const recordWeight = Number(record.weightLbs) || 0;
      weight += recordWeight;
      // Use servings from record if available, otherwise calculate
      const recordServings = record.servings
        ? Number(record.servings)
        : calculateServings(
          record.type,
          recordWeight,
          Number(record.trays || 0),
          record.density || "medium",
        );
      servings += recordServings;
      if (record.donor) {
        const donorName = record.donor.trim();
        if (donorName) donors.add(donorName);
      }
    }
    return {
      entries: dayRecords.length,
      trays,
      weight,
      servings,
      donors: donors.size,
    };
  }, [dayRecords]);

  const statsByDateKey = useMemo(() => {
    const map = new Map();
    for (const record of donationRecords || []) {
      const key = deriveDonationDateKey(record);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          entries: 0,
          trays: 0,
          weight: 0,
          donors: new Set(),
        });
      }
      const summary = map.get(key);
      summary.entries += 1;
      summary.trays += Number(record.trays) || 0;
      summary.weight += Number(record.weightLbs) || 0;
      if (record.donor) {
        const donorName = (record.donor || "").trim() || "Unknown donor";
        summary.donors.add(donorName);
      }
    }
    return map;
  }, [donationRecords]);

  const periodSnapshots = useMemo(() => {
    if (!selectedDate || !DATE_ONLY_REGEX.test(selectedDate)) {
      return {
        currentWeek: null,
        previousWeek: null,
        rollingMonth: null,
      };
    }

    const accumulateRange = (startKey, endKey) => {
      if (!startKey || !endKey) return null;
      let entries = 0;
      let trays = 0;
      let weight = 0;
      const donors = new Set();

      for (const [key, summary] of statsByDateKey.entries()) {
        if (key >= startKey && key <= endKey) {
          entries += summary.entries;
          trays += summary.trays;
          weight += summary.weight;
          summary.donors.forEach((donor) => donors.add(donor));
        }
      }

      return {
        startKey,
        endKey,
        entries,
        trays,
        weight,
        donors: donors.size,
      };
    };

    const currentWeekStart = getDateKeyNDaysBefore(selectedDate, 6);
    const previousWeekEnd = getDateKeyNDaysBefore(selectedDate, 7);
    const previousWeekStart = getDateKeyNDaysBefore(selectedDate, 13);
    const rollingMonthStart = getDateKeyNDaysBefore(selectedDate, 29);

    return {
      currentWeek: accumulateRange(currentWeekStart, selectedDate),
      previousWeek: accumulateRange(previousWeekStart, previousWeekEnd),
      rollingMonth: accumulateRange(rollingMonthStart, selectedDate),
    };
  }, [selectedDate, statsByDateKey]);

  const weeklyComparison = useMemo(() => {
    const current = periodSnapshots.currentWeek;
    if (!current) return null;

    const previous = periodSnapshots.previousWeek;
    const currentWeight = current.weight || 0;
    const deltaWeight =
      previous && typeof previous.weight === "number"
        ? currentWeight - (previous.weight || 0)
        : null;
    const deltaPercent =
      previous && previous.weight > 0
        ? (deltaWeight / previous.weight) * 100
        : null;

    let trend = "flat";
    if (deltaWeight !== null) {
      if (deltaWeight > 0.1) trend = "up";
      else if (deltaWeight < -0.1) trend = "down";
    }

    return {
      weekWeight: currentWeight,
      weekTrays: current.trays || 0,
      deltaWeight,
      deltaPercent,
      trend,
    };
  }, [periodSnapshots]);

  const typeBreakdown = useMemo(() => {
    const entries = DONATION_TYPES.map((type) => ({
      type,
      weight: Number(typeTotals[type] || 0),
    }));
    const maxWeight = entries.reduce(
      (max, entry) => Math.max(max, entry.weight),
      0,
    );
    return { entries, maxWeight };
  }, [DONATION_TYPES, typeTotals]);

  const topDonors = useMemo(() => {
    const donorsMap = new Map();
    for (const record of dayRecords) {
      const donorKey =
        (record.donor || "Unknown donor").trim() || "Unknown donor";
      if (!donorsMap.has(donorKey)) {
        donorsMap.set(donorKey, {
          donor: donorKey,
          entries: 0,
          trays: 0,
          weight: 0,
        });
      }
      const entry = donorsMap.get(donorKey);
      entry.entries += 1;
      entry.trays += Number(record.trays) || 0;
      entry.weight += Number(record.weightLbs) || 0;
    }
    return Array.from(donorsMap.values())
      .sort(
        (a, b) =>
          b.weight - a.weight || b.trays - a.trays || b.entries - a.entries,
      )
      .slice(0, 5);
  }, [dayRecords]);

  const quickRangeOptions = useMemo(
    () => [
      {
        id: "today",
        label: "Today",
        range:
          selectedDate && DATE_ONLY_REGEX.test(selectedDate)
            ? { start: selectedDate, end: selectedDate }
            : null,
      },
      {
        id: "this-week",
        label: "This week",
        range: periodSnapshots.currentWeek
          ? {
            start: periodSnapshots.currentWeek.startKey,
            end: periodSnapshots.currentWeek.endKey,
          }
          : null,
      },
      {
        id: "30-days",
        label: "Last 30 days",
        range: periodSnapshots.rollingMonth
          ? {
            start: periodSnapshots.rollingMonth.startKey,
            end: periodSnapshots.rollingMonth.endKey,
          }
          : null,
      },
    ],
    [selectedDate, periodSnapshots],
  );

  const rangePreview = useMemo(() => {
    if (
      !range.start ||
      !range.end ||
      !DATE_ONLY_REGEX.test(range.start) ||
      !DATE_ONLY_REGEX.test(range.end) ||
      range.start > range.end
    ) {
      return null;
    }

    let entries = 0;
    let trays = 0;
    let weight = 0;
    const donors = new Set();

    for (const [key, summary] of statsByDateKey.entries()) {
      if (key >= range.start && key <= range.end) {
        entries += summary.entries;
        trays += summary.trays;
        weight += summary.weight;
        summary.donors.forEach((donor) => donors.add(donor));
      }
    }

    return {
      entries,
      trays,
      weight,
      donors: donors.size,
    };
  }, [range.start, range.end, statsByDateKey]);

  const selectedDateDisplay = useMemo(() => {
    if (!selectedDate || !DATE_ONLY_REGEX.test(selectedDate)) return null;
    const parsed = parseDateKey(selectedDate);
    if (!parsed) return selectedDate;
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  }, [selectedDate]);

  const isTodaySelected = selectedDate === todayKey;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDate) {
      toast.error("Pick a date before logging a donation");
      return;
    }

    // Sanitize and validate donor name
    const sanitizedDonor = sanitizeString(form.donor, { maxLength: 100 });

    // Validate numeric inputs
    const weightLbsFloat = Number(form.weightLbs || 0);
    const traysInt = Number(form.trays || 0);

    if (!isValidNumber(weightLbsFloat, { min: 0, positive: false })) {
      toast.error("Weight must be a valid number");
      return;
    }

    if (!isValidNumber(traysInt, { min: 0, integer: false })) {
      toast.error("Trays must be a valid number");
      return;
    }

    // For minimal types (School lunch, Pastries), require donor, weight, and item name
    if (isMinimalType) {
      if (!sanitizedDonor.trim()) {
        toast.error(`Donor is required for ${form.type} entries`);
        return;
      }
      if (weightLbsFloat <= 0) {
        toast.error(`Weight (lbs) is required for ${form.type} entries`);
        return;
      }
      // Sanitize and validate item name for minimal types
      const sanitizedItemName = sanitizeString(form.itemName, {
        maxLength: 200,
        allowHTML: false
      });

      if (!sanitizedItemName.trim()) {
        toast.error(`Item name is required for ${form.type} entries`);
        return;
      }
    } else {
      // Sanitize and validate item name for non-minimal types
      const sanitizedItemName = sanitizeString(form.itemName, {
        maxLength: 200,
        allowHTML: false
      });

      if (!sanitizedItemName.trim()) {
        toast.error("Item name is required");
        return;
      }
    }

    setLoading(true);
    try {
      const weightLbs = weightLbsFloat;
      const trays = traysInt;
      const density = form.density || "medium";
      const servings = calculateServings(form.type, weightLbs, trays, density);

      // Sanitize all text inputs
      const sanitizedItemName = sanitizeString(form.itemName, {
        maxLength: 200,
        allowHTML: false
      });
      const sanitizedTemperature = sanitizeString(form.temperature, { maxLength: 50 });

      await addDonation({
        type: form.type,
        itemName: sanitizedItemName,
        trays,
        density,
        weightLbs,
        servings,
        temperature: sanitizedTemperature || null,
        donor: sanitizedDonor || "Anonymous",
        date: selectedDate,
      });

      setForm((prev) => ({
        ...prev,
        itemName: "",
        trays: "",
        weightLbs: "",
        density: "medium",
        temperature: "",
      }));

      toast.success("Donation logged successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to add donation");
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (suggestion) => {
    setForm((prev) => ({
      ...prev,
      itemName: suggestion.itemName,
      donor: suggestion.donor,
      type: suggestion.type,
    }));
  };

  const shiftSelectedDate = (offset) => {
    setSelectedDate((prev) => shiftDateKey(prev, offset));
  };

  const getRecordTimestamp = (record) => {
    if (!record) return 0;
    const candidates = [record.date, record.createdAt, record.created_at];
    for (const value of candidates) {
      if (!value) continue;
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    return 0;
  };

  const formatRecordTime = (record) => {
    if (!record) return "—";
    const candidates = [record.date, record.createdAt, record.created_at];
    for (const value of candidates) {
      if (!value) continue;
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat([], {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(parsed);
      }
    }
    return "—";
  };

  const consolidatedActivity = useMemo(() => {
    const consolidationMap = new Map();

    for (const record of dayRecords) {
      const key = `${record.type}|${record.itemName}|${record.donor}`;

      if (!consolidationMap.has(key)) {
        consolidationMap.set(key, {
          type: record.type,
          itemName: record.itemName,
          donor: record.donor,
          trays: 0,
          weightLbs: 0,
          servings: 0,
          entries: [],
          latestTimestamp: getRecordTimestamp(record),
        });
      }

      const consolidated = consolidationMap.get(key);
      consolidated.trays += Number(record.trays) || 0;
      const weight = Number(record.weightLbs) || 0;
      consolidated.weightLbs += weight;
      // Calculate servings from the record or calculate if not present
      const recordServings = record.servings
        ? Number(record.servings)
        : calculateServings(
          record.type,
          weight,
          Number(record.trays || 0),
          record.density || "medium",
        );
      consolidated.servings += recordServings;
      consolidated.entries.push(record);

      const timestamp = getRecordTimestamp(record);
      if (timestamp > consolidated.latestTimestamp) {
        consolidated.latestTimestamp = timestamp;
      }
    }

    return Array.from(consolidationMap.values()).sort(
      (a, b) => b.latestTimestamp - a.latestTimestamp,
    );
  }, [dayRecords]);

  const hasProteinOrCarbs = useMemo(() => {
    return (consolidatedActivity || []).some(
      (c) => c.type === "Protein" || c.type === "Veggie Protein" || c.type === "Carbs",
    );
  }, [consolidatedActivity]);

  const copyProteinAndCarbsToClipboard = async () => {
    try {
      const text = formatProteinAndCarbsClipboardText(consolidatedActivity);
      if (!text) {
        toast.error("No protein or carbs donations to copy.");
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback - create temporary textarea
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.top = "0";
        el.style.left = "0";
        el.style.width = "1px";
        el.style.height = "1px";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      toast.success("Copied protein & carbs to clipboard");
      setCopiedBadgeVisible(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopiedBadgeVisible(false), 1500);
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy to clipboard");
    }
  };

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const exportDonationsRange = () => {
    if (!rangePreview) {
      toast.error("Select a valid date range before exporting.");
      return;
    }

    const rows = [];
    for (const record of donationRecords || []) {
      const dateKey = deriveDonationDateKey(record);
      if (!dateKey || dateKey < range.start || dateKey > range.end) continue;

      const displayDate = (() => {
        const candidates = [
          record.date,
          record.donatedAt,
          record.donated_at,
          record.createdAt,
          record.created_at,
        ];
        for (const value of candidates) {
          if (!value) continue;
          const parsed = new Date(value);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString();
          }
        }
        const fallbackDate = parseDateKey(dateKey);
        if (fallbackDate) {
          return fallbackDate.toLocaleDateString();
        }
        return dateKey;
      })();

      rows.push({
        Date: displayDate,
        Type: record.type,
        Item: record.itemName,
        Trays: record.trays,
        Density: record.density || "medium",
        "Weight (lbs)": record.weightLbs,
        Servings: record.servings || 0,
        Temperature: record.temperature || "—",
        Donor: record.donor,
      });
    }

    if (rows.length === 0) {
      toast.error("No donations found in the selected range.");
      return;
    }

    exportDataAsCSV(rows, `donations-${range.start}-to-${range.end}.csv`);
    toast.success(
      `Exported ${formatNumber(rows.length)} donation record${rows.length === 1 ? "" : "s"}`,
    );
  };

  return (
    <div className="min-h-screen space-y-4 sm:space-y-6 pb-8 px-2 sm:px-0">
      {/* Hero Date Navigator */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-8 shadow-lg">
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-32 translate-x-32 rounded-full bg-gradient-to-br from-emerald-200/30 to-teal-200/30 blur-3xl" />

        <div className="relative flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <h1 className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              <div className="rounded-xl sm:rounded-2xl bg-emerald-600 p-2 sm:p-3 shadow-lg">
                <PackagePlus size={20} className="sm:hidden text-white" />
                <PackagePlus size={28} className="hidden sm:block text-white" />
              </div>
              Donations
            </h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
              Track, analyze, and export food donations
            </p>
          </div>

          {/* Date Navigator */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-2 sm:gap-4 rounded-xl sm:rounded-2xl border border-emerald-300/50 bg-white/80 p-3 sm:p-4 shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => shiftSelectedDate(-1)}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200 hover:scale-110 active:scale-95"
                title="Previous day"
              >
                <ChevronLeft size={20} className="sm:hidden" strokeWidth={2.5} />
                <ChevronLeft size={24} className="hidden sm:block" strokeWidth={2.5} />
              </button>

              <div className="flex-1 sm:flex-none text-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="mb-1 w-full sm:w-auto rounded-lg border-2 border-emerald-300 bg-white px-3 sm:px-4 py-2 text-center text-xs sm:text-sm font-semibold text-emerald-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <p className="text-xs font-medium text-emerald-700 hidden sm:block">
                  {selectedDateDisplay}
                </p>
              </div>

              <button
                type="button"
                onClick={() => shiftSelectedDate(1)}
                disabled={isTodaySelected}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:scale-100"
                title="Next day"
              >
                <ChevronRight size={20} className="sm:hidden" strokeWidth={2.5} />
                <ChevronRight size={24} className="hidden sm:block" strokeWidth={2.5} />
              </button>
            </div>

            <div className="hidden sm:block h-8 w-px bg-emerald-200" />

            <button
              type="button"
              onClick={() => setSelectedDate(todayKey)}
              disabled={isTodaySelected}
              className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm transition hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-blue-100/50 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="rounded-lg sm:rounded-xl bg-blue-100 p-2 sm:p-3">
                <FileText size={18} className="sm:hidden text-blue-600" />
                <FileText size={24} className="hidden sm:block text-blue-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">
                Entries
              </span>
            </div>
            <p className="mt-2 sm:mt-4 text-xl sm:text-3xl font-bold text-gray-900">
              {formatNumber(selectedStats.entries)}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-gray-600">Today's donations</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm transition hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-emerald-100/50 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="rounded-lg sm:rounded-xl bg-emerald-100 p-2 sm:p-3">
                <Scale size={18} className="sm:hidden text-emerald-600" />
                <Scale size={24} className="hidden sm:block text-emerald-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">
                Weight
              </span>
            </div>
            <p className="mt-2 sm:mt-4 text-xl sm:text-3xl font-bold text-gray-900">
              {formatNumber(selectedStats.weight, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              <span className="text-sm sm:text-xl text-gray-500"> lbs</span>
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-gray-600">Total weight today</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm transition hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-teal-100/50 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="rounded-lg sm:rounded-xl bg-teal-100 p-2 sm:p-3">
                <UtensilsCrossed size={18} className="sm:hidden text-teal-600" />
                <UtensilsCrossed size={24} className="hidden sm:block text-teal-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">
                Servings
              </span>
            </div>
            <p className="mt-2 sm:mt-4 text-xl sm:text-3xl font-bold text-gray-900">
              {formatNumber(selectedStats.servings, {
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-gray-600">Total servings</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm transition hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-amber-100/50 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="rounded-lg sm:rounded-xl bg-amber-100 p-2 sm:p-3">
                <Package size={18} className="sm:hidden text-amber-600" />
                <Package size={24} className="hidden sm:block text-amber-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trays
              </span>
            </div>
            <p className="mt-2 sm:mt-4 text-xl sm:text-3xl font-bold text-gray-900">
              {formatNumber(selectedStats.trays, {
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-gray-600">Total trays</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 sm:p-6 shadow-sm transition hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full bg-purple-100/50 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="rounded-lg sm:rounded-xl bg-purple-100 p-2 sm:p-3">
                <Users size={18} className="sm:hidden text-purple-600" />
                <Users size={24} className="hidden sm:block text-purple-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">
                Donors
              </span>
            </div>
            <p className="mt-2 sm:mt-4 text-xl sm:text-3xl font-bold text-gray-900">
              {formatNumber(selectedStats.donors)}
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-gray-600">Unique donors</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-2 rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-1 sm:p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("log")}
          className={`flex flex-1 items-center justify-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition ${activeTab === "log"
            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
            : "text-gray-600 hover:bg-gray-100"
            }`}
        >
          <PackagePlus size={16} className="sm:hidden" />
          <PackagePlus size={18} className="hidden sm:block" />
          <span className="hidden xs:inline">Log</span>
          <span className="hidden sm:inline"> Donations</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`flex flex-1 items-center justify-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition ${activeTab === "analytics"
            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
            : "text-gray-600 hover:bg-gray-100"
            }`}
        >
          <BarChart3 size={16} className="sm:hidden" />
          <BarChart3 size={18} className="hidden sm:block" />
          <span>Analytics</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("export")}
          className={`flex flex-1 items-center justify-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-2 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition ${activeTab === "export"
            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md"
            : "text-gray-600 hover:bg-gray-100"
            }`}
        >
          <Download size={16} className="sm:hidden" />
          <Download size={18} className="hidden sm:block" />
          <span>Export</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "log" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Quick Add Form */}
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4 sm:mb-6">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                <PackagePlus size={20} className="sm:hidden text-emerald-600" />
                <PackagePlus size={22} className="hidden sm:block text-emerald-600" />
                Quick Add
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Log a new donation entry
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-700">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {DONATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-700">
                  Item Name {isMinimalType && "*"}
                </label>
                <input
                  type="text"
                  value={form.itemName}
                  onChange={(event) =>
                    setForm({ ...form, itemName: event.target.value })
                  }
                  placeholder={isMinimalType ? "e.g., Sandwich, Cookie, Brownie" : "e.g., Chicken tikka masala, Fresh vegetables"}
                  className="w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {!isMinimalType && (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="mb-2 block text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-700">
                        Trays
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.trays}
                        onChange={(event) =>
                          setForm({ ...form, trays: event.target.value })
                        }
                        placeholder="0"
                        className="w-full rounded-lg sm:rounded-xl border-2 border-gray-300 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-700">
                        Weight (lbs)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.weightLbs}
                        onChange={(event) =>
                          setForm({ ...form, weightLbs: event.target.value })
                        }
                        placeholder="0.0"
                        required={isMinimalType}
                        className="w-full rounded-lg sm:rounded-xl border-2 border-gray-300 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>
                  </div>
                )}

                {!isMinimalType && (
                  <div>
                    <label className="mb-2 block text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-700">
                      Density
                    </label>
                    <select
                      value={form.density}
                      onChange={(event) =>
                        setForm({ ...form, density: event.target.value })
                      }
                      className="w-full rounded-lg sm:rounded-xl border-2 border-gray-300 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option value="light">Light (10 servings)</option>
                      <option value="medium">Medium (20 servings)</option>
                      <option value="high">High (30 servings)</option>
                    </select>
                  </div>
                )}

                {isMinimalType && (
                  <div>
                    <label className="mb-2 block text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-700">
                      Weight (lbs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.weightLbs}
                      onChange={(event) =>
                        setForm({ ...form, weightLbs: event.target.value })
                      }
                      placeholder="0.0"
                      required={isMinimalType}
                      className="w-full rounded-lg sm:rounded-xl border-2 border-gray-300 bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-700">
                  Donor / Source
                </label>
                <input
                  type="text"
                  value={form.donor}
                  onChange={(event) =>
                    setForm({ ...form, donor: event.target.value })
                  }
                  placeholder="e.g., Waymo, LinkedIn, Anonymous"
                  required={isMinimalType}
                  className="w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              {isMinimalType && (
                <p className="mt-2 text-xs text-gray-500">For {form.type} entries, Item Name, Donor, and Weight are required.</p>
              )}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-700">
                  Temperature (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.temperature}
                    onChange={(event) =>
                      setForm({ ...form, temperature: event.target.value })
                    }
                    placeholder="e.g., 165°F, Hot, Cold, Room temp"
                    className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...form, temperature: (form.temperature || "") + "°F" });
                    }}
                    className="rounded-xl border-2 border-gray-300 bg-gray-50 px-3 py-3 font-bold text-gray-900 transition hover:border-emerald-500 hover:bg-emerald-50"
                    title="Add degree Fahrenheit symbol"
                  >
                    °F
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Tip: Click °F button to add the symbol</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={20} />
                {loading ? "Saving..." : "Add Donation"}
              </button>
            </form>

            {/* Quick Fill Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <Sparkles size={16} />
                  Quick Fill
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.itemName}-${suggestion.donor}-${index}`}
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className="rounded-full border-2 border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-50"
                    >
                      {suggestion.itemName} • {suggestion.donor}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Today's Activity */}
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                  <Clock size={20} className="sm:hidden text-blue-600" />
                  <Clock size={22} className="hidden sm:block text-blue-600" />
                  Today's Activity
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">
                  {selectedStats.entries}{" "}
                  {selectedStats.entries === 1 ? "entry" : "entries"} logged
                  {consolidatedActivity.length !== selectedStats.entries && (
                    <span className="ml-1 text-emerald-600">
                      • {consolidatedActivity.length}{" "}
                      {consolidatedActivity.length === 1 ? "item" : "items"}
                    </span>
                  )}
                </p>
              </div>
              {selectedStats.entries > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 flex-1 sm:flex-none">
                    <button
                      type="button"
                      onClick={copyProteinAndCarbsToClipboard}
                      disabled={!hasProteinOrCarbs}
                      className="flex h-10 sm:h-12 items-center justify-center sm:justify-start gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border-2 border-emerald-300 bg-emerald-50 px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-semibold text-emerald-700 shadow-md transition hover:border-emerald-500 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 flex-1 sm:flex-none"
                      title="Copy protein and carbs donations to clipboard"
                    >
                      <Copy size={14} className="sm:hidden text-emerald-700" />
                      <Copy size={16} className="hidden sm:block text-emerald-700" />
                      <span className="hidden xs:inline">Copy</span>
                      <span className="hidden sm:inline"> Protein & Carbs</span>
                    </button>
                    {copiedBadgeVisible && (
                      <span className="rounded-full bg-emerald-600 text-white px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm("Delete all donations from today?")) return;
                      setDonationRecords((prev) =>
                        prev.filter((donation) => {
                          const donationDate = new Date(donation.timestamp).toDateString();
                          const todayDate = new Date().toDateString();
                          return donationDate !== todayDate;
                        })
                      );
                      toast.success("All today's donations deleted");
                    }}
                    className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg border-2 border-red-300 bg-red-50 text-red-600 shadow-md transition hover:border-red-500 hover:bg-red-100 hover:text-red-700"
                    title="Delete all entries"
                  >
                    <Trash2 size={18} className="sm:hidden" />
                    <Trash2 size={20} className="hidden sm:block" />
                  </button>
                </div>
              )}
            </div>

            {consolidatedActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-12">
                <PackagePlus size={48} className="text-gray-300" />
                <p className="mt-4 text-sm font-medium text-gray-500">
                  No donations logged yet
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Add your first donation to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {consolidatedActivity.map((consolidated, idx) => {
                  const isMultipleEntries = consolidated.entries.length > 1;
                  const firstEntry = consolidated.entries[0];
                  const key = `${consolidated.type}-${consolidated.itemName}-${consolidated.donor}-${idx}`;

                  // Show consolidated view (not editing individual entries for now)
                  return (
                    <div
                      key={key}
                      className="group rounded-xl sm:rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3 sm:p-4 transition hover:border-gray-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-0">
                        <div className="flex-1 min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="rounded-full bg-emerald-100 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-emerald-700">
                              {consolidated.type}
                            </span>
                            {isMultipleEntries && (
                              <span className="rounded-full bg-blue-100 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-blue-700">
                                {consolidated.entries.length} entries
                              </span>
                            )}
                            <span className="text-[10px] sm:text-xs font-medium text-gray-500">
                              {formatRecordTime(firstEntry)}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                            {consolidated.itemName}
                          </h3>
                          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 truncate">
                            From: {consolidated.donor || "Anonymous"}
                          </p>
                          <div className="mt-2 sm:mt-3 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Package size={12} className="sm:hidden text-amber-600" />
                              <Package size={14} className="hidden sm:block text-amber-600" />
                              <span className="font-semibold text-gray-900">
                                {formatNumber(consolidated.trays, {
                                  maximumFractionDigits: 0,
                                })}{" "}
                                <span className="hidden xs:inline">trays</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <Scale size={12} className="sm:hidden text-emerald-600" />
                              <Scale size={14} className="hidden sm:block text-emerald-600" />
                              <span className="font-semibold text-gray-900">
                                {formatNumber(consolidated.weightLbs, {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })}{" "}
                                lbs
                              </span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <UtensilsCrossed size={12} className="sm:hidden text-blue-600" />
                              <UtensilsCrossed size={14} className="hidden sm:block text-blue-600" />
                              <span className="font-semibold text-gray-900">
                                {formatNumber(consolidated.servings, {
                                  maximumFractionDigits: 0,
                                })}{" "}
                                <span className="hidden xs:inline">servings</span>
                              </span>
                            </div>
                          </div>

                          {/* Show individual entries breakdown if multiple */}
                          {isMultipleEntries && (
                            <details className="mt-3">
                              <summary className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700">
                                View {consolidated.entries.length} individual
                                entries
                              </summary>
                              <div className="mt-2 space-y-2 rounded-lg bg-blue-50 p-3">
                                {consolidated.entries.map((entry, entryIdx) => (
                                  <div
                                    key={entry.id}
                                    className="flex flex-col gap-2 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-600">
                                        Entry {entryIdx + 1} •{" "}
                                        {formatRecordTime(entry)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (
                                            !window.confirm(
                                              "Delete this individual entry?",
                                            )
                                          )
                                            return;
                                          setDonationRecords((prev) =>
                                            prev.filter(
                                              (donation) =>
                                                donation.id !== entry.id,
                                            ),
                                          );
                                          toast.success("Entry deleted");
                                        }}
                                        className="text-red-600 hover:text-red-700"
                                        title="Delete this entry"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-gray-700">
                                      <span>
                                        {formatNumber(entry.trays, {
                                          maximumFractionDigits: 0,
                                        })}{" "}
                                        trays
                                      </span>
                                      <span>
                                        {formatNumber(entry.weightLbs, {
                                          minimumFractionDigits: 1,
                                          maximumFractionDigits: 1,
                                        })}{" "}
                                        lbs
                                      </span>
                                      <span>
                                        {formatNumber(entry.servings, {
                                          maximumFractionDigits: 0,
                                        })}{" "}
                                        servings
                                      </span>
                                      {entry.temperature && (
                                        <span className="rounded-full bg-blue-200 px-2 py-0.5 font-semibold text-blue-800">
                                          {entry.temperature}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            const confirmMessage = isMultipleEntries
                              ? `Delete all ${consolidated.entries.length} entries of this item?`
                              : "Delete this donation entry?";
                            if (!window.confirm(confirmMessage)) return;
                            const idsToDelete = consolidated.entries.map(
                              (e) => e.id,
                            );
                            setDonationRecords((prev) =>
                              prev.filter(
                                (donation) =>
                                  !idsToDelete.includes(donation.id),
                              ),
                            );
                            toast.success(
                              isMultipleEntries
                                ? `${consolidated.entries.length} entries deleted`
                                : "Donation deleted",
                            );
                          }}
                          className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg border-2 border-red-300 bg-red-50 text-red-600 shadow-md transition hover:border-red-500 hover:bg-red-100 hover:text-red-700"
                          title={
                            isMultipleEntries
                              ? "Delete all entries"
                              : "Delete"
                          }
                        >
                          <Trash2 size={18} className="sm:hidden" />
                          <Trash2 size={20} className="hidden sm:block" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Type Breakdown */}
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4 sm:mb-6">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                <BarChart3 size={20} className="sm:hidden text-purple-600" />
                <BarChart3 size={22} className="hidden sm:block text-purple-600" />
                Type Breakdown
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Weight distribution by type
              </p>
            </div>

            {typeBreakdown.entries.some((entry) => entry.weight > 0) ? (
              <div className="space-y-4">
                {typeBreakdown.entries.map((entry) => {
                  const percentage = typeBreakdown.maxWeight
                    ? (entry.weight / typeBreakdown.maxWeight) * 100
                    : 0;
                  return (
                    <div key={entry.type}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">
                          {entry.type}
                        </span>
                        <span className="text-sm font-bold text-emerald-700">
                          {formatNumber(entry.weight, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{" "}
                          lbs
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                          style={{
                            width: `${Math.max(percentage, 5)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-12">
                <BarChart3 size={48} className="text-gray-300" />
                <p className="mt-4 text-sm font-medium text-gray-500">
                  No data available
                </p>
              </div>
            )}
          </div>

          {/* Top Donors */}
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <div className="mb-4 sm:mb-6">
              <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                <TrendingUp size={20} className="sm:hidden text-orange-600" />
                <TrendingUp size={22} className="hidden sm:block text-orange-600" />
                Top Donors
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Highest contributors today
              </p>
            </div>

            {topDonors.length > 0 ? (
              <div className="space-y-3">
                {topDonors.map((donor, index) => (
                  <div
                    key={donor.donor}
                    className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4"
                  >
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${index === 0
                        ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                        : index === 1
                          ? "bg-gradient-to-br from-gray-300 to-gray-500"
                          : index === 2
                            ? "bg-gradient-to-br from-orange-400 to-orange-600"
                            : "bg-gradient-to-br from-emerald-400 to-emerald-600"
                        }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{donor.donor}</h3>
                      <p className="text-xs text-gray-600">
                        {formatNumber(donor.entries)}{" "}
                        {donor.entries === 1 ? "entry" : "entries"} •{" "}
                        {formatNumber(donor.trays, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        trays
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-700">
                        {formatNumber(donor.weight, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </p>
                      <p className="text-xs text-gray-600">lbs</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-12">
                <Users size={48} className="text-gray-300" />
                <p className="mt-4 text-sm font-medium text-gray-500">
                  No donors yet
                </p>
              </div>
            )}
          </div>

          {/* Weekly Trends */}
          {weeklyComparison && (
            <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm lg:col-span-2">
              <div className="mb-4 sm:mb-6">
                <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                  <CalendarDays size={20} className="sm:hidden text-teal-600" />
                  <CalendarDays size={22} className="hidden sm:block text-teal-600" />
                  Weekly Trends
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-600">
                  Compare this week's performance
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                <div className="rounded-xl sm:rounded-2xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-6">
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-gray-700">
                    This Week
                  </p>
                  <p className="mt-2 sm:mt-3 text-2xl sm:text-4xl font-bold text-gray-900">
                    {formatNumber(weeklyComparison.weekWeight, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                    <span className="text-xl text-gray-500"> lbs</span>
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {formatNumber(weeklyComparison.weekTrays, {
                      maximumFractionDigits: 0,
                    })}{" "}
                    trays total
                  </p>
                </div>

                {weeklyComparison.deltaWeight !== null && (
                  <>
                    <div
                      className={`rounded-2xl border p-6 ${weeklyComparison.trend === "up"
                        ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100"
                        : weeklyComparison.trend === "down"
                          ? "border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100"
                          : "border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100"
                        }`}
                    >
                      <p className="text-sm font-bold uppercase tracking-wide text-gray-700">
                        Change
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        {weeklyComparison.trend === "up" ? (
                          <ArrowUpRight
                            size={28}
                            className="text-emerald-600"
                          />
                        ) : weeklyComparison.trend === "down" ? (
                          <ArrowDownRight size={28} className="text-rose-600" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-gray-400" />
                        )}
                        <p
                          className={`text-4xl font-bold ${weeklyComparison.trend === "up"
                            ? "text-emerald-700"
                            : weeklyComparison.trend === "down"
                              ? "text-rose-700"
                              : "text-gray-700"
                            }`}
                        >
                          {weeklyComparison.deltaWeight > 0 ? "+" : ""}
                          {formatNumber(weeklyComparison.deltaWeight, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        lbs vs last week
                      </p>
                    </div>

                    {weeklyComparison.deltaPercent !== null && (
                      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                        <p className="text-sm font-bold uppercase tracking-wide text-gray-700">
                          Percentage
                        </p>
                        <p className="mt-3 text-4xl font-bold text-blue-700">
                          {weeklyComparison.deltaPercent > 0 ? "+" : ""}
                          {formatNumber(weeklyComparison.deltaPercent, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                          <span className="text-xl">%</span>
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          growth rate
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "export" && (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600">
                <Download size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Export Data</h2>
              <p className="mt-2 text-gray-600">
                Download donation records as CSV for reporting
              </p>
            </div>

            <div className="space-y-6">
              {/* Quick Ranges */}
              <div>
                <label className="mb-3 block text-sm font-bold uppercase tracking-wide text-gray-700">
                  Quick Ranges
                </label>
                <div className="flex flex-wrap gap-3">
                  {quickRangeOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        option.range && setRange({ ...option.range })
                      }
                      disabled={!option.range}
                      className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={range.start}
                    onChange={(event) =>
                      setRange((prev) => ({
                        ...prev,
                        start: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={range.end}
                    onChange={(event) =>
                      setRange((prev) => ({ ...prev, end: event.target.value }))
                    }
                    className="w-full rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>

              {/* Preview */}
              {rangePreview ? (
                <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
                  <p className="mb-4 text-sm font-bold uppercase tracking-wide text-emerald-800">
                    Preview
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-2xl font-bold text-emerald-900">
                        {formatNumber(rangePreview.entries)}
                      </p>
                      <p className="text-xs text-emerald-700">Entries</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-900">
                        {formatNumber(rangePreview.weight, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </p>
                      <p className="text-xs text-emerald-700">lbs</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-900">
                        {formatNumber(rangePreview.trays, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-xs text-emerald-700">Trays</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-900">
                        {formatNumber(rangePreview.donors)}
                      </p>
                      <p className="text-xs text-emerald-700">Donors</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Select a valid date range to preview
                </div>
              )}

              {/* Export Button */}
              <button
                type="button"
                onClick={exportDonationsRange}
                disabled={!rangePreview || rangePreview.entries === 0}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={20} />
                Export {rangePreview ? rangePreview.entries : 0} Records
              </button>

              <p className="text-center text-xs text-gray-500">
                All dates use Pacific Time • CSV includes date, type, item,
                trays, weight, servings, temperature, and donor
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Donations;
