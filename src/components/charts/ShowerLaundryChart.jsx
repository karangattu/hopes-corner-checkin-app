import React, { useRef, useCallback } from "react";
import { Download, ShowerHead, WashingMachine } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import { exportChartAsImage } from "../../utils/chartExport";
import { formatDateForDisplay } from "../../utils/date";

const ShowerLaundryChart = ({ days = [] }) => {
  const chartRef = useRef(null);

  if (!days || days.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
        <div className="flex items-center justify-center gap-4 mb-2">
          <ShowerHead size={32} className="opacity-50" />
          <WashingMachine size={32} className="opacity-50" />
        </div>
        <p>No shower or laundry data available for the selected date range</p>
      </div>
    );
  }

  // Filter data to only include days with activity (showers > 0 OR laundry > 0)
  const filteredDays = days.filter(
    (day) => (day.showers || 0) > 0 || (day.laundry || 0) > 0,
  );

  if (filteredDays.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
        <div className="flex items-center justify-center gap-4 mb-2">
          <ShowerHead size={32} className="opacity-50" />
          <WashingMachine size={32} className="opacity-50" />
        </div>
        <p>No shower or laundry activity for the selected date range</p>
      </div>
    );
  }

  const chartData = filteredDays.map((day) => ({
    date: formatDateForDisplay(day.date, {
      month: "short",
      day: "numeric",
    }),
    fullDate: day.date,
    showers: day.showers || 0,
    laundry: day.laundry || 0,
  }));

  // Calculate totals
  const totalShowers = chartData.reduce((sum, day) => sum + day.showers, 0);
  const totalLaundry = chartData.reduce((sum, day) => sum + day.laundry, 0);

  const handleExportChart = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `showers-laundry-report-${timestamp}.png`;
      await exportChartAsImage(chartRef, filename);
      toast.success("Showers & Laundry chart downloaded as PNG!");
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
          {formatDateForDisplay(data.fullDate)}
        </p>
        <div className="space-y-1 text-sm">
          <p className="text-blue-600 font-medium">
            <ShowerHead size={14} className="inline mr-1" />
            Showers: {data.showers}
          </p>
          <p className="text-purple-600 font-medium">
            <WashingMachine size={14} className="inline mr-1" />
            Laundry: {data.laundry}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <ShowerHead size={20} className="text-blue-600" />
            <WashingMachine size={20} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            Showers & Laundry
          </h3>
        </div>
        <button
          onClick={handleExportChart}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Download as PNG"
        >
          <Download size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <ShowerHead size={18} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-600">
              Showers Booked
            </span>
          </div>
          <div className="text-3xl font-bold text-blue-900">{totalShowers}</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <WashingMachine size={18} className="text-purple-600" />
            <span className="text-sm font-medium text-gray-600">
              Laundry Loads
            </span>
          </div>
          <div className="text-3xl font-bold text-purple-900">
            {totalLaundry}
          </div>
        </div>
      </div>

      {/* Line chart for trends */}
      <div ref={chartRef} className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                formatDateForDisplay(value, {
                  month: "short",
                  day: "numeric",
                })
              }
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />

            <Line
              type="monotone"
              dataKey="showers"
              name="Showers Booked"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3b82f6" }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="laundry"
              name="Laundry Loads"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ r: 4, fill: "#a855f7" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ShowerLaundryChart;
