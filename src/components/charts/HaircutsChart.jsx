import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Scissors } from "lucide-react";
import { CHART_COLORS } from "./ChartTheme";

/**
 * HaircutsChart - Specialized visualization for haircut services
 *
 * Features:
 * - Bar chart showing daily haircut counts
 * - Summary statistics (total, average, peak day)
 * - Comparison to target if provided
 *
 * @param {Object} props
 * @param {Array} props.days - Array of daily metrics with haircuts property
 * @param {number} props.target - Optional monthly target
 */
const HaircutsChart = ({ days = [], target = null }) => {
  if (!days || days.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <Scissors size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No haircut data available</p>
          <p className="text-sm mt-1">Haircut records will appear here once logged</p>
        </div>
      </div>
    );
  }

  const chartData = days.map((day) => ({
    date: day.date,
    dateFormatted: new Date(day.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    haircuts: day.haircuts || 0,
  }));

  const totalHaircuts = chartData.reduce((sum, d) => sum + d.haircuts, 0);
  const avgPerDay = totalHaircuts / (chartData.length || 1);
  const peakDay = chartData.reduce(
    (max, d) => (d.haircuts > max.haircuts ? d : max),
    chartData[0]
  );

  const targetProgress = target ? (totalHaircuts / target) * 100 : null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">
          {new Date(label).toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scissors size={14} className="text-yellow-600" />
            <span className="text-sm text-gray-700">Haircuts:</span>
            <span className="text-sm font-semibold text-gray-900">
              {payload[0].value}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Scissors size={20} className="text-yellow-600" />
            Haircut Services
          </h3>
          <p className="text-sm text-gray-600 mt-1">Daily haircut service volume</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-800 mb-1">Total Haircuts</p>
          <p className="text-2xl font-bold text-yellow-900">{totalHaircuts}</p>
          {target && (
            <p className="text-xs text-yellow-600 mt-1">
              {targetProgress.toFixed(0)}% of target ({target})
            </p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Daily Average</p>
          <p className="text-2xl font-bold text-gray-900">
            {avgPerDay.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">per service day</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Peak Day</p>
          <p className="text-2xl font-bold text-gray-900">{peakDay.haircuts}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(peakDay.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              }
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "10px" }} />
            <Bar dataKey="haircuts" name="Haircuts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          {totalHaircuts > 0 ? (
            <>
              <span className="font-semibold">{totalHaircuts}</span> haircuts provided
              across <span className="font-semibold">{chartData.length}</span> days
              (avg <span className="font-semibold">{avgPerDay.toFixed(1)}</span> per day).
              {peakDay.haircuts > avgPerDay * 1.5 && (
                <> Peak demand on{" "}
                  <span className="font-semibold">
                    {new Date(peakDay.date).toLocaleDateString(undefined, {
                      weekday: "long",
                    })}
                  </span> with {peakDay.haircuts} haircuts.
                </>
              )}
            </>
          ) : (
            "No haircuts recorded in this period."
          )}
        </p>
      </div>
    </div>
  );
};

export default HaircutsChart;
