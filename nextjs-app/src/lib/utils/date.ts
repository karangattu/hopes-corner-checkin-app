// Date utilities for Pacific timezone handling

/**
 * Get today's date as a string in Pacific timezone (YYYY-MM-DD)
 */
export function todayPacificDateString(): string {
  const now = new Date();
  const pacificDate = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
  );
  return formatDateString(pacificDate);
}

/**
 * Format a Date object as YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get Pacific date string from a Date or ISO string
 */
export function pacificDateStringFrom(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const pacificDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
  );
  return formatDateString(pacificDate);
}

/**
 * Combine a date string (YYYY-MM-DD) and time string (HH:MM) to ISO string
 */
export function combineDateAndTimeISO(
  dateStr: string | null,
  timeStr: string | null
): string | null {
  if (!dateStr) return null;
  
  // Default to noon if no time specified
  const time = timeStr || '12:00';
  
  try {
    // Create date in Pacific timezone
    const dateTimeStr = `${dateStr}T${time}:00`;
    const date = new Date(dateTimeStr);
    
    // Adjust for Pacific timezone offset
    const pacificOffset = -8 * 60; // PST offset in minutes
    const adjustedDate = new Date(date.getTime() - pacificOffset * 60 * 1000);
    
    return adjustedDate.toISOString();
  } catch {
    return null;
  }
}

/**
 * Get ISO string from date-only string (defaults to noon)
 */
export function fallbackIsoFromDateOnly(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  try {
    return new Date(`${dateStr}T12:00:00Z`).toISOString();
  } catch {
    return null;
  }
}

/**
 * Extract time from laundry slot label (e.g., "9:00 AM - 10:00 AM" -> "09:00")
 */
export function extractLaundrySlotStart(slotLabel: string | null): string | null {
  if (!slotLabel) return null;
  
  const match = slotLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();
  
  if (meridiem === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Format a date for display
 */
export function formatDisplayDate(
  dateInput: Date | string | null,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  if (!dateInput) return '';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('en-US', options);
  } catch {
    return '';
  }
}

/**
 * Format a date with time for display
 */
export function formatDisplayDateTime(
  dateInput: Date | string | null,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
): string {
  if (!dateInput) return '';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('en-US', options);
  } catch {
    return '';
  }
}

/**
 * Check if two dates are the same day (in Pacific timezone)
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  return pacificDateStringFrom(date1) === pacificDateStringFrom(date2);
}

/**
 * Get the start of today in Pacific timezone as ISO string
 */
export function todayStartISO(): string {
  const todayStr = todayPacificDateString();
  return `${todayStr}T00:00:00.000Z`;
}

/**
 * Get the end of today in Pacific timezone as ISO string
 */
export function todayEndISO(): string {
  const todayStr = todayPacificDateString();
  return `${todayStr}T23:59:59.999Z`;
}
