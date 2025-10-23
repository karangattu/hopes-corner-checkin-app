import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Heart, TrendingUp, Package } from "lucide-react";
import { useAppContext } from "../../context/useAppContext";
import { CHART_COLORS } from "./ChartTheme";

/**
 * DonationsChart - Specialized visualization for donation tracking
 *
 * Features:
 * - Daily donation volume chart
 * - Donation type breakdown (pie chart)
 * - Top donors list
 * - Weight/trays tracking
 * - Summary statistics
 *
 * @param {Object} props
 * @param {string} props.startDate - Start date in YYYY-MM-DD format
 * @param {string} props.endDate - End date in YYYY-MM-DD format
 */
const DonationsChart = ({ startDate, endDate }) => {
  const { donationRecords } = useAppContext();

  const filteredDonations = useMemo(() => {
    if (!donationRecords || donationRecords.length === 0) return [];

    return donationRecords.filter((donation) => {
      const donationDate = donation.dateKey || donation.date;
      if (!donationDate) return false;

      // Handle both ISO timestamps and date-only strings
      const dateStr = donationDate.split("T")[0];
      return dateStr >= startDate && dateStr <= endDate;
    });
  }, [donationRecords, startDate, endDate]);

  const analytics = useMemo(() => {
    if (filteredDonations.length === 0) {
      return {
        dailyData: [],
        byType: [],
        byDonor: [],
        totalDonations: 0,
        totalTrays: 0,
        totalWeight: 0,
        uniqueDonors: 0,
      };
    }

    // Daily breakdown
    const dailyMap = {};
    filteredDonations.forEach((donation) => {
      const dateStr = (donation.dateKey || donation.date).split("T")[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          count: 0,
          trays: 0,
          weight: 0,
        };
      }
      dailyMap[dateStr].count += 1;
      dailyMap[dateStr].trays += donation.trays || 0;
      dailyMap[dateStr].weight += donation.weightLbs || 0;
    });

    const dailyData = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // By donation type
    const typeMap = {};
    filteredDonations.forEach((donation) => {
      const type = donation.type || "Other";
      typeMap[type] = (typeMap[type] || 0) + 1;
    });

    const byType = Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // By donor
    const donorMap = {};
    filteredDonations.forEach((donation) => {
      const donor = donation.donor || "Anonymous";
      if (!donorMap[donor]) {
        donorMap[donor] = {
          donor,
          count: 0,
          trays: 0,
          weight: 0,
        };
      }
      donorMap[donor].count += 1;
      donorMap[donor].trays += donation.trays || 0;
      donorMap[donor].weight += donation.weightLbs || 0;
    });

    const byDonor = Object.values(donorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 donors

    return {
      dailyData,
      byType,
      byDonor,
      totalDonations: filteredDonations.length,
      totalTrays: filteredDonations.reduce((sum, d) => sum + (d.trays || 0), 0),
      totalWeight: filteredDonations.reduce((sum, d) => sum + (d.weightLbs || 0), 0),
      uniqueDonors: Object.keys(donorMap).length,
    };
  }, [filteredDonations]);

  if (analytics.totalDonations === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <Heart size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No donation data available</p>
          <p className="text-sm mt-1">
            Donation records will appear here once logged for this period
          </p>
        </div>
      </div>
    );
  }

  const DailyTooltip = ({ active, payload, label }) => {
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
        <div className="space-y-1 text-sm">
          <p className="text-gray-700">
            Donations: <span className="font-semibold">{payload[0]?.value || 0}</span>
          </p>
          {payload[1] && (
            <p className="text-gray-700">
              Trays: <span className="font-semibold">{payload[1].value}</span>
            </p>
          )}
          {payload[2] && (
            <p className="text-gray-700">
              Weight: <span className="font-semibold">{payload[2].value} lbs</span>
            </p>
          )}
        </div>
      </div>
    );
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Heart size={20} className="text-red-600" />
          Donation Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm text-red-800 mb-1">Total Donations</p>
            <p className="text-3xl font-bold text-red-900">
              {analytics.totalDonations}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Trays</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.totalTrays}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Weight</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.totalWeight}
            </p>
            <p className="text-xs text-gray-500 mt-1">pounds</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Unique Donors</p>
            <p className="text-3xl font-bold text-gray-900">
              {analytics.uniqueDonors}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Donations Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-600" />
          Daily Donation Volume
        </h3>

        <div style={{ height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.dailyData}>
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
              <Tooltip content={<DailyTooltip />} />
              <Legend wrapperStyle={{ paddingTop: "10px" }} />
              <Bar dataKey="count" name="Donations" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donation Types & Top Donors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donation Types Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package size={20} className="text-purple-600" />
            Donation Types
          </h3>

          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.byType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                >
                  {analytics.byType.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Donors List */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Heart size={20} className="text-red-600" />
            Top Donors
          </h3>

          <div className="space-y-3">
            {analytics.byDonor.map((donor, index) => (
              <div
                key={donor.donor}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      index === 0
                        ? "bg-yellow-500"
                        : index === 1
                          ? "bg-gray-400"
                          : index === 2
                            ? "bg-amber-600"
                            : "bg-gray-300"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{donor.donor}</p>
                    <p className="text-xs text-gray-500">
                      {donor.trays} trays • {donor.weight} lbs
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{donor.count}</p>
                  <p className="text-xs text-gray-500">donations</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationsChart;
