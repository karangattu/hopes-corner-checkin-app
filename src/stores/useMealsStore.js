import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import { fetchAllPaginated } from '../utils/supabasePagination';
import { createPersistConfig } from './middleware/persistentStorage';
import {
  mapMealRow,
  mapHolidayRow,
  mapHaircutRow,
} from '../context/utils/mappers';
import { todayPacificDateString, pacificDateStringFrom } from '../utils/date';
import { getRealtimeClient, isRealtimeAvailable } from '../hooks/useRealtimeSubscription';

// Store active realtime subscriptions for cleanup
let mealsRealtimeChannels = [];

export const useMealsStore = create(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // State
          mealRecords: [],
          rvMealRecords: [],
          extraMealRecords: [],
          holidayRecords: [],
          haircutRecords: [],

          // Meal Actions
          // pickedUpByGuestId: optional - tracks who physically picked up the meal (for linked/proxy guests)
          addMealRecord: async (guestId, quantity = 1, pickedUpByGuestId = null) => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled() && supabase) {
              // Validation: Check if guest already has a meal recorded today
              const { data: existingRecord, error: checkError } = await supabase
                .from('meal_attendance')
                .select('id')
                .eq('guest_id', guestId)
                .eq('meal_date', todayStr)
                .maybeSingle();

              if (checkError) {
                console.error('Error checking existing meal record:', checkError);
                throw new Error('Failed to validate meal availability');
              }

              if (existingRecord) {
                throw new Error('Guest already received a meal today');
              }

              const payload = {
                guest_id: guestId,
                quantity,
                meal_date: todayStr,
                picked_up_by_guest_id: pickedUpByGuestId || null,
              };
              
              // Add proxy tracking if a different guest picked up the meal
              if (pickedUpByGuestId && pickedUpByGuestId !== guestId) {
                payload.picked_up_by_guest_id = pickedUpByGuestId;
              }

              const { data, error } = await supabase
                .from('meal_attendance')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add meal record to Supabase:', error);
                throw new Error('Unable to save meal record');
              }

              const mapped = mapMealRow(data);
              set((state) => {
                state.mealRecords.push(mapped);
              });
              return mapped;
            }

            const fallbackRecord = {
              id: `local-meal-${Date.now()}`,
              guestId,
              pickedUpByGuestId: pickedUpByGuestId !== guestId ? pickedUpByGuestId : null,
              quantity,
              date: todayStr,
              createdAt: new Date().toISOString(),
            };

            set((state) => {
              state.mealRecords.push(fallbackRecord);
            });
            // Debug: ensure pickedUpByGuestId is normalized (null if equals guestId)
            // console.log('DEBUG addMealRecord fallbackRecord:', fallbackRecord);
            return fallbackRecord;
          },

          deleteMealRecord: async (recordId) => {
            const { mealRecords } = get();
            const target = mealRecords.find((r) => r.id === recordId);

            set((state) => {
              state.mealRecords = state.mealRecords.filter(
                (r) => r.id !== recordId
              );
            });

            if (isSupabaseEnabled() && supabase && target) {
              const { error } = await supabase
                .from('meal_attendance')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete meal record from Supabase:', error);
              }
            }
          },

          // RV Meal Actions (stored as meal_attendance with RV flag or in local state)
          addRvMealRecord: async (guestId, quantity = 1) => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            const fallbackRecord = {
              id: `local-rv-meal-${Date.now()}`,
              guestId,
              quantity,
              date: todayStr,
              createdAt: new Date().toISOString(),
            };

            set((state) => {
              state.rvMealRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteRvMealRecord: async (recordId) => {
            set((state) => {
              state.rvMealRecords = state.rvMealRecords.filter(
                (r) => r.id !== recordId
              );
            });
          },

          // Extra Meal Actions
          addExtraMealRecord: async (guestId, quantity = 1) => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            const fallbackRecord = {
              id: `local-extra-meal-${Date.now()}`,
              guestId,
              quantity,
              date: todayStr,
              createdAt: new Date().toISOString(),
            };

            set((state) => {
              state.extraMealRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteExtraMealRecord: async (recordId) => {
            set((state) => {
              state.extraMealRecords = state.extraMealRecords.filter(
                (r) => r.id !== recordId
              );
            });
          },

          // Holiday Records
          addHolidayRecord: async (guestId) => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled() && supabase) {
              const payload = {
                guest_id: guestId,
                visit_date: todayStr,
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

              const mapped = mapHolidayRow(data);
              set((state) => {
                state.holidayRecords.push(mapped);
              });
              return mapped;
            }

            const fallbackRecord = {
              id: `local-holiday-${Date.now()}`,
              guestId,
              date: todayStr,
              createdAt: new Date().toISOString(),
            };

            set((state) => {
              state.holidayRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteHolidayRecord: async (recordId) => {
            const { holidayRecords } = get();
            const target = holidayRecords.find((r) => r.id === recordId);

            set((state) => {
              state.holidayRecords = state.holidayRecords.filter(
                (r) => r.id !== recordId
              );
            });

            if (isSupabaseEnabled() && supabase && target) {
              const { error} = await supabase
                .from('holiday_visits')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete holiday record from Supabase:', error);
              }
            }
          },

          // Haircut Records
          addHaircutRecord: async (guestId) => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled() && supabase) {
              const payload = {
                guest_id: guestId,
                visit_date: todayStr,
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

              const mapped = mapHaircutRow(data);
              set((state) => {
                state.haircutRecords.push(mapped);
              });
              return mapped;
            }

            const fallbackRecord = {
              id: `local-haircut-${Date.now()}`,
              guestId,
              date: todayStr,
              createdAt: new Date().toISOString(),
            };

            set((state) => {
              state.haircutRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteHaircutRecord: async (recordId) => {
            const { haircutRecords } = get();
            const target = haircutRecords.find((r) => r.id === recordId);

            set((state) => {
              state.haircutRecords = state.haircutRecords.filter(
                (r) => r.id !== recordId
              );
            });

            if (isSupabaseEnabled() && supabase && target) {
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
          loadFromSupabase: async () => {
            if (!isSupabaseEnabled() || !supabase) return;

            try {
              const [mealRows, holidayRows, haircutRows] = await Promise.all([
                fetchAllPaginated(supabase, {
                  table: 'meal_attendance',
                  select:
                    'id,guest_id,quantity,served_on,meal_type,recorded_at,created_at',
                  orderBy: 'created_at',
                  ascending: false,
                  pageSize: 1000,
                  mapper: mapMealRow,
                }),
                fetchAllPaginated(supabase, {
                  table: 'holiday_visits',
                  select: 'id,guest_id,served_at,created_at',
                  orderBy: 'created_at',
                  ascending: false,
                  pageSize: 1000,
                  mapper: mapHolidayRow,
                }),
                fetchAllPaginated(supabase, {
                  table: 'haircut_visits',
                  select: 'id,guest_id,served_at,created_at',
                  orderBy: 'created_at',
                  ascending: false,
                  pageSize: 1000,
                  mapper: mapHaircutRow,
                }),
              ]);

              set((state) => {
                state.mealRecords = mealRows || [];
                state.holidayRecords = holidayRows || [];
                state.haircutRecords = haircutRows || [];
              });
            } catch (error) {
              console.error('Failed to load meal records from Supabase:', error);
            }
          },

          // Clear all meal records
          clearMealRecords: () => {
            set((state) => {
              state.mealRecords = [];
              state.rvMealRecords = [];
              state.extraMealRecords = [];
              state.holidayRecords = [];
              state.haircutRecords = [];
            });
          },

          // Selectors (computed values)
          getTodayMeals: () => {
            const today = todayPacificDateString();
            return get().mealRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayRvMeals: () => {
            const today = todayPacificDateString();
            return get().rvMealRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayExtraMeals: () => {
            const today = todayPacificDateString();
            return get().extraMealRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayHolidays: () => {
            const today = todayPacificDateString();
            return get().holidayRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayHaircuts: () => {
            const today = todayPacificDateString();
            return get().haircutRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          // Realtime subscription methods
          subscribeToRealtime: () => {
            if (!isSupabaseEnabled() || !isRealtimeAvailable()) {
              console.log('[Meals] Realtime not available, skipping subscription');
              return () => {};
            }

            const client = getRealtimeClient();
            if (!client) return () => {};

            // Clean up any existing subscriptions
            get().unsubscribeFromRealtime();

            const handleMealChange = (eventType, payload) => {
              const { new: newRecord, old: oldRecord } = payload;
              set((state) => {
                if (eventType === 'INSERT' && newRecord) {
                  const mapped = mapMealRow(newRecord);
                  // Only add to mealRecords if meal_type is 'guest' - other types go to their own arrays
                  if (newRecord.meal_type !== 'guest') {
                    console.log('[Realtime] Skipping non-guest meal INSERT:', mapped.id, 'type:', newRecord.meal_type);
                    return;
                  }
                  const exists = state.mealRecords.some((r) => r.id === mapped.id);
                  if (!exists) {
                    state.mealRecords.push(mapped);
                    console.log('[Realtime] Meal INSERT:', mapped.id);
                  }
                } else if (eventType === 'UPDATE' && newRecord) {
                  const mapped = mapMealRow(newRecord);
                  // Only update mealRecords if meal_type is 'guest'
                  if (newRecord.meal_type !== 'guest') {
                    console.log('[Realtime] Skipping non-guest meal UPDATE:', mapped.id, 'type:', newRecord.meal_type);
                    return;
                  }
                  const idx = state.mealRecords.findIndex((r) => r.id === mapped.id);
                  if (idx >= 0) {
                    state.mealRecords[idx] = mapped;
                    console.log('[Realtime] Meal UPDATE:', mapped.id);
                  }
                } else if (eventType === 'DELETE' && oldRecord) {
                  state.mealRecords = state.mealRecords.filter(
                    (r) => r.id !== oldRecord.id
                  );
                  console.log('[Realtime] Meal DELETE:', oldRecord.id);
                }
              });
            };

            const handleHolidayChange = (eventType, payload) => {
              const { new: newRecord, old: oldRecord } = payload;
              set((state) => {
                if (eventType === 'INSERT' && newRecord) {
                  const mapped = mapHolidayRow(newRecord);
                  const exists = state.holidayRecords.some((r) => r.id === mapped.id);
                  if (!exists) {
                    state.holidayRecords.push(mapped);
                    console.log('[Realtime] Holiday INSERT:', mapped.id);
                  }
                } else if (eventType === 'UPDATE' && newRecord) {
                  const mapped = mapHolidayRow(newRecord);
                  const idx = state.holidayRecords.findIndex((r) => r.id === mapped.id);
                  if (idx >= 0) {
                    state.holidayRecords[idx] = mapped;
                    console.log('[Realtime] Holiday UPDATE:', mapped.id);
                  }
                } else if (eventType === 'DELETE' && oldRecord) {
                  state.holidayRecords = state.holidayRecords.filter(
                    (r) => r.id !== oldRecord.id
                  );
                  console.log('[Realtime] Holiday DELETE:', oldRecord.id);
                }
              });
            };

            const handleHaircutChange = (eventType, payload) => {
              const { new: newRecord, old: oldRecord } = payload;
              set((state) => {
                if (eventType === 'INSERT' && newRecord) {
                  const mapped = mapHaircutRow(newRecord);
                  const exists = state.haircutRecords.some((r) => r.id === mapped.id);
                  if (!exists) {
                    state.haircutRecords.push(mapped);
                    console.log('[Realtime] Haircut INSERT:', mapped.id);
                  }
                } else if (eventType === 'UPDATE' && newRecord) {
                  const mapped = mapHaircutRow(newRecord);
                  const idx = state.haircutRecords.findIndex((r) => r.id === mapped.id);
                  if (idx >= 0) {
                    state.haircutRecords[idx] = mapped;
                    console.log('[Realtime] Haircut UPDATE:', mapped.id);
                  }
                } else if (eventType === 'DELETE' && oldRecord) {
                  state.haircutRecords = state.haircutRecords.filter(
                    (r) => r.id !== oldRecord.id
                  );
                  console.log('[Realtime] Haircut DELETE:', oldRecord.id);
                }
              });
            };

            // Subscribe to meal_attendance
            const mealChannel = client
              .channel('meals-attendance')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_attendance' }, (payload) => {
                handleMealChange(payload.eventType, payload);
              })
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  console.log('[Meals] Subscribed to meal_attendance realtime');
                }
              });

            // Subscribe to holiday_visits
            const holidayChannel = client
              .channel('meals-holidays')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'holiday_visits' }, (payload) => {
                handleHolidayChange(payload.eventType, payload);
              })
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  console.log('[Meals] Subscribed to holiday_visits realtime');
                }
              });

            // Subscribe to haircut_visits
            const haircutChannel = client
              .channel('meals-haircuts')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'haircut_visits' }, (payload) => {
                handleHaircutChange(payload.eventType, payload);
              })
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  console.log('[Meals] Subscribed to haircut_visits realtime');
                }
              });

            mealsRealtimeChannels = [mealChannel, holidayChannel, haircutChannel];

            // Return cleanup function
            return () => get().unsubscribeFromRealtime();
          },

          unsubscribeFromRealtime: () => {
            const client = getRealtimeClient();
            if (client && mealsRealtimeChannels.length > 0) {
              mealsRealtimeChannels.forEach((channel) => {
                client.removeChannel(channel);
              });
              mealsRealtimeChannels = [];
              console.log('[Meals] Unsubscribed from realtime');
            }
          },
        })),
        {
          ...createPersistConfig('hopes-corner-meals'),
          // Migration to clean up corrupted data where non-guest meal types
          // were incorrectly added to mealRecords (e.g., lunch_bag records)
          version: 1,
          migrate: (persistedState, version) => {
            if (version === 0 || !version) {
              // Filter mealRecords to only include records with valid guestId
              // This fixes the bug where lunch_bag records (no guestId) were
              // incorrectly added to mealRecords via realtime subscription
              const cleanedMealRecords = (persistedState.mealRecords || []).filter(
                (record) => record.guestId && record.type === 'guest'
              );
              console.log('[MealsStore] Migration v1: Cleaned mealRecords from', 
                persistedState.mealRecords?.length || 0, 'to', cleanedMealRecords.length);
              return {
                ...persistedState,
                mealRecords: cleanedMealRecords,
              };
            }
            return persistedState;
          },
        }
      )
    ),
    { name: 'MealsStore' }
  )
);
