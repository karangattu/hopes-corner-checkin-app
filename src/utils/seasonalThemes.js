/**
 * Seasonal Themes Utility
 * Detects holidays and seasons to provide themed decorations
 */

// Holiday definitions with date ranges and theme configurations
const HOLIDAYS = {
  newYear: {
    name: "New Year",
    check: (date) => {
      const month = date.getMonth();
      const day = date.getDate();
      // Dec 31 - Jan 2
      return (month === 11 && day >= 31) || (month === 0 && day <= 2);
    },
    emoji: "🎆",
    colors: ["#FFD700", "#C0C0C0", "#FFFFFF"],
    message: "Happy New Year! 🎉",
    decorations: ["sparkle", "confetti"],
  },
  valentines: {
    name: "Valentine's Day",
    check: (date) => {
      const month = date.getMonth();
      const day = date.getDate();
      // Feb 12-15
      return month === 1 && day >= 12 && day <= 15;
    },
    emoji: "💕",
    colors: ["#FF69B4", "#FF1493", "#FFB6C1"],
    message: "Spreading love today! 💝",
    decorations: ["hearts"],
  },
  stPatricks: {
    name: "St. Patrick's Day",
    check: (date) => {
      const month = date.getMonth();
      const day = date.getDate();
      // Mar 16-18
      return month === 2 && day >= 16 && day <= 18;
    },
    emoji: "☘️",
    colors: ["#00FF00", "#228B22", "#32CD32"],
    message: "Lucky to serve you! 🍀",
    decorations: ["clovers"],
  },
  easter: {
    name: "Easter",
    check: (date) => {
      // Easter is complex - approximate with late March/April window
      const year = date.getFullYear();
      const easterDate = calculateEaster(year);
      const diff = Math.abs(date - easterDate) / (1000 * 60 * 60 * 24);
      return diff <= 2;
    },
    emoji: "🐰",
    colors: ["#FFB6C1", "#98FB98", "#DDA0DD", "#FFFF00"],
    message: "Happy Easter! 🥚",
    decorations: ["eggs"],
  },
  cincoMayo: {
    name: "Cinco de Mayo",
    check: (date) => {
      const m = date.getMonth();
      const d = date.getDate();
      // May 4-6
      return m === 4 && d >= 4 && d <= 6;
    },
    emoji: "🎊",
    colors: ["#006847", "#FFFFFF", "#CE1126"],
    message: "¡Feliz Cinco de Mayo! 🌮",
    decorations: ["confetti"],
  },
  independence: {
    name: "Independence Day",
    check: (date) => {
      const month = date.getMonth();
      const day = date.getDate();
      // Jul 3-5
      return month === 6 && day >= 3 && day <= 5;
    },
    emoji: "🇺🇸",
    colors: ["#FF0000", "#FFFFFF", "#0000FF"],
    message: "Happy 4th of July! 🎆",
    decorations: ["fireworks", "stars"],
  },
  halloween: {
    name: "Halloween",
    check: (date) => {
      const month = date.getMonth();
      const day = date.getDate();
      // Oct 29 - Nov 1
      return (month === 9 && day >= 29) || (month === 10 && day === 1);
    },
    emoji: "🎃",
    colors: ["#FF6600", "#000000", "#800080"],
    message: "Spooky service! 👻",
    decorations: ["pumpkins", "bats"],
  },
  thanksgiving: {
    name: "Thanksgiving",
    check: (date) => {
      const month = date.getMonth();
      const day = date.getDate();
      // 4th Thursday of November and surrounding days
      if (month !== 10) return false;
      // Find 4th Thursday
      const firstDay = new Date(date.getFullYear(), 10, 1).getDay();
      const fourthThursday = 22 + ((11 - firstDay) % 7);
      return day >= fourthThursday - 1 && day <= fourthThursday + 1;
    },
    emoji: "🦃",
    colors: ["#8B4513", "#FF8C00", "#FFD700"],
    message: "Grateful for you! 🍂",
    decorations: ["leaves"],
  },
  christmas: {
    name: "Christmas",
    check: (date) => {
      const month = date.getMonth();
      const day = date.getDate();
      // Dec 20-26
      return month === 11 && day >= 20 && day <= 26;
    },
    emoji: "🎄",
    colors: ["#FF0000", "#00FF00", "#FFFFFF", "#FFD700"],
    message: "Merry Christmas! 🎁",
    decorations: ["snowflakes", "ornaments"],
  },
  hanukkah: {
    name: "Hanukkah",
    check: (date) => {
      // Hanukkah varies - check approximate December window
      const month = date.getMonth();
      const day = date.getDate();
      // Usually falls in December
      return month === 11 && day >= 10 && day <= 30;
    },
    emoji: "🕎",
    colors: ["#0000FF", "#FFFFFF", "#C0C0C0"],
    message: "Happy Hanukkah! ✡️",
    decorations: ["stars"],
  },
};

// Season definitions
const SEASONS = {
  spring: {
    name: "Spring",
    check: (date) => {
      const month = date.getMonth();
      return month >= 2 && month <= 4; // Mar-May
    },
    emoji: "🌸",
    colors: ["#FFB6C1", "#98FB98", "#FFFF00"],
    decorations: ["flowers"],
  },
  summer: {
    name: "Summer",
    check: (date) => {
      const month = date.getMonth();
      return month >= 5 && month <= 7; // Jun-Aug
    },
    emoji: "☀️",
    colors: ["#FFD700", "#87CEEB", "#FF6347"],
    decorations: ["sun"],
  },
  fall: {
    name: "Fall",
    check: (date) => {
      const month = date.getMonth();
      return month >= 8 && month <= 10; // Sep-Nov
    },
    emoji: "🍂",
    colors: ["#FF8C00", "#8B4513", "#FFD700"],
    decorations: ["leaves"],
  },
  winter: {
    name: "Winter",
    check: (date) => {
      const month = date.getMonth();
      return month === 11 || month <= 1; // Dec-Feb
    },
    emoji: "❄️",
    colors: ["#ADD8E6", "#FFFFFF", "#87CEEB"],
    decorations: ["snowflakes"],
  },
};

/**
 * Calculate Easter Sunday for a given year (Computus algorithm)
 */
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/**
 * Get the current holiday if any
 * @param {Date} date - Date to check (defaults to now)
 * @returns {object|null} Holiday configuration or null
 */
export function getCurrentHoliday(date = new Date()) {
  for (const [key, holiday] of Object.entries(HOLIDAYS)) {
    if (holiday.check(date)) {
      return { key, ...holiday };
    }
  }
  return null;
}

/**
 * Get the current season
 * @param {Date} date - Date to check (defaults to now)
 * @returns {object} Season configuration
 */
export function getCurrentSeason(date = new Date()) {
  for (const [key, season] of Object.entries(SEASONS)) {
    if (season.check(date)) {
      return { key, ...season };
    }
  }
  // Fallback to winter
  return { key: "winter", ...SEASONS.winter };
}

/**
 * Get the current theme (holiday takes priority over season)
 * @param {Date} date - Date to check (defaults to now)
 * @returns {object} Theme configuration with type indicator
 */
export function getCurrentTheme(date = new Date()) {
  const holiday = getCurrentHoliday(date);
  if (holiday) {
    return { type: "holiday", ...holiday };
  }
  const season = getCurrentSeason(date);
  return { type: "season", ...season };
}

/**
 * Check if today is a special occasion worth celebrating
 * @param {Date} date - Date to check (defaults to now)
 * @returns {boolean}
 */
export function isSpecialOccasion(date = new Date()) {
  return getCurrentHoliday(date) !== null;
}

/**
 * Get themed greeting message
 * @param {Date} date - Date to check (defaults to now)
 * @returns {string}
 */
export function getThemedGreeting(date = new Date()) {
  const holiday = getCurrentHoliday(date);
  if (holiday?.message) {
    return holiday.message;
  }
  const season = getCurrentSeason(date);
  const greetings = {
    spring: "Welcome! Spring is in the air! 🌷",
    summer: "Welcome! Stay cool out there! 😎",
    fall: "Welcome! Enjoy the autumn vibes! 🍁",
    winter: "Welcome! Stay warm! 🧣",
  };
  return greetings[season.key] || "Welcome!";
}

// Export for testing
export { HOLIDAYS, SEASONS, calculateEaster };
