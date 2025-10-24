import React, { useRef } from "react";
import { Download, Utensils } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import toast from "react-hot-toast";
import { exportChartAsImage } from "../../utils/chartExport";

const MEAL_TYPE_COLORS = {
  guest: "#3b82f6", // Blue
  rv: "#f59e0b", // Amber
  shelter: "#10b981", // Emerald
  unitedEffort: "#8b5cf6", // Violet
  extras: "#ec4899", // Pink
  dayWorker: "#f97316", // Orange
  lunchBags: "#6366f1", // Indigo
};

const MEAL_TYPE_LABELS = {
  guest: "Guest Meals",
  rv: "RV Meals",
  shelter: "Shelter Meals",
  unitedEffort: "United Effort",
  extras: "Extra Meals",
  dayWorker: "Day Worker",
  lunchBags: "Lunch Bags",
};

const MealsChart = ({ days, selectedMealTypes = [] }) => {
  const chartRef = useRef(null);

  if (!days || days.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
        <Utensils size={32} className="mx-auto mb-2 opacity-50" />
        <p>No meal data available for the selected date range</p>
      </div>
    );
  }

  // Filter data to only include days with activity
  const filteredDays = days.filter((day) => {
    const dayTotal = selectedMealTypes.reduce(
      (sum, type) => sum + (day.mealsByType?.[type] || 0),
      0,
    );
    return dayTotal > 0;
  });

  if (filteredDays.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
        <Utensils size={32} className="mx-auto mb-2 opacity-50" />
        <p>No meal activity for the selected date range</p>
      </div>
    );
  }

  const chartData = filteredDays.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    fullDate: day.date,
    guest: day.mealsByType?.guest || 0,
    rv: day.mealsByType?.rv || 0,
    shelter: day.mealsByType?.shelter || 0,
    unitedEffort: day.mealsByType?.unitedEffort || 0,
    extras: day.mealsByType?.extras || 0,
    dayWorker: day.mealsByType?.dayWorker || 0,
    lunchBags: day.mealsByType?.lunchBags || 0,
  }));

  // Calculate totals for the period
  const totals = selectedMealTypes.reduce((acc, type) => {
    acc[type] = chartData.reduce((sum, day) => sum + (day[type] || 0), 0);
    return acc;
  }, {});

  const handleExportChart = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `meals-report-${timestamp}.png`;
      await exportChartAsImage(chartRef, filename);
      toast.success("Meals chart downloaded as PNG!");
    } catch (error) {
      console.error("Error exporting chart:", error);
      toast.error("Failed to export chart");
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">
          {new Date(data.fullDate).toLocaleDateString()}
        </p>
        <div className="space-y-1 text-sm">
          {selectedMealTypes.map((type) => (
            <p
              key={type}
              style={{ color: MEAL_TYPE_COLORS[type] }}
              className="font-medium"
            >
              {MEAL_TYPE_LABELS[type]}: {data[type] || 0}
            </p>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils size={20} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Meals Served</h3>
        </div>
        <button
          onClick={handleExportChart}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Download as PNG"
        >
          <Download size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Summary cards for each meal type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {selectedMealTypes.map((type) => (
          <div
            key={type}
            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
          >
            <div className="text-xs text-gray-600 mb-1">
              {MEAL_TYPE_LABELS[type]}
            </div>
            <div
              className="text-lg font-bold"
              style={{ color: MEAL_TYPE_COLORS[type] }}
            >
              {totals[type] || 0}
            </div>
          </div>
        ))}
        {selectedMealTypes.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-300">
            <div className="text-xs font-semibold text-blue-700 mb-1">
              Total Meals
            </div>
            <div className="text-lg font-bold text-blue-900">
              {Object.values(totals).reduce((a, b) => a + b, 0)}
            </div>
          </div>
        )}
      </div>

      {/* Stacked area chart */}
      <div ref={chartRef} className="relative">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />

            {selectedMealTypes.map((type) => (
              <Area
                key={type}
                type="monotone"
                dataKey={type}
                name={MEAL_TYPE_LABELS[type]}
                stackId="meals"
                stroke={MEAL_TYPE_COLORS[type]}
                fill={MEAL_TYPE_COLORS[type]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MealsChart;
