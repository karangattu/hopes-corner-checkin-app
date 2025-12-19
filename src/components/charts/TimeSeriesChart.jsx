import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CHART_COLORS } from "./ChartTheme";
import { formatDateForDisplay } from "../../utils/date";

/**
 * TimeSeriesChart - Universal time-series visualization component
 *
 * Features:
 * - Line or area chart modes
 * - Multiple series support
 * - Automatic trend detection
 * - Custom tooltips with contextual information
 * - Responsive design
 *
 * @param {Object} props
 * @param {Array} props.data - Array of data points with date and value properties
 * @param {Array<Object>} props.series - Array of series configurations
 * @param {string} props.series[].key - Data key for this series
 * @param {string} props.series[].name - Display name
 * @param {string} props.series[].color - Color code
 * @param {string} props.type - 'line' | 'area' (default: 'line')
 * @param {string} props.title - Chart title
 * @param {string} props.subtitle - Chart subtitle
 * @param {boolean} props.showTrend - Show trend indicator (default: true)
 * @param {string} props.height - Chart height (default: '400px')
 */
const TimeSeriesChart = ({
  data = [],
  series = [],
  type = "line",
  title,
  subtitle,
  showTrend = true,
  height = "400px",
}) => {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      date: item.date,
      dateFormatted: formatDateForDisplay(item.date, {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [data]);

  const trendAnalysis = useMemo(() => {
    if (!showTrend || !series.length || chartData.length < 2) return null;

    // Analyze primary series (first one)
    const primaryKey = series[0].key;
    const values = chartData.map((d) => d[primaryKey] || 0);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const avgFirst =
      firstHalf.reduce((sum, v) => sum + v, 0) / (firstHalf.length || 1);
    const avgSecond =
      secondHalf.reduce((sum, v) => sum + v, 0) / (secondHalf.length || 1);

    const percentChange =
      avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;

    let trend = "stable";
    let icon = Minus;
    let color = "text-gray-600";

    if (percentChange > 5) {
      trend = "increasing";
      icon = TrendingUp;
      color = "text-green-600";
    } else if (percentChange < -5) {
      trend = "decreasing";
      icon = TrendingDown;
      color = "text-red-600";
    }

    return {
      trend,
      percentChange,
      icon,
      color,
      avgFirst: Math.round(avgFirst),
      avgSecond: Math.round(avgSecond),
    };
  }, [chartData, series, showTrend]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-2">
          {formatDateForDisplay(label, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700">{entry.name}:</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {typeof entry.value === "number"
                  ? entry.value.toLocaleString()
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm mt-1">
            Select a different time range to see data
          </p>
        </div>
      </div>
    );
  }

  const ChartComponent = type === "area" ? AreaChart : LineChart;
  const DataComponent = type === "area" ? Area : Line;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-4">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}

        {/* Trend Indicator */}
        {trendAnalysis && (
          <div
            className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${trendAnalysis.trend === "increasing"
                ? "bg-green-50 border-green-200"
                : trendAnalysis.trend === "decreasing"
                  ? "bg-red-50 border-red-200"
                  : "bg-gray-50 border-gray-200"
              }`}
          >
            {React.createElement(trendAnalysis.icon, {
              size: 16,
              className: trendAnalysis.color,
            })}
            <span className={`text-sm font-medium ${trendAnalysis.color}`}>
              {trendAnalysis.trend === "increasing" && "Trending up"}
              {trendAnalysis.trend === "decreasing" && "Trending down"}
              {trendAnalysis.trend === "stable" && "Stable"}
            </span>
            <span className="text-xs text-gray-600">
              {Math.abs(trendAnalysis.percentChange).toFixed(1)}% vs previous
              period
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
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
            stroke="#6b7280"
          />
          <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: "10px" }} />

          {series.map((s, index) => {
            const props = {
              key: s.key,
              type: "monotone",
              dataKey: s.key,
              name: s.name,
              stroke: s.color || CHART_COLORS[index % CHART_COLORS.length],
              strokeWidth: 2,
              dot: { r: 3 },
              activeDot: { r: 5 },
            };

            if (type === "area") {
              props.fill = s.color || CHART_COLORS[index % CHART_COLORS.length];
              props.fillOpacity = 0.3;
            }

            return React.createElement(DataComponent, props);
          })}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Summary Stats */}
      {series.length > 0 && chartData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {series.map((s) => {
              const values = chartData.map((d) => d[s.key] || 0);
              const total = values.reduce((sum, v) => sum + v, 0);
              const avg = total / (values.length || 1);
              const max = Math.max(...values);
              const min = Math.min(...values);

              return (
                <div key={s.key} className="text-center">
                  <p className="text-xs text-gray-600 mb-1">{s.name}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {Math.round(avg).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">avg/day</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {min.toLocaleString()} - {max.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSeriesChart;
