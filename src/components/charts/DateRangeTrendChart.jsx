import React, { useRef } from "react";
import { Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import { exportChartAsImage } from "../../utils/chartExport";

const PROGRAM_TYPES = [
  { value: "meals", label: "Meals", color: "#22c55e" },
  { value: "showers", label: "Showers", color: "#3b82f6" },
  { value: "laundry", label: "Laundry", color: "#a855f7" },
  { value: "haircuts", label: "Haircuts", color: "#f43f5e" },
  { value: "holidays", label: "Holidays", color: "#f59e0b" },
  { value: "bicycles", label: "Bicycles", color: "#06b6d4" },
];

const DateRangeTrendChart = ({ days, selectedPrograms, selectedMealTypes = [] }) => {
  const chartRef = useRef(null);

  const chartData = days.map(day => {
    // Calculate filtered meal total based on selected meal types
    const filteredMealTotal = day.mealsByType && selectedMealTypes.length > 0
      ? selectedMealTypes.reduce((sum, type) => sum + (day.mealsByType[type] || 0), 0)
      : day.meals;

    return {
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: day.date,
      ...day,
      meals: filteredMealTotal, // Override meals with filtered total
    };
  });

  const handleExportChart = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `date-range-report-${timestamp}.png`;
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
        <p className="font-semibold text-gray-800 mb-2">{new Date(data.fullDate).toLocaleDateString()}</p>
        <div className="space-y-1 text-sm">
          {selectedPrograms.includes('meals') && (
            <p className="text-green-600">Meals: {data.meals}</p>
          )}
          {selectedPrograms.includes('showers') && (
            <p className="text-blue-600">Showers: {data.showers}</p>
          )}
          {selectedPrograms.includes('laundry') && (
            <p className="text-purple-600">Laundry: {data.laundry}</p>
          )}
          {selectedPrograms.includes('haircuts') && (
            <p className="text-rose-600">Haircuts: {data.haircuts || 0}</p>
          )}
          {selectedPrograms.includes('holidays') && (
            <p className="text-amber-600">Holidays: {data.holidays || 0}</p>
          )}
          {selectedPrograms.includes('bicycles') && (
            <p className="text-cyan-600">Bicycles: {data.bicycles || 0}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={chartRef} className="bg-white border rounded-lg p-4 relative group">
      <button
        onClick={handleExportChart}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-2 shadow-sm z-10"
        title="Download as PNG"
      >
        <Download size={16} className="text-gray-600" />
      </button>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          
          {selectedPrograms.includes('meals') && (
            <Line 
              type="monotone" 
              dataKey="meals" 
              stroke="#22c55e" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Meals"
            />
          )}
          {selectedPrograms.includes('showers') && (
            <Line 
              type="monotone" 
              dataKey="showers" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Showers"
            />
          )}
          {selectedPrograms.includes('laundry') && (
            <Line 
              type="monotone" 
              dataKey="laundry" 
              stroke="#a855f7" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Laundry"
            />
          )}
          {selectedPrograms.includes('haircuts') && (
            <Line 
              type="monotone" 
              dataKey="haircuts" 
              stroke="#f43f5e" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Haircuts"
            />
          )}
          {selectedPrograms.includes('holidays') && (
            <Line 
              type="monotone" 
              dataKey="holidays" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Holidays"
            />
          )}
          {selectedPrograms.includes('bicycles') && (
            <Line 
              type="monotone" 
              dataKey="bicycles" 
              stroke="#06b6d4" 
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Bicycles"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DateRangeTrendChart;
