import React, { useMemo, useRef } from "react";
import { Line } from "react-chartjs-2";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { palette, defaultAnimations } from "./ChartTheme";

const TrendLine = ({ days, metrics = ["meals", "showers", "laundry"] }) => {
  const chartRef = useRef(null);
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

  const handleExportChart = () => {
    if (!chartRef.current) {
      toast.error("Chart not found");
      return;
    }

    try {
      // Get the Chart.js instance from the canvas
      const chartInstance = chartRef.current;
      const base64Image = chartInstance.toBase64Image();

      // Create download link
      const link = document.createElement("a");
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-");
      link.download = `30-day-activity-trend-${timestamp}.png`;
      link.href = base64Image;
      link.click();

      toast.success("Chart downloaded as PNG!");
    } catch (error) {
      console.error("Error exporting chart:", error);
      toast.error("Failed to export chart");
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 h-72 relative group">
      <button
        onClick={handleExportChart}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm z-10"
        title="Download as PNG"
      >
        <Download size={16} className="text-gray-600" />
      </button>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
};

export default TrendLine;
