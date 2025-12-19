/**
 * App version utilities
 * Centralizes version information and changelog data
 */

// Import version from package.json via Vite's define (defined in vite.config.js)
// eslint-disable-next-line no-undef
export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

// Changelog entries - add new entries at the top
export const CHANGELOG = [
  {
    version: "0.0.4",
    date: "December 18, 2025",
    highlights: [
      {
        type: "feature",
        title: "Linked Guests",
        description: "Link up to 3 guests together for families or groups who pick up meals together. When searching for one guest, quickly access their linked guests to assign meals without separate searches.",
      },
    ],
  },
  {
    version: "0.0.3",
    date: "November 28, 2025",
    highlights: [
      {
        type: "feature",
        title: "What's New Modal",
        description: "Users can now see recent app updates and new features via a \"What's New\" button in the footer.",
      },
    ],
  },
  {
    version: "0.0.2",
    date: "November 19, 2025",
    highlights: [
      {
        type: "fix",
        title: "Donation Temperature & Servings",
        description: "Donor items now allow recording temperature and servings for each donation item.",
      },
      {
        type: "performance",
        title: "Large CSV Import Performance",
        description: "Batch import attendance records now handles very large CSV files (45,000+ rows) without crashing or freezing.",
      },
    ],
  },
  {
    version: "0.0.1",
    date: "September 28, 2025",
    highlights: [
      {
        type: "feature",
        title: "Services Dashboard Updates",
        description: "Surfaced booked shower slot times and fresh laundry activity in the Services dashboard.",
      },
      {
        type: "fix",
        title: "Donation Date Handling",
        description: "Ensured donation logs honor the selected date, showing every recorded item before export.",
      },
    ],
  },
];

/**
 * Check if there are unseen updates
 */
export const hasUnseenUpdates = () => {
  const seenVersion = localStorage.getItem("hopes-corner-seen-version");
  return seenVersion !== APP_VERSION;
};

/**
 * Mark current version as seen
 */
export const markVersionAsSeen = () => {
  localStorage.setItem("hopes-corner-seen-version", APP_VERSION);
};

/**
 * Get the current app version
 */
export const getAppVersion = () => APP_VERSION;
