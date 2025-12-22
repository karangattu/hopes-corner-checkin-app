import React, { useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
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

const StackedBarCardRecharts = ({ title, subtitle, crossTabData }) => {
  const chartRef = useRef(null);

  const categories = Object.keys(crossTabData || {});
  const allSubcategories = new Set();

  categories.forEach((category) => {
    Object.keys(crossTabData[category] || {}).forEach((subcat) => {
      allSubcategories.add(subcat);
    });
  });

  const subcategoriesArray = Array.from(allSubcategories);

  const chartData = categories.map((category) => {
    const dataPoint = { name: category };
    subcategoriesArray.forEach((subcat) => {
      dataPoint[subcat] = crossTabData[category]?.[subcat] || 0;
    });
    return dataPoint;
  });

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

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.fill }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={chartRef}
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
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: "10px" }} iconType="square" />
          {subcategoriesArray.map((subcat, index) => (
            <Bar
              key={subcat}
              dataKey={subcat}
              stackId="a"
              fill={COLORS[index % COLORS.length]}
            >
              <LabelList
                dataKey={subcat}
                position="center"
                style={{ fill: "white", fontSize: "12px", fontWeight: "bold" }}
                formatter={(value) => (value > 0 ? value : "")}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StackedBarCardRecharts;
