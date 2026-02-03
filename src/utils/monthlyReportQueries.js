import { supabase, assertSupabase } from "../supabaseClient";
import { LAUNDRY_STATUS } from "../context/constants";

/**
 * Default page size for paginated queries
 */
const PAGE_SIZE = 1000;

/**
 * Get the start and end dates for a given month
 * @param {number} year - Full year (e.g., 2024)
 * @param {number} month - Month (1-12)
 * @returns {{ startDate: string, endDate: string }}
 */
export const getMonthDateRange = (year, month) => {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
};

/**
 * Get the YTD date range (Jan 1 to end of selected month)
 * @param {number} year - Full year
 * @param {number} month - Month (1-12)
 * @returns {{ startDate: string, endDate: string }}
 */
export const getYTDDateRange = (year, month) => {
  const startDate = `${year}-01-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
};

/**
 * Fetch meal counts by type for a date range
 * Uses pagination to ensure all records are fetched (Supabase default limit is 1000)
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<{ guest: number, rv: number, lunchBag: number, dayWorker: number, total: number }>}
 */
export const fetchMealCounts = async (startDate, endDate) => {
  assertSupabase();

  const counts = {
    guest: 0,
    rv: 0,
    lunchBag: 0,
    dayWorker: 0,
    total: 0,
  };

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("meal_attendance")
      .select("meal_type, quantity")
      .gte("served_on", startDate)
      .lte("served_on", endDate)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching meal counts:", error);
      throw error;
    }

    const rows = data || [];

    rows.forEach((record) => {
      const qty = record.quantity || 1;
      counts.total += qty;

      switch (record.meal_type) {
        case "guest":
          counts.guest += qty;
          break;
        case "rv":
          counts.rv += qty;
          break;
        case "lunch_bag":
          counts.lunchBag += qty;
          break;
        case "day_worker":
          counts.dayWorker += qty;
          break;
        // Extra, shelter, united_effort are grouped into guest for reporting
        case "extra":
        case "shelter":
        case "united_effort":
          counts.guest += qty;
          break;
        default:
          counts.guest += qty;
      }
    });

    offset += PAGE_SIZE;
    hasMore = rows.length === PAGE_SIZE;
  }

  return counts;
};

/**
 * Fetch shower count for a date range
 * Uses scheduled_for column (date type) and status 'done' for completed showers
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<number>}
 */
export const fetchShowerCount = async (startDate, endDate) => {
  assertSupabase();

  const { count, error } = await supabase
    .from("shower_reservations")
    .select("*", { count: "exact", head: true })
    .gte("scheduled_for", startDate)
    .lte("scheduled_for", endDate)
    .eq("status", "done");

  if (error) {
    console.error("Error fetching shower count:", error);
    throw error;
  }

  return count || 0;
};

/**
 * Fetch laundry count for a date range
 * Uses scheduled_for column (date type)
 * Includes completed statuses: done, picked_up, returned, offsite_picked_up
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<number>}
 */
export const fetchLaundryCount = async (startDate, endDate) => {
  assertSupabase();

  const completedLaundryStatuses = new Set(
    [
      LAUNDRY_STATUS?.DONE,
      LAUNDRY_STATUS?.PICKED_UP,
      LAUNDRY_STATUS?.RETURNED,
      LAUNDRY_STATUS?.OFFSITE_PICKED_UP,
    ]
      .filter(Boolean)
      .map((value) => value.toString().toLowerCase()),
  );

  let offset = 0;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    const { data, error } = await supabase
      .from("laundry_bookings")
      .select("status")
      .gte("scheduled_for", startDate)
      .lte("scheduled_for", endDate)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching laundry count:", error);
      throw error;
    }

    const rows = data || [];

    rows.forEach((record) => {
      const status = (record?.status || "").toString().toLowerCase();
      if (completedLaundryStatuses.has(status)) {
        total += 1;
      }
    });

    offset += PAGE_SIZE;
    hasMore = rows.length === PAGE_SIZE;
  }

  return total;
};

/**
 * Fetch bicycle repair counts (service vs gifted/new bicycles)
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<{ service: number, gifted: number }>}
 */
export const fetchBicycleCounts = async (startDate, endDate) => {
  assertSupabase();

  const { data, error } = await supabase
    .from("bicycle_repairs")
    .select("repair_types, status")
    .gte("requested_at", `${startDate}T00:00:00`)
    .lte("requested_at", `${endDate}T23:59:59`)
    .in("status", ["done", "in_progress"]);

  if (error) {
    console.error("Error fetching bicycle counts:", error);
    throw error;
  }

  let service = 0;
  let gifted = 0;

  (data || []).forEach((record) => {
    const repairTypes = record.repair_types || [];
    // If "New Bicycle" is in the repair types, count as gifted
    if (repairTypes.includes("New Bicycle")) {
      gifted += 1;
    } else {
      service += 1;
    }
  });

  return { service, gifted };
};

/**
 * Fetch haircut count for a date range
 * Uses served_at column (timestamptz type)
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<number>}
 */
export const fetchHaircutCount = async (startDate, endDate) => {
  assertSupabase();

  const { count, error } = await supabase
    .from("haircut_visits")
    .select("*", { count: "exact", head: true })
    .gte("served_at", `${startDate}T00:00:00`)
    .lte("served_at", `${endDate}T23:59:59`);

  if (error) {
    console.error("Error fetching haircut count:", error);
    throw error;
  }

  return count || 0;
};

/**
 * Fetch guest IDs who received meals in a date range (for demographics)
 * Uses pagination to ensure all records are fetched
 * Filter out null guest_ids in JavaScript since .not() may not work with proxy
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<string[]>}
 */
export const fetchActiveGuestIds = async (startDate, endDate) => {
  assertSupabase();

  const allGuestIds = new Set();
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("meal_attendance")
      .select("guest_id")
      .gte("served_on", startDate)
      .lte("served_on", endDate)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching active guest IDs:", error);
      throw error;
    }

    const rows = data || [];
    rows.forEach((r) => {
      if (r.guest_id != null) {
        allGuestIds.add(r.guest_id);
      }
    });

    offset += PAGE_SIZE;
    hasMore = rows.length === PAGE_SIZE;
  }

  return [...allGuestIds];
};

/**
 * Fetch demographics for a set of guest IDs
 * Batches queries to handle large guest lists (Supabase IN clause has limits)
 * @param {string[]} guestIds - Array of guest IDs
 * @returns {Promise<{ housingStatus: Object, locations: Object, ageGroups: Object }>}
 */
export const fetchGuestDemographics = async (guestIds) => {
  assertSupabase();

  if (!guestIds || guestIds.length === 0) {
    return {
      housingStatus: {},
      locations: {},
      ageGroups: {},
      totalGuests: 0,
    };
  }

  const housingStatus = {};
  const locations = {};
  const ageGroups = {};
  let totalGuests = 0;

  // Batch guest IDs to avoid IN clause limits (typically 500-1000 items)
  const BATCH_SIZE = 500;
  for (let i = 0; i < guestIds.length; i += BATCH_SIZE) {
    const batch = guestIds.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from("guests")
      .select("housing_status, location, age_group")
      .in("id", batch);

    if (error) {
      console.error("Error fetching guest demographics:", error);
      throw error;
    }

    (data || []).forEach((guest) => {
      totalGuests += 1;

      // Housing status
      const housing = guest.housing_status || "Unknown";
      housingStatus[housing] = (housingStatus[housing] || 0) + 1;

      // Location
      const location = guest.location || "Unknown";
      locations[location] = (locations[location] || 0) + 1;

      // Age group
      const ageGroup = guest.age_group || "Unknown";
      ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
    });
  }

  return {
    housingStatus,
    locations,
    ageGroups,
    totalGuests,
  };
};

/**
 * Fetch all monthly report data in one call
 * @param {number} year - Full year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>}
 */
export const fetchMonthlyReportData = async (year, month) => {
  const monthRange = getMonthDateRange(year, month);
  const ytdRange = getYTDDateRange(year, month);

  // Fetch all data in parallel
  const [
    monthMeals,
    ytdMeals,
    monthShowers,
    ytdShowers,
    monthLaundry,
    ytdLaundry,
    monthBicycles,
    ytdBicycles,
    monthHaircuts,
    ytdHaircuts,
    monthGuestIds,
  ] = await Promise.all([
    fetchMealCounts(monthRange.startDate, monthRange.endDate),
    fetchMealCounts(ytdRange.startDate, ytdRange.endDate),
    fetchShowerCount(monthRange.startDate, monthRange.endDate),
    fetchShowerCount(ytdRange.startDate, ytdRange.endDate),
    fetchLaundryCount(monthRange.startDate, monthRange.endDate),
    fetchLaundryCount(ytdRange.startDate, ytdRange.endDate),
    fetchBicycleCounts(monthRange.startDate, monthRange.endDate),
    fetchBicycleCounts(ytdRange.startDate, ytdRange.endDate),
    fetchHaircutCount(monthRange.startDate, monthRange.endDate),
    fetchHaircutCount(ytdRange.startDate, ytdRange.endDate),
    fetchActiveGuestIds(monthRange.startDate, monthRange.endDate),
  ]);

  // Fetch demographics for active guests (those who received meals)
  const demographics = await fetchGuestDemographics(monthGuestIds);

  return {
    month: {
      meals: monthMeals,
      showers: monthShowers,
      laundry: monthLaundry,
      bicycles: monthBicycles,
      haircuts: monthHaircuts,
    },
    ytd: {
      meals: ytdMeals,
      showers: ytdShowers,
      laundry: ytdLaundry,
      bicycles: ytdBicycles,
      haircuts: ytdHaircuts,
    },
    demographics,
    dateRange: {
      month: monthRange,
      ytd: ytdRange,
    },
  };
};
