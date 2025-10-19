import React, { useState, useMemo, useRef } from "react";
import { useAppContext } from "../../context/useAppContext";
import { Download, Calendar, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 3, label: "Wednesday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const MealReport = () => {
  const {
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    exportDataAsCSV,
  } = useAppContext();

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedDays, setSelectedDays] = useState([1, 3, 5, 6]);
  const [comparisonMonths, setComparisonMonths] = useState(3);
  const chartRef = useRef(null);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

  const toggleDay = (dayValue) => {
    setSelectedDays(prev =>
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b)
    );
  };

  const getDateFromRecord = (record) => {
    if (!record.date) return null;
    return new Date(record.date);
  };

  const getDayOfWeek = (date) => {
    return date.getDay();
  };

  const isDateInMonth = (date, year, month) => {
    return date.getFullYear() === year && date.getMonth() === month;
  };

  const calculateMealData = useMemo(() => {
    const results = [];
    const monthNames = months;
    
    for (let monthOffset = 0; monthOffset <= comparisonMonths; monthOffset++) {
      const targetDate = new Date(selectedYear, selectedMonth - monthOffset);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const monthLabel = `${monthNames[targetMonth]} ${targetYear}`;

      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      let validDaysCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(targetYear, targetMonth, day);
        const dayOfWeek = getDayOfWeek(date);
        if (selectedDays.includes(dayOfWeek)) {
          validDaysCount++;
        }
      }

      const filterRecordsByDayAndMonth = (records) => {
        return records.filter(record => {
          const date = getDateFromRecord(record);
          if (!date) return false;
          const dayOfWeek = getDayOfWeek(date);
          return isDateInMonth(date, targetYear, targetMonth) && selectedDays.includes(dayOfWeek);
        });
      };

      const monthMeals = filterRecordsByDayAndMonth(mealRecords);
      const monthRvMeals = filterRecordsByDayAndMonth(rvMealRecords);
      const monthShelterMeals = filterRecordsByDayAndMonth(shelterMealRecords);
      const monthUnitedEffortMeals = filterRecordsByDayAndMonth(unitedEffortMealRecords);
      const monthExtraMeals = filterRecordsByDayAndMonth(extraMealRecords);
      const monthDayWorkerMeals = filterRecordsByDayAndMonth(dayWorkerMealRecords);

      const guestMealsCount = monthMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const rvMealsCount = monthRvMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const shelterMealsCount = monthShelterMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const unitedEffortMealsCount = monthUnitedEffortMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const extraMealsCount = monthExtraMeals.reduce((sum, r) => sum + (r.count || 0), 0);
      const dayWorkerMealsCount = monthDayWorkerMeals.reduce((sum, r) => sum + (r.count || 0), 0);

      const uniqueGuestIds = new Set(
        [...monthMeals, ...monthRvMeals, ...monthShelterMeals, 
         ...monthUnitedEffortMeals, ...monthExtraMeals, ...monthDayWorkerMeals]
          .map(r => r.guestId)
          .filter(Boolean)
      );

      results.push({
        month: monthLabel,
        year: targetYear,
        monthIndex: targetMonth,
        guestMeals: guestMealsCount,
        extras: extraMealsCount,
        rvMeals: rvMealsCount,
        dayWorkerMeals: dayWorkerMealsCount,
        shelterMeals: shelterMealsCount,
        unitedEffortMeals: unitedEffortMealsCount,
        totalMeals: guestMealsCount + extraMealsCount + rvMealsCount + 
                    dayWorkerMealsCount + shelterMealsCount + unitedEffortMealsCount,
        uniqueGuests: uniqueGuestIds.size,
        validDaysCount,
        isCurrentMonth: monthOffset === 0,
      });
    }

    return results.reverse();
  }, [
    selectedYear,
    selectedMonth,
    selectedDays,
    comparisonMonths,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    months,
  ]);

  const selectedDayLabels = useMemo(
    () =>
      selectedDays
        .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
        .filter(Boolean),
    [selectedDays],
  );

  const chartNarrative = useMemo(() => {
    if (!calculateMealData.length) return null;
    const currentMonth = calculateMealData[calculateMealData.length - 1];
    const previousMonth =
      calculateMealData.length > 1
        ? calculateMealData[calculateMealData.length - 2]
        : null;

    const averagePerServiceDay = currentMonth.validDaysCount
      ? Math.round(currentMonth.totalMeals / currentMonth.validDaysCount)
      : currentMonth.totalMeals;

    const changeText = (() => {
      if (!previousMonth) return null;
      const delta = currentMonth.totalMeals - previousMonth.totalMeals;
      if (delta === 0) {
        return `unchanged compared to ${previousMonth.month}`;
      }
      const magnitude = Math.abs(delta);
      const noun = magnitude === 1 ? "meal" : "meals";
      return `${magnitude} ${noun} ${delta > 0 ? "more" : "fewer"} than ${previousMonth.month}`;
    })();

    return {
      monthLabel: currentMonth.month,
      totalMeals: currentMonth.totalMeals,
      validDays: currentMonth.validDaysCount,
      averagePerServiceDay,
      uniqueGuests: currentMonth.uniqueGuests,
      changeText,
    };
  }, [calculateMealData]);

  const exportCSV = () => {
    if (calculateMealData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const currentMonthData = calculateMealData[calculateMealData.length - 1];
    const targetYear = currentMonthData.year;
    const targetMonth = currentMonthData.monthIndex;
    
    const exportData = [];
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const dayOfWeek = getDayOfWeek(date);
      
      if (!selectedDays.includes(dayOfWeek)) continue;

      const dateStr = date.toISOString().split('T')[0];
      const dayName = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || date.toLocaleDateString('en-US', { weekday: 'long' });

      const filterRecordsByDate = (records) => {
        return records.filter(record => {
          const recordDate = getDateFromRecord(record);
          if (!recordDate) return false;
          return recordDate.toISOString().split('T')[0] === dateStr;
        });
      };

      const dayMeals = filterRecordsByDate(mealRecords);
      const dayRvMeals = filterRecordsByDate(rvMealRecords);
      const dayShelterMeals = filterRecordsByDate(shelterMealRecords);
      const dayUnitedEffortMeals = filterRecordsByDate(unitedEffortMealRecords);
      const dayExtraMeals = filterRecordsByDate(extraMealRecords);
      const dayDayWorkerMeals = filterRecordsByDate(dayWorkerMealRecords);

      exportData.push({
        Date: date.toLocaleDateString(),
        "Day of Week": dayName,
        "Guest Meals": dayMeals.reduce((sum, r) => sum + (r.count || 0), 0),
        "Extra Meals": dayExtraMeals.reduce((sum, r) => sum + (r.count || 0), 0),
        "RV Meals": dayRvMeals.reduce((sum, r) => sum + (r.count || 0), 0),
        "Day Worker Meals": dayDayWorkerMeals.reduce((sum, r) => sum + (r.count || 0), 0),
        "Shelter Meals": dayShelterMeals.reduce((sum, r) => sum + (r.count || 0), 0),
        "United Effort Meals": dayUnitedEffortMeals.reduce((sum, r) => sum + (r.count || 0), 0),
        "Total Meals": 
          dayMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayExtraMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayRvMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayDayWorkerMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayShelterMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayUnitedEffortMeals.reduce((sum, r) => sum + (r.count || 0), 0),
      });
    }

    const filename = `meal-report-${months[targetMonth]}-${targetYear}-${selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label.substring(0, 3)).join('-')}.csv`;
    exportDataAsCSV(exportData, filename);
    toast.success("Meal report exported successfully!");
  };

  const exportChart = async () => {
    if (!chartRef.current) {
      toast.error("Chart not found");
      return;
    }

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `meal-comparison-chart-${timestamp}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Chart downloaded as PNG!");
    } catch (error) {
      console.error("Error exporting chart:", error);
      toast.error("Failed to export chart");
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">{data.month}</p>
        <div className="space-y-1 text-sm">
          <p className="text-blue-600">Guest Meals: {data.guestMeals}</p>
          <p className="text-orange-600">Extras: {data.extras}</p>
          <p className="text-purple-600">RV Meals: {data.rvMeals}</p>
          <p className="text-green-600">Day Worker: {data.dayWorkerMeals}</p>
          <p className="text-pink-600">Shelter: {data.shelterMeals}</p>
          <p className="text-indigo-600">United Effort: {data.unitedEffortMeals}</p>
          <p className="font-semibold text-gray-800 mt-2 pt-2 border-t">Total: {data.totalMeals}</p>
          <p className="text-gray-600">Unique Guests: {data.uniqueGuests}</p>
          <p className="text-gray-500 text-xs mt-1">Days: {data.validDaysCount}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-blue-600" />
          Meal Report by Day of Week
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compare with
            </label>
            <select
              value={comparisonMonths}
              onChange={(e) => setComparisonMonths(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportCSV}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Days of Week
          </label>
          <div className="flex flex-wrap gap-3">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedDays.includes(day.value)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {selectedDays.length === 0 && (
            <p className="text-red-600 text-sm mt-2">Please select at least one day</p>
          )}
        </div>
      </div>

      {selectedDays.length > 0 && calculateMealData.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp size={18} className="text-green-600" />
                Monthly Comparison - {selectedDayLabels.join(', ')}
              </h3>
              <button
                onClick={exportChart}
                className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              >
                <Download size={14} />
                Export Chart
              </button>
            </div>

            {chartNarrative && (
              <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <p>
                  Totals reflect every {selectedDayLabels.join(
                    ", ",
                  )} in {chartNarrative.monthLabel}. We served
                  <span className="font-semibold"> {chartNarrative.totalMeals.toLocaleString()}</span> meals
                  across <span className="font-semibold">{chartNarrative.validDays}</span>{" "}
                  service days (≈{chartNarrative.averagePerServiceDay.toLocaleString()} meals per day) to
                  <span className="font-semibold"> {chartNarrative.uniqueGuests.toLocaleString()}</span> unique guests.
                  {chartNarrative.changeText ? ` This is ${chartNarrative.changeText}.` : ""}
                </p>
              </div>
            )}

            <div ref={chartRef} className="bg-white p-4">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={calculateMealData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="guestMeals" stackId="a" fill="#3b82f6" name="Guest Meals" />
                  <Bar dataKey="extras" stackId="a" fill="#f97316" name="Extras" />
                  <Bar dataKey="rvMeals" stackId="a" fill="#a855f7" name="RV Meals" />
                  <Bar dataKey="dayWorkerMeals" stackId="a" fill="#22c55e" name="Day Worker" />
                  <Bar dataKey="shelterMeals" stackId="a" fill="#ec4899" name="Shelter" />
                  <Bar dataKey="unitedEffortMeals" stackId="a" fill="#6366f1" name="United Effort" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-semibold">Month</th>
                    <th className="px-4 py-3 text-right font-semibold">Guest</th>
                    <th className="px-4 py-3 text-right font-semibold">Extras</th>
                    <th className="px-4 py-3 text-right font-semibold">RV</th>
                    <th className="px-4 py-3 text-right font-semibold">Day Worker</th>
                    <th className="px-4 py-3 text-right font-semibold">Shelter</th>
                    <th className="px-4 py-3 text-right font-semibold">United Effort</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-right font-semibold">Unique Guests</th>
                    <th className="px-4 py-3 text-right font-semibold">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMealData.map((data, index) => (
                    <tr 
                      key={index} 
                      className={`border-b ${data.isCurrentMonth ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-3">{data.month}</td>
                      <td className="px-4 py-3 text-right">{data.guestMeals}</td>
                      <td className="px-4 py-3 text-right">{data.extras}</td>
                      <td className="px-4 py-3 text-right">{data.rvMeals}</td>
                      <td className="px-4 py-3 text-right">{data.dayWorkerMeals}</td>
                      <td className="px-4 py-3 text-right">{data.shelterMeals}</td>
                      <td className="px-4 py-3 text-right">{data.unitedEffortMeals}</td>
                      <td className="px-4 py-3 text-right font-semibold">{data.totalMeals}</td>
                      <td className="px-4 py-3 text-right text-green-700">{data.uniqueGuests}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{data.validDaysCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MealReport;
