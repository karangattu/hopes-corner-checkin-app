import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient, isSupabaseEnabled } from '@/lib/supabase/client';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import type { MealRecord, HolidayRecord, HaircutRecord, MealType } from '@/lib/types';

// Database row types
interface MealAttendanceRow {
  id: string;
  guest_id: string | null;
  quantity: number;
  served_on: string;
  meal_type: MealType;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

interface HolidayVisitRow {
  id: string;
  guest_id: string;
  served_at: string;
  created_at: string;
}

interface HaircutVisitRow {
  id: string;
  guest_id: string;
  served_at: string;
  created_at: string;
}

// Mappers
function mapMealRow(row: MealAttendanceRow): MealRecord {
  return {
    id: row.id,
    guestId: row.guest_id,
    count: row.quantity,
    date: row.served_on,
    recordedAt: row.recorded_at || row.created_at,
    servedOn: row.served_on,
    createdAt: row.created_at,
    type: row.meal_type || 'guest',
  };
}

function mapHolidayRow(row: HolidayVisitRow): HolidayRecord {
  return {
    id: row.id,
    guestId: row.guest_id,
    date: pacificDateStringFrom(row.served_at),
    type: 'holiday',
  };
}

function mapHaircutRow(row: HaircutVisitRow): HaircutRecord {
  return {
    id: row.id,
    guestId: row.guest_id,
    date: pacificDateStringFrom(row.served_at),
    type: 'haircut',
  };
}

// Store state interface
interface MealsState {
  // State
  mealRecords: MealRecord[];
  rvMealRecords: MealRecord[];
  extraMealRecords: MealRecord[];
  holidayRecords: HolidayRecord[];
  haircutRecords: HaircutRecord[];
  isLoading: boolean;
  error: string | null;
}

// Store actions interface
interface MealsActions {
  // Meal Actions
  addMealRecord: (guestId: string, quantity?: number) => Promise<MealRecord>;
  deleteMealRecord: (recordId: string) => Promise<void>;
  
  // RV Meal Actions
  addRvMealRecord: (guestId: string, quantity?: number) => Promise<MealRecord>;
  deleteRvMealRecord: (recordId: string) => Promise<void>;
  
  // Extra Meal Actions
  addExtraMealRecord: (guestId: string, quantity?: number) => Promise<MealRecord>;
  deleteExtraMealRecord: (recordId: string) => Promise<void>;
  
  // Holiday Records
  addHolidayRecord: (guestId: string) => Promise<HolidayRecord>;
  deleteHolidayRecord: (recordId: string) => Promise<void>;
  
  // Haircut Records
  addHaircutRecord: (guestId: string) => Promise<HaircutRecord>;
  deleteHaircutRecord: (recordId: string) => Promise<void>;
  
  // Load from Supabase
  loadFromSupabase: () => Promise<void>;
  
  // Clear all records
  clearMealRecords: () => void;
  
  // Selectors
  getTodayMeals: () => MealRecord[];
  getTodayRvMeals: () => MealRecord[];
  getTodayExtraMeals: () => MealRecord[];
  getTodayHolidays: () => HolidayRecord[];
  getTodayHaircuts: () => HaircutRecord[];
}

type MealsStore = MealsState & MealsActions;

export const useMealsStore = create<MealsStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // Initial State
          mealRecords: [],
          rvMealRecords: [],
          extraMealRecords: [],
          holidayRecords: [],
          haircutRecords: [],
          isLoading: false,
          error: null,

          // Meal Actions
          addMealRecord: async (guestId: string, quantity = 1): Promise<MealRecord> => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const payload = {
                guest_id: guestId,
                quantity,
                served_on: todayStr,
                meal_type: 'guest' as MealType,
              };

              const { data, error } = await supabase
                .from('meal_attendance')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add meal record to Supabase:', error);
                throw new Error('Unable to save meal record');
              }

              const mapped = mapMealRow(data as MealAttendanceRow);
              set((state) => {
                state.mealRecords.push(mapped);
              });
              return mapped;
            }

            // Local fallback
            const fallbackRecord: MealRecord = {
              id: `local-meal-${Date.now()}`,
              guestId,
              count: quantity,
              date: todayStr,
              recordedAt: new Date().toISOString(),
              servedOn: todayStr,
              createdAt: new Date().toISOString(),
              type: 'guest',
            };

            set((state) => {
              state.mealRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteMealRecord: async (recordId: string): Promise<void> => {
            const { mealRecords } = get();
            const target = mealRecords.find((r) => r.id === recordId);

            set((state) => {
              state.mealRecords = state.mealRecords.filter((r) => r.id !== recordId);
            });

            if (isSupabaseEnabled() && target) {
              const supabase = createClient();
              const { error } = await supabase
                .from('meal_attendance')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete meal record from Supabase:', error);
              }
            }
          },

          // RV Meal Actions
          addRvMealRecord: async (guestId: string, quantity = 1): Promise<MealRecord> => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const payload = {
                guest_id: guestId,
                quantity,
                served_on: todayStr,
                meal_type: 'rv' as MealType,
              };

              const { data, error } = await supabase
                .from('meal_attendance')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add RV meal record to Supabase:', error);
                throw new Error('Unable to save RV meal record');
              }

              const mapped = mapMealRow(data as MealAttendanceRow);
              set((state) => {
                state.rvMealRecords.push(mapped);
              });
              return mapped;
            }

            const fallbackRecord: MealRecord = {
              id: `local-rv-meal-${Date.now()}`,
              guestId,
              count: quantity,
              date: todayStr,
              recordedAt: new Date().toISOString(),
              servedOn: todayStr,
              createdAt: new Date().toISOString(),
              type: 'rv',
            };

            set((state) => {
              state.rvMealRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteRvMealRecord: async (recordId: string): Promise<void> => {
            set((state) => {
              state.rvMealRecords = state.rvMealRecords.filter((r) => r.id !== recordId);
            });

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const { error } = await supabase
                .from('meal_attendance')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete RV meal record from Supabase:', error);
              }
            }
          },

          // Extra Meal Actions
          addExtraMealRecord: async (guestId: string, quantity = 1): Promise<MealRecord> => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const payload = {
                guest_id: guestId,
                quantity,
                served_on: todayStr,
                meal_type: 'extra' as MealType,
              };

              const { data, error } = await supabase
                .from('meal_attendance')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add extra meal record to Supabase:', error);
                throw new Error('Unable to save extra meal record');
              }

              const mapped = mapMealRow(data as MealAttendanceRow);
              set((state) => {
                state.extraMealRecords.push(mapped);
              });
              return mapped;
            }

            const fallbackRecord: MealRecord = {
              id: `local-extra-meal-${Date.now()}`,
              guestId,
              count: quantity,
              date: todayStr,
              recordedAt: new Date().toISOString(),
              servedOn: todayStr,
              createdAt: new Date().toISOString(),
              type: 'extra',
            };

            set((state) => {
              state.extraMealRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteExtraMealRecord: async (recordId: string): Promise<void> => {
            set((state) => {
              state.extraMealRecords = state.extraMealRecords.filter((r) => r.id !== recordId);
            });

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const { error } = await supabase
                .from('meal_attendance')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete extra meal record from Supabase:', error);
              }
            }
          },

          // Holiday Records
          addHolidayRecord: async (guestId: string): Promise<HolidayRecord> => {
            if (!guestId) throw new Error('Guest ID is required');

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const payload = {
                guest_id: guestId,
              };

              const { data, error } = await supabase
                .from('holiday_visits')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add holiday record to Supabase:', error);
                throw new Error('Unable to save holiday record');
              }

              const mapped = mapHolidayRow(data as HolidayVisitRow);
              set((state) => {
                state.holidayRecords.push(mapped);
              });
              return mapped;
            }

            const todayStr = todayPacificDateString();
            const fallbackRecord: HolidayRecord = {
              id: `local-holiday-${Date.now()}`,
              guestId,
              date: todayStr,
              type: 'holiday',
            };

            set((state) => {
              state.holidayRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteHolidayRecord: async (recordId: string): Promise<void> => {
            const { holidayRecords } = get();
            const target = holidayRecords.find((r) => r.id === recordId);

            set((state) => {
              state.holidayRecords = state.holidayRecords.filter((r) => r.id !== recordId);
            });

            if (isSupabaseEnabled() && target) {
              const supabase = createClient();
              const { error } = await supabase
                .from('holiday_visits')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete holiday record from Supabase:', error);
              }
            }
          },

          // Haircut Records
          addHaircutRecord: async (guestId: string): Promise<HaircutRecord> => {
            if (!guestId) throw new Error('Guest ID is required');

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const payload = {
                guest_id: guestId,
              };

              const { data, error } = await supabase
                .from('haircut_visits')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add haircut record to Supabase:', error);
                throw new Error('Unable to save haircut record');
              }

              const mapped = mapHaircutRow(data as HaircutVisitRow);
              set((state) => {
                state.haircutRecords.push(mapped);
              });
              return mapped;
            }

            const todayStr = todayPacificDateString();
            const fallbackRecord: HaircutRecord = {
              id: `local-haircut-${Date.now()}`,
              guestId,
              date: todayStr,
              type: 'haircut',
            };

            set((state) => {
              state.haircutRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteHaircutRecord: async (recordId: string): Promise<void> => {
            const { haircutRecords } = get();
            const target = haircutRecords.find((r) => r.id === recordId);

            set((state) => {
              state.haircutRecords = state.haircutRecords.filter((r) => r.id !== recordId);
            });

            if (isSupabaseEnabled() && target) {
              const supabase = createClient();
              const { error } = await supabase
                .from('haircut_visits')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete haircut record from Supabase:', error);
              }
            }
          },

          // Load from Supabase
          loadFromSupabase: async (): Promise<void> => {
            if (!isSupabaseEnabled()) return;

            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            try {
              const supabase = createClient();

              const [mealRes, holidayRes, haircutRes] = await Promise.all([
                supabase
                  .from('meal_attendance')
                  .select('id,guest_id,quantity,served_on,meal_type,recorded_at,created_at,updated_at,notes')
                  .order('created_at', { ascending: false }),
                supabase
                  .from('holiday_visits')
                  .select('id,guest_id,served_at,created_at')
                  .order('created_at', { ascending: false }),
                supabase
                  .from('haircut_visits')
                  .select('id,guest_id,served_at,created_at')
                  .order('created_at', { ascending: false }),
              ]);

              if (mealRes.error) throw mealRes.error;
              if (holidayRes.error) throw holidayRes.error;
              if (haircutRes.error) throw haircutRes.error;

              const meals = (mealRes.data || []).map((row) => mapMealRow(row as MealAttendanceRow));
              const guestMeals = meals.filter((m) => m.type === 'guest');
              const rvMeals = meals.filter((m) => m.type === 'rv');
              const extraMeals = meals.filter((m) => m.type === 'extra');

              set((state) => {
                state.mealRecords = guestMeals;
                state.rvMealRecords = rvMeals;
                state.extraMealRecords = extraMeals;
                state.holidayRecords = (holidayRes.data || []).map((row) => 
                  mapHolidayRow(row as HolidayVisitRow)
                );
                state.haircutRecords = (haircutRes.data || []).map((row) => 
                  mapHaircutRow(row as HaircutVisitRow)
                );
                state.isLoading = false;
              });
            } catch (error) {
              console.error('Failed to load meal records from Supabase:', error);
              set((state) => {
                state.isLoading = false;
                state.error = error instanceof Error ? error.message : 'Failed to load records';
              });
            }
          },

          // Clear all records
          clearMealRecords: (): void => {
            set((state) => {
              state.mealRecords = [];
              state.rvMealRecords = [];
              state.extraMealRecords = [];
              state.holidayRecords = [];
              state.haircutRecords = [];
            });
          },

          // Selectors
          getTodayMeals: (): MealRecord[] => {
            const today = todayPacificDateString();
            return get().mealRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayRvMeals: (): MealRecord[] => {
            const today = todayPacificDateString();
            return get().rvMealRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayExtraMeals: (): MealRecord[] => {
            const today = todayPacificDateString();
            return get().extraMealRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayHolidays: (): HolidayRecord[] => {
            const today = todayPacificDateString();
            return get().holidayRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayHaircuts: (): HaircutRecord[] => {
            const today = todayPacificDateString();
            return get().haircutRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },
        })),
        {
          name: 'hopes-corner-meals',
          partialize: (state) => ({
            mealRecords: state.mealRecords,
            rvMealRecords: state.rvMealRecords,
            extraMealRecords: state.extraMealRecords,
            holidayRecords: state.holidayRecords,
            haircutRecords: state.haircutRecords,
          }),
        }
      )
    ),
    { name: 'MealsStore' }
  )
);
