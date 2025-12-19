/**
 * Date utility functions for Pacific time handling
 */

export const pacificDateStringFrom = (dateLike: Date | string = new Date()): string => {
  const d = new Date(dateLike);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d);
};

export const todayPacificDateString = (): string => pacificDateStringFrom(new Date());

/**
 * Converts a Pacific date string (YYYY-MM-DD) to an ISO timestamp that correctly
 * represents that date in Pacific time.
 */
export const isoFromPacificDateString = (pacificDateStr: string): string => {
  const [year, month, day] = pacificDateStr.split('-').map(Number);

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

interface DateFormatOptions {
  weekday?: 'long' | 'short' | 'narrow';
  year?: 'numeric' | '2-digit';
  month?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit';
  day?: 'numeric' | '2-digit';
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) for display in local time.
 * This avoids the day-shifting issue where YYYY-MM-DD is interpreted as UTC.
 */
export const formatDateForDisplay = (
  dateValue: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string => {
  if (!dateValue) return '';

  // If it's a YYYY-MM-DD string, parse it manually to avoid UTC shift
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split('-').map(Number);
    // Create local date (month is 0-indexed)
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString(undefined, options);
  }

  // For other values, use standard Date parsing
  return new Date(dateValue).toLocaleDateString(undefined, options);
};

/**
 * Get the start and end dates for common time ranges
 */
export function getDateRange(range: '7d' | '30d' | '90d' | 'year' | 'all'): {
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const endDate = pacificDateStringFrom(today);

  let startDate: string;

  switch (range) {
    case '7d':
      const week = new Date(today);
      week.setDate(week.getDate() - 7);
      startDate = pacificDateStringFrom(week);
      break;
    case '30d':
      const month = new Date(today);
      month.setDate(month.getDate() - 30);
      startDate = pacificDateStringFrom(month);
      break;
    case '90d':
      const quarter = new Date(today);
      quarter.setDate(quarter.getDate() - 90);
      startDate = pacificDateStringFrom(quarter);
      break;
    case 'year':
      const year = new Date(today);
      year.setFullYear(year.getFullYear() - 1);
      startDate = pacificDateStringFrom(year);
      break;
    case 'all':
    default:
      startDate = '2020-01-01';
      break;
  }

  return { startDate, endDate };
}

/**
 * Get date range for a specific month
 */
export function getMonthDateRange(year: number, month: number): {
  startDate: string;
  endDate: string;
} {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}
