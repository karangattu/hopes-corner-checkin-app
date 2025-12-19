'use client';

import React, { useMemo } from 'react';
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
} from 'recharts';
import { Heart, TrendingUp, Package } from 'lucide-react';
import { CHART_COLOR_PALETTE, CHART_TOOLTIP_STYLE, CHART_GRID_STYLE } from './ChartTheme';
import { formatDateForDisplay } from '@/utils/date';

interface Donation {
  dateKey?: string;
  date?: string;
  donor?: string;
  type?: string;
  trays?: number;
  weightLbs?: number;
}

interface DonationsChartProps {
  donationRecords: Donation[];
  startDate: string;
  endDate: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DailyTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={CHART_TOOLTIP_STYLE.contentStyle} className="p-4">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {formatDateForDisplay(label, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}
      </p>
      <div className="space-y-1 text-sm">
        <p className="text-gray-700 dark:text-gray-300">
          Donations: <span className="font-semibold">{payload[0]?.value || 0}</span>
        </p>
        {payload[1] && (
          <p className="text-gray-700 dark:text-gray-300">
            Trays: <span className="font-semibold">{payload[1].value}</span>
          </p>
        )}
        {payload[2] && (
          <p className="text-gray-700 dark:text-gray-300">
            Weight: <span className="font-semibold">{payload[2].value} lbs</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function DonationsChart({ donationRecords, startDate, endDate }: DonationsChartProps) {
  const filteredDonations = useMemo(() => {
    if (!donationRecords || donationRecords.length === 0) return [];

    return donationRecords.filter((donation) => {
      const donationDate = donation.dateKey || donation.date;
      if (!donationDate) return false;

      const dateStr = donationDate.split('T')[0];
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
    const dailyMap: Record<string, { date: string; count: number; trays: number; weight: number }> = {};
    filteredDonations.forEach((donation) => {
      const dateStr = (donation.dateKey || donation.date || '').split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, count: 0, trays: 0, weight: 0 };
      }
      dailyMap[dateStr].count += 1;
      dailyMap[dateStr].trays += donation.trays || 0;
      dailyMap[dateStr].weight = Math.round((dailyMap[dateStr].weight + (donation.weightLbs || 0)) * 10) / 10;
    });

    const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // By donation type
    const typeMap: Record<string, number> = {};
    filteredDonations.forEach((donation) => {
      const type = donation.type || 'Other';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });

    const byType = Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // By donor
    const donorMap: Record<string, { donor: string; count: number; trays: number; weight: number }> = {};
    filteredDonations.forEach((donation) => {
      const donor = donation.donor || 'Anonymous';
      if (!donorMap[donor]) {
        donorMap[donor] = { donor, count: 0, trays: 0, weight: 0 };
      }
      donorMap[donor].count += 1;
      donorMap[donor].trays += donation.trays || 0;
      donorMap[donor].weight = Math.round((donorMap[donor].weight + (donation.weightLbs || 0)) * 10) / 10;
    });

    const byDonor = Object.values(donorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      dailyData,
      byType,
      byDonor,
      totalDonations: filteredDonations.length,
      totalTrays: filteredDonations.reduce((sum, d) => sum + (d.trays || 0), 0),
      totalWeight: Math.round(
        filteredDonations.reduce((sum, d) => sum + (d.weightLbs || 0), 0) * 10
      ) / 10,
      uniqueDonors: Object.keys(donorMap).length,
    };
  }, [filteredDonations]);

  if (analytics.totalDonations === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Heart size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium">No donation data available</p>
          <p className="text-sm mt-1">
            Donation records will appear here once logged for this period
          </p>
        </div>
      </div>
    );
  }

  const RADIAN = Math.PI / 180;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Heart size={20} className="text-red-600" />
          Donation Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300 mb-1">Total Donations</p>
            <p className="text-3xl font-bold text-red-900 dark:text-red-200">
              {analytics.totalDonations}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Trays</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {analytics.totalTrays}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Weight</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {analytics.totalWeight}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">pounds</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unique Donors</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {analytics.uniqueDonors}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Donations Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-600" />
          Daily Donation Volume
        </h3>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.dailyData}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  formatDateForDisplay(value, { month: 'short', day: 'numeric' })
                }
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<DailyTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar
                dataKey="count"
                name="Donations"
                fill={CHART_COLOR_PALETTE[0]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donation Types & Top Donors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donation Types Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Package size={20} className="text-purple-600" />
            Donation Types
          </h3>

          <div className="h-80">
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
                  {analytics.byType.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Heart size={20} className="text-red-600" />
            Top Donors
          </h3>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {analytics.byDonor.map((donor, index) => (
              <div
                key={donor.donor}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      index === 0
                        ? 'bg-yellow-500'
                        : index === 1
                        ? 'bg-gray-400'
                        : index === 2
                        ? 'bg-amber-600'
                        : 'bg-gray-300'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{donor.donor}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {donor.trays} trays • {donor.weight.toFixed(1)} lbs
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {donor.count}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">donations</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DonationsChart;
