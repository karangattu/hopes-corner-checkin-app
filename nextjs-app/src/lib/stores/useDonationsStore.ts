import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createClient, isSupabaseEnabled } from '@/lib/supabase/client';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import type { Donation, LaPlazaDonation, DonationType, LaPlazaCategory } from '@/lib/types';

// Database row types
interface DonationRow {
  id: string;
  donation_type: DonationType;
  item_name: string;
  trays: number;
  weight_lbs: number;
  servings: number | null;
  temperature: string | null;
  donor: string;
  donated_at: string;
  date_key: string | null;
  created_at: string;
  updated_at: string;
}

interface LaPlazaDonationRow {
  id: string;
  category: LaPlazaCategory;
  weight_lbs: number;
  notes: string | null;
  received_at: string;
  date_key: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemDistributedRow {
  id: string;
  guest_id: string;
  item_key: string;
  distributed_at: string;
  created_at: string;
}

// Item record type for local state
interface ItemRecord {
  id: string;
  guestId: string;
  item: string;
  quantity: number;
  date: string;
  createdAt: string;
}

// Mappers
function mapDonationRow(row: DonationRow): Donation {
  return {
    id: row.id,
    type: row.donation_type,
    itemName: row.item_name,
    trays: row.trays || 0,
    weightLbs: row.weight_lbs || 0,
    servings: row.servings || 0,
    temperature: row.temperature || '',
    donor: row.donor,
    donatedAt: row.donated_at,
    dateKey: row.date_key || pacificDateStringFrom(row.donated_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLaPlazaRow(row: LaPlazaDonationRow): LaPlazaDonation {
  return {
    id: row.id,
    category: row.category,
    weightLbs: row.weight_lbs,
    notes: row.notes || '',
    receivedAt: row.received_at,
    dateKey: row.date_key || pacificDateStringFrom(row.received_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItemRow(row: ItemDistributedRow): ItemRecord {
  return {
    id: row.id,
    guestId: row.guest_id,
    item: row.item_key,
    quantity: 1,
    date: pacificDateStringFrom(row.distributed_at),
    createdAt: row.created_at,
  };
}

// Donation input type
interface DonationInput {
  type: DonationType;
  itemName: string;
  trays?: number;
  weightLbs?: number;
  servings?: number;
  temperature?: string;
  donor: string;
}

// La Plaza input type
interface LaPlazaInput {
  category: LaPlazaCategory;
  weightLbs: number;
  notes?: string;
}

// Item input type
interface ItemInput {
  guestId: string;
  item: string;
  quantity?: number;
}

// Store state interface
interface DonationsState {
  donationRecords: Donation[];
  laPlazaRecords: LaPlazaDonation[];
  itemRecords: ItemRecord[];
  isLoading: boolean;
  error: string | null;
}

// Store actions interface
interface DonationsActions {
  // Donation Actions
  addDonation: (input: DonationInput) => Promise<Donation>;
  updateDonation: (id: string, updates: Partial<DonationInput>) => Promise<void>;
  deleteDonation: (recordId: string) => Promise<void>;
  
  // La Plaza Actions
  addLaPlazaDonation: (input: LaPlazaInput) => Promise<LaPlazaDonation>;
  updateLaPlazaDonation: (id: string, updates: Partial<LaPlazaInput>) => Promise<void>;
  deleteLaPlazaDonation: (recordId: string) => Promise<void>;
  
  // Item Actions
  addItem: (input: ItemInput) => Promise<ItemRecord>;
  deleteItem: (recordId: string) => Promise<void>;
  
  // Load from Supabase
  loadFromSupabase: () => Promise<void>;
  
  // Clear all records
  clearDonationRecords: () => void;
  
  // Selectors
  getTodayDonations: () => Donation[];
  getTodayLaPlaza: () => LaPlazaDonation[];
  getTodayItems: () => ItemRecord[];
  getDonationsByType: (type: DonationType) => Donation[];
  getItemsByName: (itemName: string) => ItemRecord[];
  getDonationsByDateRange: (startDate: string, endDate: string) => Donation[];
}

type DonationsStore = DonationsState & DonationsActions;

export const useDonationsStore = create<DonationsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        donationRecords: [],
        laPlazaRecords: [],
        itemRecords: [],
        isLoading: false,
        error: null,

        // Donation Actions
        addDonation: async (input: DonationInput): Promise<Donation> => {
          if (!input.type) throw new Error('Donation type is required');
          if (!input.itemName) throw new Error('Item name is required');
          if (!input.donor) throw new Error('Donor is required');

          const todayStr = todayPacificDateString();

          if (isSupabaseEnabled()) {
            const supabase = createClient();
            const payload = {
              donation_type: input.type,
              item_name: input.itemName,
              trays: input.trays || 0,
              weight_lbs: input.weightLbs || 0,
              servings: input.servings || 0,
              temperature: input.temperature || null,
              donor: input.donor,
              date_key: todayStr,
            };

            const { data, error } = await supabase
              .from('donations')
              .insert(payload)
              .select()
              .single();

            if (error) {
              console.error('Failed to add donation to Supabase:', error);
              throw new Error('Unable to save donation record');
            }

            const mapped = mapDonationRow(data as DonationRow);
            set((state) => {
              state.donationRecords.push(mapped);
            });
            return mapped;
          }

          // Local fallback
          const fallbackRecord: Donation = {
            id: `local-donation-${Date.now()}`,
            type: input.type,
            itemName: input.itemName,
            trays: input.trays || 0,
            weightLbs: input.weightLbs || 0,
            servings: input.servings || 0,
            temperature: input.temperature || '',
            donor: input.donor,
            donatedAt: new Date().toISOString(),
            dateKey: todayStr,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set((state) => {
            state.donationRecords.push(fallbackRecord);
          });
          return fallbackRecord;
        },

        updateDonation: async (id: string, updates: Partial<DonationInput>): Promise<void> => {
          const { donationRecords } = get();
          const target = donationRecords.find((r) => r.id === id);

          if (!target) throw new Error('Donation record not found');

          const originalRecord = { ...target };

          set((state) => {
            const index = state.donationRecords.findIndex((r) => r.id === id);
            if (index !== -1) {
              if (updates.type !== undefined) state.donationRecords[index].type = updates.type;
              if (updates.itemName !== undefined) state.donationRecords[index].itemName = updates.itemName;
              if (updates.trays !== undefined) state.donationRecords[index].trays = updates.trays;
              if (updates.weightLbs !== undefined) state.donationRecords[index].weightLbs = updates.weightLbs;
              if (updates.servings !== undefined) state.donationRecords[index].servings = updates.servings;
              if (updates.temperature !== undefined) state.donationRecords[index].temperature = updates.temperature;
              if (updates.donor !== undefined) state.donationRecords[index].donor = updates.donor;
              state.donationRecords[index].updatedAt = new Date().toISOString();
            }
          });

          if (isSupabaseEnabled()) {
            const supabase = createClient();
            const payload: Record<string, unknown> = {};
            if (updates.type !== undefined) payload.donation_type = updates.type;
            if (updates.itemName !== undefined) payload.item_name = updates.itemName;
            if (updates.trays !== undefined) payload.trays = updates.trays;
            if (updates.weightLbs !== undefined) payload.weight_lbs = updates.weightLbs;
            if (updates.servings !== undefined) payload.servings = updates.servings;
            if (updates.temperature !== undefined) payload.temperature = updates.temperature;
            if (updates.donor !== undefined) payload.donor = updates.donor;

            if (Object.keys(payload).length > 0) {
              const { error } = await supabase
                .from('donations')
                .update(payload)
                .eq('id', id);

              if (error) {
                console.error('Failed to update donation in Supabase:', error);
                // Revert on error
                set((state) => {
                  const index = state.donationRecords.findIndex((r) => r.id === id);
                  if (index !== -1) {
                    state.donationRecords[index] = originalRecord;
                  }
                });
                throw new Error('Unable to update donation');
              }
            }
          }
        },

        deleteDonation: async (recordId: string): Promise<void> => {
          const { donationRecords } = get();
          const target = donationRecords.find((r) => r.id === recordId);

          set((state) => {
            state.donationRecords = state.donationRecords.filter((r) => r.id !== recordId);
          });

          if (isSupabaseEnabled() && target) {
            const supabase = createClient();
            const { error } = await supabase
              .from('donations')
              .delete()
              .eq('id', recordId);

            if (error) {
              console.error('Failed to delete donation from Supabase:', error);
            }
          }
        },

        // La Plaza Actions
        addLaPlazaDonation: async (input: LaPlazaInput): Promise<LaPlazaDonation> => {
          if (!input.category) throw new Error('Category is required');
          if (input.weightLbs === undefined) throw new Error('Weight is required');

          const todayStr = todayPacificDateString();

          if (isSupabaseEnabled()) {
            const supabase = createClient();
            const payload = {
              category: input.category,
              weight_lbs: input.weightLbs,
              notes: input.notes || null,
              date_key: todayStr,
            };

            const { data, error } = await supabase
              .from('la_plaza_donations')
              .insert(payload)
              .select()
              .single();

            if (error) {
              console.error('Failed to add La Plaza donation to Supabase:', error);
              throw new Error('Unable to save La Plaza donation');
            }

            const mapped = mapLaPlazaRow(data as LaPlazaDonationRow);
            set((state) => {
              state.laPlazaRecords.push(mapped);
            });
            return mapped;
          }

          // Local fallback
          const fallbackRecord: LaPlazaDonation = {
            id: `local-laplaza-${Date.now()}`,
            category: input.category,
            weightLbs: input.weightLbs,
            notes: input.notes || '',
            receivedAt: new Date().toISOString(),
            dateKey: todayStr,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set((state) => {
            state.laPlazaRecords.push(fallbackRecord);
          });
          return fallbackRecord;
        },

        updateLaPlazaDonation: async (id: string, updates: Partial<LaPlazaInput>): Promise<void> => {
          const { laPlazaRecords } = get();
          const target = laPlazaRecords.find((r) => r.id === id);

          if (!target) throw new Error('La Plaza donation not found');

          const originalRecord = { ...target };

          set((state) => {
            const index = state.laPlazaRecords.findIndex((r) => r.id === id);
            if (index !== -1) {
              if (updates.category !== undefined) state.laPlazaRecords[index].category = updates.category;
              if (updates.weightLbs !== undefined) state.laPlazaRecords[index].weightLbs = updates.weightLbs;
              if (updates.notes !== undefined) state.laPlazaRecords[index].notes = updates.notes;
              state.laPlazaRecords[index].updatedAt = new Date().toISOString();
            }
          });

          if (isSupabaseEnabled()) {
            const supabase = createClient();
            const payload: Record<string, unknown> = {};
            if (updates.category !== undefined) payload.category = updates.category;
            if (updates.weightLbs !== undefined) payload.weight_lbs = updates.weightLbs;
            if (updates.notes !== undefined) payload.notes = updates.notes;

            if (Object.keys(payload).length > 0) {
              const { error } = await supabase
                .from('la_plaza_donations')
                .update(payload)
                .eq('id', id);

              if (error) {
                console.error('Failed to update La Plaza donation in Supabase:', error);
                set((state) => {
                  const index = state.laPlazaRecords.findIndex((r) => r.id === id);
                  if (index !== -1) {
                    state.laPlazaRecords[index] = originalRecord;
                  }
                });
                throw new Error('Unable to update La Plaza donation');
              }
            }
          }
        },

        deleteLaPlazaDonation: async (recordId: string): Promise<void> => {
          const { laPlazaRecords } = get();
          const target = laPlazaRecords.find((r) => r.id === recordId);

          set((state) => {
            state.laPlazaRecords = state.laPlazaRecords.filter((r) => r.id !== recordId);
          });

          if (isSupabaseEnabled() && target) {
            const supabase = createClient();
            const { error } = await supabase
              .from('la_plaza_donations')
              .delete()
              .eq('id', recordId);

            if (error) {
              console.error('Failed to delete La Plaza donation from Supabase:', error);
            }
          }
        },

        // Item Actions
        addItem: async (input: ItemInput): Promise<ItemRecord> => {
          if (!input.guestId) throw new Error('Guest ID is required');
          if (!input.item) throw new Error('Item is required');

          const todayStr = todayPacificDateString();

          if (isSupabaseEnabled()) {
            const supabase = createClient();
            const payload = {
              guest_id: input.guestId,
              item_key: input.item,
            };

            const { data, error } = await supabase
              .from('items_distributed')
              .insert(payload)
              .select()
              .single();

            if (error) {
              console.error('Failed to add item to Supabase:', error);
              throw new Error('Unable to save item record');
            }

            const mapped = mapItemRow(data as ItemDistributedRow);
            set((state) => {
              state.itemRecords.push(mapped);
            });
            return mapped;
          }

          // Local fallback
          const fallbackRecord: ItemRecord = {
            id: `local-item-${Date.now()}`,
            guestId: input.guestId,
            item: input.item,
            quantity: input.quantity || 1,
            date: todayStr,
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            state.itemRecords.push(fallbackRecord);
          });
          return fallbackRecord;
        },

        deleteItem: async (recordId: string): Promise<void> => {
          const { itemRecords } = get();
          const target = itemRecords.find((r) => r.id === recordId);

          set((state) => {
            state.itemRecords = state.itemRecords.filter((r) => r.id !== recordId);
          });

          if (isSupabaseEnabled() && target) {
            const supabase = createClient();
            const { error } = await supabase
              .from('items_distributed')
              .delete()
              .eq('id', recordId);

            if (error) {
              console.error('Failed to delete item from Supabase:', error);
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

            const [donationRes, laPlazaRes, itemRes] = await Promise.all([
              supabase
                .from('donations')
                .select('*')
                .order('created_at', { ascending: false }),
              supabase
                .from('la_plaza_donations')
                .select('*')
                .order('created_at', { ascending: false }),
              supabase
                .from('items_distributed')
                .select('*')
                .order('created_at', { ascending: false }),
            ]);

            if (donationRes.error) throw donationRes.error;
            if (laPlazaRes.error) throw laPlazaRes.error;
            if (itemRes.error) throw itemRes.error;

            set((state) => {
              state.donationRecords = (donationRes.data || []).map((row) => 
                mapDonationRow(row as DonationRow)
              );
              state.laPlazaRecords = (laPlazaRes.data || []).map((row) => 
                mapLaPlazaRow(row as LaPlazaDonationRow)
              );
              state.itemRecords = (itemRes.data || []).map((row) => 
                mapItemRow(row as ItemDistributedRow)
              );
              state.isLoading = false;
            });
          } catch (error) {
            console.error('Failed to load donation records from Supabase:', error);
            set((state) => {
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : 'Failed to load records';
            });
          }
        },

        // Clear all records
        clearDonationRecords: (): void => {
          set((state) => {
            state.donationRecords = [];
            state.laPlazaRecords = [];
            state.itemRecords = [];
          });
        },

        // Selectors
        getTodayDonations: (): Donation[] => {
          const today = todayPacificDateString();
          return get().donationRecords.filter(
            (r) => r.dateKey === today || pacificDateStringFrom(r.donatedAt) === today
          );
        },

        getTodayLaPlaza: (): LaPlazaDonation[] => {
          const today = todayPacificDateString();
          return get().laPlazaRecords.filter(
            (r) => r.dateKey === today || pacificDateStringFrom(r.receivedAt) === today
          );
        },

        getTodayItems: (): ItemRecord[] => {
          const today = todayPacificDateString();
          return get().itemRecords.filter(
            (r) => pacificDateStringFrom(r.date) === today
          );
        },

        getDonationsByType: (type: DonationType): Donation[] => {
          return get().donationRecords.filter((r) => r.type === type);
        },

        getItemsByName: (itemName: string): ItemRecord[] => {
          return get().itemRecords.filter((r) => r.item === itemName);
        },

        getDonationsByDateRange: (startDate: string, endDate: string): Donation[] => {
          return get().donationRecords.filter((r) => {
            const recordDate = r.dateKey || pacificDateStringFrom(r.donatedAt);
            return recordDate >= startDate && recordDate <= endDate;
          });
        },
      })),
      {
        name: 'hopes-corner-donations',
        partialize: (state) => ({
          donationRecords: state.donationRecords,
          laPlazaRecords: state.laPlazaRecords,
          itemRecords: state.itemRecords,
        }),
      }
    ),
    { name: 'DonationsStore' }
  )
);
