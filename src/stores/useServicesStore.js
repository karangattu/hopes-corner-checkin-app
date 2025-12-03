import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import { createPersistConfig } from './middleware/persistentStorage';
import {
  mapShowerRow,
  mapLaundryRow,
  mapBicycleRow,
} from '../context/utils/mappers';
import { todayPacificDateString, pacificDateStringFrom } from '../utils/date';

export const useServicesStore = create(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // State
          showerRecords: [],
          laundryRecords: [],
          bicycleRecords: [],

          // Shower Actions
          addShowerRecord: async (guestId) => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled() && supabase) {
              const payload = {
                guest_id: guestId,
                scheduled_for: todayStr,
                status: 'booked',
              };

              const { data, error } = await supabase
                .from('shower_reservations')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add shower record to Supabase:', error);
                throw new Error('Unable to save shower record');
              }

              const mapped = mapShowerRow(data);
              set((state) => {
                state.showerRecords.push(mapped);
              });
              return mapped;
            }

            const fallbackRecord = {
              id: `local-shower-${Date.now()}`,
              guestId,
              date: todayStr,
              createdAt: new Date().toISOString(),
            };

            set((state) => {
              state.showerRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteShowerRecord: async (recordId) => {
            const { showerRecords } = get();
            const target = showerRecords.find((r) => r.id === recordId);

            set((state) => {
              state.showerRecords = state.showerRecords.filter(
                (r) => r.id !== recordId
              );
            });

            if (isSupabaseEnabled() && supabase && target) {
              const { error } = await supabase
                .from('shower_reservations')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error(
                  'Failed to delete shower record from Supabase:',
                  error
                );
              }
            }
          },

          // Laundry Actions
          addLaundryRecord: async (guestId, washType) => {
            if (!guestId) throw new Error('Guest ID is required');
            if (!washType) throw new Error('Wash type is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled() && supabase) {
              const payload = {
                guest_id: guestId,
                laundry_type: washType.toLowerCase(),
                scheduled_for: todayStr,
                status: 'waiting',
              };

              const { data, error } = await supabase
                .from('laundry_bookings')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add laundry record to Supabase:', error);
                throw new Error('Unable to save laundry record');
              }

              const mapped = mapLaundryRow(data);
              set((state) => {
                state.laundryRecords.push(mapped);
              });
              return mapped;
            }

            const fallbackRecord = {
              id: `local-laundry-${Date.now()}`,
              guestId,
              washType,
              date: todayStr,
              createdAt: new Date().toISOString(),
            };

            set((state) => {
              state.laundryRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          deleteLaundryRecord: async (recordId) => {
            const { laundryRecords } = get();
            const target = laundryRecords.find((r) => r.id === recordId);

            set((state) => {
              state.laundryRecords = state.laundryRecords.filter(
                (r) => r.id !== recordId
              );
            });

            if (isSupabaseEnabled() && supabase && target) {
              const { error } = await supabase
                .from('laundry_bookings')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error(
                  'Failed to delete laundry record from Supabase:',
                  error
                );
              }
            }
          },

          // Bicycle Actions
          addBicycleRecord: async (guestId, repairOptions = {}) => {
            if (!guestId) throw new Error('Guest ID is required');

            const {
              repairType = 'Flat Tire',
              repairTypes = null,
              notes = '',
              status = 'pending',
              priority = 0,
            } = repairOptions;

            if (isSupabaseEnabled() && supabase) {
              const payload = {
                guest_id: guestId,
                repair_type: repairType,
                repair_types: repairTypes || [repairType],
                notes,
                status,
                priority,
                completed_repairs: [],
              };

              const { data, error } = await supabase
                .from('bicycle_repairs')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add bicycle record to Supabase:', error);
                throw new Error('Unable to save bicycle record');
              }

              const mapped = mapBicycleRow(data);
              set((state) => {
                state.bicycleRecords.push(mapped);
              });
              return mapped;
            }

            const fallbackRecord = {
              id: `local-bicycle-${Date.now()}`,
              guestId,
              date: new Date().toISOString(),
              repairType,
              repairTypes: repairTypes || [repairType],
              completedRepairs: [],
              notes,
              status,
              priority,
              doneAt: null,
              lastUpdated: new Date().toISOString(),
            };

            set((state) => {
              state.bicycleRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          updateBicycleRecord: async (recordId, updates) => {
            const { bicycleRecords } = get();
            const target = bicycleRecords.find((r) => r.id === recordId);

            if (!target) throw new Error('Bicycle record not found');

            const completedAt = updates.status === 'done' ? new Date().toISOString() : null;

            set((state) => {
              const index = state.bicycleRecords.findIndex(
                (r) => r.id === recordId
              );
              if (index !== -1) {
                Object.assign(state.bicycleRecords[index], {
                  ...updates,
                  doneAt: updates.status === 'done' ? completedAt : state.bicycleRecords[index].doneAt,
                });
              }
            });

            if (isSupabaseEnabled() && supabase) {
              const payload = { ...updates };
              if (updates.status === 'done') {
                payload.completed_at = completedAt;
              }

              const { error } = await supabase
                .from('bicycle_repairs')
                .update(payload)
                .eq('id', recordId);

              if (error) {
                console.error(
                  'Failed to update bicycle repair in Supabase:',
                  error
                );
                // Revert optimistic update
                set((state) => {
                  const index = state.bicycleRecords.findIndex(
                    (r) => r.id === recordId
                  );
                  if (index !== -1) {
                    state.bicycleRecords[index] = { ...target };
                  }
                });
                throw new Error('Unable to update bicycle repair');
              }
            }
          },

          deleteBicycleRecord: async (recordId) => {
            const { bicycleRecords } = get();
            const target = bicycleRecords.find((r) => r.id === recordId);

            set((state) => {
              state.bicycleRecords = state.bicycleRecords.filter(
                (r) => r.id !== recordId
              );
            });

            if (isSupabaseEnabled() && supabase && target) {
              const { error } = await supabase
                .from('bicycle_repairs')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error(
                  'Failed to delete bicycle record from Supabase:',
                  error
                );
              }
            }
          },

          // Load from Supabase
          loadFromSupabase: async () => {
            if (!isSupabaseEnabled() || !supabase) return;

            try {
              const [showerRes, laundryRes, bicycleRes] = await Promise.all([
                supabase.from('shower_reservations').select('*'),
                supabase.from('laundry_bookings').select('*'),
                supabase.from('bicycle_repairs').select('*'),
              ]);

              set((state) => {
                if (showerRes.data) {
                  state.showerRecords = showerRes.data.map(mapShowerRow);
                }
                if (laundryRes.data) {
                  state.laundryRecords = laundryRes.data.map(mapLaundryRow);
                }
                if (bicycleRes.data) {
                  state.bicycleRecords = bicycleRes.data.map(mapBicycleRow);
                }
              });
            } catch (error) {
              console.error(
                'Failed to load service records from Supabase:',
                error
              );
            }
          },

          // Clear all service records
          clearServiceRecords: () => {
            set((state) => {
              state.showerRecords = [];
              state.laundryRecords = [];
              state.bicycleRecords = [];
            });
          },

          // Selectors
          getTodayShowers: () => {
            const today = todayPacificDateString();
            return get().showerRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayLaundry: () => {
            const today = todayPacificDateString();
            return get().laundryRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayOnsiteLaundry: () => {
            const today = todayPacificDateString();
            return get().laundryRecords.filter(
              (r) =>
                pacificDateStringFrom(r.date) === today &&
                r.washType === 'Onsite'
            );
          },

          getTodayOffsiteLaundry: () => {
            const today = todayPacificDateString();
            return get().laundryRecords.filter(
              (r) =>
                pacificDateStringFrom(r.date) === today &&
                r.washType === 'Offsite'
            );
          },

          getActiveBicycles: () => {
            return get().bicycleRecords.filter((r) => !r.returnedAt);
          },

          getTodayBicycles: () => {
            const today = todayPacificDateString();
            return get().bicycleRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },
        })),
        createPersistConfig('hopes-corner-services')
      )
    ),
    { name: 'ServicesStore' }
  )
);
