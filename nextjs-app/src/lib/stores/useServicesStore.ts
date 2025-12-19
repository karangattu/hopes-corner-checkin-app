import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient, isSupabaseEnabled } from '@/lib/supabase/client';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import type { 
  ShowerRecord, 
  LaundryRecord, 
  BicycleRepair, 
  ShowerStatus, 
  LaundryStatus, 
  LaundryType,
  BicycleRepairStatus 
} from '@/lib/types';

// Database row types
interface ShowerReservationRow {
  id: string;
  guest_id: string;
  scheduled_for: string;
  scheduled_time: string | null;
  status: ShowerStatus;
  created_at: string;
  updated_at: string;
  note: string | null;
}

interface LaundryBookingRow {
  id: string;
  guest_id: string;
  slot_label: string | null;
  laundry_type: string;
  bag_number: string | null;
  scheduled_for: string;
  status: LaundryStatus;
  created_at: string;
  updated_at: string;
  note: string | null;
}

interface BicycleRepairRow {
  id: string;
  guest_id: string | null;
  requested_at: string;
  repair_type: string | null;
  repair_types: string[];
  notes: string | null;
  status: BicycleRepairStatus;
  priority: number;
  completed_repairs: string[];
  completed_at: string | null;
  updated_at: string;
}

// Mappers
function mapShowerRow(row: ShowerReservationRow): ShowerRecord {
  return {
    id: row.id,
    guestId: row.guest_id,
    time: row.scheduled_time,
    scheduledFor: row.scheduled_for,
    date: row.scheduled_for,
    status: row.status,
    createdAt: row.created_at,
    lastUpdated: row.updated_at,
  };
}

function mapLaundryRow(row: LaundryBookingRow): LaundryRecord {
  return {
    id: row.id,
    guestId: row.guest_id,
    time: row.slot_label,
    laundryType: row.laundry_type as LaundryType,
    bagNumber: row.bag_number || '',
    scheduledFor: row.scheduled_for,
    date: row.scheduled_for,
    status: row.status,
    createdAt: row.created_at,
    lastUpdated: row.updated_at,
  };
}

function mapBicycleRow(row: BicycleRepairRow): BicycleRepair {
  return {
    id: row.id,
    guestId: row.guest_id,
    date: row.requested_at,
    repairType: row.repair_type || row.repair_types?.[0] || '',
    repairTypes: row.repair_types || [],
    completedRepairs: row.completed_repairs || [],
    notes: row.notes || '',
    status: row.status,
    priority: row.priority,
    doneAt: row.completed_at,
    lastUpdated: row.updated_at,
  };
}

// Store state interface
interface ServicesState {
  showerRecords: ShowerRecord[];
  laundryRecords: LaundryRecord[];
  bicycleRecords: BicycleRepair[];
  isLoading: boolean;
  error: string | null;
}

// Bicycle repair options
interface BicycleRepairOptions {
  repairType?: string;
  repairTypes?: string[] | null;
  notes?: string;
  status?: BicycleRepairStatus;
  priority?: number;
}

// Store actions interface
interface ServicesActions {
  // Shower Actions
  addShowerRecord: (guestId: string, time?: string) => Promise<ShowerRecord>;
  updateShowerStatus: (recordId: string, status: ShowerStatus) => Promise<void>;
  deleteShowerRecord: (recordId: string) => Promise<void>;
  
  // Laundry Actions
  addLaundryRecord: (guestId: string, washType: string) => Promise<LaundryRecord>;
  updateLaundryStatus: (recordId: string, status: LaundryStatus) => Promise<void>;
  deleteLaundryRecord: (recordId: string) => Promise<void>;
  
  // Bicycle Actions
  addBicycleRecord: (guestId: string, options?: BicycleRepairOptions) => Promise<BicycleRepair>;
  updateBicycleRecord: (recordId: string, updates: Partial<BicycleRepair>) => Promise<void>;
  deleteBicycleRecord: (recordId: string) => Promise<void>;
  
  // Load from Supabase
  loadFromSupabase: () => Promise<void>;
  
  // Clear all records
  clearServiceRecords: () => void;
  
  // Selectors
  getTodayShowers: () => ShowerRecord[];
  getTodayLaundry: () => LaundryRecord[];
  getTodayOnsiteLaundry: () => LaundryRecord[];
  getTodayOffsiteLaundry: () => LaundryRecord[];
  getActiveBicycles: () => BicycleRepair[];
  getTodayBicycles: () => BicycleRepair[];
}

type ServicesStore = ServicesState & ServicesActions;

export const useServicesStore = create<ServicesStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // Initial State
          showerRecords: [],
          laundryRecords: [],
          bicycleRecords: [],
          isLoading: false,
          error: null,

          // Shower Actions
          addShowerRecord: async (guestId: string, time?: string): Promise<ShowerRecord> => {
            if (!guestId) throw new Error('Guest ID is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const payload: Record<string, unknown> = {
                guest_id: guestId,
                scheduled_for: todayStr,
                status: 'booked',
              };
              if (time) {
                payload.scheduled_time = time;
              }

              const { data, error } = await supabase
                .from('shower_reservations')
                .insert(payload)
                .select()
                .single();

              if (error) {
                console.error('Failed to add shower record to Supabase:', error);
                throw new Error('Unable to save shower record');
              }

              const mapped = mapShowerRow(data as ShowerReservationRow);
              set((state) => {
                state.showerRecords.push(mapped);
              });
              return mapped;
            }

            // Local fallback
            const fallbackRecord: ShowerRecord = {
              id: `local-shower-${Date.now()}`,
              guestId,
              time: time || null,
              scheduledFor: todayStr,
              date: todayStr,
              status: 'booked',
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            };

            set((state) => {
              state.showerRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          updateShowerStatus: async (recordId: string, status: ShowerStatus): Promise<void> => {
            const { showerRecords } = get();
            const target = showerRecords.find((r) => r.id === recordId);
            
            if (!target) throw new Error('Shower record not found');

            const originalRecord = { ...target };

            set((state) => {
              const index = state.showerRecords.findIndex((r) => r.id === recordId);
              if (index !== -1) {
                state.showerRecords[index].status = status;
                state.showerRecords[index].lastUpdated = new Date().toISOString();
              }
            });

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const { error } = await supabase
                .from('shower_reservations')
                .update({ status })
                .eq('id', recordId);

              if (error) {
                console.error('Failed to update shower status in Supabase:', error);
                // Revert on error
                set((state) => {
                  const index = state.showerRecords.findIndex((r) => r.id === recordId);
                  if (index !== -1) {
                    state.showerRecords[index] = originalRecord;
                  }
                });
                throw new Error('Unable to update shower status');
              }
            }
          },

          deleteShowerRecord: async (recordId: string): Promise<void> => {
            const { showerRecords } = get();
            const target = showerRecords.find((r) => r.id === recordId);

            set((state) => {
              state.showerRecords = state.showerRecords.filter((r) => r.id !== recordId);
            });

            if (isSupabaseEnabled() && target) {
              const supabase = createClient();
              const { error } = await supabase
                .from('shower_reservations')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete shower record from Supabase:', error);
              }
            }
          },

          // Laundry Actions
          addLaundryRecord: async (guestId: string, washType: string): Promise<LaundryRecord> => {
            if (!guestId) throw new Error('Guest ID is required');
            if (!washType) throw new Error('Wash type is required');

            const todayStr = todayPacificDateString();

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const payload = {
                guest_id: guestId,
                laundry_type: washType.toLowerCase(),
                scheduled_for: todayStr,
                status: 'waiting' as LaundryStatus,
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

              const mapped = mapLaundryRow(data as LaundryBookingRow);
              set((state) => {
                state.laundryRecords.push(mapped);
              });
              return mapped;
            }

            // Local fallback
            const fallbackRecord: LaundryRecord = {
              id: `local-laundry-${Date.now()}`,
              guestId,
              time: null,
              laundryType: washType.toLowerCase() as LaundryType,
              bagNumber: '',
              scheduledFor: todayStr,
              date: todayStr,
              status: 'waiting',
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
            };

            set((state) => {
              state.laundryRecords.push(fallbackRecord);
            });
            return fallbackRecord;
          },

          updateLaundryStatus: async (recordId: string, status: LaundryStatus): Promise<void> => {
            const { laundryRecords } = get();
            const target = laundryRecords.find((r) => r.id === recordId);
            
            if (!target) throw new Error('Laundry record not found');

            const originalRecord = { ...target };

            set((state) => {
              const index = state.laundryRecords.findIndex((r) => r.id === recordId);
              if (index !== -1) {
                state.laundryRecords[index].status = status;
                state.laundryRecords[index].lastUpdated = new Date().toISOString();
              }
            });

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const { error } = await supabase
                .from('laundry_bookings')
                .update({ status })
                .eq('id', recordId);

              if (error) {
                console.error('Failed to update laundry status in Supabase:', error);
                // Revert on error
                set((state) => {
                  const index = state.laundryRecords.findIndex((r) => r.id === recordId);
                  if (index !== -1) {
                    state.laundryRecords[index] = originalRecord;
                  }
                });
                throw new Error('Unable to update laundry status');
              }
            }
          },

          deleteLaundryRecord: async (recordId: string): Promise<void> => {
            const { laundryRecords } = get();
            const target = laundryRecords.find((r) => r.id === recordId);

            set((state) => {
              state.laundryRecords = state.laundryRecords.filter((r) => r.id !== recordId);
            });

            if (isSupabaseEnabled() && target) {
              const supabase = createClient();
              const { error } = await supabase
                .from('laundry_bookings')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete laundry record from Supabase:', error);
              }
            }
          },

          // Bicycle Actions
          addBicycleRecord: async (guestId: string, options: BicycleRepairOptions = {}): Promise<BicycleRepair> => {
            if (!guestId) throw new Error('Guest ID is required');

            const {
              repairType = 'Flat Tire',
              repairTypes = null,
              notes = '',
              status = 'pending',
              priority = 0,
            } = options;

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const payload = {
                guest_id: guestId,
                repair_type: repairType,
                repair_types: repairTypes || [repairType],
                notes,
                status,
                priority,
                completed_repairs: [] as string[],
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

              const mapped = mapBicycleRow(data as BicycleRepairRow);
              set((state) => {
                state.bicycleRecords.push(mapped);
              });
              return mapped;
            }

            // Local fallback
            const fallbackRecord: BicycleRepair = {
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

          updateBicycleRecord: async (recordId: string, updates: Partial<BicycleRepair>): Promise<void> => {
            const { bicycleRecords } = get();
            const target = bicycleRecords.find((r) => r.id === recordId);

            if (!target) throw new Error('Bicycle record not found');

            const originalRecord = { ...target };
            const completedAt = updates.status === 'done' ? new Date().toISOString() : null;

            set((state) => {
              const index = state.bicycleRecords.findIndex((r) => r.id === recordId);
              if (index !== -1) {
                Object.assign(state.bicycleRecords[index], {
                  ...updates,
                  doneAt: updates.status === 'done' ? completedAt : state.bicycleRecords[index].doneAt,
                  lastUpdated: new Date().toISOString(),
                });
              }
            });

            if (isSupabaseEnabled()) {
              const supabase = createClient();
              const payload: Record<string, unknown> = {};
              
              if (updates.status !== undefined) payload.status = updates.status;
              if (updates.notes !== undefined) payload.notes = updates.notes;
              if (updates.priority !== undefined) payload.priority = updates.priority;
              if (updates.repairTypes !== undefined) payload.repair_types = updates.repairTypes;
              if (updates.completedRepairs !== undefined) payload.completed_repairs = updates.completedRepairs;
              if (updates.status === 'done') {
                payload.completed_at = completedAt;
              }

              const { error } = await supabase
                .from('bicycle_repairs')
                .update(payload)
                .eq('id', recordId);

              if (error) {
                console.error('Failed to update bicycle repair in Supabase:', error);
                // Revert optimistic update
                set((state) => {
                  const index = state.bicycleRecords.findIndex((r) => r.id === recordId);
                  if (index !== -1) {
                    state.bicycleRecords[index] = originalRecord;
                  }
                });
                throw new Error('Unable to update bicycle repair');
              }
            }
          },

          deleteBicycleRecord: async (recordId: string): Promise<void> => {
            const { bicycleRecords } = get();
            const target = bicycleRecords.find((r) => r.id === recordId);

            set((state) => {
              state.bicycleRecords = state.bicycleRecords.filter((r) => r.id !== recordId);
            });

            if (isSupabaseEnabled() && target) {
              const supabase = createClient();
              const { error } = await supabase
                .from('bicycle_repairs')
                .delete()
                .eq('id', recordId);

              if (error) {
                console.error('Failed to delete bicycle record from Supabase:', error);
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

              const [showerRes, laundryRes, bicycleRes] = await Promise.all([
                supabase
                  .from('shower_reservations')
                  .select('id,guest_id,scheduled_for,scheduled_time,status,created_at,updated_at,note')
                  .order('created_at', { ascending: false }),
                supabase
                  .from('laundry_bookings')
                  .select('id,guest_id,slot_label,laundry_type,bag_number,scheduled_for,status,created_at,updated_at,note')
                  .order('created_at', { ascending: false }),
                supabase
                  .from('bicycle_repairs')
                  .select('id,guest_id,requested_at,repair_type,repair_types,notes,status,priority,completed_repairs,completed_at,updated_at')
                  .order('updated_at', { ascending: false }),
              ]);

              if (showerRes.error) throw showerRes.error;
              if (laundryRes.error) throw laundryRes.error;
              if (bicycleRes.error) throw bicycleRes.error;

              set((state) => {
                state.showerRecords = (showerRes.data || []).map((row) => 
                  mapShowerRow(row as ShowerReservationRow)
                );
                state.laundryRecords = (laundryRes.data || []).map((row) => 
                  mapLaundryRow(row as LaundryBookingRow)
                );
                state.bicycleRecords = (bicycleRes.data || []).map((row) => 
                  mapBicycleRow(row as BicycleRepairRow)
                );
                state.isLoading = false;
              });
            } catch (error) {
              console.error('Failed to load service records from Supabase:', error);
              set((state) => {
                state.isLoading = false;
                state.error = error instanceof Error ? error.message : 'Failed to load records';
              });
            }
          },

          // Clear all records
          clearServiceRecords: (): void => {
            set((state) => {
              state.showerRecords = [];
              state.laundryRecords = [];
              state.bicycleRecords = [];
            });
          },

          // Selectors
          getTodayShowers: (): ShowerRecord[] => {
            const today = todayPacificDateString();
            return get().showerRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayLaundry: (): LaundryRecord[] => {
            const today = todayPacificDateString();
            return get().laundryRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },

          getTodayOnsiteLaundry: (): LaundryRecord[] => {
            const today = todayPacificDateString();
            return get().laundryRecords.filter(
              (r) =>
                pacificDateStringFrom(r.date) === today &&
                r.laundryType === 'onsite'
            );
          },

          getTodayOffsiteLaundry: (): LaundryRecord[] => {
            const today = todayPacificDateString();
            return get().laundryRecords.filter(
              (r) =>
                pacificDateStringFrom(r.date) === today &&
                r.laundryType === 'offsite'
            );
          },

          getActiveBicycles: (): BicycleRepair[] => {
            return get().bicycleRecords.filter((r) => r.status !== 'done');
          },

          getTodayBicycles: (): BicycleRepair[] => {
            const today = todayPacificDateString();
            return get().bicycleRecords.filter(
              (r) => pacificDateStringFrom(r.date) === today
            );
          },
        })),
        {
          name: 'hopes-corner-services',
          partialize: (state) => ({
            showerRecords: state.showerRecords,
            laundryRecords: state.laundryRecords,
            bicycleRecords: state.bicycleRecords,
          }),
        }
      )
    ),
    { name: 'ServicesStore' }
  )
);
