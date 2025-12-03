import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import { createPersistConfig } from './middleware/persistentStorage';
import { mapDonationRow, mapItemRow } from '../context/utils/mappers';
import { todayPacificDateString, pacificDateStringFrom } from '../utils/date';

export const useDonationsStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        donationRecords: [],
        itemRecords: [],

        // Donation Actions
        addDonation: async ({ guestId, type, amount, description }) => {
          if (!guestId) throw new Error('Guest ID is required');
          if (!type) throw new Error('Donation type is required');

          const todayStr = todayPacificDateString();

          if (isSupabaseEnabled() && supabase) {
            const payload = {
              guest_id: guestId,
              donation_type: type,
              amount: amount || null,
              description: description || '',
              donation_date: todayStr,
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

            const mapped = mapDonationRow(data);
            set((state) => {
              state.donationRecords.push(mapped);
            });
            return mapped;
          }

          const fallbackRecord = {
            id: `local-donation-${Date.now()}`,
            guestId,
            type,
            amount: amount || null,
            description: description || '',
            date: todayStr,
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            state.donationRecords.push(fallbackRecord);
          });
          return fallbackRecord;
        },

        updateDonation: async (id, updates) => {
          const { donationRecords } = get();
          const target = donationRecords.find((r) => r.id === id);

          if (!target) throw new Error('Donation record not found');

          const originalRecord = { ...target };

          set((state) => {
            const index = state.donationRecords.findIndex((r) => r.id === id);
            if (index !== -1) {
              state.donationRecords[index] = {
                ...state.donationRecords[index],
                ...updates,
              };
            }
          });

          if (isSupabaseEnabled() && supabase) {
            const payload = {};
            if (updates.type !== undefined) payload.donation_type = updates.type;
            if (updates.amount !== undefined) payload.amount = updates.amount;
            if (updates.description !== undefined)
              payload.description = updates.description;

            if (Object.keys(payload).length > 0) {
              try {
                const { data, error } = await supabase
                  .from('donations')
                  .update(payload)
                  .eq('id', id)
                  .select()
                  .single();

                if (error) throw error;

                if (data) {
                  const mapped = mapDonationRow(data);
                  set((state) => {
                    const index = state.donationRecords.findIndex(
                      (r) => r.id === id
                    );
                    if (index !== -1) {
                      state.donationRecords[index] = mapped;
                    }
                  });
                }
              } catch (error) {
                console.error('Failed to update donation in Supabase:', error);
                // Revert on error
                set((state) => {
                  const index = state.donationRecords.findIndex(
                    (r) => r.id === id
                  );
                  if (index !== -1) {
                    state.donationRecords[index] = originalRecord;
                  }
                });
                throw new Error('Unable to update donation. Changes reverted.');
              }
            }
          }
        },

        deleteDonation: async (recordId) => {
          const { donationRecords } = get();
          const target = donationRecords.find((r) => r.id === recordId);

          set((state) => {
            state.donationRecords = state.donationRecords.filter(
              (r) => r.id !== recordId
            );
          });

          if (isSupabaseEnabled() && supabase && target) {
            const { error } = await supabase
              .from('donations')
              .delete()
              .eq('id', recordId);

            if (error) {
              console.error('Failed to delete donation from Supabase:', error);
            }
          }
        },

        // Item Actions
        addItem: async ({ guestId, item, quantity = 1 }) => {
          if (!guestId) throw new Error('Guest ID is required');
          if (!item) throw new Error('Item is required');

          const todayStr = todayPacificDateString();

          if (isSupabaseEnabled() && supabase) {
            const payload = {
              guest_id: guestId,
              item_name: item,
              quantity,
              distribution_date: todayStr,
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

            const mapped = mapItemRow(data);
            set((state) => {
              state.itemRecords.push(mapped);
            });
            return mapped;
          }

          const fallbackRecord = {
            id: `local-item-${Date.now()}`,
            guestId,
            item,
            quantity,
            date: todayStr,
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            state.itemRecords.push(fallbackRecord);
          });
          return fallbackRecord;
        },

        deleteItem: async (recordId) => {
          const { itemRecords } = get();
          const target = itemRecords.find((r) => r.id === recordId);

          set((state) => {
            state.itemRecords = state.itemRecords.filter(
              (r) => r.id !== recordId
            );
          });

          if (isSupabaseEnabled() && supabase && target) {
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
        loadFromSupabase: async () => {
          if (!isSupabaseEnabled() || !supabase) return;

          try {
            const [donationRes, itemRes] = await Promise.all([
              supabase.from('donations').select('*'),
              supabase.from('items_distributed').select('*'),
            ]);

            set((state) => {
              if (donationRes.data) {
                state.donationRecords = donationRes.data.map(mapDonationRow);
              }
              if (itemRes.data) {
                state.itemRecords = itemRes.data.map(mapItemRow);
              }
            });
          } catch (error) {
            console.error(
              'Failed to load donation/item records from Supabase:',
              error
            );
          }
        },

        // Clear all records
        clearDonationRecords: () => {
          set((state) => {
            state.donationRecords = [];
            state.itemRecords = [];
          });
        },

        // Selectors
        getTodayDonations: () => {
          const today = todayPacificDateString();
          return get().donationRecords.filter(
            (r) => pacificDateStringFrom(r.date) === today
          );
        },

        getTodayItems: () => {
          const today = todayPacificDateString();
          return get().itemRecords.filter(
            (r) => pacificDateStringFrom(r.date) === today
          );
        },

        getDonationsByType: (type) => {
          return get().donationRecords.filter((r) => r.type === type);
        },

        getItemsByName: (itemName) => {
          return get().itemRecords.filter((r) => r.item === itemName);
        },
      })),
      createPersistConfig('hopes-corner-donations')
    ),
    { name: 'DonationsStore' }
  )
);
