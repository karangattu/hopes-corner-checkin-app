import React, { useMemo, useRef } from "react";
import { Line } from "react-chartjs-2";
import { Download } from "lucide-react";
import { palette, defaultAnimations } from "./ChartTheme";
import { useChartExport } from "../../hooks/useChartExport";

const TrendLine = ({ days, metrics = ["meals", "showers", "laundry"] }) => {
  const chartRef = useRef(null);
  const { exportToPNG } = useChartExport();
  const sorted = useMemo(() => {
    return [...(days || [])].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
  }, [days]);

  const labels = sorted.map((d) => new Date(d.date).toLocaleDateString());

  const metricStyles = {
    meals: { label: "Meals", color: palette.green },
    showers: { label: "Showers", color: palette.blue },
    laundry: { label: "Laundry", color: palette.purple },
    haircuts: { label: "Haircuts", color: palette.rose },
    holidays: { label: "Holiday", color: palette.amber },
    bicycles: { label: "Bicycle", color: palette.sky },
  };

  const datasets = metrics.map((m) => ({
    label: metricStyles[m]?.label || m,
    data: sorted.map((d) => d[m] ?? 0),
    borderColor: metricStyles[m]?.color,
    backgroundColor: (metricStyles[m]?.color || "#999") + "33", // 20% fill
    fill: true,
    pointRadius: 2,
    borderWidth: 2,
  }));

  const data = { labels, datasets };

  const options = {
    animation: defaultAnimations,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "#f1f5f9" },
      },
    },
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
    },
  };

  return (
    <div
      className="bg-white border rounded-lg p-4 h-72 relative group"
      ref={chartRef}
    >
      <button
        onClick={() => exportToPNG(chartRef, "30-day-activity-trend")}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm z-10"
        title="Download as PNG"
      >
        <Download size={16} className="text-gray-600" />
      </button>
      <Line data={data} options={options} />
    </div>
  );
};

export default TrendLine;
