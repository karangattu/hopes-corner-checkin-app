import React, { useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import {
  defaultAnimations,
  generateColorPalette,
  applyAlpha,
} from "./ChartTheme";

const DonutCard = ({ title, subtitle, dataMap }) => {
  const chartRef = useRef(null);
  const labels = Object.keys(dataMap || {});
  const values = Object.values(dataMap || {});
  const baseColors = generateColorPalette(labels.length);

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: baseColors.map((hex) => applyAlpha(hex, 0.7)),
        borderColor: baseColors,
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    cutout: "65%",
    animation: defaultAnimations,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed}`,
        },
      },
    },
  };

  const total = values.reduce((a, b) => a + b, 0);

  const safeTitle = title?.toLowerCase().replace(/\s+/g, "-") || "chart";

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
      link.download = `${safeTitle}-${timestamp}.png`;
      link.href = base64Image;
      link.click();

      toast.success("Chart downloaded as PNG!");
    } catch (error) {
      console.error("Error exporting chart:", error);
      toast.error("Failed to export chart");
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 h-64 relative group">
      <button
        onClick={handleExportChart}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm z-10"
        title="Download as PNG"
      >
        <Download size={16} className="text-gray-600" />
      </button>
      <div className="absolute inset-0 p-4">
        <Doughnut ref={chartRef} data={data} options={options} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-sm text-gray-500">{subtitle}</div>
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-gray-400">{title}</div>
        </div>
      </div>
    </div>
  );
};

export default DonutCard;
