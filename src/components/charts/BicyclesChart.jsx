import React, { useRef } from "react";
import { Download, Bike } from "lucide-react";
import {
  BarChart,
  Bar,
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

const BicyclesChart = ({ days = [] }) => {
  const chartRef = useRef(null);

  if (!days || days.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
        <Bike size={32} className="mx-auto mb-2 opacity-50" />
        <p>No bicycle program data available for the selected date range</p>
      </div>
    );
  }

  // Filter data to only include days with activity
  const filteredDays = days.filter((day) => (day.bicycles || 0) > 0);

  if (filteredDays.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
        <Bike size={32} className="mx-auto mb-2 opacity-50" />
        <p>No bicycle activity for the selected date range</p>
      </div>
    );
  }

  const chartData = filteredDays.map((day) => ({
    date: formatDateForDisplay(day.date, {
      month: "short",
      day: "numeric",
    }),
    fullDate: day.date,
    bicycles: day.bicycles || 0,
  }));

  // Calculate total
  const totalBicycles = chartData.reduce((sum, day) => sum + day.bicycles, 0);

  // Calculate daily average
  const averageBicycles =
    chartData.length > 0 ? (totalBicycles / chartData.length).toFixed(1) : 0;

  // Find peak day
  const peakDay = chartData.reduce(
    (max, day) => (day.bicycles > max.bicycles ? day : max),
    chartData[0],
  );

  const handleExportChart = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `bicycles-report-${timestamp}.png`;
      await exportChartAsImage(chartRef, filename);
      toast.success("Bicycles chart downloaded as PNG!");
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
          <p className="text-cyan-600 font-medium">
            <Bike size={14} className="inline mr-1" />
            Bicycles: {data.bicycles}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike size={20} className="text-cyan-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Bicycle Program
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

      {/* Summary cards with statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
          <div className="text-xs font-medium text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-cyan-900">
            {totalBicycles}
          </div>
        </div>

        <div className="bg-sky-50 rounded-lg p-3 border border-sky-200">
          <div className="text-xs font-medium text-gray-600 mb-1">
            Daily Average
          </div>
          <div className="text-2xl font-bold text-sky-900">
            {averageBicycles}
          </div>
        </div>

        <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
          <div className="text-xs font-medium text-gray-600 mb-1">Peak Day</div>
          <div className="text-2xl font-bold text-teal-900">
            {peakDay.bicycles}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs font-medium text-gray-600 mb-1">
            Days with Activity
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {chartData.filter((d) => d.bicycles > 0).length}
          </div>
        </div>
      </div>

      {/* Bar chart for daily breakdown */}
      <div ref={chartRef} className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
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

            <Bar
              dataKey="bicycles"
              name="Bicycle Repairs/Maintenance"
              fill="#06b6d4"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BicyclesChart;
