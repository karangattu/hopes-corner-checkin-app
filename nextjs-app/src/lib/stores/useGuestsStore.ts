import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Guest, AgeGroup, Gender } from '../types';
import { getSupabaseClient, isSupabaseEnabled } from '../supabase/client';
import {
  toTitleCase,
  normalizePreferredName,
  normalizeBicycleDescription,
  normalizeHousingStatus,
  mapGuestRow,
} from '../utils/normalizers';
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from '../types';

interface GuestInput {
  firstName?: string;
  lastName?: string;
  name?: string;
  preferredName?: string;
  housingStatus?: string;
  age: AgeGroup;
  gender: Gender;
  location: string;
  notes?: string;
  bicycleDescription?: string;
  guestId?: string;
}

interface GuestUpdate {
  firstName?: string;
  lastName?: string;
  name?: string;
  preferredName?: string;
  housingStatus?: string;
  age?: AgeGroup;
  gender?: Gender;
  location?: string;
  notes?: string;
  bicycleDescription?: string;
  guestId?: string;
  bannedAt?: string | null;
  bannedUntil?: string | null;
  banReason?: string;
}

interface GuestsState {
  guests: Guest[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface GuestsActions {
  fetchGuests: () => Promise<void>;
  addGuest: (guest: GuestInput) => Promise<Guest>;
  updateGuest: (id: string, updates: GuestUpdate) => Promise<boolean>;
  deleteGuest: (id: string) => Promise<boolean>;
  getGuestById: (id: string) => Guest | undefined;
  getGuestByExternalId: (guestId: string) => Guest | undefined;
  clearGuests: () => void;
  generateGuestId: () => string;
}

export const useGuestsStore = create<GuestsState & GuestsActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        guests: [],
        isLoading: false,
        error: null,
        lastFetched: null,

        // Generate unique guest ID
        generateGuestId: () => {
          return (
            'G' +
            Date.now().toString(36).toUpperCase() +
            Math.floor(Math.random() * 1000)
              .toString()
              .padStart(3, '0')
          );
        },

        // Fetch all guests
        fetchGuests: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            if (!isSupabaseEnabled()) {
              set((state) => {
                state.isLoading = false;
                state.error = 'Supabase not configured';
              });
              return;
            }

            const supabase = getSupabaseClient();
            const allGuests: Guest[] = [];
            let hasMore = true;
            let offset = 0;
            const pageSize = 1000;

            while (hasMore) {
              const { data, error } = await supabase
                .from('guests')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + pageSize - 1);

              if (error) throw error;

              if (data && data.length > 0) {
                const mapped = data.map(mapGuestRow);
                allGuests.push(...mapped);
                offset += pageSize;
                hasMore = data.length === pageSize;
              } else {
                hasMore = false;
              }
            }

            set((state) => {
              state.guests = allGuests;
              state.isLoading = false;
              state.lastFetched = Date.now();
            });
          } catch (error) {
            console.error('Failed to fetch guests:', error);
            set((state) => {
              state.isLoading = false;
              state.error =
                error instanceof Error ? error.message : 'Failed to fetch guests';
            });
          }
        },

        // Add a new guest
        addGuest: async (guest: GuestInput) => {
          const { guests, generateGuestId } = get();

          // Parse name
          let firstName = '';
          let lastName = '';

          if (guest.firstName && guest.lastName) {
            firstName = toTitleCase(guest.firstName.trim());
            lastName = toTitleCase(guest.lastName.trim());
          } else if (guest.name) {
            const nameParts = guest.name.trim().split(/\s+/);
            firstName = toTitleCase(nameParts[0] || '');
            lastName = toTitleCase(nameParts.slice(1).join(' ') || '');
          }

          // Validate required fields
          if (!guest.location?.trim()) {
            throw new Error('Missing required field: location');
          }
          if (!guest.age) {
            throw new Error('Missing required field: age');
          }
          if (!guest.gender) {
            throw new Error('Missing required field: gender');
          }

          // Validate enums
          const normalizedHousing = normalizeHousingStatus(guest.housingStatus);
          if (!HOUSING_STATUSES.includes(normalizedHousing)) {
            throw new Error('Invalid housing status');
          }
          if (!AGE_GROUPS.includes(guest.age)) {
            throw new Error('Invalid age category');
          }
          if (!GENDERS.includes(guest.gender)) {
            throw new Error('Invalid gender');
          }

          const preferredName = normalizePreferredName(guest.preferredName);
          const bicycleDescription = normalizeBicycleDescription(
            guest.bicycleDescription
          );
          const legalName = `${firstName} ${lastName}`.trim();

          // Generate unique ID
          const takenIds = new Set(guests.map((g) => g.guestId));
          let finalGuestId = guest.guestId || generateGuestId();
          while (takenIds.has(finalGuestId)) {
            finalGuestId = generateGuestId();
          }

          if (!isSupabaseEnabled()) {
            // Fallback for offline/no Supabase
            const fallbackGuest: Guest = {
              id: `local-${Date.now()}`,
              guestId: finalGuestId,
              firstName,
              lastName,
              name: legalName,
              preferredName,
              housingStatus: normalizedHousing,
              age: guest.age,
              gender: guest.gender,
              location: guest.location,
              notes: guest.notes || '',
              bicycleDescription,
              bannedAt: null,
              bannedUntil: null,
              banReason: '',
              isBanned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            set((state) => {
              state.guests.unshift(fallbackGuest);
            });
            return fallbackGuest;
          }

          const supabase = getSupabaseClient();
          const payload = {
            external_id: finalGuestId,
            first_name: firstName,
            last_name: lastName,
            full_name: legalName,
            preferred_name: preferredName,
            housing_status: normalizedHousing,
            age_group: guest.age,
            gender: guest.gender,
            location: guest.location,
            notes: guest.notes || '',
            bicycle_description: bicycleDescription,
          };

          const { data, error } = await supabase
            .from('guests')
            .insert(payload)
            .select()
            .single();

          if (error) {
            console.error('Failed to add guest to Supabase:', error);
            throw new Error('Unable to save guest. Please try again.');
          }

          const mapped = mapGuestRow(data);
          set((state) => {
            state.guests.unshift(mapped);
          });
          return mapped;
        },

        // Update a guest
        updateGuest: async (id: string, updates: GuestUpdate) => {
          const { guests } = get();
          const target = guests.find((g) => g.id === id);
          if (!target) return false;

          const originalGuest = { ...target };

          // Optimistically update local state
          set((state) => {
            const guestIndex = state.guests.findIndex((g) => g.id === id);
            if (guestIndex !== -1) {
              Object.assign(state.guests[guestIndex], updates);
            }
          });

          if (!isSupabaseEnabled()) {
            return true;
          }

          try {
            const supabase = getSupabaseClient();
            const payload: Record<string, unknown> = {};

            if (updates.firstName !== undefined)
              payload.first_name = toTitleCase(updates.firstName);
            if (updates.lastName !== undefined)
              payload.last_name = toTitleCase(updates.lastName);
            if (updates.name !== undefined)
              payload.full_name = toTitleCase(updates.name);
            if (updates.preferredName !== undefined)
              payload.preferred_name = normalizePreferredName(updates.preferredName);
            if (updates.housingStatus !== undefined)
              payload.housing_status = normalizeHousingStatus(updates.housingStatus);
            if (updates.age !== undefined) payload.age_group = updates.age;
            if (updates.gender !== undefined) payload.gender = updates.gender;
            if (updates.location !== undefined) payload.location = updates.location;
            if (updates.notes !== undefined) payload.notes = updates.notes;
            if (updates.bicycleDescription !== undefined)
              payload.bicycle_description = updates.bicycleDescription;
            if (updates.guestId !== undefined)
              payload.external_id = updates.guestId;
            if (updates.bannedAt !== undefined)
              payload.banned_at = updates.bannedAt;
            if (updates.bannedUntil !== undefined)
              payload.banned_until = updates.bannedUntil;
            if (updates.banReason !== undefined)
              payload.ban_reason = updates.banReason;

            if (Object.keys(payload).length === 0) return true;

            const { data, error } = await supabase
              .from('guests')
              .update(payload)
              .eq('id', id)
              .select()
              .single();

            if (error) throw error;

            if (data) {
              const mapped = mapGuestRow(data);
              set((state) => {
                const guestIndex = state.guests.findIndex((g) => g.id === id);
                if (guestIndex !== -1) {
                  state.guests[guestIndex] = mapped;
                }
              });
            }

            return true;
          } catch (error) {
            console.error('Failed to update guest in Supabase:', error);
            // Revert optimistic update
            set((state) => {
              const guestIndex = state.guests.findIndex((g) => g.id === id);
              if (guestIndex !== -1) {
                state.guests[guestIndex] = originalGuest;
              }
            });
            return false;
          }
        },

        // Delete a guest
        deleteGuest: async (id: string) => {
          const { guests } = get();
          const target = guests.find((g) => g.id === id);
          if (!target) return false;

          // Optimistically remove from local state
          set((state) => {
            state.guests = state.guests.filter((g) => g.id !== id);
          });

          if (!isSupabaseEnabled()) {
            return true;
          }

          try {
            const supabase = getSupabaseClient();
            const { error } = await supabase.from('guests').delete().eq('id', id);

            if (error) throw error;
            return true;
          } catch (error) {
            console.error('Failed to delete guest from Supabase:', error);
            // Revert optimistic delete
            set((state) => {
              state.guests.push(target);
            });
            return false;
          }
        },

        // Get guest by ID
        getGuestById: (id: string) => {
          return get().guests.find((g) => g.id === id);
        },

        // Get guest by external ID (guestId)
        getGuestByExternalId: (guestId: string) => {
          return get().guests.find((g) => g.guestId === guestId);
        },

        // Clear all guests (useful for logout)
        clearGuests: () => {
          set((state) => {
            state.guests = [];
            state.lastFetched = null;
            state.error = null;
          });
        },
      })),
      {
        name: 'guests-storage',
        partialize: (state) => ({
          guests: state.guests,
          lastFetched: state.lastFetched,
        }),
      }
    ),
    { name: 'GuestsStore' }
  )
);
