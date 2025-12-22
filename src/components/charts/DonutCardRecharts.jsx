import React, { useRef, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { exportChartAsImage } from "../../utils/chartExport";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

const DonutCardRecharts = ({ title, subtitle, dataMap }) => {
  const chartRef = useRef(null);

  const chartData = useMemo(
    () => Object.entries(dataMap || {}).map(([name, value]) => ({ name, value })),
    [dataMap]
  );

  const handleExportChart = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${title.toLowerCase().replace(/\s+/g, "-")}-${timestamp}.png`;
      await exportChartAsImage(chartRef, filename);
      toast.success("Chart downloaded as PNG!");
    } catch (error) {
      console.error("Error exporting chart:", error);
      toast.error("Failed to export chart");
    }
  };

  const CustomTooltip = useMemo(
    () =>
      ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;

        const data = payload[0];
        const total = chartData.reduce((sum, item) => sum + item.value, 0);
        const percentage = ((data.value / total) * 100).toFixed(1);

        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <p className="font-semibold text-gray-800">{data.name}</p>
            <p className="text-sm text-gray-600">
              {data.value} ({percentage}%)
            </p>
          </div>
        );
      },
    [chartData]
  );

  return (
    <div
      ref={chartRef}
      data-chart-container
      className="bg-white border rounded-lg p-4 h-80 relative group"
      style={{ minHeight: "320px" }}
    >
      <button
        onClick={handleExportChart}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm z-10"
        title="Download as PNG"
      >
        <Download size={16} className="text-gray-600" />
      </button>

      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      <ResponsiveContainer width="100%" height="85%" minHeight={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value, entry) => (
              <span className="text-xs">
                {value}: {entry.payload.value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DonutCardRecharts;
