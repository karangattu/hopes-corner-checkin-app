/**
 * Meal Service Time Utility
 * 
 * Calculates meal service timing for Hope's Corner.
 * 
 * Schedule (Pacific Time):
 * - Monday, Wednesday: 8:00 AM - 9:00 AM
 * - Friday: 7:30 AM - 8:30 AM
 * - Saturday: 8:00 AM - 10:00 AM
 * - Tuesday, Thursday, Sunday: No service
 */

/**
 * Get meal service info for a given date
 * @param {Date} date - The date to check (defaults to now)
 * @returns {Object|null} Service info or null if no service
 */
export function getMealServiceInfo(date = new Date()) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Define service days and their end times
  // 0 = Sunday (no service)
  // 1 = Monday (8-9 AM)
  // 2 = Tuesday (no service)
  // 3 = Wednesday (8-9 AM)
  // 4 = Thursday (no service)
  // 5 = Friday (7:30-8:30 AM)
  // 6 = Saturday (8-10 AM)
  
  const serviceSchedule = {
    0: null, // Sunday - no service
    1: { startHour: 8, startMinute: 0, endHour: 9, endMinute: 0 }, // Monday
    2: null, // Tuesday - no service
    3: { startHour: 8, startMinute: 0, endHour: 9, endMinute: 0 }, // Wednesday
    4: null, // Thursday - no service
    5: { startHour: 7, startMinute: 30, endHour: 8, endMinute: 30 }, // Friday
    6: { startHour: 8, startMinute: 0, endHour: 10, endMinute: 0 }, // Saturday
  };
  
  return serviceSchedule[dayOfWeek];
}

/**
 * Get the current meal service status
 * @param {Date} now - Current time (defaults to new Date())
 * @returns {Object} Status object with type and details
 */
export function getMealServiceStatus(now = new Date()) {
  const serviceInfo = getMealServiceInfo(now);
  
  // No service today
  if (!serviceInfo) {
    return {
      type: 'no-service',
      message: null,
      timeRemaining: null,
    };
  }
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  const startTimeInMinutes = serviceInfo.startHour * 60 + serviceInfo.startMinute;
  const endTimeInMinutes = serviceInfo.endHour * 60 + serviceInfo.endMinute;
  
  // Before service starts
  if (currentTimeInMinutes < startTimeInMinutes) {
    const minutesUntilStart = startTimeInMinutes - currentTimeInMinutes;
    return {
      type: 'before-service',
      message: `Meal service starts in ${formatTimeRemaining(minutesUntilStart)}`,
      timeRemaining: minutesUntilStart,
      startsAt: formatTime(serviceInfo.startHour, serviceInfo.startMinute),
      endsAt: formatTime(serviceInfo.endHour, serviceInfo.endMinute),
    };
  }
  
  // During service
  if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
    const minutesRemaining = endTimeInMinutes - currentTimeInMinutes;
    return {
      type: 'during-service',
      message: `${formatTimeRemaining(minutesRemaining)} remaining`,
      timeRemaining: minutesRemaining,
      totalDuration: endTimeInMinutes - startTimeInMinutes,
      elapsed: currentTimeInMinutes - startTimeInMinutes,
      endsAt: formatTime(serviceInfo.endHour, serviceInfo.endMinute),
    };
  }
  
  // After service ended
  return {
    type: 'ended',
    message: 'Meal service ended for today',
    timeRemaining: 0,
  };
}

/**
 * Format minutes into a human-readable string
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted time string
 */
export function formatTimeRemaining(minutes) {
  if (minutes < 1) {
    return 'less than a minute';
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins} min`;
  }
  
  if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Format time in 12-hour format
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @returns {string} Formatted time (e.g., "8:00 AM")
 */
export function formatTime(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Get day name from day number
 * @param {number} dayNumber - Day of week (0-6)
 * @returns {string} Day name
 */
export function getDayName(dayNumber) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber];
}

/**
 * Check if a specific day has meal service
 * @param {number} dayNumber - Day of week (0-6)
 * @returns {boolean} True if service is available
 */
export function hasMealService(dayNumber) {
  return getMealServiceInfo(new Date(2024, 0, dayNumber)) !== null;
}