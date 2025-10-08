import React, { useRef } from "react";
import { Bar } from "react-chartjs-2";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import {
  defaultAnimations,
  generateColorPalette,
  applyAlpha,
} from "./ChartTheme";

/**
 * StackedBarCard - A reusable stacked bar chart component
 * 
 * @param {string} title - Main title of the chart
 * @param {string} subtitle - Subtitle (usually the X-axis label)
 * @param {Object} crossTabData - Object with structure: { category1: { subcat1: count, subcat2: count }, ... }
 * Example: { "Mountain View": { "18-25": 5, "26-35": 8 }, "San Jose": { "18-25": 3, "26-35": 10 } }
 */
const StackedBarCard = ({ title, subtitle, crossTabData }) => {
  const chartRef = useRef(null);

  // Extract unique categories (cities) and subcategories (age groups/housing statuses)
  const categories = Object.keys(crossTabData || {});
  const allSubcategories = new Set();
  
  categories.forEach((category) => {
    Object.keys(crossTabData[category] || {}).forEach((subcat) => {
      allSubcategories.add(subcat);
    });
  });

  const subcategories = Array.from(allSubcategories);

  const colors = generateColorPalette(subcategories.length, {
    offset: 30,
  });

  // Build datasets - one dataset per subcategory
  const datasets = subcategories.map((subcat, index) => ({
    label: subcat,
  data: categories.map((category) => crossTabData[category]?.[subcat] || 0),
  backgroundColor: applyAlpha(colors[index], 0.75),
  borderColor: colors[index],
    borderWidth: 2,
  }));

  const data = {
    labels: categories,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: defaultAnimations,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: {
            size: 11,
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          font: {
            size: 11,
          },
          padding: 8,
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
    },
  };

  const safeTitle = title?.toLowerCase().replace(/\s+/g, "-") || "chart";

  const handleExportChart = () => {
    if (!chartRef.current) {
      toast.error("Chart not found");
      return;
    }

    try {
      const base64Image = chartRef.current.toBase64Image();
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
    <div className="bg-white border rounded-lg p-4 relative group">
      <button
        onClick={handleExportChart}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm z-10"
        title="Download as PNG"
      >
        <Download size={16} className="text-gray-600" />
      </button>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div style={{ height: "300px" }}>
        <Bar ref={chartRef} data={data} options={options} />
      </div>
    </div>
  );
};

export default StackedBarCard;
