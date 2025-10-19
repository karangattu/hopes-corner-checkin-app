import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  BarChart3,
  Calendar,
  Download,
  Home,
  FileText,
  Upload,
  Users,
} from "lucide-react";
import {
  AlertTriangle,
  ShieldAlert,
  Cloud,
  HardDrive,
  RefreshCcw,
  Database,
  ClipboardList,
  CheckCircle2,
  Utensils,
  ShowerHead,
  WashingMachine,
} from "lucide-react";
import Donations from "../../components/Donations";
import { useAppContext } from "../../context/useAppContext";
import GuestBatchUpload from "../../components/GuestBatchUpload";
import AttendanceBatchUpload from "../../components/AttendanceBatchUpload";
import OverviewDashboard from "../../components/admin/OverviewDashboard";
import MealReport from "../../components/admin/MealReport";
import DateRangeTrendChart from "../../components/charts/DateRangeTrendChart";
import SupabaseSyncToggle from "../../components/SupabaseSyncToggle";
import Selectize from "../../components/Selectize";
import { animated as Animated } from "@react-spring/web";
import { useFadeInUp, SpringIcon } from "../../utils/animations";
import { todayPacificDateString } from "../../utils/date";

const Dashboard = () => {
  const {
    getTodayMetrics,
    getDateRangeMetrics,
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
  } = useAppContext();

  const [activeSection, setActiveSection] = useState("overview");

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const sevenAgo = new Date(today);
    sevenAgo.setDate(today.getDate() - 7);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(sevenAgo);
  });

  const [endDate, setEndDate] = useState(() => todayPacificDateString());

  const [metrics, setMetrics] = useState(() => ({
    today: getTodayMetrics(),
    period: null,
  }));

  const [selectedExportGuest, setSelectedExportGuest] = useState("");
  const [selectedPrograms, setSelectedPrograms] = useState(["meals", "showers", "laundry"]);

  const handleDateRangeSearch = () => {
    const periodMetrics = getDateRangeMetrics(startDate, endDate);
    setMetrics({
      ...metrics,
      period: periodMetrics,
    });
  };

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
    const laundry = laundryRecords.filter((r) => String(r.guestId) === guestKey);

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
    const periodMetrics =
      metrics.period || getDateRangeMetrics(startDate, endDate);

    if (!periodMetrics || !Array.isArray(periodMetrics.dailyBreakdown)) {
      toast.error("No metrics available for the selected range");
      return;
    }

    if (!metrics.period) {
      setMetrics((prev) => ({ ...prev, period: periodMetrics }));
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

    exportDataAsCSV(
      metricsData,
      `hopes-corner-metrics-${startDate}-to-${endDate}.csv`,
    );
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

  const headerAnim = useFadeInUp();
  const overviewGridAnim = useFadeInUp();
  const monthGridAnim = useFadeInUp();
  const yearGridAnim = useFadeInUp();
  const reportsChartAnim = useFadeInUp();

  const sections = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "meal-report", label: "Meal Report", icon: Utensils },
    { id: "batch-upload", label: "Batch Upload", icon: Upload },
    { id: "donations", label: "Donations", icon: FileText },
    { id: "export", label: "Data Export", icon: Download },
    { id: "system", label: "System", icon: ShieldAlert },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverviewSection();
      case "reports":
        return renderReportsSection();
      case "meal-report":
        return renderMealReportSection();
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

  const toggleProgram = (programValue) => {
    setSelectedPrograms(prev =>
      prev.includes(programValue)
        ? prev.filter(p => p !== programValue)
        : [...prev, programValue]
    );
  };

  const renderReportsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
          <Calendar size={18} /> Date Range Reports
        </h2>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={handleDateRangeSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Generate Report
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Programs to Display
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "meals", label: "Meals", icon: Utensils },
              { value: "showers", label: "Showers", icon: ShowerHead },
              { value: "laundry", label: "Laundry", icon: WashingMachine },
              { value: "haircuts", label: "Haircuts", icon: Users },
              { value: "holidays", label: "Holidays", icon: Calendar },
              { value: "bicycles", label: "Bicycles", icon: Users },
            ].map(program => {
              const Icon = program.icon;
              return (
                <button
                  key={program.value}
                  onClick={() => toggleProgram(program.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                    selectedPrograms.includes(program.value)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <Icon size={16} />
                  {program.label}
                </button>
              );
            })}
          </div>
          {selectedPrograms.length === 0 && (
            <p className="text-red-600 text-sm mt-2">Please select at least one program type</p>
          )}
        </div>

        {metrics.period && (
          <div className="mt-4 border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              {selectedPrograms.includes('meals') && (
                <div className="bg-gray-50 rounded p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Utensils size={16} /> Meals Served
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.period.mealsServed}
                  </div>
                </div>
              )}

              {selectedPrograms.includes('showers') && (
                <div className="bg-gray-50 rounded p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <ShowerHead size={16} /> Showers Booked
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.period.showersBooked}
                  </div>
                </div>
              )}

              {selectedPrograms.includes('laundry') && (
                <div className="bg-gray-50 rounded p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <WashingMachine size={16} /> Laundry Loads
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.period.laundryLoads}
                  </div>
                </div>
              )}

              {selectedPrograms.includes('haircuts') && (
                <div className="bg-gray-50 rounded p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Users size={16} /> Haircuts
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.period.haircuts || 0}
                  </div>
                </div>
              )}

              {selectedPrograms.includes('holidays') && (
                <div className="bg-gray-50 rounded p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Calendar size={16} /> Holidays
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.period.holidays || 0}
                  </div>
                </div>
              )}

              {selectedPrograms.includes('bicycles') && (
                <div className="bg-gray-50 rounded p-3">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Users size={16} /> Bicycles
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.period.bicycles || 0}
                  </div>
                </div>
              )}
            </div>
            
            {selectedPrograms.length > 0 && (
              <Animated.div
                style={reportsChartAnim}
                className="mt-4 will-change-transform"
              >
                <DateRangeTrendChart
                  days={metrics.period.dailyBreakdown}
                  selectedPrograms={selectedPrograms}
                />
              </Animated.div>
            )}

            <div className="mt-4 mb-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Date</th>
                    {selectedPrograms.includes('meals') && <th className="px-4 py-2 text-right">Meals</th>}
                    {selectedPrograms.includes('showers') && <th className="px-4 py-2 text-right">Showers</th>}
                    {selectedPrograms.includes('laundry') && <th className="px-4 py-2 text-right">Laundry</th>}
                    {selectedPrograms.includes('haircuts') && <th className="px-4 py-2 text-right">Haircuts</th>}
                    {selectedPrograms.includes('holidays') && <th className="px-4 py-2 text-right">Holidays</th>}
                    {selectedPrograms.includes('bicycles') && <th className="px-4 py-2 text-right">Bicycles</th>}
                  </tr>
                </thead>
                <tbody>
                  {metrics.period.dailyBreakdown
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((day) => (
                      <tr key={day.date} className="border-b">
                        <td className="px-4 py-2">
                          {new Date(day.date).toLocaleDateString()}
                        </td>
                        {selectedPrograms.includes('meals') && <td className="px-4 py-2 text-right">{day.meals}</td>}
                        {selectedPrograms.includes('showers') && <td className="px-4 py-2 text-right">{day.showers}</td>}
                        {selectedPrograms.includes('laundry') && <td className="px-4 py-2 text-right">{day.laundry}</td>}
                        {selectedPrograms.includes('haircuts') && <td className="px-4 py-2 text-right">{day.haircuts || 0}</td>}
                        {selectedPrograms.includes('holidays') && <td className="px-4 py-2 text-right">{day.holidays || 0}</td>}
                        {selectedPrograms.includes('bicycles') && <td className="px-4 py-2 text-right">{day.bicycles || 0}</td>}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={exportMetricsData}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              <Download size={16} /> Export Date Range Report
            </button>
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Supplies given in range
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["tshirt", "sleeping_bag", "backpack"].map((item) => {
                  const count = (itemGivenRecords || []).filter((r) => {
                    const d = new Date(r.date).toISOString();
                    return (
                      r.item === item &&
                      d >= new Date(startDate).toISOString() &&
                      d <= new Date(endDate).toISOString()
                    );
                  }).length;
                  const label =
                    item === "tshirt"
                      ? "T-Shirts"
                      : item === "sleeping_bag"
                        ? "Sleeping Bags"
                        : "Backpacks";
                  return (
                    <div key={item} className="bg-gray-50 rounded p-3">
                      <div className="text-gray-600 text-sm">{label}</div>
                      <div className="text-2xl font-bold">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
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

  const renderExportSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
          <FileText size={18} /> Data Export Options
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={exportGuests}
            className="flex items-center justify-center gap-2 bg-blue-100 text-blue-800 px-4 py-3 rounded hover:bg-blue-200 transition-colors"
          >
            <Users size={18} />
            <span>Export Guest List</span>
          </button>

          <button
            onClick={exportServiceData}
            className="flex items-center justify-center gap-2 bg-green-100 text-green-800 px-4 py-3 rounded hover:bg-green-200 transition-colors"
          >
            <FileText size={18} />
            <span>Export Service Records</span>
          </button>

          <button
            onClick={exportDonations}
            className="flex items-center justify-center gap-2 bg-pink-100 text-pink-800 px-4 py-3 rounded hover:bg-pink-200 transition-colors"
          >
            <FileText size={18} />
            <span>Export Donations</span>
          </button>
          <button
            onClick={exportSuppliesData}
            className="flex items-center justify-center gap-2 bg-amber-100 text-amber-800 px-4 py-3 rounded hover:bg-amber-200 transition-colors"
          >
            <FileText size={18} />
            <span>Export Supplies Given</span>
          </button>

          <button
            onClick={exportMetricsData}
            className="flex items-center justify-center gap-2 bg-purple-100 text-purple-800 px-4 py-3 rounded hover:bg-purple-200 transition-colors"
          >
            <BarChart3 size={18} />
            <span>Export Current Metrics</span>
          </button>
        </div>

        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">
            Export a single guest's service history
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <Selectize
              options={guests.map((g) => ({
                value: String(g.id),
                label: `${g.name} (${g.guestId || "-"})`,
              }))}
              value={selectedExportGuest}
              onChange={(val) => setSelectedExportGuest(val || "")}
              placeholder="Search guest by name or ID…"
              size="sm"
              searchable
              className="flex-1"
            />
            <button
              type="button"
              onClick={() =>
                selectedExportGuest &&
                exportGuestMetrics(selectedExportGuest)
              }
              disabled={!selectedExportGuest}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors border disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            >
              <Download size={16} />
              Export History
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDonationsSection = () => (
    <div className="space-y-6">
      <Donations />
    </div>
  );

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
      bicycles: bicycleRecords?.length || 0,
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
