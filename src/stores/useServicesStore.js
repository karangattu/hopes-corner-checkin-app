import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import { fetchAllPaginated } from '../utils/supabasePagination';
import { createPersistConfig } from './middleware/persistentStorage';
import {
  mapShowerRow,
  mapLaundryRow,
  mapBicycleRow,
} from '../context/utils/mappers';
import { todayPacificDateString, pacificDateStringFrom } from '../utils/date';
import { getRealtimeClient, isRealtimeAvailable } from '../hooks/useRealtimeSubscription';

// Store active realtime subscriptions for cleanup
let realtimeChannels = [];

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
          addShowerRecord: async (guestId, slotTime) => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled() && supabase) {
              // Validation: Check if guest already has a shower booked today
              const { data: existingBooking, error: checkError } = await supabase
                .from('shower_reservations')
                .select('id')
                .eq('guest_id', guestId)
                .eq('scheduled_for', todayStr)
                .neq('status', 'cancelled') // Ignore cancelled bookings
                .maybeSingle();

              if (checkError) {
                console.error('Error checking existing shower booking:', checkError);
                throw new Error('Failed to validate shower availability');
              }

              if (existingBooking) {
                throw new Error('Guest already has a shower booked for today');
              }

              // Validation: Check slot capacity if a specific time is requested
              if (slotTime) {
                const { count, error: countError } = await supabase
                  .from('shower_reservations')
                  .select('id', { count: 'exact', head: true })
                  .eq('scheduled_for', todayStr)
                  .eq('scheduled_time', slotTime)
                  .neq('status', 'cancelled');

                if (countError) {
                  console.error('Error checking shower slot capacity:', countError);
                  throw new Error('Failed to check slot capacity');
                }

                if (count >= 2) {
                  throw new Error('This shower slot is already full');
                }
              }

              const payload = {
                guest_id: guestId,
                scheduled_for: todayStr,
                scheduled_time: slotTime || null,
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
              time: slotTime || null,
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
              // Validation: Check if guest already has laundry booked today
              const { data: existingBooking, error: checkError } = await supabase
                .from('laundry_bookings')
                .select('id')
                .eq('guest_id', guestId)
                .eq('scheduled_for', todayStr)
                .neq('status', 'cancelled')
                .maybeSingle();

              if (checkError) {
                console.error('Error checking existing laundry booking:', checkError);
                throw new Error('Failed to validate laundry availability');
              }

              if (existingBooking) {
                throw new Error('Guest already has laundry booked for today');
              }

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
              const [showerRows, laundryRows, bicycleRows] = await Promise.all([
                fetchAllPaginated(supabase, {
                  table: 'shower_reservations',
                  select:
                    'id,guest_id,scheduled_for,scheduled_time,status,created_at,updated_at',
                  orderBy: 'created_at',
                  ascending: false,
                  pageSize: 1000,
                  mapper: mapShowerRow,
                }),
                fetchAllPaginated(supabase, {
                  table: 'laundry_bookings',
                  select:
                    'id,guest_id,slot_label,laundry_type,bag_number,scheduled_for,status,created_at,updated_at',
                  orderBy: 'created_at',
                  ascending: false,
                  pageSize: 1000,
                  mapper: mapLaundryRow,
                }),
                fetchAllPaginated(supabase, {
                  table: 'bicycle_repairs',
                  select:
                    'id,guest_id,requested_at,repair_type,repair_types,notes,status,priority,completed_repairs,completed_at,updated_at',
                  orderBy: 'updated_at',
                  ascending: false,
                  pageSize: 1000,
                  mapper: mapBicycleRow,
                }),
              ]);

              set((state) => {
                state.showerRecords = showerRows || [];
                state.laundryRecords = laundryRows || [];
                state.bicycleRecords = bicycleRows || [];
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

          /**
           * Sync methods for AppContext mutations to push changes back to the store.
           * This prevents useStoreToContextSync from overwriting AppContext with stale store data.
           * Called by showerMutations.js / laundryMutations.js after successful writes.
           */
          syncShowerFromMutation: (action, record) => {
            set((state) => {
              if (action === 'add') {
                const exists = state.showerRecords.some((r) => r.id === record.id);
                if (!exists) {
                  state.showerRecords.push(record);
                  console.log('[StoreSync] Shower added from mutation:', record.id);
                }
              } else if (action === 'update') {
                const idx = state.showerRecords.findIndex((r) => r.id === record.id);
                if (idx >= 0) {
                  state.showerRecords[idx] = record;
                } else {
                  state.showerRecords.push(record);
                }
                console.log('[StoreSync] Shower updated from mutation:', record.id);
              } else if (action === 'remove') {
                state.showerRecords = state.showerRecords.filter((r) => r.id !== record.id);
                console.log('[StoreSync] Shower removed from mutation:', record.id);
              } else if (action === 'bulkRemove' && Array.isArray(record)) {
                const idsToRemove = new Set(record.map((r) => r.id || r));
                state.showerRecords = state.showerRecords.filter((r) => !idsToRemove.has(r.id));
                console.log('[StoreSync] Showers bulk removed from mutation:', record.length);
              }
            });
          },

          syncLaundryFromMutation: (action, record) => {
            set((state) => {
              if (action === 'add') {
                const exists = state.laundryRecords.some((r) => r.id === record.id);
                if (!exists) {
                  state.laundryRecords.push(record);
                  console.log('[StoreSync] Laundry added from mutation:', record.id);
                }
              } else if (action === 'update') {
                const idx = state.laundryRecords.findIndex((r) => r.id === record.id);
                if (idx >= 0) {
                  state.laundryRecords[idx] = record;
                } else {
                  state.laundryRecords.push(record);
                }
                console.log('[StoreSync] Laundry updated from mutation:', record.id);
              } else if (action === 'remove') {
                state.laundryRecords = state.laundryRecords.filter((r) => r.id !== record.id);
                console.log('[StoreSync] Laundry removed from mutation:', record.id);
              } else if (action === 'bulkRemove' && Array.isArray(record)) {
                const idsToRemove = new Set(record.map((r) => r.id || r));
                state.laundryRecords = state.laundryRecords.filter((r) => !idsToRemove.has(r.id));
                console.log('[StoreSync] Laundry bulk removed from mutation:', record.length);
              }
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

          // Realtime subscription methods
          subscribeToRealtime: () => {
            if (!isSupabaseEnabled() || !isRealtimeAvailable()) {
              console.log('[Services] Realtime not available, skipping subscription');
              return () => {};
            }

            const client = getRealtimeClient();
            if (!client) return () => {};

            // Clean up any existing subscriptions
            get().unsubscribeFromRealtime();

            const handleShowerChange = (eventType, payload) => {
              const { new: newRecord, old: oldRecord } = payload;
              set((state) => {
                if (eventType === 'INSERT' && newRecord) {
                  const mapped = mapShowerRow(newRecord);
                  const exists = state.showerRecords.some((r) => r.id === mapped.id);
                  if (!exists) {
                    state.showerRecords.push(mapped);
                    console.log('[Realtime] Shower INSERT:', mapped.id);
                  }
                } else if (eventType === 'UPDATE' && newRecord) {
                  const mapped = mapShowerRow(newRecord);
                  const idx = state.showerRecords.findIndex((r) => r.id === mapped.id);
                  if (idx >= 0) {
                    state.showerRecords[idx] = mapped;
                    console.log('[Realtime] Shower UPDATE:', mapped.id);
                  }
                } else if (eventType === 'DELETE' && oldRecord) {
                  state.showerRecords = state.showerRecords.filter(
                    (r) => r.id !== oldRecord.id
                  );
                  console.log('[Realtime] Shower DELETE:', oldRecord.id);
                }
              });
            };

            const handleLaundryChange = (eventType, payload) => {
              const { new: newRecord, old: oldRecord } = payload;
              set((state) => {
                if (eventType === 'INSERT' && newRecord) {
                  const mapped = mapLaundryRow(newRecord);
                  const exists = state.laundryRecords.some((r) => r.id === mapped.id);
                  if (!exists) {
                    state.laundryRecords.push(mapped);
                    console.log('[Realtime] Laundry INSERT:', mapped.id);
                  }
                } else if (eventType === 'UPDATE' && newRecord) {
                  const mapped = mapLaundryRow(newRecord);
                  const idx = state.laundryRecords.findIndex((r) => r.id === mapped.id);
                  if (idx >= 0) {
                    state.laundryRecords[idx] = mapped;
                    console.log('[Realtime] Laundry UPDATE:', mapped.id);
                  }
                } else if (eventType === 'DELETE' && oldRecord) {
                  state.laundryRecords = state.laundryRecords.filter(
                    (r) => r.id !== oldRecord.id
                  );
                  console.log('[Realtime] Laundry DELETE:', oldRecord.id);
                }
              });
            };

            const handleBicycleChange = (eventType, payload) => {
              const { new: newRecord, old: oldRecord } = payload;
              set((state) => {
                if (eventType === 'INSERT' && newRecord) {
                  const mapped = mapBicycleRow(newRecord);
                  const exists = state.bicycleRecords.some((r) => r.id === mapped.id);
                  if (!exists) {
                    state.bicycleRecords.push(mapped);
                    console.log('[Realtime] Bicycle INSERT:', mapped.id);
                  }
                } else if (eventType === 'UPDATE' && newRecord) {
                  const mapped = mapBicycleRow(newRecord);
                  const idx = state.bicycleRecords.findIndex((r) => r.id === mapped.id);
                  if (idx >= 0) {
                    state.bicycleRecords[idx] = mapped;
                    console.log('[Realtime] Bicycle UPDATE:', mapped.id);
                  }
                } else if (eventType === 'DELETE' && oldRecord) {
                  state.bicycleRecords = state.bicycleRecords.filter(
                    (r) => r.id !== oldRecord.id
                  );
                  console.log('[Realtime] Bicycle DELETE:', oldRecord.id);
                }
              });
            };

            // Subscribe to shower_reservations
            const showerChannel = client
              .channel('services-showers')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'shower_reservations' }, (payload) => {
                handleShowerChange(payload.eventType, payload);
              })
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  console.log('[Services] Subscribed to shower_reservations realtime');
                }
              });

            // Subscribe to laundry_bookings
            const laundryChannel = client
              .channel('services-laundry')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'laundry_bookings' }, (payload) => {
                handleLaundryChange(payload.eventType, payload);
              })
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  console.log('[Services] Subscribed to laundry_bookings realtime');
                }
              });

            // Subscribe to bicycle_repairs
            const bicycleChannel = client
              .channel('services-bicycles')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'bicycle_repairs' }, (payload) => {
                handleBicycleChange(payload.eventType, payload);
              })
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  console.log('[Services] Subscribed to bicycle_repairs realtime');
                }
              });

            realtimeChannels = [showerChannel, laundryChannel, bicycleChannel];

            // Return cleanup function
            return () => get().unsubscribeFromRealtime();
          },

          unsubscribeFromRealtime: () => {
            const client = getRealtimeClient();
            if (client && realtimeChannels.length > 0) {
              realtimeChannels.forEach((channel) => {
                client.removeChannel(channel);
              });
              realtimeChannels = [];
              console.log('[Services] Unsubscribed from realtime');
            }
          },        })),
        createPersistConfig('hopes-corner-services')
      )
    ),
    { name: 'ServicesStore' }
  )
);
