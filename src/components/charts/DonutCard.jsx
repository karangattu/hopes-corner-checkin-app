import React, { useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { Download } from "lucide-react";
import { palette, defaultAnimations } from "./ChartTheme";
import { useChartExport } from "../../hooks/useChartExport";

const DonutCard = ({ title, subtitle, dataMap }) => {
  const chartRef = useRef(null);
  const { exportToPNG } = useChartExport();
  const labels = Object.keys(dataMap || {});
  const values = Object.values(dataMap || {});
  const colors = [
    palette.blue,
    palette.green,
    palette.purple,
    palette.amber,
    palette.sky,
    palette.rose,
    palette.gray,
  ];

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, i) => colors[i % colors.length] + "B3"),
        borderColor: labels.map((_, i) => colors[i % colors.length]),
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

  return (
    <div className="bg-white border rounded-lg p-4 h-64 relative group" ref={chartRef}>
      <button
        onClick={() => exportToPNG(chartRef, safeTitle)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm z-10"
        title="Download as PNG"
      >
        <Download size={16} className="text-gray-600" />
      </button>
      <div className="absolute inset-0 p-4">
        <Doughnut data={data} options={options} />
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
