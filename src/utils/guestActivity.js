/**
 * Utility functions for tracking guest activity status
 */

import { pacificDateStringFrom } from "./date";

/**
 * Check if a guest has received meal service in the last 7 days
 * @param {string} guestId - The guest's ID
 * @param {Array} mealRecords - Array of meal records
 * @returns {Object} - { isRecent: boolean, lastMealDate: Date|null, daysAgo: number|null }
 */
export const getLastMealDate = (guestId, mealRecords = []) => {
  if (!guestId || !Array.isArray(mealRecords) || mealRecords.length === 0) {
    return { isRecent: false, lastMealDate: null, daysAgo: null };
  }

  // Find all meal records for this guest, sorted by date descending
  const guestMealRecords = mealRecords
    .filter((record) => record?.guestId === guestId)
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

  if (guestMealRecords.length === 0) {
    return { isRecent: false, lastMealDate: null, daysAgo: null };
  }

  const lastRecord = guestMealRecords[0];
  const lastMealDate = new Date(lastRecord.date);
  const now = new Date();

  // Calculate days ago using Pacific timezone
  const lastMealPacificStr = pacificDateStringFrom(lastMealDate);
  const todayPacificStr = pacificDateStringFrom(now);

  const [lastYear, lastMonth, lastDay] = lastMealPacificStr
    .split("-")
    .map(Number);
  const [todayYear, todayMonth, todayDay] = todayPacificStr
    .split("-")
    .map(Number);

  const lastMealLocal = new Date(lastYear, lastMonth - 1, lastDay);
  const todayLocal = new Date(todayYear, todayMonth - 1, todayDay);

  const diffMs = todayLocal - lastMealLocal;
  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const isRecent = daysAgo >= 0 && daysAgo <= 6; // 0-6 days ago means within 7 days

  return {
    isRecent,
    lastMealDate,
    daysAgo,
  };
};

/**
 * Check if a guest is considered "active" - has received meal service in the last 7 days
 * @param {string} guestId - The guest's ID
 * @param {Array} mealRecords - Array of meal records
 * @returns {boolean} - True if guest received meal in last 7 days
 */
export const isActiveGuest = (guestId, mealRecords = []) => {
  const { isRecent } = getLastMealDate(guestId, mealRecords);
  return isRecent;
};

/**
 * Get a label describing when a guest last received meals
 * @param {string} guestId - The guest's ID
 * @param {Array} mealRecords - Array of meal records
 * @returns {string} - A human-readable label like "3 days ago" or empty string if no meals
 */
export const getLastMealLabel = (guestId, mealRecords = []) => {
  const { lastMealDate, daysAgo } = getLastMealDate(
    guestId,
    mealRecords
  );

  if (!lastMealDate) return "";

  if (daysAgo === 0) {
    return "Today";
  }
  if (daysAgo === 1) {
    return "Yesterday";
  }
  if (daysAgo >= 2 && daysAgo <= 6) {
    return `${daysAgo} days ago`;
  }
  if (daysAgo >= 7) {
    return `${Math.floor(daysAgo / 7)} weeks ago`;
  }

  return "";
};
