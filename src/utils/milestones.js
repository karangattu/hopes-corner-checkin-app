/**
 * Milestone Celebration Utility
 * Tracks service milestones and triggers celebrations
 */

// Milestone thresholds to celebrate
const MILESTONES = [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000];

// Service type configurations
const SERVICE_CONFIGS = {
  meals: {
    label: "meals served",
    emoji: "🍽️",
    color: "#10B981", // green
  },
  showers: {
    label: "showers provided",
    emoji: "🚿",
    color: "#3B82F6", // blue
  },
  laundry: {
    label: "laundry loads done",
    emoji: "👕",
    color: "#8B5CF6", // purple
  },
  checkins: {
    label: "guest check-ins",
    emoji: "✅",
    color: "#F59E0B", // amber
  },
  donations: {
    label: "donations received",
    emoji: "💝",
    color: "#EC4899", // pink
  },
};

// Local storage key for tracking shown milestones
const SHOWN_MILESTONES_KEY = "hopesCorner_shownMilestones";

/**
 * Get the next milestone for a given count
 * @param {number} count - Current count
 * @returns {number|null} Next milestone or null if past all milestones
 */
export function getNextMilestone(count) {
  return MILESTONES.find((m) => m > count) || null;
}

/**
 * Get the previous milestone for a given count
 * @param {number} count - Current count
 * @returns {number|null} Previous milestone or null if before first milestone
 */
export function getPreviousMilestone(count) {
  const previousMilestones = MILESTONES.filter((m) => m <= count);
  return previousMilestones.length > 0
    ? previousMilestones[previousMilestones.length - 1]
    : null;
}

/**
 * Calculate progress to next milestone
 * @param {number} count - Current count
 * @returns {object} Progress info with current, next, percentage
 */
export function getMilestoneProgress(count) {
  const previousMilestone = getPreviousMilestone(count) || 0;
  const nextMilestone = getNextMilestone(count);

  if (!nextMilestone) {
    return {
      current: count,
      previous: previousMilestone,
      next: null,
      percentage: 100,
      remaining: 0,
    };
  }

  const rangeSize = nextMilestone - previousMilestone;
  const progress = count - previousMilestone;
  const percentage = Math.round((progress / rangeSize) * 100);

  return {
    current: count,
    previous: previousMilestone,
    next: nextMilestone,
    percentage,
    remaining: nextMilestone - count,
  };
}

/**
 * Check if a count has reached a new milestone
 * @param {number} previousCount - Previous count
 * @param {number} newCount - New count
 * @returns {number|null} Milestone reached or null
 */
export function checkMilestoneReached(previousCount, newCount) {
  for (const milestone of MILESTONES) {
    if (previousCount < milestone && newCount >= milestone) {
      return milestone;
    }
  }
  return null;
}

/**
 * Get shown milestones from local storage
 * @returns {object} Map of serviceType -> array of shown milestones
 */
export function getShownMilestones() {
  try {
    const stored = localStorage.getItem(SHOWN_MILESTONES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Mark a milestone as shown
 * @param {string} serviceType - Type of service
 * @param {number} milestone - Milestone value
 */
export function markMilestoneShown(serviceType, milestone) {
  try {
    const shown = getShownMilestones();
    if (!shown[serviceType]) {
      shown[serviceType] = [];
    }
    if (!shown[serviceType].includes(milestone)) {
      shown[serviceType].push(milestone);
    }
    localStorage.setItem(SHOWN_MILESTONES_KEY, JSON.stringify(shown));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if a milestone has been shown before
 * @param {string} serviceType - Type of service
 * @param {number} milestone - Milestone value
 * @returns {boolean}
 */
export function isMilestoneShown(serviceType, milestone) {
  const shown = getShownMilestones();
  return shown[serviceType]?.includes(milestone) || false;
}

/**
 * Check if should show a celebration for a service
 * @param {string} serviceType - Type of service (meals, showers, etc.)
 * @param {number} count - Current count
 * @returns {object|null} Celebration config or null
 */
export function shouldCelebrate(serviceType, count) {
  const milestone = MILESTONES.find((m) => m === count);
  if (!milestone) return null;

  // Check if already shown
  if (isMilestoneShown(serviceType, milestone)) {
    return null;
  }

  const config = SERVICE_CONFIGS[serviceType];
  if (!config) return null;

  return {
    milestone,
    serviceType,
    ...config,
    message: `🎉 Congratulations! ${milestone.toLocaleString()} ${config.label}!`,
    celebrationType: milestone >= 1000 ? "fireworks" : "confetti",
  };
}

/**
 * Format milestone number for display
 * @param {number} milestone - Milestone number
 * @returns {string} Formatted string
 */
export function formatMilestone(milestone) {
  if (milestone >= 1000) {
    return `${milestone / 1000}K`;
  }
  return milestone.toString();
}

/**
 * Get celebration message for a milestone
 * @param {number} milestone - Milestone reached
 * @param {string} serviceType - Type of service
 * @returns {string}
 */
export function getCelebrationMessage(milestone, serviceType) {
  const config = SERVICE_CONFIGS[serviceType];
  const label = config?.label || "services completed";
  const emoji = config?.emoji || "🎉";

  const messages = {
    100: `${emoji} First 100! ${milestone.toLocaleString()} ${label}! Keep going!`,
    250: `${emoji} Quarter milestone! ${milestone.toLocaleString()} ${label}!`,
    500: `${emoji} Half a thousand! ${milestone.toLocaleString()} ${label}!`,
    750: `${emoji} Three quarters! ${milestone.toLocaleString()} ${label}!`,
    1000: `🎆 WOW! ${milestone.toLocaleString()} ${label}! That's amazing!`,
    1500: `🌟 ${milestone.toLocaleString()} ${label}! You're incredible!`,
    2000: `✨ ${milestone.toLocaleString()} ${label}! Truly remarkable!`,
    2500: `🏆 ${milestone.toLocaleString()} ${label}! A real achievement!`,
    3000: `💫 ${milestone.toLocaleString()} ${label}! Outstanding work!`,
    5000: `🎊 ${milestone.toLocaleString()} ${label}! Legendary status!`,
    7500: `👑 ${milestone.toLocaleString()} ${label}! You're a superstar!`,
    10000: `🌈 ${milestone.toLocaleString()} ${label}! Absolutely incredible!`,
  };

  return (
    messages[milestone] ||
    `🎉 ${milestone.toLocaleString()} ${label}! Great work!`
  );
}

// Export constants for testing
export { MILESTONES, SERVICE_CONFIGS };
