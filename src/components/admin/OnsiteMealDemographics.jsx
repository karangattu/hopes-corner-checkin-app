import React, { useMemo } from "react";
import { Users, PieChart } from "lucide-react";
import PieCardRecharts from "../charts/PieCardRecharts";
import { useAppContext } from "../../context/useAppContext";

const formatPercent = (part, total) => {
  if (!total || total <= 0) return "0%";
  const percent = (part / total) * 100;
  return `${percent.toFixed(percent >= 10 ? 0 : 1)}%`;
};

const resolveRecordDate = (record) => {
  if (!record) return null;
  const candidates = [record.date, record.recordedAt, record.createdAt];
  if (record.servedOn) {
    candidates.push(`${record.servedOn}T12:00:00`);
  }

  for (const value of candidates) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

const mapAgeGroupLabel = (rawAge) => {
  switch (rawAge) {
    case "Senior 60+":
      return "Seniors";
    case "Child 0-17":
      return "Youth";
    case "Adult 18-59":
      return "Adults";
    default:
      return "Unknown";
  }
};

const OnsiteMealDemographics = () => {
  const { mealRecords, extraMealRecords, guests } = useAppContext();

  const {
    totalIndividuals,
    chartData,
    ageSummary,
    housingSummary,
    reportingWindowLabel,
  } = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const onsiteYtdRecords = [
      ...(mealRecords || []),
      ...(extraMealRecords || []),
    ].filter((record) => {
      if (!record || !record.guestId) return false;
      if (record.type === "extra" && !record.guestId) return false;
      const recordDate = resolveRecordDate(record);
      if (!recordDate) return false;
      return recordDate >= startOfYear && recordDate <= now;
    });

    const guestIndex = new Map();
    (guests || []).forEach((guest) => {
      if (!guest) return;
      if (guest.id) guestIndex.set(guest.id, guest);
      if (guest.guestId) guestIndex.set(guest.guestId, guest);
    });

    const uniqueGuests = new Map();
    onsiteYtdRecords.forEach((record) => {
      const match = guestIndex.get(record.guestId);
      if (match && !uniqueGuests.has(match.id)) {
        uniqueGuests.set(match.id, match);
      }
    });

    const uniqueGuestList = Array.from(uniqueGuests.values());
    const total = uniqueGuestList.length;

    const ageBuckets = {
      Adults: 0,
      Seniors: 0,
      Youth: 0,
      Unknown: 0,
    };

    uniqueGuestList.forEach((guest) => {
      const label = mapAgeGroupLabel(guest?.age || guest?.age_group);
      ageBuckets[label] = (ageBuckets[label] || 0) + 1;
    });

    const totalWithAge = ageBuckets.Adults + ageBuckets.Seniors + ageBuckets.Youth;

    const chartMap = {
      Adults: ageBuckets.Adults,
      Seniors: ageBuckets.Seniors,
      Youth: ageBuckets.Youth,
    };
    if (ageBuckets.Unknown > 0) {
      chartMap["Unknown"] = ageBuckets.Unknown;
    }

    const housingDetails = {
      providedCount: 0,
      housed: 0,
      other: 0,
    };

    uniqueGuestList.forEach((guest) => {
      const status = (guest?.housingStatus || "").trim();
      if (!status) return;
      housingDetails.providedCount += 1;
      if (status.toLowerCase() === "housed") {
        housingDetails.housed += 1;
      } else {
        housingDetails.other += 1;
      }
    });

    const reportingLabel = (() => {
      const formatter = new Intl.DateTimeFormat("en-US", { month: "long" });
      const startMonth = formatter.format(startOfYear);
      const currentMonth = formatter.format(now);
      return `${startMonth} ${startOfYear.getFullYear()} – ${currentMonth} ${now.getFullYear()}`;
    })();

    return {
      totalIndividuals: total,
      chartData: chartMap,
      ageSummary: {
        adults: ageBuckets.Adults,
        seniors: ageBuckets.Seniors,
        youth: ageBuckets.Youth,
        unknown: ageBuckets.Unknown,
        totalWithAge,
      },
      housingSummary: housingDetails,
      reportingWindowLabel: reportingLabel,
    };
  }, [mealRecords, extraMealRecords, guests]);

  if (totalIndividuals === 0) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center gap-2 text-gray-800 mb-2">
          <PieChart size={18} />
          <h2 className="text-lg font-semibold">On-site Meal Guest Demographics</h2>
        </div>
        <p className="text-sm text-gray-600">
          No on-site meal attendance records with guest identifiers have been logged for the current year yet.
        </p>
      </div>
    );
  }

  const { adults, seniors, youth, unknown, totalWithAge } = ageSummary;
  const { providedCount, housed, other } = housingSummary;

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center gap-2 text-gray-800 mb-4">
        <PieChart size={18} />
        <h2 className="text-lg font-semibold">On-site Meal Guest Demographics</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        <div className="lg:col-span-2 space-y-3">
          <p className="text-sm text-gray-600">
            Year-to-date ({reportingWindowLabel}), the on-site meal program has served
            {" "}
            <span className="font-semibold text-gray-900">{totalIndividuals.toLocaleString()}</span>
            {" "}
            unduplicated guest{totalIndividuals === 1 ? "" : "s"}.
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <Users size={16} />
              Age demographics
              {totalWithAge !== totalIndividuals && (
                <span className="text-xs font-normal text-blue-700">
                  ({totalWithAge.toLocaleString()} guest{totalWithAge === 1 ? "" : "s"} with age info)
                </span>
              )}
            </div>
            <ul className="space-y-1 text-blue-800">
              <li>
                Adults: <span className="font-semibold">{adults.toLocaleString()}</span>
                {" "}({formatPercent(adults, totalWithAge)})
              </li>
              <li>
                Seniors: <span className="font-semibold">{seniors.toLocaleString()}</span>
                {" "}({formatPercent(seniors, totalWithAge)})
              </li>
              <li>
                Youth: <span className="font-semibold">{youth.toLocaleString()}</span>
                {" "}({formatPercent(youth, totalWithAge)})
              </li>
              {unknown > 0 && (
                <li>
                  Unknown: <span className="font-semibold">{unknown.toLocaleString()}</span>
                  {" "}({formatPercent(unknown, totalWithAge)})
                </li>
              )}
            </ul>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-sm text-green-900">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <Users size={16} />
              Housing status
              {providedCount !== totalIndividuals && (
                <span className="text-xs font-normal text-green-700">
                  ({providedCount.toLocaleString()} guest{providedCount === 1 ? "" : "s"} shared status)
                </span>
              )}
            </div>
            {providedCount > 0 ? (
              <ul className="space-y-1 text-green-800">
                <li>
                  Housed: <span className="font-semibold">{housed.toLocaleString()}</span>
                  {" "}({formatPercent(housed, providedCount)})
                </li>
                <li>
                  Unhoused / other: <span className="font-semibold">{other.toLocaleString()}</span>
                  {" "}({formatPercent(other, providedCount)})
                </li>
              </ul>
            ) : (
              <p className="text-green-700">
                No housing status information has been recorded for these guests.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <PieCardRecharts
            title="Age Breakdown"
            subtitle="Unique on-site meal guests (YTD)"
            dataMap={chartData}
          />
        </div>
      </div>
    </div>
  );
};

export default OnsiteMealDemographics;
