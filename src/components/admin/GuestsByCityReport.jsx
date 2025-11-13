import React, { useMemo } from "react";
import { useAppContext } from "../../context/useAppContext";
import { Download, MapPin, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { toCsvValue } from "../../pages/guest/services/utils";

const GuestsByCityReport = () => {
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
    holidayRecords,
    haircutRecords,
  } = useAppContext();

  // Process guests data to aggregate by city and year based on attendance records
  const reportData = useMemo(() => {
    // Combine all attendance records
    const allAttendanceRecords = [
      ...(mealRecords || []),
      ...(rvMealRecords || []),
      ...(shelterMealRecords || []),
      ...(unitedEffortMealRecords || []),
      ...(extraMealRecords || []),
      ...(dayWorkerMealRecords || []),
      ...(lunchBagRecords || []),
      ...(showerRecords || []),
      ...(laundryRecords || []),
      ...(bicycleRecords || []),
      ...(holidayRecords || []),
      ...(haircutRecords || []),
    ];

    // Build a map of guest IDs to their cities
    const guestCityMap = new Map();
    guests.forEach((guest) => {
      if (guest && guest.id && guest.location) {
        guestCityMap.set(String(guest.id), guest.location);
      }
    });

    // Group guests by year and city based on attendance records
    const guestsByYearCity = new Map();
    const guestYearCityCombinations = new Set(); // Track unique guest-year-city combinations
    const allYears = new Set();

    allAttendanceRecords.forEach((record) => {
      if (!record || !record.date) return;

      const attendanceDate = new Date(record.date);
      const year = attendanceDate.getFullYear();
      const guestId = String(record.guest_id || record.guestId || "");

      // Skip if no guest ID or guest not found
      if (!guestId || !guestCityMap.has(guestId)) return;

      const city = guestCityMap.get(guestId);
      allYears.add(year);

      // Track unique guest-year-city combinations to avoid double-counting
      const combination = `${guestId}|${year}|${city}`;
      if (!guestYearCityCombinations.has(combination)) {
        guestYearCityCombinations.add(combination);

        // Increment count for this year-city combination
        const key = `${year}|${city}`;
        guestsByYearCity.set(key, (guestsByYearCity.get(key) || 0) + 1);
      }
    });

    // If no attendance records found, fall back to guest creation dates
    if (allYears.size === 0) {
      guests.forEach((guest) => {
        if (!guest || !guest.location) return;

        const createdAt = guest.createdAt ? new Date(guest.createdAt) : new Date();
        const year = createdAt.getFullYear();
        const city = guest.location;

        allYears.add(year);

        const key = `${year}|${city}`;
        guestsByYearCity.set(key, (guestsByYearCity.get(key) || 0) + 1);
      });
    }

    // Sort years in ascending order
    const sortedYears = Array.from(allYears).sort((a, b) => a - b);
    console.log('GuestsByCityReport - Guests found:', guestCityMap.size);

    // Build aggregated data structure
    const aggregatedData = [];
    const cityTotals = new Map(); // For totals row

    // Collect all cities across all years
    const allCities = new Set();
    guestsByYearCity.forEach((_, key) => {
      const [, city] = key.split("|");
      allCities.add(city);
    });

    // Sort cities alphabetically
    const sortedCities = Array.from(allCities).sort();

    // Build rows with data for each city and year
    sortedCities.forEach((city) => {
      const row = {
        city: city || "Unknown",
      };

      let cityTotal = 0;

      sortedYears.forEach((year) => {
        const key = `${year}|${city}`;
        const count = guestsByYearCity.get(key) || 0;
        row[`year_${year}`] = count;
        cityTotal += count;

        // Add to yearly totals
        if (!cityTotals.has(year)) {
          cityTotals.set(year, 0);
        }
        cityTotals.set(year, cityTotals.get(year) + count);
      });

      row.total = cityTotal;
      aggregatedData.push(row);
    });

    // Add totals row
    const totalsRow = {
      city: "TOTAL",
    };

    let grandTotal = 0;
    sortedYears.forEach((year) => {
      const yearTotal = cityTotals.get(year) || 0;
      totalsRow[`year_${year}`] = yearTotal;
      grandTotal += yearTotal;
    });
    totalsRow.total = grandTotal;

    return {
      rows: aggregatedData,
      totals: totalsRow,
      years: sortedYears,
      allCities: sortedCities,
    };
  }, [
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
    holidayRecords,
    haircutRecords,
  ]);

  // Convert report data to CSV format and export
  const handleExportCSV = () => {
    if (!reportData.rows || reportData.rows.length === 0) {
      toast.error("No guest data available to export");
      return;
    }

    const csvRows = [];

    // Header row
    const headers = ["City"];
    reportData.years.forEach((year) => {
      headers.push(String(year));
    });
    headers.push("Total");

    csvRows.push(headers.map(toCsvValue).join(","));

    // Data rows
    reportData.rows.forEach((row) => {
      const values = [row.city];
      reportData.years.forEach((year) => {
        values.push(String(row[`year_${year}`] || 0));
      });
      values.push(String(row.total || 0));

      csvRows.push(values.map(toCsvValue).join(","));
    });

    // Totals row
    const totalsValues = [reportData.totals.city];
    reportData.years.forEach((year) => {
      totalsValues.push(String(reportData.totals[`year_${year}`] || 0));
    });
    totalsValues.push(String(reportData.totals.total || 0));

    csvRows.push(totalsValues.map(toCsvValue).join(","));

    // Generate CSV content and export
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `guests-by-city-report-${timestamp}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Guests by city report exported to CSV");
  };

  const totalGuests = reportData.totals.total;
  const totalCities = reportData.allCities.length;
  const yearCount = reportData.years.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MapPin className="text-indigo-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 font-heading">
                Guests by City Report
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Aggregated count of guests by city for each year
              </p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={reportData.rows.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Summary Stats */}
        {totalGuests > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                <TrendingUp size={16} aria-hidden="true" />
                <span>Total Guests</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {totalGuests.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Across all cities and years
              </p>
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                <MapPin size={16} aria-hidden="true" />
                <span>Unique Cities</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {totalCities}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Number of different cities recorded
              </p>
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                <span>Year Range</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {yearCount}
              </p>
              <p className="mt-1 text-xs text-gray-600">
                {reportData.years.length > 0
                  ? `${reportData.years[0]} - ${reportData.years[reportData.years.length - 1]}`
                  : "No data"}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        {reportData.rows.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                    City
                  </th>
                  {reportData.years.map((year) => (
                    <th
                      key={`year-${year}`}
                      className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900 bg-blue-50"
                    >
                      {year}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-900 bg-gray-50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row, idx) => (
                  <tr key={`row-${idx}`} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 font-medium text-gray-900">
                      {row.city}
                    </td>
                    {reportData.years.map((year) => (
                      <td
                        key={`cell-${idx}-${year}`}
                        className="border border-gray-300 px-4 py-2 text-right bg-blue-50"
                      >
                        {(row[`year_${year}`] || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-4 py-2 text-right font-semibold bg-gray-50">
                      {(row.total || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="bg-gray-200">
                  <td className="border border-gray-300 px-4 py-2 font-bold text-gray-900">
                    {reportData.totals.city}
                  </td>
                  {reportData.years.map((year) => (
                    <td
                      key={`total-${year}`}
                      className="border border-gray-300 px-4 py-2 text-right font-bold bg-blue-200"
                    >
                      {(reportData.totals[`year_${year}`] || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-4 py-2 text-right font-bold bg-gray-300">
                    {(reportData.totals.total || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-600">No guest data available to display</p>
          </div>
        )}

        {/* Notes */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">About this report:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>
              <strong>City:</strong> Guest's location field from their check-in
              record
            </li>
            <li>
              <strong>Year:</strong> Determined from the guest's creation date
            </li>
            <li>
              <strong>Count:</strong> Number of unique guests from each city per
              year
            </li>
            <li>
              <strong>Total:</strong> Sum across all years for each city, and
              grand total for all guests
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GuestsByCityReport;
