'use client';

import React, { useMemo, useCallback } from 'react';
import { Download, MapPin, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

// CSV value escape utility
function toCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const strValue = String(value);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}

interface Guest {
  id: string;
  location?: string;
  createdAt?: string | Date;
}

interface AttendanceRecord {
  id?: string;
  date?: string | Date;
  guest_id?: string;
  guestId?: string;
}

interface GuestsByCityReportProps {
  guests: Guest[];
  mealRecords?: AttendanceRecord[];
  showerRecords?: AttendanceRecord[];
  laundryRecords?: AttendanceRecord[];
  bicycleRecords?: AttendanceRecord[];
}

interface ReportRow {
  city: string;
  total: number;
  [key: string]: string | number;
}

interface ReportData {
  rows: ReportRow[];
  totals: ReportRow;
  years: number[];
  allCities: string[];
}

export function GuestsByCityReport({
  guests,
  mealRecords = [],
  showerRecords = [],
  laundryRecords = [],
  bicycleRecords = [],
}: GuestsByCityReportProps) {
  const reportData = useMemo<ReportData>(() => {
    const allAttendanceRecords = [
      ...mealRecords,
      ...showerRecords,
      ...laundryRecords,
      ...bicycleRecords,
    ];

    const guestCityMap = new Map<string, string>();
    guests.forEach((guest) => {
      if (guest?.id && guest.location) {
        guestCityMap.set(String(guest.id), guest.location);
      }
    });

    const guestsByYearCity = new Map<string, number>();
    const guestYearCityCombinations = new Set<string>();
    const allYears = new Set<number>();

    allAttendanceRecords.forEach((record) => {
      if (!record?.date) return;

      const attendanceDate = new Date(record.date);
      const year = attendanceDate.getFullYear();
      const guestId = String(record.guest_id || record.guestId || '');

      if (!guestId || !guestCityMap.has(guestId)) return;

      const city = guestCityMap.get(guestId)!;
      allYears.add(year);

      const combination = `${guestId}|${year}|${city}`;
      if (!guestYearCityCombinations.has(combination)) {
        guestYearCityCombinations.add(combination);
        const key = `${year}|${city}`;
        guestsByYearCity.set(key, (guestsByYearCity.get(key) || 0) + 1);
      }
    });

    // Fallback to guest creation dates if no attendance
    if (allYears.size === 0) {
      guests.forEach((guest) => {
        if (!guest?.location) return;
        const createdAt = guest.createdAt ? new Date(guest.createdAt) : new Date();
        const year = createdAt.getFullYear();
        const city = guest.location;

        allYears.add(year);
        const key = `${year}|${city}`;
        guestsByYearCity.set(key, (guestsByYearCity.get(key) || 0) + 1);
      });
    }

    const sortedYears = Array.from(allYears).sort((a, b) => a - b);
    const cityTotals = new Map<number, number>();
    const allCities = new Set<string>();

    guestsByYearCity.forEach((_, key) => {
      const [, city] = key.split('|');
      allCities.add(city);
    });

    const sortedCities = Array.from(allCities).sort();
    const aggregatedData: ReportRow[] = [];

    sortedCities.forEach((city) => {
      const row: ReportRow = { city: city || 'Unknown', total: 0 };
      let cityTotal = 0;

      sortedYears.forEach((year) => {
        const key = `${year}|${city}`;
        const count = guestsByYearCity.get(key) || 0;
        row[`year_${year}`] = count;
        cityTotal += count;

        if (!cityTotals.has(year)) cityTotals.set(year, 0);
        cityTotals.set(year, (cityTotals.get(year) || 0) + count);
      });

      row.total = cityTotal;
      aggregatedData.push(row);
    });

    const totalsRow: ReportRow = { city: 'TOTAL', total: 0 };
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
  }, [guests, mealRecords, showerRecords, laundryRecords, bicycleRecords]);

  const handleExportCSV = useCallback(() => {
    if (!reportData.rows || reportData.rows.length === 0) {
      toast.error('No guest data available to export');
      return;
    }

    const csvRows: string[] = [];
    const headers = ['City', ...reportData.years.map(String), 'Total'];
    csvRows.push(headers.map(toCsvValue).join(','));

    reportData.rows.forEach((row) => {
      const values = [
        row.city,
        ...reportData.years.map((year) => String(row[`year_${year}`] || 0)),
        String(row.total || 0),
      ];
      csvRows.push(values.map(toCsvValue).join(','));
    });

    const totalsValues = [
      reportData.totals.city,
      ...reportData.years.map((year) => String(reportData.totals[`year_${year}`] || 0)),
      String(reportData.totals.total || 0),
    ];
    csvRows.push(totalsValues.map(toCsvValue).join(','));

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 10);

    link.setAttribute('href', url);
    link.setAttribute('download', `guests-by-city-report-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Guests by city report exported to CSV');
  }, [reportData]);

  const totalGuests = reportData.totals.total;
  const totalCities = reportData.allCities.length;
  const yearCount = reportData.years.length;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MapPin className="text-indigo-600 dark:text-indigo-400" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Guests by City Report
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
            <div className="rounded-lg border border-indigo-100 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-900/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                <TrendingUp size={16} aria-hidden="true" />
                <span>Total Guests</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {totalGuests.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Across all cities and years
              </p>
            </div>

            <div className="rounded-lg border border-indigo-100 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-900/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                <MapPin size={16} aria-hidden="true" />
                <span>Unique Cities</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {totalCities}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Number of different cities recorded
              </p>
            </div>

            <div className="rounded-lg border border-indigo-100 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-900/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                <span>Year Range</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {yearCount}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {reportData.years.length > 0
                  ? `${reportData.years[0]} - ${reportData.years[reportData.years.length - 1]}`
                  : 'No data'}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        {reportData.rows.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">
                    City
                  </th>
                  {reportData.years.map((year) => (
                    <th
                      key={`year-${year}`}
                      className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100 bg-blue-50 dark:bg-blue-900/30"
                    >
                      {year}
                    </th>
                  ))}
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row, idx) => (
                  <tr key={`row-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                      {row.city}
                    </td>
                    {reportData.years.map((year) => (
                      <td
                        key={`cell-${idx}-${year}`}
                        className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300"
                      >
                        {((row[`year_${year}`] as number) || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right font-semibold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {(row.total || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="bg-gray-200 dark:bg-gray-600">
                  <td className="border border-gray-300 dark:border-gray-500 px-4 py-2 font-bold text-gray-900 dark:text-gray-100">
                    {reportData.totals.city}
                  </td>
                  {reportData.years.map((year) => (
                    <td
                      key={`total-${year}`}
                      className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-right font-bold bg-blue-200 dark:bg-blue-800 text-gray-900 dark:text-gray-100"
                    >
                      {((reportData.totals[`year_${year}`] as number) || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="border border-gray-300 dark:border-gray-500 px-4 py-2 text-right font-bold bg-gray-300 dark:bg-gray-500 text-gray-900 dark:text-gray-100">
                    {(reportData.totals.total || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 p-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400">No guest data available to display</p>
          </div>
        )}

        {/* Notes */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
          <p className="font-semibold mb-2">About this report:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>
              <strong>City:</strong> Guest&apos;s location field from their check-in record
            </li>
            <li>
              <strong>Year:</strong> Determined from the guest&apos;s creation date
            </li>
            <li>
              <strong>Count:</strong> Number of unique guests from each city per year
            </li>
            <li>
              <strong>Total:</strong> Sum across all years for each city, and grand total
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GuestsByCityReport;
