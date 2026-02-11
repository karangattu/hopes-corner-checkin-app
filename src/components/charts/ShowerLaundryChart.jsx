import React, { useRef, useMemo } from "react";
import { Download, ShowerHead, WashingMachine, FileText } from "lucide-react";
import { useDailyNotesStore } from "../../stores/useDailyNotesStore";
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
import toast from "react-hot-toast";
import { exportChartAsImage } from "../../utils/chartExport";
import { formatDateForDisplay } from "../../utils/date";

const ShowerLaundryChart = ({ days = [] }) => {
  const chartRef = useRef(null);
  const { getNotesForDateRange } = useDailyNotesStore();

  // Get date range from days data
  const dateRange = useMemo(() => {
    if (!days || days.length === 0) return { start: null, end: null };
    const dates = days.map(d => d.date).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [days]);

  // Get shower and laundry notes for this date range
  const serviceNotes = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const allNotes = getNotesForDateRange(dateRange.start, dateRange.end);
    return allNotes.filter(note => note.serviceType === 'showers' || note.serviceType === 'laundry');
  }, [dateRange, getNotesForDateRange]);

  // Create a map of notes by date for quick lookup
  const notesByDate = useMemo(() => {
    const map = {};
    serviceNotes.forEach(note => {
      if (!map[note.noteDate]) {
        map[note.noteDate] = [];
      }
      map[note.noteDate].push(note);
    });
    return map;
  }, [serviceNotes]);

  if (!days || days.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
        <div className="flex items-center justify-center gap-4 mb-2">
          <ShowerHead size={32} className="opacity-50" />
          <WashingMachine size={32} className="opacity-50" />
        </div>
        <p>No shower or laundry data available for the selected date range</p>
      </div>
    );
  }

  // Filter data to only include days with activity (showers > 0 OR laundry > 0)
  const filteredDays = days.filter(
    (day) => (day.showers || 0) > 0 || (day.laundry || 0) > 0,
  );

  if (filteredDays.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
        <div className="flex items-center justify-center gap-4 mb-2">
          <ShowerHead size={32} className="opacity-50" />
          <WashingMachine size={32} className="opacity-50" />
        </div>
        <p>No shower or laundry activity for the selected date range</p>
      </div>
    );
  }

  const chartData = filteredDays.map((day) => ({
    date: formatDateForDisplay(day.date, {
      month: "short",
      day: "numeric",
    }),
    fullDate: day.date,
    showers: day.showers || 0,
    laundry: day.laundry || 0,
  }));

  // Calculate totals
  const totalShowers = chartData.reduce((sum, day) => sum + day.showers, 0);
  const totalLaundry = chartData.reduce((sum, day) => sum + day.laundry, 0);

  const handleExportChart = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `showers-laundry-report-${timestamp}.png`;
      await exportChartAsImage(chartRef, filename);
      toast.success("Showers & Laundry chart downloaded as PNG!");
    } catch (error) {
      console.error("Error exporting chart:", error);
      toast.error("Failed to export chart");
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const notesForThisDate = notesByDate[data.fullDate] || [];

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
        <p className="font-semibold text-gray-800 mb-2">
          {formatDateForDisplay(data.fullDate)}
        </p>
        <div className="space-y-1 text-sm">
          <p className="text-blue-600 font-medium">
            <ShowerHead size={14} className="inline mr-1" />
            Showers: {data.showers}
          </p>
          <p className="text-purple-600 font-medium">
            <WashingMachine size={14} className="inline mr-1" />
            Laundry: {data.laundry}
          </p>
        </div>
        {notesForThisDate.length > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200 bg-amber-50 -m-3 mt-2 p-2 rounded-b-lg">
            <div className="flex items-center gap-1 mb-1">
              <FileText size={12} className="text-amber-700" />
              <span className="text-xs font-semibold text-amber-900">Notes:</span>
            </div>
            {notesForThisDate.map((note, idx) => (
              <div key={idx} className="text-xs text-amber-800 leading-relaxed mb-1 flex items-start gap-1">
                {note.serviceType === 'showers' ? (
                  <ShowerHead size={12} className="text-blue-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <WashingMachine size={12} className="text-purple-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{note.noteText}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <ShowerHead size={20} className="text-blue-600" />
            <WashingMachine size={20} className="text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            Showers & Laundry
          </h3>
          {serviceNotes.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full border border-amber-200 flex items-center gap-1">
              <FileText size={12} />
              {serviceNotes.length} {serviceNotes.length === 1 ? 'note' : 'notes'}
            </span>
          )}
        </div>
        <button
          onClick={handleExportChart}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Download as PNG"
        >
          <Download size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <ShowerHead size={18} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-600">
              Showers Booked
            </span>
          </div>
          <div className="text-3xl font-bold text-blue-900">{totalShowers}</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <WashingMachine size={18} className="text-purple-600" />
            <span className="text-sm font-medium text-gray-600">
              Laundry Loads
            </span>
          </div>
          <div className="text-3xl font-bold text-purple-900">
            {totalLaundry}
          </div>
        </div>
      </div>

      {/* Line chart for trends */}
      <div ref={chartRef} className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
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

            <Line
              type="monotone"
              dataKey="showers"
              name="Showers Booked"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: "#3b82f6" }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="laundry"
              name="Laundry Loads"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ r: 4, fill: "#a855f7" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ShowerLaundryChart;
