import React, { useMemo, useRef } from "react";
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
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { exportChartAsImage } from "../../utils/chartExport";

const METRIC_COLORS = {
  meals: "#22c55e",
  showers: "#3b82f6",
  laundry: "#a855f7",
  haircuts: "#f43f5e",
  holidays: "#f59e0b",
  bicycles: "#06b6d4",
  proxyPickups: "#f59e0b", // amber tone for proxy pickups
};

const METRIC_LABELS = {
  meals: "Meals",
  showers: "Showers",
  laundry: "Laundry",
  haircuts: "Haircuts",
  holidays: "Holiday",
  bicycles: "Bicycle",
  proxyPickups: "Proxy Pickups",
};

const TrendLineRecharts = ({
  days,
  metrics = ["meals", "showers", "laundry"],
}) => {
  const chartRef = useRef(null);

  const sorted = useMemo(() => {
    return [...(days || [])].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
  }, [days]);

  const chartData = sorted.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    fullDate: day.date,
    ...day,
  }));

  const handleExportChart = async () => {
    try {
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
      const filename = `30-day-activity-trend-${timestamp}.png`;
      await exportChartAsImage(chartRef, filename);
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
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">
          {new Date(data.fullDate).toLocaleDateString()}
        </p>
        <div className="space-y-1 text-sm">
          {metrics.map((metric) => {
            const color = METRIC_COLORS[metric];
            const label = METRIC_LABELS[metric];
            return (
              <p key={metric} style={{ color }}>
                {label}: {data[metric] ?? 0}
              </p>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={chartRef}
      className="bg-white border rounded-lg p-4 h-72 relative group"
    >
      <button
        onClick={handleExportChart}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm z-10"
        title="Download as PNG"
      >
        <Download size={16} className="text-gray-600" />
      </button>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: "10px" }} />
          {metrics.map((metric) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={METRIC_COLORS[metric]}
              strokeWidth={2}
              dot={{ r: 2 }}
              name={METRIC_LABELS[metric]}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendLineRecharts;
