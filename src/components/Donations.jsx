import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";
import {
  PackagePlus,
  History,
  Save,
  List,
  Download,
  Users,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Scale,
  Edit3,
  Trash2,
  Undo2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";

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

const deriveDonationDateKey = (record) => {
  if (!record) return null;
  if (record.dateKey) return record.dateKey;
  const candidates = [
    record.date,
    record.donatedAt,
    record.donated_at,
    record.createdAt,
    record.created_at,
  ];
  for (const value of candidates) {
    if (!value) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (DATE_ONLY_REGEX.test(trimmed)) {
        return trimmed;
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return pacificDateStringFrom(parsed);
      }
    } else if (value instanceof Date) {
      if (!Number.isNaN(value.getTime())) {
        return pacificDateStringFrom(value);
      }
    } else {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return pacificDateStringFrom(parsed);
      }
    }
  }
  return null;
};

const Donations = () => {
  const {
    DONATION_TYPES,
    addDonation,
    getRecentDonations,
    exportDataAsCSV,
    donationRecords,
    actionHistory,
    undoAction,
    setDonationRecords,
  } = useAppContext();

  const todayKey = todayPacificDateString();

  const [selectedDate, setSelectedDate] = useState(() => todayKey);
  const [form, setForm] = useState({
    type: DONATION_TYPES?.[0] || "Protein",
    itemName: "",
    trays: "",
    weightLbs: "",
    donor: "",
  });
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState(() => ({
    start: getDateKeyNDaysBefore(todayKey, 7) || todayKey,
    end: todayKey,
  }));
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({
    type: DONATION_TYPES?.[0] || "Protein",
    itemName: "",
    trays: 0,
    weightLbs: 0,
    donor: "",
  });

  const suggestions = useMemo(
    () => getRecentDonations(8),
    [getRecentDonations],
  );

  const dayRecords = useMemo(
    () =>
      (donationRecords || []).filter(
        (record) => deriveDonationDateKey(record) === selectedDate,
      ),
    [donationRecords, selectedDate],
  );

  const consolidated = useMemo(() => {
    const map = new Map();
    for (const record of dayRecords) {
      const key = `${record.itemName}|${record.donor}`;
      if (!map.has(key)) {
        map.set(key, {
          itemName: record.itemName,
          donor: record.donor,
          type: record.type,
          trays: 0,
          weightLbs: 0,
        });
      }
      const entry = map.get(key);
      entry.trays += Number(record.trays) || 0;
      entry.weightLbs += Number(record.weightLbs) || 0;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.itemName.localeCompare(b.itemName),
    );
  }, [dayRecords]);

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
    const donors = new Set();
    for (const record of dayRecords) {
      trays += Number(record.trays) || 0;
      weight += Number(record.weightLbs) || 0;
      if (record.donor) {
        const donorName = record.donor.trim();
        if (donorName) donors.add(donorName);
      }
    }
    return {
      entries: dayRecords.length,
      trays,
      weight,
      donors: donors.size,
    };
  }, [dayRecords]);

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
      .slice(0, 4);
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
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  }, [selectedDate]);

  const WeeklyDeltaIcon =
    weeklyComparison?.trend === "down"
      ? ArrowDownRight
      : weeklyComparison?.trend === "up"
        ? ArrowUpRight
        : Minus;

  const weeklyDeltaToneClass =
    weeklyComparison?.trend === "down"
      ? "text-rose-600 bg-rose-50 border border-rose-200"
      : weeklyComparison?.trend === "up"
        ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
        : "text-emerald-700/70 bg-emerald-50/70 border border-emerald-200/60";

  const weeklyDeltaText = (() => {
    if (!weeklyComparison) return "";
    if (weeklyComparison.deltaWeight === null) return "First week logged";
    if (Math.abs(weeklyComparison.deltaWeight) < 0.1)
      return "Even with last week";
    const weightPortion = `${weeklyComparison.deltaWeight > 0 ? "+" : ""}${formatNumber(
      weeklyComparison.deltaWeight,
      {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      },
    )} lbs`;
    const percentPortion =
      weeklyComparison.deltaPercent != null
        ? ` (${weeklyComparison.deltaPercent > 0 ? "+" : ""}${formatNumber(
            weeklyComparison.deltaPercent,
            {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            },
          )}%)`
        : "";
    return `${weightPortion}${percentPortion}`;
  })();

  const isTodaySelected = selectedDate === todayKey;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDate) {
      toast.error("Pick a date before logging a donation");
      return;
    }
    setLoading(true);
    try {
      await addDonation({
        type: form.type,
        itemName: form.itemName,
        trays: Number(form.trays || 0),
        weightLbs: Number(form.weightLbs || 0),
        donor: form.donor,
        date: selectedDate,
      });

      setForm((prev) => ({
        ...prev,
        trays: "",
        weightLbs: "",
      }));
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
        return parsed.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    return "—";
  };

  const recentWithUndo = useMemo(() => {
    const recs = [...dayRecords].sort(
      (a, b) => getRecordTimestamp(b) - getRecordTimestamp(a),
    );
    const findActionId = (recordId) =>
      (actionHistory || []).find(
        (action) =>
          action.type === "DONATION_ADDED" && action.data?.recordId === recordId,
      )?.id;
    return recs.map((record) => ({
      ...record,
      actionId: findActionId(record.id),
    }));
  }, [dayRecords, actionHistory]);

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
        "Weight (lbs)": record.weightLbs,
        Donor: record.donor,
      });
    }

    if (rows.length === 0) {
      toast.error("No donations found in the selected range.");
      return;
    }

    exportDataAsCSV(
      rows,
      `donations-${range.start}-to-${range.end}.csv`,
    );
    toast.success(
      `Exported ${formatNumber(rows.length)} donation record${rows.length === 1 ? "" : "s"}`,
    );
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <PackagePlus size={18} className="text-emerald-500" />
            <span>Donations for</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => shiftSelectedDate(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50"
              aria-label="Previous day"
            >
              <ArrowLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-[160px] rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={() => shiftSelectedDate(1)}
              disabled={isTodaySelected}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next day"
            >
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(todayKey)}
              disabled={isTodaySelected}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Today
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-emerald-600">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1">
            <CalendarDays size={14} className="text-emerald-500" />
            {selectedDateDisplay || "—"} (Pacific)
          </span>
          <span className="text-emerald-500">
            History updates as you adjust the date.
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  <PackagePlus size={20} className="text-emerald-500" /> Log a
                  donation
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Record what arrived, how much was delivered, and who dropped
                  it off. Everything saves instantly.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                {formatNumber(selectedStats.entries)} entr
                {selectedStats.entries === 1 ? "y" : "ies"} today
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-3 md:grid-cols-12"
            >
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm({ ...form, type: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  {DONATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-9">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Donation details
                </label>
                <input
                  type="text"
                  value={form.itemName}
                  onChange={(event) =>
                    setForm({ ...form, itemName: event.target.value })
                  }
                  placeholder="e.g., Chicken tikka masala, Bok choy, Pasta"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Trays
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.trays}
                  onChange={(event) =>
                    setForm({ ...form, trays: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.weightLbs}
                  onChange={(event) =>
                    setForm({ ...form, weightLbs: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Source (Donor)
                </label>
                <input
                  type="text"
                  value={form.donor}
                  onChange={(event) =>
                    setForm({ ...form, donor: event.target.value })
                  }
                  placeholder="e.g., Waymo, LinkedIn"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="md:col-span-12 flex items-center justify-start pt-1 md:justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
                >
                  <Save size={16} /> {loading ? "Saving…" : "Add donation"}
                </button>
              </div>
            </form>

            {suggestions.length > 0 && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  <Sparkles size={16} /> Quick fill from recent deliveries
                </div>
                <p className="mt-1 text-xs text-emerald-700/80">
                  Prefill item, donor, and type. Weight and trays stay editable.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.itemName}-${suggestion.donor}-${index}`}
                      type="button"
                      onClick={() => applySuggestion(suggestion)}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-700 transition hover:border-emerald-400"
                    >
                      {suggestion.itemName} · {suggestion.donor}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  <List size={20} className="text-emerald-500" /> Daily rollup
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Grouped by item and donor for {selectedDateDisplay || "—"}.
                </p>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-400">
                Same-day totals
              </span>
            </div>
            {consolidated.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
                No donations recorded for this date yet.
              </div>
            ) : (
              <div className="space-y-3">
                {consolidated.map((row, index) => (
                  <div
                    key={`${row.itemName}|${row.donor}|${index}`}
                    className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {row.itemName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.donor} · {row.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-semibold text-gray-900">
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="text-xs uppercase tracking-wide text-gray-500">
                          Trays
                        </span>
                        {formatNumber(row.trays, {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="text-xs uppercase tracking-wide text-gray-500">
                          Weight
                        </span>
                        {formatNumber(row.weightLbs, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        lbs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-xs text-gray-600">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1">
                <Scale size={14} className="text-emerald-500" />
                {selectedStats.entries > 0
                  ? `Avg ${formatNumber(selectedStats.weight / selectedStats.entries, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })} lbs per entry`
                  : "Average weight updates after first entry"}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1">
                Total trays: {formatNumber(selectedStats.trays, {
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1">
                Total weight: {formatNumber(selectedStats.weight, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{" "}
                lbs
              </div>
            </div>
          </div>

          <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  <History size={20} className="text-emerald-500" /> Recent
                  activity
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Inline edit or undo entries without leaving the dashboard.
                </p>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-400">
                {selectedDateDisplay || "Selected date"}
              </span>
            </div>
            {recentWithUndo.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
                No entries yet for this date.
              </div>
            ) : (
              <div className="space-y-4">
                {recentWithUndo.map((record) => {
                  const isEditing = editingId === record.id;
                  return (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                            <History size={14} /> {formatRecordTime(record)} · {record.type}
                          </div>
                          {isEditing ? (
                            <p className="text-sm font-medium text-gray-900">
                              Editing entry
                            </p>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-gray-900">
                                {record.itemName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.donor} · {formatNumber(record.weightLbs, {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })}{" "}
                                lbs
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const clean = {
                                    itemName: (editRow.itemName || "").trim(),
                                    donor: (editRow.donor || "").trim(),
                                    type: editRow.type,
                                    trays: Number(editRow.trays || 0),
                                    weightLbs: Number(editRow.weightLbs || 0),
                                  };
                                  if (!clean.itemName) {
                                    toast.error("Item is required");
                                    return;
                                  }
                                  if (!clean.donor) {
                                    toast.error("Donor is required");
                                    return;
                                  }
                                  if (!DONATION_TYPES.includes(clean.type)) {
                                    toast.error("Invalid type");
                                    return;
                                  }
                                  if (
                                    clean.trays < 0 ||
                                    clean.weightLbs < 0 ||
                                    Number.isNaN(clean.trays) ||
                                    Number.isNaN(clean.weightLbs)
                                  ) {
                                    toast.error("Enter valid numbers");
                                    return;
                                  }
                                  setDonationRecords((prev) =>
                                    prev.map((donation) =>
                                      donation.id === record.id
                                        ? {
                                            ...donation,
                                            ...clean,
                                            lastUpdated:
                                              new Date().toISOString(),
                                          }
                                        : donation,
                                    ),
                                  );
                                  toast.success("Donation updated");
                                  setEditingId(null);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                              >
                                <Save size={14} /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
                                onClick={() => {
                                  setEditingId(record.id);
                                  setEditRow({
                                    type: record.type,
                                    itemName: record.itemName,
                                    trays: record.trays,
                                    weightLbs: record.weightLbs,
                                    donor: record.donor,
                                  });
                                }}
                              >
                                <Edit3 size={14} /> Edit
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300"
                                onClick={async () => {
                                  if (!window.confirm("Delete this donation entry?"))
                                    return;
                                  if (record.actionId) {
                                    const ok = await undoAction(record.actionId);
                                    if (ok) {
                                      toast.success("Donation deleted");
                                      return;
                                    }
                                  }
                                  setDonationRecords((prev) =>
                                    prev.filter((donation) => donation.id !== record.id),
                                  );
                                  toast.success("Donation deleted");
                                }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                              <button
                                type="button"
                                disabled={!record.actionId}
                                onClick={async () => {
                                  if (record.actionId) {
                                    await undoAction(record.actionId);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Undo2 size={14} /> Undo
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
                          <div className="md:col-span-6">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Item
                            </label>
                            <input
                              type="text"
                              value={editRow.itemName}
                              onChange={(event) =>
                                setEditRow((prev) => ({
                                  ...prev,
                                  itemName: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                          <div className="md:col-span-6">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Donor
                            </label>
                            <input
                              type="text"
                              value={editRow.donor}
                              onChange={(event) =>
                                setEditRow((prev) => ({
                                  ...prev,
                                  donor: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                          <div className="md:col-span-4">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Type
                            </label>
                            <select
                              value={editRow.type}
                              onChange={(event) =>
                                setEditRow((prev) => ({
                                  ...prev,
                                  type: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            >
                              {DONATION_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-4">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Trays
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editRow.trays}
                              onChange={(event) =>
                                setEditRow((prev) => ({
                                  ...prev,
                                  trays: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                          <div className="md:col-span-4">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Weight (lbs)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editRow.weightLbs}
                              onChange={(event) =>
                                setEditRow((prev) => ({
                                  ...prev,
                                  weightLbs: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600 sm:grid-cols-4">
                          <div className="rounded-xl border border-white bg-white px-3 py-2 text-center shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Trays
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatNumber(record.trays, {
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white bg-white px-3 py-2 text-center shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Weight
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatNumber(record.weightLbs, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}{" "}
                              lbs
                            </p>
                          </div>
                          <div className="rounded-xl border border-white bg-white px-3 py-2 text-center shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Donor
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {record.donor}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white bg-white px-3 py-2 text-center shadow-sm">
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Item
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {record.itemName}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Daily insights
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Quick breakdown for {selectedDateDisplay || "—"}.
                </p>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-400">
                Snapshot
              </span>
            </div>
            {typeBreakdown.entries.some((entry) => entry.weight > 0) ? (
              <div className="space-y-3">
                {typeBreakdown.entries.map((entry) => (
                  <div
                    key={entry.type}
                    className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3"
                  >
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <span className="font-medium text-gray-900">
                        {entry.type}
                      </span>
                      <span className="text-gray-600">
                        {formatNumber(entry.weight, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        lbs
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${
                            typeBreakdown.maxWeight
                              ? Math.max(
                                  (entry.weight / typeBreakdown.maxWeight) *
                                    100,
                                  6,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
                Add donations to see the breakdown by type.
              </div>
            )}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-700">
                <Sparkles size={16} /> Highlights
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-emerald-700/70">Top donor today</p>
                  {topDonors.length === 0 ? (
                    <p className="text-sm font-semibold text-emerald-800">
                      Waiting for entries
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-emerald-800">
                      {topDonors[0].donor}
                    </p>
                  )}
                  {topDonors.length > 0 && (
                    <p className="text-xs text-emerald-700/70">
                      {formatNumber(topDonors[0].weight, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{" "}
                      lbs · {formatNumber(topDonors[0].trays, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      trays
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-emerald-700/70">
                    Rolling 30-day reach
                  </p>
                  {periodSnapshots.rollingMonth ? (
                    <p className="text-sm font-semibold text-emerald-800">
                      {formatNumber(periodSnapshots.rollingMonth.donors)} donors ·
                      {" "}
                      {formatNumber(periodSnapshots.rollingMonth.entries)} entries
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-emerald-800">
                      Log more days to unlock
                    </p>
                  )}
                  {periodSnapshots.rollingMonth && (
                    <p className="text-xs text-emerald-700/70">
                      {periodSnapshots.rollingMonth.startKey} →
                      {" "}
                      {periodSnapshots.rollingMonth.endKey}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-emerald-700/70">Week to date</p>
                  {weeklyComparison ? (
                    <>
                      <p className="text-sm font-semibold text-emerald-800">
                        {formatNumber(weeklyComparison.weekWeight, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })} lbs
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${weeklyDeltaToneClass}`}
                      >
                        <WeeklyDeltaIcon size={14} /> {weeklyDeltaText}
                      </span>
                      {periodSnapshots.currentWeek && (
                        <p className="mt-1 text-xs text-emerald-700/70">
                          {periodSnapshots.currentWeek.startKey} →
                          {" "}
                          {periodSnapshots.currentWeek.endKey}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-emerald-800">
                      Log a full week to compare
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <h4 className="text-xs uppercase tracking-wide text-gray-500">
                Donor leaderboard (today)
              </h4>
              {topDonors.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Donor details will appear as soon as entries are logged.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topDonors.map((donor) => (
                    <li
                      key={donor.donor}
                      className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {donor.donor}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(donor.entries)} entr
                          {donor.entries === 1 ? "y" : "ies"} · {formatNumber(donor.trays, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          trays
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {formatNumber(donor.weight, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{" "}
                        lbs
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                  <Download size={20} className="text-emerald-500" /> Exports &
                  archives
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Pull a CSV for finance, compliance, or pantry planning.
                </p>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-400">
                CSV
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Quick ranges
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickRangeOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => option.range && setRange({ ...option.range })}
                      disabled={!option.range}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Start
                  </label>
                  <input
                    type="date"
                    value={range.start}
                    onChange={(event) =>
                      setRange((prev) => ({ ...prev, start: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    End
                  </label>
                  <input
                    type="date"
                    value={range.end}
                    onChange={(event) =>
                      setRange((prev) => ({ ...prev, end: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>
              {rangePreview ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
                  {formatNumber(rangePreview.entries)} entr
                  {rangePreview.entries === 1 ? "y" : "ies"} ·
                  {" "}
                  {formatNumber(rangePreview.weight, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{" "}
                  lbs ·
                  {" "}
                  {formatNumber(rangePreview.trays, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  trays · {formatNumber(rangePreview.donors)} donors
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-500">
                  Choose a valid start and end date to preview totals.
                </div>
              )}
              <button
                type="button"
                onClick={exportDonationsRange}
                disabled={!rangePreview || rangePreview.entries === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                <Download size={16} /> Export donations ({range.start || "—"} →
                {" "}
                {range.end || "—"})
              </button>
              <p className="text-xs text-gray-500">
                Dates use Pacific time. Exports include item, donor, tray, and
                weight details.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Donations;
