export const MEAL_REPORT_TYPE_ORDER = [
  "guest",
  "dayWorker",
  "rv",
  "shelter",
  "unitedEffort",
  "extras",
  "lunchBags",
];

export const MEAL_REPORT_TYPE_LABELS = {
  guest: "Guest meals",
  dayWorker: "Day Worker Center meals",
  rv: "RV meals",
  shelter: "Shelter meals",
  unitedEffort: "United Effort meals",
  extras: "Extra meals",
  lunchBags: "Lunch bags",
};

export const createDefaultMealReportTypes = () => ({
  guest: true,
  dayWorker: true,
  rv: true,
  shelter: true,
  unitedEffort: true,
  extras: true,
  lunchBags: false,
});

export const createEmptyMealTotals = () =>
  MEAL_REPORT_TYPE_ORDER.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {});

export const FILTER_STORAGE_KEY = "services-filters-v1";

export const CSV_QUOTE_PATTERN = /[",\n]/u;

export const toCsvValue = (value) => {
  const stringValue = String(value ?? "");
  if (CSV_QUOTE_PATTERN.test(stringValue)) {
    return `"${stringValue.replace(/"/gu, '""')}"`;
  }
  return stringValue;
};

export const BICYCLE_REPAIR_TYPES = [
  "Flat Tire",
  "Brake Adjustment",
  "Gear Adjustment",
  "Chain Replacement",
  "Wheel Truing",
  "Basic Tune Up",
  "Drivetrain Cleaning",
  "Cable Replacement",
  "Headset Adjustment",
  "Seat Adjustment",
  "Kickstand",
  "Basket/Rack",
  "Bike Lights",
  "Lock",
  "New Tube",
  "New Tire",
  "New Bicycle",
  "Other",
];
