// Type definitions for the application

// User Roles
export type UserRole = 'admin' | 'board' | 'staff' | 'checkin';

// Guest Types
export interface Guest {
  id: string;
  guestId: string;
  firstName: string;
  lastName: string;
  name: string;
  preferredName: string;
  housingStatus: HousingStatus;
  age: AgeGroup;
  gender: Gender;
  location: string;
  notes: string;
  bicycleDescription: string;
  bannedAt: string | null;
  bannedUntil: string | null;
  banReason: string;
  isBanned: boolean;
  banned?: boolean; // Legacy alias for isBanned
  visitCount?: number;
  lastVisit?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HousingStatus = 'Unhoused' | 'Housed' | 'Temp. shelter' | 'RV or vehicle';
export type AgeGroup = 'Adult 18-59' | 'Senior 60+' | 'Child 0-17';
export type Gender = 'Male' | 'Female' | 'Unknown' | 'Non-binary';

// Meal Types
export interface MealRecord {
  id: string;
  guestId: string | null;
  count: number;
  date: string;
  recordedAt: string;
  servedOn: string;
  createdAt: string;
  type: MealType;
}

export type MealType = 
  | 'guest' 
  | 'extra' 
  | 'rv' 
  | 'shelter' 
  | 'united_effort' 
  | 'day_worker' 
  | 'lunch_bag';

// Service Types
export interface ShowerRecord {
  id: string;
  guestId: string;
  time: string | null;
  scheduledFor: string;
  date: string;
  status: ShowerStatus;
  createdAt: string;
  lastUpdated: string;
}

export type ShowerStatus = 'booked' | 'waitlisted' | 'done' | 'cancelled' | 'no_show';

export interface LaundryRecord {
  id: string;
  guestId: string;
  time: string | null;
  laundryType: LaundryType;
  bagNumber: string;
  scheduledFor: string;
  date: string;
  status: LaundryStatus;
  createdAt: string;
  lastUpdated: string;
}

export type LaundryType = 'onsite' | 'offsite';
export type LaundryStatus = 
  | 'waiting' 
  | 'washer' 
  | 'dryer' 
  | 'done' 
  | 'picked_up' 
  | 'pending' 
  | 'transported' 
  | 'returned' 
  | 'offsite_picked_up';

export interface BicycleRepair {
  id: string;
  guestId: string | null;
  date: string;
  repairType: string;
  repairTypes: string[];
  completedRepairs: string[];
  notes: string;
  status: BicycleRepairStatus;
  priority: number;
  doneAt: string | null;
  lastUpdated: string;
}

export type BicycleRepairStatus = 'pending' | 'in_progress' | 'done';

// Holiday/Haircut Records
export interface HolidayRecord {
  id: string;
  guestId: string;
  date: string;
  type: 'holiday';
}

export interface HaircutRecord {
  id: string;
  guestId: string;
  date: string;
  type: 'haircut';
}

// Donation Types
export interface Donation {
  id: string;
  type: DonationType;
  itemName: string;
  trays: number;
  weightLbs: number;
  servings: number;
  temperature: string;
  donor: string;
  donatedAt: string;
  dateKey: string;
  createdAt: string;
  updatedAt: string;
}

export type DonationType = 
  | 'Protein' 
  | 'Carbs' 
  | 'Vegetables' 
  | 'Fruit' 
  | 'Veggie Protein' 
  | 'Deli Foods' 
  | 'Pastries' 
  | 'School lunch';

export interface LaPlazaDonation {
  id: string;
  category: LaPlazaCategory;
  weightLbs: number;
  notes: string;
  receivedAt: string;
  dateKey: string;
  createdAt: string;
  updatedAt: string;
}

export type LaPlazaCategory = 
  | 'Bakery' 
  | 'Beverages' 
  | 'Dairy' 
  | 'Meat' 
  | 'Mix' 
  | 'Nonfood' 
  | 'Prepared/Perishable' 
  | 'Produce';

// App Settings
export interface AppSettings {
  id: string;
  siteName: string;
  maxOnsiteLaundrySlots: number;
  enableOffsiteLaundry: boolean;
  uiDensity: 'comfortable' | 'compact';
  showCharts: boolean;
  defaultReportDays: number;
  donationAutofill: boolean;
  defaultDonationType: DonationType;
  targets: ServiceTargets;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceTargets {
  monthlyMeals: number;
  yearlyMeals: number;
  monthlyShowers: number;
  yearlyShowers: number;
  monthlyLaundry: number;
  yearlyLaundry: number;
  monthlyBicycles: number;
  yearlyBicycles: number;
  monthlyHaircuts: number;
  yearlyHaircuts: number;
  monthlyHolidays: number;
  yearlyHolidays: number;
}

// Constants
export const HOUSING_STATUSES: HousingStatus[] = [
  'Unhoused',
  'Housed',
  'Temp. shelter',
  'RV or vehicle',
];

export const AGE_GROUPS: AgeGroup[] = ['Adult 18-59', 'Senior 60+', 'Child 0-17'];

export const GENDERS: Gender[] = ['Male', 'Female', 'Unknown', 'Non-binary'];

export const DONATION_TYPES: DonationType[] = [
  'Protein',
  'Carbs',
  'Vegetables',
  'Fruit',
  'Veggie Protein',
  'Deli Foods',
  'Pastries',
  'School lunch',
];

export const LA_PLAZA_CATEGORIES: LaPlazaCategory[] = [
  'Bakery',
  'Beverages',
  'Dairy',
  'Meat',
  'Mix',
  'Nonfood',
  'Prepared/Perishable',
  'Produce',
];
