'use client';

import React, { useMemo } from 'react';
import { Users, Home } from 'lucide-react';
import { PieCardRecharts } from '../charts';

// Types
interface Guest {
  id: string;
  guestId?: string;
  age?: string;
  housingStatus?: string;
  [key: string]: unknown;
}

interface MealRecord {
  id: string;
  guestId?: string;
  date?: string | Date;
  count?: number;
  [key: string]: unknown;
}

interface OnsiteMealDemographicsProps {
  guests: Guest[];
  mealRecords: MealRecord[];
  extraMealRecords: MealRecord[];
  reportYear?: number;
}

// Age group mapping utilities
const AGE_GROUP_MAP: Record<string, string> = {
  'Adult 18-59': 'Adults',
  'Senior 60+': 'Seniors',
  'Child 0-17': 'Youth',
};

const mapAgeGroupLabel = (age: string | undefined): string => {
  if (!age) return 'Unknown';
  return AGE_GROUP_MAP[age] || age;
};

const formatPercent = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

const resolveRecordDate = (record: MealRecord): Date | null => {
  if (!record.date) return null;
  if (record.date instanceof Date) return record.date;
  const parsed = new Date(record.date);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * OnsiteMealDemographics - Year-to-date demographic breakdown of on-site meal guests
 * Shows age group distribution and housing status analysis using pie charts
 */
const OnsiteMealDemographics: React.FC<OnsiteMealDemographicsProps> = ({
  guests,
  mealRecords,
  extraMealRecords,
  reportYear,
}) => {
  const currentYear = reportYear ?? new Date().getFullYear();

  // Calculate demographic data
  const demographicData = useMemo(() => {
    // Build a guest lookup map
    const guestMap = new Map<string, Guest>();
    guests.forEach((guest) => {
      const id = guest.id || guest.guestId;
      if (id) {
        guestMap.set(String(id), guest);
      }
    });

    // Filter records to current year and get unique guests
    const uniqueGuestIds = new Set<string>();
    
    const filterAndAddGuests = (records: MealRecord[]) => {
      records.forEach((record) => {
        const date = resolveRecordDate(record);
        if (!date) return;
        if (date.getFullYear() !== currentYear) return;
        if (record.guestId) {
          uniqueGuestIds.add(String(record.guestId));
        }
      });
    };

    filterAndAddGuests(mealRecords);
    filterAndAddGuests(extraMealRecords);

    // Count by age group
    const ageCounts: Record<string, number> = {
      Adults: 0,
      Seniors: 0,
      Youth: 0,
      Unknown: 0,
    };

    // Count by housing status
    const housingCounts: Record<string, number> = {};

    uniqueGuestIds.forEach((guestId) => {
      const guest = guestMap.get(guestId);
      
      // Age group
      const ageGroup = mapAgeGroupLabel(guest?.age);
      if (ageCounts[ageGroup] !== undefined) {
        ageCounts[ageGroup]++;
      } else {
        ageCounts.Unknown++;
      }

      // Housing status
      const housing = guest?.housingStatus || 'Unknown';
      housingCounts[housing] = (housingCounts[housing] || 0) + 1;
    });

    const totalGuests = uniqueGuestIds.size;

    // Format for pie charts
    const ageData = Object.entries(ageCounts)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
        fill: name === 'Adults' ? '#3b82f6' : 
              name === 'Seniors' ? '#f59e0b' : 
              name === 'Youth' ? '#10b981' : '#9ca3af',
      }));

    const housingData = Object.entries(housingCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], index) => ({
        name,
        value,
        fill: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
          '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
        ][index % 8],
      }));

    return {
      totalGuests,
      ageCounts,
      ageData,
      housingCounts,
      housingData,
    };
  }, [guests, mealRecords, extraMealRecords, currentYear]);

  const { totalGuests, ageCounts, ageData, housingData } = demographicData;

  if (totalGuests === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="text-center text-gray-500">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2">No on-site meal data available for {currentYear}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-emerald-100 p-2">
            <Users size={24} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              On-Site Meal Demographics - {currentYear}
            </h2>
            <p className="text-sm text-gray-600">
              Year-to-date breakdown of unique guests served
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{totalGuests}</p>
            <p className="text-xs font-medium text-blue-600">Unique Guests</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{ageCounts.Adults}</p>
            <p className="text-xs font-medium text-blue-600">
              Adults ({formatPercent(ageCounts.Adults, totalGuests)})
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{ageCounts.Seniors}</p>
            <p className="text-xs font-medium text-amber-600">
              Seniors ({formatPercent(ageCounts.Seniors, totalGuests)})
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{ageCounts.Youth}</p>
            <p className="text-xs font-medium text-emerald-600">
              Youth ({formatPercent(ageCounts.Youth, totalGuests)})
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Age Distribution */}
        <PieCardRecharts
          title="Age Group Distribution"
          subtitle={`${totalGuests} unique guests served YTD`}
          data={ageData}
          icon={Users}
          iconColor="text-blue-600"
        />

        {/* Housing Status */}
        <PieCardRecharts
          title="Housing Status"
          subtitle="Distribution by housing situation"
          data={housingData}
          icon={Home}
          iconColor="text-emerald-600"
        />
      </div>

      {/* Detailed Housing Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Home size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Housing Status Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Housing Status
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  Count
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody>
              {housingData.map((item, index) => (
                <tr
                  key={item.name}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      {item.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {item.value.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatPercent(item.value, totalGuests)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OnsiteMealDemographics;
