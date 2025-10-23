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
  ReferenceLine,
} from "recharts";
import { Gift, Calendar } from "lucide-react";
import { CHART_COLORS } from "./ChartTheme";

/**
 * HolidaysChart - Specialized visualization for holiday services
 *
 * Features:
 * - Bar chart showing daily holiday service counts
 * - Event markers for high-volume days
 * - Summary statistics (total, average, peak day)
 * - Comparison to target if provided
 *
 * @param {Object} props
 * @param {Array} props.days - Array of daily metrics with holidays property
 * @param {number} props.target - Optional monthly target
 */
const HolidaysChart = ({ days = [], target = null }) => {
  if (!days || days.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <Gift size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No holiday service data available</p>
          <p className="text-sm mt-1">Holiday service records will appear here once logged</p>
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
    holidays: day.holidays || 0,
  }));

  const totalHolidays = chartData.reduce((sum, d) => sum + d.holidays, 0);
  const avgPerDay = totalHolidays / (chartData.length || 1);
  const peakDay = chartData.reduce(
    (max, d) => (d.holidays > max.holidays ? d : max),
    chartData[0]
  );

  // Identify special event days (days with unusually high counts)
  const eventThreshold = avgPerDay * 2;
  const eventDays = chartData.filter((d) => d.holidays > eventThreshold);

  const targetProgress = target ? (totalHolidays / target) * 100 : null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const isEventDay = payload[0].value > eventThreshold;

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
            <Gift size={14} className="text-pink-600" />
            <span className="text-sm text-gray-700">Holiday Services:</span>
            <span className="text-sm font-semibold text-gray-900">
              {payload[0].value}
            </span>
          </div>
          {isEventDay && (
            <div className="mt-2 px-2 py-1 bg-pink-100 rounded text-xs text-pink-800">
              Special Event Day
            </div>
          )}
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
            <Gift size={20} className="text-pink-600" />
            Holiday Services
          </h3>
          <p className="text-sm text-gray-600 mt-1">Daily holiday service volume</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
          <p className="text-sm text-pink-800 mb-1">Total Services</p>
          <p className="text-2xl font-bold text-pink-900">{totalHolidays}</p>
          {target && (
            <p className="text-xs text-pink-600 mt-1">
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
          <p className="text-2xl font-bold text-gray-900">{peakDay.holidays}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(peakDay.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Event Days</p>
          <p className="text-2xl font-bold text-gray-900">{eventDays.length}</p>
          <p className="text-xs text-gray-500 mt-1">high volume days</p>
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
            {eventThreshold > 0 && (
              <ReferenceLine
                y={eventThreshold}
                stroke="#ec4899"
                strokeDasharray="3 3"
                label={{ value: "Event Threshold", position: "right", fontSize: 10 }}
              />
            )}
            <Bar
              dataKey="holidays"
              name="Holiday Services"
              fill="#ec4899"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            {totalHolidays > 0 ? (
              <>
                <span className="font-semibold">{totalHolidays}</span> holiday services
                provided across <span className="font-semibold">{chartData.length}</span>{" "}
                days (avg <span className="font-semibold">{avgPerDay.toFixed(1)}</span>{" "}
                per day).
                {eventDays.length > 0 && (
                  <>
                    {" "}Identified <span className="font-semibold">{eventDays.length}</span>{" "}
                    high-volume event day{eventDays.length > 1 ? "s" : ""}.
                  </>
                )}
              </>
            ) : (
              "No holiday services recorded in this period."
            )}
          </p>
        </div>

        {/* Event Days List */}
        {eventDays.length > 0 && (
          <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
            <p className="text-sm font-semibold text-pink-900 mb-2 flex items-center gap-2">
              <Calendar size={14} />
              Special Event Days
            </p>
            <div className="space-y-1">
              {eventDays.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-pink-800">
                    {new Date(day.date).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="font-semibold text-pink-900">
                    {day.holidays} services
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidaysChart;
