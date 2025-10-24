import React, { useState, useMemo, useRef } from "react";
import { useAppContext } from "../../context/useAppContext";
import { Download, Calendar, TrendingUp } from "lucide-react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ScatterChart,
  Scatter,
  Cell,
} from "recharts";
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

  const months = useMemo(
    () => [
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
    ],
    [],
  );

  const toggleDay = (dayValue) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b),
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
        return records.filter((record) => {
          const date = getDateFromRecord(record);
          if (!date) return false;
          const dayOfWeek = getDayOfWeek(date);
          return (
            isDateInMonth(date, targetYear, targetMonth) &&
            selectedDays.includes(dayOfWeek)
          );
        });
      };

      const monthMeals = filterRecordsByDayAndMonth(mealRecords);
      const monthRvMeals = filterRecordsByDayAndMonth(rvMealRecords);
      const monthShelterMeals = filterRecordsByDayAndMonth(shelterMealRecords);
      const monthUnitedEffortMeals = filterRecordsByDayAndMonth(
        unitedEffortMealRecords,
      );
      const monthExtraMeals = filterRecordsByDayAndMonth(extraMealRecords);
      const monthDayWorkerMeals =
        filterRecordsByDayAndMonth(dayWorkerMealRecords);

      const guestMealsCount = monthMeals.reduce(
        (sum, r) => sum + (r.count || 0),
        0,
      );
      const rvMealsCount = monthRvMeals.reduce(
        (sum, r) => sum + (r.count || 0),
        0,
      );
      const shelterMealsCount = monthShelterMeals.reduce(
        (sum, r) => sum + (r.count || 0),
        0,
      );
      const unitedEffortMealsCount = monthUnitedEffortMeals.reduce(
        (sum, r) => sum + (r.count || 0),
        0,
      );
      const extraMealsCount = monthExtraMeals.reduce(
        (sum, r) => sum + (r.count || 0),
        0,
      );
      const dayWorkerMealsCount = monthDayWorkerMeals.reduce(
        (sum, r) => sum + (r.count || 0),
        0,
      );

      const uniqueGuestIds = new Set(
        [
          ...monthMeals,
          ...monthRvMeals,
          ...monthShelterMeals,
          ...monthUnitedEffortMeals,
          ...monthExtraMeals,
          ...monthDayWorkerMeals,
        ]
          .map((r) => r.guestId)
          .filter(Boolean),
      );

      const totalMealsServed =
        guestMealsCount +
        extraMealsCount +
        rvMealsCount +
        dayWorkerMealsCount +
        shelterMealsCount +
        unitedEffortMealsCount;

      const avgMealsPerServiceDay = validDaysCount
        ? totalMealsServed / validDaysCount
        : totalMealsServed;

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
        totalMeals: totalMealsServed,
        avgMealsPerServiceDay,
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

    const averagePerServiceDay = Math.round(
      currentMonth.avgMealsPerServiceDay ?? currentMonth.totalMeals,
    );

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

  const categorizeScatterPoint = (totalMeals, extrasShare) => {
    if (totalMeals >= 260) {
      return { color: "#dc2626", label: "Peak service day" };
    }
    if (extrasShare >= 0.35) {
      return { color: "#f97316", label: "High extras mix" };
    }
    if (extrasShare <= 0.1) {
      return { color: "#2563eb", label: "Guest-focused" };
    }
    return { color: "#10b981", label: "Balanced service" };
  };

  const dailyScatterData = useMemo(() => {
    if (!calculateMealData.length) return [];
    const currentMonth = calculateMealData[calculateMealData.length - 1];
    if (!currentMonth) return [];

    const targetYear = currentMonth.year;
    const targetMonthIndex = currentMonth.monthIndex;
    if (
      typeof targetYear !== "number" ||
      typeof targetMonthIndex !== "number"
    ) {
      return [];
    }

    const daysInMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
    const points = [];
    let serviceIndex = 0;

    const recordsForDay = (records, day) =>
      records.filter((record) => {
        const recordDate = getDateFromRecord(record);
        if (!recordDate) return false;
        return (
          recordDate.getFullYear() === targetYear &&
          recordDate.getMonth() === targetMonthIndex &&
          recordDate.getDate() === day
        );
      });

    const sumCounts = (records) =>
      records.reduce((sum, record) => sum + (record.count || 0), 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonthIndex, day);
      const dayOfWeek = getDayOfWeek(date);
      if (!selectedDays.includes(dayOfWeek)) continue;

      serviceIndex += 1;

      const dayMeals = recordsForDay(mealRecords, day);
      const dayRvMeals = recordsForDay(rvMealRecords, day);
      const dayShelterMeals = recordsForDay(shelterMealRecords, day);
      const dayUnitedEffortMeals = recordsForDay(unitedEffortMealRecords, day);
      const dayExtraMeals = recordsForDay(extraMealRecords, day);
      const dayDayWorkerMeals = recordsForDay(dayWorkerMealRecords, day);

      const guestMealsTotal = sumCounts(dayMeals);
      const rvMealsTotal = sumCounts(dayRvMeals);
      const shelterMealsTotal = sumCounts(dayShelterMeals);
      const unitedEffortMealsTotal = sumCounts(dayUnitedEffortMeals);
      const extraMealsTotal = sumCounts(dayExtraMeals);
      const dayWorkerMealsTotal = sumCounts(dayDayWorkerMeals);

      const totalMeals =
        guestMealsTotal +
        rvMealsTotal +
        shelterMealsTotal +
        unitedEffortMealsTotal +
        extraMealsTotal +
        dayWorkerMealsTotal;

      const extrasShare = totalMeals ? extraMealsTotal / totalMeals : 0;

      const uniqueGuests = new Set(
        [
          ...dayMeals,
          ...dayRvMeals,
          ...dayShelterMeals,
          ...dayUnitedEffortMeals,
        ]
          .map((record) => record.guestId)
          .filter(Boolean),
      ).size;

      const { color, label } = categorizeScatterPoint(totalMeals, extrasShare);

      points.push({
        timestamp: date.getTime(),
        serviceIndex,
        dateLabel: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        weekdayLabel: date.toLocaleDateString(undefined, {
          weekday: "long",
        }),
        totalMeals,
        guestMeals: guestMealsTotal,
        extrasMeals: extraMealsTotal,
        rvMeals: rvMealsTotal,
        dayWorkerMeals: dayWorkerMealsTotal,
        shelterMeals: shelterMealsTotal,
        unitedEffortMeals: unitedEffortMealsTotal,
        uniqueGuests,
        color,
        categoryLabel: label,
        extrasShare,
      });
    }

    return points.sort((a, b) => a.timestamp - b.timestamp);
  }, [
    calculateMealData,
    selectedDays,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
  ]);

  const scatterLegend = useMemo(() => {
    const categoryMap = new Map();
    dailyScatterData.forEach((point) => {
      if (!categoryMap.has(point.categoryLabel)) {
        categoryMap.set(point.categoryLabel, point.color);
      }
    });
    return Array.from(categoryMap.entries()).map(([label, color]) => ({
      label,
      color,
    }));
  }, [dailyScatterData]);

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

      const dateStr = date.toISOString().split("T")[0];
      const dayName =
        DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label ||
        date.toLocaleDateString("en-US", { weekday: "long" });

      const filterRecordsByDate = (records) => {
        return records.filter((record) => {
          const recordDate = getDateFromRecord(record);
          if (!recordDate) return false;
          return recordDate.toISOString().split("T")[0] === dateStr;
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
        "Extra Meals": dayExtraMeals.reduce(
          (sum, r) => sum + (r.count || 0),
          0,
        ),
        "RV Meals": dayRvMeals.reduce((sum, r) => sum + (r.count || 0), 0),
        "Day Worker Meals": dayDayWorkerMeals.reduce(
          (sum, r) => sum + (r.count || 0),
          0,
        ),
        "Shelter Meals": dayShelterMeals.reduce(
          (sum, r) => sum + (r.count || 0),
          0,
        ),
        "United Effort Meals": dayUnitedEffortMeals.reduce(
          (sum, r) => sum + (r.count || 0),
          0,
        ),
        "Total Meals":
          dayMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayExtraMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayRvMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayDayWorkerMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayShelterMeals.reduce((sum, r) => sum + (r.count || 0), 0) +
          dayUnitedEffortMeals.reduce((sum, r) => sum + (r.count || 0), 0),
      });
    }

    const filename = `meal-report-${months[targetMonth]}-${targetYear}-${selectedDays.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label.substring(0, 3)).join("-")}.csv`;
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

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">{data.month}</p>
        <div className="space-y-1 text-sm">
          <p className="text-blue-600">Guest Meals: {data.guestMeals}</p>
          <p className="text-orange-600">Extras: {data.extras}</p>
          <p className="text-purple-600">RV Meals: {data.rvMeals}</p>
          <p className="text-green-600">Day Worker: {data.dayWorkerMeals}</p>
          <p className="text-pink-600">Shelter: {data.shelterMeals}</p>
          <p className="text-indigo-600">
            United Effort: {data.unitedEffortMeals}
          </p>
          <p className="font-semibold text-gray-800 mt-2 pt-2 border-t">
            Total: {data.totalMeals}
          </p>
          <p className="text-gray-700">
            Avg Meals / Service Day:{" "}
            {Math.round(data.avgMealsPerServiceDay || 0)}
          </p>
          <p className="text-gray-600">Unique Guests: {data.uniqueGuests}</p>
          <p className="text-gray-500 text-xs mt-1">
            Days: {data.validDaysCount}
          </p>
        </div>
      </div>
    );
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">
          {point.weekdayLabel}, {point.dateLabel}
        </p>
        <div className="space-y-1 text-sm">
          <p>Total Meals: {point.totalMeals}</p>
          <p>Guest Meals: {point.guestMeals}</p>
          <p>Extras: {point.extrasMeals}</p>
          <p>RV Meals: {point.rvMeals}</p>
          <p>Day Worker: {point.dayWorkerMeals}</p>
          <p>Shelter: {point.shelterMeals}</p>
          <p>United Effort: {point.unitedEffortMeals}</p>
          <p>Unique Guests: {point.uniqueGuests}</p>
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
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
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
                <option key={index} value={index}>
                  {month}
                </option>
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
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedDays.includes(day.value)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          {selectedDays.length === 0 && (
            <p className="text-red-600 text-sm mt-2">
              Please select at least one day
            </p>
          )}
        </div>
      </div>

      {selectedDays.length > 0 && calculateMealData.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp size={18} className="text-green-600" />
                Monthly Comparison - {selectedDayLabels.join(", ")}
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
                  Totals reflect every {selectedDayLabels.join(", ")} in{" "}
                  {chartNarrative.monthLabel}. We served
                  <span className="font-semibold">
                    {" "}
                    {chartNarrative.totalMeals.toLocaleString()}
                  </span>{" "}
                  meals across{" "}
                  <span className="font-semibold">
                    {chartNarrative.validDays}
                  </span>{" "}
                  service days (≈
                  {chartNarrative.averagePerServiceDay.toLocaleString()} meals
                  per day) to
                  <span className="font-semibold">
                    {" "}
                    {chartNarrative.uniqueGuests.toLocaleString()}
                  </span>{" "}
                  unique guests.
                  {chartNarrative.changeText
                    ? ` This is ${chartNarrative.changeText}.`
                    : ""}
                </p>
              </div>
            )}

            <div ref={chartRef} className="bg-white p-4">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={calculateMealData}
                  margin={{ top: 16, right: 40, bottom: 40, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    label={{
                      value: "Month",
                      position: "insideBottom",
                      offset: -20,
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "Total Meals",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: "Avg Meals / Service Day",
                      angle: -90,
                      position: "insideRight",
                      offset: -5,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="guestMeals"
                    stackId="a"
                    fill="#3b82f6"
                    name="Guest Meals"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="extras"
                    stackId="a"
                    fill="#f97316"
                    name="Extras"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="rvMeals"
                    stackId="a"
                    fill="#a855f7"
                    name="RV Meals"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="dayWorkerMeals"
                    stackId="a"
                    fill="#22c55e"
                    name="Day Worker"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="shelterMeals"
                    stackId="a"
                    fill="#ec4899"
                    name="Shelter"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="unitedEffortMeals"
                    stackId="a"
                    fill="#6366f1"
                    name="United Effort"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgMealsPerServiceDay"
                    stroke="#0f172a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Avg Meals / Service Day"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {dailyScatterData.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-2">Daily Service Mix</h3>
              <p className="text-sm text-gray-600 mb-4">
                Each dot represents a selected service day this month. Colors
                highlight when extras dominate, guests dominate, or we hit peak
                volume.
              </p>
              {scatterLegend.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {scatterLegend.map(({ label, color }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ height: "320px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 16, right: 24, bottom: 40, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      dataKey="timestamp"
                      scale="time"
                      domain={["auto", "auto"]}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      label={{
                        value: "Service Day",
                        position: "insideBottom",
                        offset: -20,
                      }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="totalMeals"
                      tick={{ fontSize: 12 }}
                      label={{
                        value: "Total Meals",
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                      }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={<ScatterTooltip />}
                    />
                    <Scatter data={dailyScatterData} name="Total Meals">
                      {dailyScatterData.map((point, index) => (
                        <Cell
                          key={`${point.timestamp}-${index}`}
                          fill={point.color}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-semibold">Month</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Guest
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Extras
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">RV</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Day Worker
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Shelter
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      United Effort
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Avg/Day
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Unique Guests
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMealData.map((data, index) => (
                    <tr
                      key={index}
                      className={`border-b ${data.isCurrentMonth ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-4 py-3">{data.month}</td>
                      <td className="px-4 py-3 text-right">
                        {data.guestMeals}
                      </td>
                      <td className="px-4 py-3 text-right">{data.extras}</td>
                      <td className="px-4 py-3 text-right">{data.rvMeals}</td>
                      <td className="px-4 py-3 text-right">
                        {data.dayWorkerMeals}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {data.shelterMeals}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {data.unitedEffortMeals}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {data.totalMeals}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {Math.round(data.avgMealsPerServiceDay || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700">
                        {data.uniqueGuests}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {data.validDaysCount}
                      </td>
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
