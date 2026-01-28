import React, { useState, useMemo, useCallback } from "react";
import { Calendar, Download, FileText, Loader2, AlertCircle } from "lucide-react";
import { fetchMonthlyReportData } from "../../utils/monthlyReportQueries";
import { isSupabaseEnabled } from "../../supabaseClient";
import toast from "react-hot-toast";

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

/**
 * Get list of available months (past months only, up to current month)
 */
const getAvailableMonths = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const months = [];
  // Go back up to 24 months
  for (let i = 0; i < 24; i++) {
    let year = currentYear;
    let month = currentMonth - i;

    while (month <= 0) {
      month += 12;
      year -= 1;
    }

    months.push({ year, month, label: `${MONTH_NAMES[month - 1]} ${year}` });
  }

  return months;
};

/**
 * Calculate percentage with one decimal place
 */
const calcPercent = (value, total) => {
  if (!total || total === 0) return "0.0";
  return ((value / total) * 100).toFixed(1);
};

/**
 * Get top N locations sorted by count
 */
const getTopLocations = (locations, n = 5) => {
  return Object.entries(locations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
};

/**
 * Generate PDF using jsPDF
 */
const generatePDF = async (data, year, month) => {
  // Dynamically import jsPDF to avoid loading it if not needed
  let jsPDF;
  try {
    const jspdfModule = await import("jspdf");
    jsPDF = jspdfModule.jsPDF || jspdfModule.default;
  } catch (error) {
    toast.error("PDF library not installed. Please run: npm install jspdf");
    console.error("jsPDF import error:", error);
    return;
  }

  const doc = new jsPDF();
  const monthName = MONTH_NAMES[month - 1];
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Hope's Corner Monthly Report`, pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`${monthName} ${year}`, pageWidth / 2, 28, { align: "center" });

  // Service Statistics Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Service Statistics", 14, 42);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Table headers
  const startY = 50;
  const col1 = 14;
  const col2 = 100;
  const col3 = 140;
  const rowHeight = 8;

  doc.setFont("helvetica", "bold");
  doc.text("Service", col1, startY);
  doc.text("Month", col2, startY);
  doc.text("YTD", col3, startY);

  doc.setFont("helvetica", "normal");

  // Data rows
  const services = [
    { name: "Total Meals", month: data.month.meals.total, ytd: data.ytd.meals.total },
    { name: "On-Site Hot Meals", month: data.month.meals.guest, ytd: data.ytd.meals.guest },
    { name: "Bag Lunch", month: data.month.meals.lunchBag, ytd: data.ytd.meals.lunchBag },
    { name: "RV / Safe Park", month: data.month.meals.rv, ytd: data.ytd.meals.rv },
    { name: "Day Worker", month: data.month.meals.dayWorker, ytd: data.ytd.meals.dayWorker },
    { name: "Showers", month: data.month.showers, ytd: data.ytd.showers },
    { name: "Laundry", month: data.month.laundry, ytd: data.ytd.laundry },
    { name: "Bike Service", month: data.month.bicycles.service, ytd: data.ytd.bicycles.service },
    { name: "New Bicycles", month: data.month.bicycles.gifted, ytd: data.ytd.bicycles.gifted },
    { name: "Haircuts", month: data.month.haircuts, ytd: data.ytd.haircuts },
  ];

  let y = startY + rowHeight;
  services.forEach((service) => {
    doc.text(service.name, col1, y);
    doc.text(service.month.toLocaleString(), col2, y);
    doc.text(service.ytd.toLocaleString(), col3, y);
    y += rowHeight;
  });

  // Demographics Section
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Guest Demographics", 14, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  y += 10;

  doc.text(`Based on ${data.demographics.totalGuests.toLocaleString()} guests who received meals in ${monthName}`, 14, y);
  y += 12;

  // Housing Status
  doc.setFont("helvetica", "bold");
  doc.text("Housing Status:", 14, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  const totalGuests = data.demographics.totalGuests;
  const housingEntries = Object.entries(data.demographics.housingStatus).sort((a, b) => b[1] - a[1]);
  housingEntries.forEach(([status, count]) => {
    doc.text(`${status}: ${count.toLocaleString()} (${calcPercent(count, totalGuests)}%)`, 20, y);
    y += 6;
  });

  // Top Locations
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Top 5 Locations:", 14, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  const topLocations = getTopLocations(data.demographics.locations, 5);
  topLocations.forEach(([location, count]) => {
    doc.text(`${location}: ${count.toLocaleString()} (${calcPercent(count, totalGuests)}%)`, 20, y);
    y += 6;
  });

  // Age Groups
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Age Groups:", 14, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  const ageEntries = Object.entries(data.demographics.ageGroups).sort((a, b) => b[1] - a[1]);
  ageEntries.forEach(([ageGroup, count]) => {
    doc.text(`${ageGroup}: ${count.toLocaleString()} (${calcPercent(count, totalGuests)}%)`, 20, y);
    y += 6;
  });

  // Footer
  y = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, y);

  // Save the PDF
  doc.save(`hopes-corner-report-${year}-${String(month).padStart(2, "0")}.pdf`);
  toast.success("PDF downloaded successfully!");
};

const MonthlyReport = () => {
  const availableMonths = useMemo(() => getAvailableMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0]);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateReport = useCallback(async () => {
    if (!isSupabaseEnabled()) {
      toast.error("Supabase sync must be enabled to generate reports");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMonthlyReportData(selectedMonth.year, selectedMonth.month);
      setReportData(data);
      toast.success("Report generated successfully!");
    } catch (err) {
      console.error("Error generating report:", err);
      setError(err.message || "Failed to generate report");
      toast.error("Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  const handleDownloadPDF = useCallback(() => {
    if (!reportData) {
      toast.error("Please generate the report first");
      return;
    }
    generatePDF(reportData, selectedMonth.year, selectedMonth.month);
  }, [reportData, selectedMonth]);

  const numberFormatter = new Intl.NumberFormat("en-US");

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText size={20} className="text-purple-600" />
              Monthly Report Generator
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Generate board-ready reports with service statistics and guest demographics
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Month Selector */}
            <div className="relative">
              <select
                value={`${selectedMonth.year}-${selectedMonth.month}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split("-").map(Number);
                  setSelectedMonth({ year, month, label: `${MONTH_NAMES[month - 1]} ${year}` });
                  setReportData(null); // Clear previous report when month changes
                }}
                className="appearance-none pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {availableMonths.map((m) => (
                  <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>Generate Report</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Error generating report</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {reportData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Hope&apos;s Corner Monthly Report</h3>
                <p className="text-purple-100 mt-1">{selectedMonth.label}</p>
              </div>
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm transition"
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </div>

          {/* Service Statistics Table */}
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Service Statistics</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Service</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">{MONTH_NAMES[selectedMonth.month - 1]}</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">YTD {selectedMonth.year}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-purple-50 font-medium">
                    <td className="py-3 px-4 text-purple-900">Total Meals</td>
                    <td className="py-3 px-4 text-right text-purple-900 font-semibold">{numberFormatter.format(reportData.month.meals.total)}</td>
                    <td className="py-3 px-4 text-right text-purple-900 font-semibold">{numberFormatter.format(reportData.ytd.meals.total)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700 pl-8">On-Site Hot Meals</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.month.meals.guest)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.ytd.meals.guest)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700 pl-8">Bag Lunch</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.month.meals.lunchBag)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.ytd.meals.lunchBag)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700 pl-8">RV / Safe Park</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.month.meals.rv)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.ytd.meals.rv)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700 pl-8">Day Worker</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.month.meals.dayWorker)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.ytd.meals.dayWorker)}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-200">
                    <td className="py-3 px-4 text-gray-700">Showers</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.month.showers)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.ytd.showers)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700">Laundry</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.month.laundry)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.ytd.laundry)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700">Bike Service</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.month.bicycles.service)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.ytd.bicycles.service)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700">New Bicycles</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.month.bicycles.gifted)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.ytd.bicycles.gifted)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-700">Haircuts</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.month.haircuts)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{numberFormatter.format(reportData.ytd.haircuts)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Demographics Section */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Guest Demographics</h4>
            <p className="text-sm text-gray-600 mb-6">
              Based on {numberFormatter.format(reportData.demographics.totalGuests)} guests who received meals in {MONTH_NAMES[selectedMonth.month - 1]}
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Housing Status */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="font-semibold text-gray-800 mb-3">Housing Status</h5>
                <div className="space-y-2">
                  {Object.entries(reportData.demographics.housingStatus)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => (
                      <div key={status} className="flex justify-between text-sm">
                        <span className="text-gray-600">{status}</span>
                        <span className="font-medium text-gray-900">
                          {numberFormatter.format(count)} ({calcPercent(count, reportData.demographics.totalGuests)}%)
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Top 5 Locations */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="font-semibold text-gray-800 mb-3">Top 5 Locations</h5>
                <div className="space-y-2">
                  {getTopLocations(reportData.demographics.locations, 5).map(([location, count]) => (
                    <div key={location} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate mr-2">{location}</span>
                      <span className="font-medium text-gray-900 whitespace-nowrap">
                        {numberFormatter.format(count)} ({calcPercent(count, reportData.demographics.totalGuests)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Age Groups */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="font-semibold text-gray-800 mb-3">Age Groups</h5>
                <div className="space-y-2">
                  {Object.entries(reportData.demographics.ageGroups)
                    .sort((a, b) => b[1] - a[1])
                    .map(([ageGroup, count]) => (
                      <div key={ageGroup} className="flex justify-between text-sm">
                        <span className="text-gray-600">{ageGroup}</span>
                        <span className="font-medium text-gray-900">
                          {numberFormatter.format(count)} ({calcPercent(count, reportData.demographics.totalGuests)}%)
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-100 border-t border-gray-200 text-xs text-gray-500">
            Report generated on {new Date().toLocaleDateString()} | Data range: {reportData.dateRange.month.startDate} to {reportData.dateRange.month.endDate}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!reportData && !isLoading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Report Generated</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Select a month and click &quot;Generate Report&quot; to view service statistics and guest demographics.
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;
