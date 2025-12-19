// Application constants

export const HOUSING_STATUSES = [
  'Unhoused',
  'Housed',
  'Temp. shelter',
  'RV or vehicle',
] as const;

export type HousingStatus = (typeof HOUSING_STATUSES)[number];

export const AGE_GROUPS = ['Adult 18-59', 'Senior 60+', 'Child 0-17'] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

export const GENDERS = ['Male', 'Female', 'Unknown', 'Non-binary'] as const;

export type Gender = (typeof GENDERS)[number];

export const LAUNDRY_STATUS = {
  WAITING: 'waiting',
  WASHER: 'washer',
  DRYER: 'dryer',
  DONE: 'done',
  PICKED_UP: 'picked_up',
  PENDING: 'pending',
  TRANSPORTED: 'transported',
  RETURNED: 'returned',
  OFFSITE_PICKED_UP: 'offsite_picked_up',
} as const;

export type LaundryStatusValue = (typeof LAUNDRY_STATUS)[keyof typeof LAUNDRY_STATUS];

export const DONATION_TYPES = [
  'Protein',
  'Carbs',
  'Vegetables',
  'Fruit',
  'Veggie Protein',
  'Deli Foods',
  'Pastries',
  'School lunch',
] as const;

export type DonationType = (typeof DONATION_TYPES)[number];

export const BICYCLE_REPAIR_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
} as const;

export type BicycleRepairStatusValue = (typeof BICYCLE_REPAIR_STATUS)[keyof typeof BICYCLE_REPAIR_STATUS];

export const LA_PLAZA_CATEGORIES = [
  'Bakery',
  'Beverages',
  'Dairy',
  'Meat',
  'Mix',
  'Nonfood',
  'Prepared/Perishable',
  'Produce',
] as const;

export type LaPlazaCategory = (typeof LA_PLAZA_CATEGORIES)[number];

// Bay Area cities for location selection
export const BAY_AREA_CITIES = [
  'Campbell',
  'Cupertino',
  'Gilroy',
  'Los Altos Hills',
  'Los Altos',
  'Los Gatos',
  'Milpitas',
  'Monte Sereno',
  'Morgan Hill',
  'Mountain View',
  'Palo Alto',
  'San Jose',
  'Santa Clara',
  'Saratoga',
  'Sunnyvale',
] as const;

export type BayAreaCity = (typeof BAY_AREA_CITIES)[number];

// Service types
export const SERVICE_TYPES = ['shower', 'laundry', 'bicycle'] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// User roles
export const USER_ROLES = ['admin', 'staff'] as const;

export type UserRole = (typeof USER_ROLES)[number];
