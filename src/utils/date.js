export const pacificDateStringFrom = (dateLike = new Date()) => {
  const d = new Date(dateLike);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
};

export const todayPacificDateString = () => pacificDateStringFrom(new Date());

/**
 * Converts a Pacific date string (YYYY-MM-DD) to an ISO timestamp that correctly
 * represents that date in Pacific time. 
 * 
 * For example: "YYYY-09-15" -> ISO timestamp that equals that same date in Pacific time
 */
export const isoFromPacificDateString = (pacificDateStr) => {
  // Parse the date string
  const [year, month, day] = pacificDateStr.split("-").map(Number);

  // Start searching from UTC hour 14 (typical offset for Pacific time)
  // Check hours 14-22 to account for different DST offsets
  for (let hour = 14; hour <= 22; hour++) {
    const testDate = new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
    const testPacificStr = pacificDateStringFrom(testDate);

    if (testPacificStr === pacificDateStr) {
      return testDate.toISOString();
    }
  }

  // Fallback: return UTC midnight if search fails
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
};

/**
 * Formats a date string (YYYY-MM-DD or ISO) for display in local time.
 * This avoids the day-shifting issue where YYYY-MM-DD is interpreted as UTC.
 */
export const formatDateForDisplay = (dateValue, options = {}) => {
  if (!dateValue) return "";

  // If it's a YYYY-MM-DD string, parse it manually to avoid UTC shift
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-").map(Number);
    // Create local date (month is 0-indexed)
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString(undefined, options);
  }

  // For other values, use standard Date parsing
  return new Date(dateValue).toLocaleDateString(undefined, options);
};
