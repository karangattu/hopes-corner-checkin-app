import React, { useMemo, useCallback } from "react";
import { useAppContext } from "../../context/useAppContext";
import { Download, Calendar } from "lucide-react";
import toast from "react-hot-toast";

/**
 * MonthlySummaryReport - Comprehensive monthly meal statistics table
 *
 * Displays a breakdown of meals by month and type for 2025, including:
 * - Weekday-specific guest meals (Mon/Wed/Sat/Fri)
 * - Special meal types (Day Worker, Extra, RV, Lunch Bags)
 * - Calculated totals and onsite meal counts
 */
const MonthlySummaryReport = () => {
  const {
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    exportDataAsCSV,
  } = useAppContext();

  // Helper: Get day of week from date string (0=Sunday, 1=Monday, ..., 6=Saturday)
  const getDayOfWeek = useCallback((dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.getDay();
  }, []);

  // Helper: Filter records by year, month, and optionally specific days
  const filterRecords = useCallback((records, year, month, daysOfWeek = null) => {
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
  }, [getDayOfWeek]);

  // Helper: Sum quantities from filtered records
  const sumQuantities = (records) => {
    return records.reduce((sum, record) => sum + (record.count || 0), 0);
  };

  // Calculate monthly data for all months from Jan 2025 to current month
  const monthlyData = useMemo(() => {
    const currentDate = new Date();
    const currentYear = 2025;
    const currentMonth = currentDate.getFullYear() === currentYear ? currentDate.getMonth() : 11;

    const months = [];
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Generate data for each month from January to current month
    for (let month = 0; month <= currentMonth; month++) {
      const monthName = monthNames[month];

      // Guest meals by specific days
      const mondayMeals = sumQuantities(filterRecords(mealRecords, currentYear, month, [1]));
      const wednesdayMeals = sumQuantities(filterRecords(mealRecords, currentYear, month, [3]));
      const saturdayMeals = sumQuantities(filterRecords(mealRecords, currentYear, month, [6]));
      const fridayMeals = sumQuantities(filterRecords(mealRecords, currentYear, month, [5]));

      // Special meal types (all days)
      const dayWorkerMeals = sumQuantities(filterRecords(dayWorkerMealRecords, currentYear, month));
      const extraMeals = sumQuantities(filterRecords(extraMealRecords, currentYear, month));

      // RV meals split by day groups
      const rvWedSat = sumQuantities(filterRecords(rvMealRecords, currentYear, month, [3, 6]));
      const rvMonThu = sumQuantities(filterRecords(rvMealRecords, currentYear, month, [1, 4]));

      // Lunch bags
      const lunchBags = sumQuantities(filterRecords(lunchBagRecords, currentYear, month));

      // Shelter and United Effort meals (for total hot meals)
      const shelterMeals = sumQuantities(filterRecords(shelterMealRecords, currentYear, month));
      const unitedEffortMeals = sumQuantities(filterRecords(unitedEffortMealRecords, currentYear, month));

      // Calculated totals
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

      // Onsite hot meals = (guest meals + extra meals) on Mon/Wed/Sat/Fri
      const onsiteMondayMeals = mondayMeals + sumQuantities(filterRecords(extraMealRecords, currentYear, month, [1]));
      const onsiteWednesdayMeals = wednesdayMeals + sumQuantities(filterRecords(extraMealRecords, currentYear, month, [3]));
      const onsiteSaturdayMeals = saturdayMeals + sumQuantities(filterRecords(extraMealRecords, currentYear, month, [6]));
      const onsiteFridayMeals = fridayMeals + sumQuantities(filterRecords(extraMealRecords, currentYear, month, [5]));
      const onsiteHotMeals = onsiteMondayMeals + onsiteWednesdayMeals + onsiteSaturdayMeals + onsiteFridayMeals;

      months.push({
        month: monthName,
        mondayMeals,
        wednesdayMeals,
        saturdayMeals,
        fridayMeals,
        dayWorkerMeals,
        extraMeals,
        rvWedSat,
        rvMonThu,
        lunchBags,
        totalHotMeals,
        totalWithLunchBags,
        onsiteHotMeals,
      });
    }

    // Calculate totals row
    const totals = {
      month: "TOTAL",
      mondayMeals: months.reduce((sum, m) => sum + m.mondayMeals, 0),
      wednesdayMeals: months.reduce((sum, m) => sum + m.wednesdayMeals, 0),
      saturdayMeals: months.reduce((sum, m) => sum + m.saturdayMeals, 0),
      fridayMeals: months.reduce((sum, m) => sum + m.fridayMeals, 0),
      dayWorkerMeals: months.reduce((sum, m) => sum + m.dayWorkerMeals, 0),
      extraMeals: months.reduce((sum, m) => sum + m.extraMeals, 0),
      rvWedSat: months.reduce((sum, m) => sum + m.rvWedSat, 0),
      rvMonThu: months.reduce((sum, m) => sum + m.rvMonThu, 0),
      lunchBags: months.reduce((sum, m) => sum + m.lunchBags, 0),
      totalHotMeals: months.reduce((sum, m) => sum + m.totalHotMeals, 0),
      totalWithLunchBags: months.reduce((sum, m) => sum + m.totalWithLunchBags, 0),
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
  ]);

  // Export data to CSV
  const handleExportCSV = () => {
    const csvData = [
      ...monthlyData.months.map(row => ({
        Month: row.month,
        "Monday": row.mondayMeals,
        "Wednesday": row.wednesdayMeals,
        "Saturday": row.saturdayMeals,
        "Friday": row.fridayMeals,
        "Day Worker Center": row.dayWorkerMeals,
        "Extra Meals": row.extraMeals,
        "RV Wed+Sat": row.rvWedSat,
        "RV Mon+Thu": row.rvMonThu,
        "Lunch Bags": row.lunchBags,
        "TOTAL HOT MEALS": row.totalHotMeals,
        "Total w/ Lunch Bags": row.totalWithLunchBags,
        "Onsite Hot Meals": row.onsiteHotMeals,
      })),
      // Add totals row
      {
        Month: monthlyData.totals.month,
        "Monday": monthlyData.totals.mondayMeals,
        "Wednesday": monthlyData.totals.wednesdayMeals,
        "Saturday": monthlyData.totals.saturdayMeals,
        "Friday": monthlyData.totals.fridayMeals,
        "Day Worker Center": monthlyData.totals.dayWorkerMeals,
        "Extra Meals": monthlyData.totals.extraMeals,
        "RV Wed+Sat": monthlyData.totals.rvWedSat,
        "RV Mon+Thu": monthlyData.totals.rvMonThu,
        "Lunch Bags": monthlyData.totals.lunchBags,
        "TOTAL HOT MEALS": monthlyData.totals.totalHotMeals,
        "Total w/ Lunch Bags": monthlyData.totals.totalWithLunchBags,
        "Onsite Hot Meals": monthlyData.totals.onsiteHotMeals,
      },
    ];

    exportDataAsCSV(csvData, `monthly-summary-2025-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Monthly summary exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Monthly Summary Report - 2025
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
            Export to CSV
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">
                  Month
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-gray-100">
                  Monday
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-gray-100">
                  Wednesday
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-gray-100">
                  Saturday
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-blue-50">
                  Friday
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Day Worker Center
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Extra Meals
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-orange-50">
                  RV Wed+Sat
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-orange-50">
                  RV Mon+Thu
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-purple-50">
                  Lunch Bags
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  TOTAL HOT MEALS
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Total w/ Lunch Bags
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Onsite Hot Meals
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Month rows */}
              {monthlyData.months.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">
                    {row.month}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                    {row.mondayMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                    {row.wednesdayMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                    {row.saturdayMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">
                    {row.fridayMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                    {row.dayWorkerMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                    {row.extraMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-orange-50">
                    {row.rvWedSat.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-orange-50">
                    {row.rvMonThu.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                    {row.lunchBags.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white font-semibold">
                    {row.totalHotMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white font-semibold">
                    {row.totalWithLunchBags.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white font-semibold">
                    {row.onsiteHotMeals.toLocaleString()}
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-gray-200 font-bold">
                <td className="border border-gray-300 px-3 py-2 text-gray-900">
                  {monthlyData.totals.month}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                  {monthlyData.totals.mondayMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                  {monthlyData.totals.wednesdayMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                  {monthlyData.totals.saturdayMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">
                  {monthlyData.totals.fridayMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.dayWorkerMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.extraMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-orange-50">
                  {monthlyData.totals.rvWedSat.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-orange-50">
                  {monthlyData.totals.rvMonThu.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                  {monthlyData.totals.lunchBags.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.totalHotMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.totalWithLunchBags.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.onsiteHotMeals.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300"></div>
            <span className="text-gray-700">Weekday Guest Meals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-gray-300"></div>
            <span className="text-gray-700">Friday Meals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-50 border border-gray-300"></div>
            <span className="text-gray-700">RV Meals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-50 border border-gray-300"></div>
            <span className="text-gray-700">Lunch Bags</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Calculation Notes:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>TOTAL HOT MEALS:</strong> Sum of all meal types except lunch bags</li>
            <li><strong>Total w/ Lunch Bags:</strong> TOTAL HOT MEALS + Lunch Bags</li>
            <li><strong>Onsite Hot Meals:</strong> Guest meals + Extra meals on Mon/Wed/Sat/Fri only</li>
            <li><strong>RV Meals:</strong> Split by service days (Mon+Thu and Wed+Sat)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryReport;
