import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import { fetchAllPaginated } from '../utils/supabasePagination';
import { createPersistConfig } from './middleware/persistentStorage';
import enhancedToast from '../utils/toast';
import {
  toTitleCase,
  normalizePreferredName,
  normalizeBicycleDescription,
  normalizeHousingStatus,
  computeIsGuestBanned,
  normalizeDateInputToISO,
} from '../context/utils/normalizers';
import { mapGuestRow, mapGuestProxyRow, mapGuestWarningRow } from '../context/utils/mappers';
import {
  HOUSING_STATUSES,
  AGE_GROUPS,
  GENDERS,
} from '../context/constants';
import { clearSearchIndexCache } from '../utils/flexibleNameSearch';

const GUEST_IMPORT_CHUNK_SIZE = 100;
const MAX_LINKED_GUESTS = 3;

export const useGuestsStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        guests: [],
        guestProxies: [], // Linked guest relationships
        // Guest warnings persisted in Supabase
        warnings: [],

        // Helper functions
        migrateGuestData: (guestList) => {
          return guestList.map((guest) => {
            const bannedUntil = guest?.bannedUntil ?? guest?.banned_until ?? null;
            const bannedAt = guest?.bannedAt ?? guest?.banned_at ?? null;
            const banReason = guest?.banReason ?? guest?.ban_reason ?? '';
            // Program-specific bans
            const bannedFromBicycle = guest?.bannedFromBicycle ?? guest?.banned_from_bicycle ?? false;
            const bannedFromMeals = guest?.bannedFromMeals ?? guest?.banned_from_meals ?? false;
            const bannedFromShower = guest?.bannedFromShower ?? guest?.banned_from_shower ?? false;
            const bannedFromLaundry = guest?.bannedFromLaundry ?? guest?.banned_from_laundry ?? false;
            const withBanMetadata = {
              ...guest,
              bannedUntil,
              bannedAt,
              banReason,
              isBanned: computeIsGuestBanned(bannedUntil),
              bannedFromBicycle,
              bannedFromMeals,
              bannedFromShower,
              bannedFromLaundry,
            };

            const baseGuest = withBanMetadata;

            if (baseGuest.firstName && baseGuest.lastName) {
              return {
                ...baseGuest,
                firstName: toTitleCase(baseGuest.firstName),
                lastName: toTitleCase(baseGuest.lastName),
                name: toTitleCase(
                  baseGuest.name || `${baseGuest.firstName} ${baseGuest.lastName}`
                ),
                preferredName: normalizePreferredName(baseGuest.preferredName),
                bicycleDescription: normalizeBicycleDescription(
                  baseGuest.bicycleDescription
                ),
              };
            }

            const nameParts = (baseGuest.name || '').trim().split(/\s+/);
            const firstName = toTitleCase(nameParts[0] || '');
            const lastName = toTitleCase(nameParts.slice(1).join(' ') || '');

            return {
              ...baseGuest,
              firstName,
              lastName,
              name: toTitleCase(baseGuest.name || ''),
              preferredName: normalizePreferredName(baseGuest.preferredName),
              bicycleDescription: normalizeBicycleDescription(
                baseGuest.bicycleDescription
              ),
            };
          });
        },

        generateGuestId: () => {
          return (
            'G' +
            Date.now().toString(36).toUpperCase() +
            Math.floor(Math.random() * 1000)
              .toString()
              .padStart(3, '0')
          );
        },

        generateUniqueGuestId: (preferredId, takenSet) => {
          const { generateGuestId } = get();
          let id;

          if (preferredId && !takenSet.has(preferredId)) {
            id = preferredId;
          } else if (preferredId) {
            id = generateGuestId();
          } else {
            id = generateGuestId();
          }

          while (takenSet.has(id)) {
            id = generateGuestId();
          }
          takenSet.add(id);
          return id;
        },

        // Actions
        addGuest: async (guest) => {
          const { guests, generateUniqueGuestId } = get();

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

          // DATA INTEGRITY: Validate that we have a valid first name
          // This prevents creating guests that would appear as "Unknown Guest"
          if (!firstName) {
            console.error(
              '[DATA INTEGRITY] Attempted to create guest without first name:',
              JSON.stringify(guest, null, 2)
            );
            throw new Error('First name is required. Cannot create guest without a name.');
          }

          // DATA INTEGRITY: Ensure last name has at least something
          if (!lastName) {
            console.warn(
              '[DATA INTEGRITY] Creating guest with empty last name, using first letter of first name:',
              { firstName, originalGuest: guest }
            );
            lastName = firstName.charAt(0).toUpperCase();
          }

          // DATA INTEGRITY: Prevent duplicate guests with exact same first and last name
          // Case-insensitive comparison to prevent "Stephen S" and "stephen s" duplicates
          const normalizedFirstName = firstName.toLowerCase().trim();
          const normalizedLastName = lastName.toLowerCase().trim();
          const existingDuplicate = guests.find((g) => {
            const existingFirst = (g.firstName || '').toLowerCase().trim();
            const existingLast = (g.lastName || '').toLowerCase().trim();
            return existingFirst === normalizedFirstName && existingLast === normalizedLastName;
          });

          if (existingDuplicate) {
            const existingName = `${existingDuplicate.firstName} ${existingDuplicate.lastName}`.trim();
            console.error(
              '[DATA INTEGRITY] Attempted to create duplicate guest:',
              { newGuest: { firstName, lastName }, existingGuest: existingDuplicate }
            );
            throw new Error(
              `A guest named "${existingName}" already exists. Please use a different name or find the existing guest.`
            );
          }

          const requiredFields = ['location', 'age', 'gender'];
          for (const field of requiredFields) {
            if (
              !guest[field] ||
              (typeof guest[field] === 'string' && !guest[field].trim())
            ) {
              throw new Error(`Missing required field: ${field}`);
            }
          }

          const normalizedHousing = normalizeHousingStatus(guest.housingStatus);
          if (!HOUSING_STATUSES.includes(normalizedHousing)) {
            throw new Error('Invalid housing status');
          }
          guest.housingStatus = normalizedHousing;
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

          const takenIds = new Set(guests.map((g) => g.guestId));
          const finalGuestId = generateUniqueGuestId(guest.guestId, takenIds);

          if (isSupabaseEnabled() && supabase) {
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
              state.guests.push(mapped);
            });
            // Clear search cache after adding guest
            clearSearchIndexCache();
            return mapped;
          }

          const fallbackGuest = {
            id: `local-${Date.now()}`,
            guestId: finalGuestId,
            ...guest,
            firstName,
            lastName,
            name: legalName,
            preferredName,
            bicycleDescription,
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            state.guests.push(fallbackGuest);
          });
          // Clear search cache after adding guest
          clearSearchIndexCache();
          return fallbackGuest;
        },

        updateGuest: async (id, updates) => {
          const { guests } = get();

          // DATA INTEGRITY: Prevent name fields from being set to empty values
          // This helps prevent the "Unknown Guest" data corruption issue
          const validateNameUpdates = (updates, originalGuest) => {
            const issues = [];
            
            // Check firstName - if being updated, must not be empty
            if (updates.firstName !== undefined) {
              const newFirstName = (updates.firstName || '').trim();
              if (!newFirstName) {
                issues.push('firstName cannot be empty');
              }
            }
            
            // Check lastName - if being updated, must not be empty
            if (updates.lastName !== undefined) {
              const newLastName = (updates.lastName || '').trim();
              if (!newLastName) {
                issues.push('lastName cannot be empty');
              }
            }
            
            // Check name (full name) - if being updated, must not be empty
            if (updates.name !== undefined) {
              const newName = (updates.name || '').trim();
              if (!newName) {
                issues.push('name (full name) cannot be empty');
              }
            }
            
            // Log if there's a potential issue with partial name updates
            if (issues.length > 0) {
              console.error(
                '[DATA INTEGRITY] Attempted to update guest with empty name field(s):',
                issues,
                '\nGuest ID:', id,
                '\nOriginal guest:', JSON.stringify(originalGuest, null, 2),
                '\nUpdates:', JSON.stringify(updates, null, 2)
              );
              return { isValid: false, issues };
            }
            
            return { isValid: true, issues: [] };
          };

          const normalizedUpdates = {
            ...updates,
            bicycleDescription:
              updates?.bicycleDescription !== undefined
                ? normalizeBicycleDescription(updates.bicycleDescription)
                : undefined,
          };
          if (normalizedUpdates.bicycleDescription === undefined) {
            delete normalizedUpdates.bicycleDescription;
          }

          const target = guests.find((g) => g.id === id);
          const originalGuest = target ? { ...target } : null;

          // DATA INTEGRITY: Validate name updates before proceeding
          const nameValidation = validateNameUpdates(normalizedUpdates, originalGuest);
          if (!nameValidation.isValid) {
            enhancedToast.error(
              `Cannot update guest: ${nameValidation.issues.join(', ')}. Name fields cannot be empty.`
            );
            return false;
          }

          set((state) => {
            const guestIndex = state.guests.findIndex((g) => g.id === id);
            if (guestIndex !== -1) {
              state.guests[guestIndex] = {
                ...state.guests[guestIndex],
                ...normalizedUpdates,
              };
            }
          });

          if (isSupabaseEnabled() && supabase && target) {
            const payload = {};
            if (normalizedUpdates.firstName !== undefined)
              payload.first_name = toTitleCase(normalizedUpdates.firstName);
            if (normalizedUpdates.lastName !== undefined)
              payload.last_name = toTitleCase(normalizedUpdates.lastName);
            if (normalizedUpdates.name !== undefined)
              payload.full_name = toTitleCase(normalizedUpdates.name);
            if (normalizedUpdates.preferredName !== undefined)
              payload.preferred_name = normalizePreferredName(
                normalizedUpdates.preferredName
              );
            if (normalizedUpdates.housingStatus !== undefined)
              payload.housing_status = normalizeHousingStatus(
                normalizedUpdates.housingStatus
              );
            if (normalizedUpdates.age !== undefined)
              payload.age_group = normalizedUpdates.age;
            if (normalizedUpdates.gender !== undefined)
              payload.gender = normalizedUpdates.gender;
            if (normalizedUpdates.location !== undefined)
              payload.location = normalizedUpdates.location;
            if (normalizedUpdates.notes !== undefined)
              payload.notes = normalizedUpdates.notes;
            if (normalizedUpdates.bicycleDescription !== undefined)
              payload.bicycle_description = normalizedUpdates.bicycleDescription;
            if (normalizedUpdates.guestId !== undefined)
              payload.external_id = normalizedUpdates.guestId;

            if (Object.keys(payload).length === 0) return true;

            // DATA INTEGRITY: Double-check payload doesn't have empty name fields
            if (payload.first_name !== undefined && !payload.first_name.trim()) {
              console.error('[DATA INTEGRITY] Blocking update with empty first_name in payload');
              enhancedToast.error('Cannot save: first name cannot be empty');
              if (originalGuest) {
                set((state) => {
                  const guestIndex = state.guests.findIndex((g) => g.id === id);
                  if (guestIndex !== -1) {
                    state.guests[guestIndex] = originalGuest;
                  }
                });
              }
              return false;
            }
            if (payload.full_name !== undefined && !payload.full_name.trim()) {
              console.error('[DATA INTEGRITY] Blocking update with empty full_name in payload');
              enhancedToast.error('Cannot save: full name cannot be empty');
              if (originalGuest) {
                set((state) => {
                  const guestIndex = state.guests.findIndex((g) => g.id === id);
                  if (guestIndex !== -1) {
                    state.guests[guestIndex] = originalGuest;
                  }
                });
              }
              return false;
            }

            try {
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
                // Clear search cache after updating guest
                clearSearchIndexCache();
              }
            } catch (error) {
              console.error('Failed to update guest in Supabase:', error);
              if (originalGuest) {
                set((state) => {
                  const guestIndex = state.guests.findIndex((g) => g.id === id);
                  if (guestIndex !== -1) {
                    state.guests[guestIndex] = originalGuest;
                  }
                });
              }
              enhancedToast.error('Unable to update guest. Changes were reverted.');
              return false;
            }
          }

          return true;
        },

        removeGuest: async (id) => {
          const { guests } = get();
          const target = guests.find((g) => g.id === id);

          set((state) => {
            state.guests = state.guests.filter((g) => g.id !== id);
          });
          // Clear search cache after removing guest
          clearSearchIndexCache();

          if (isSupabaseEnabled() && supabase && target) {
            const { error } = await supabase.from('guests').delete().eq('id', id);

            if (error) {
              console.error('Failed to delete guest from Supabase:', error);
            }
          }
        },

        banGuest: async (
          guestId,
          { 
            bannedUntil, 
            banReason = '', 
            bannedAt: bannedAtOverride,
            // Program-specific bans - if all false, it's a blanket ban from all services
            bannedFromBicycle = false,
            bannedFromMeals = false,
            bannedFromShower = false,
            bannedFromLaundry = false,
          } = {}
        ) => {
          const { guests } = get();

          if (!guestId) throw new Error('Guest ID is required.');

          const target = guests.find((guest) => guest.id === guestId);
          if (!target) throw new Error('Guest not found.');

          const normalizedUntil = normalizeDateInputToISO(bannedUntil);
          if (!normalizedUntil) throw new Error('Ban end time is required.');

          const untilDate = new Date(normalizedUntil);
          if (Number.isNaN(untilDate.getTime()))
            throw new Error('Ban end time is invalid.');
          if (untilDate.getTime() <= Date.now())
            throw new Error('Ban end time must be in the future.');

          const normalizedBannedAt = bannedAtOverride
            ? normalizeDateInputToISO(bannedAtOverride)
            : target.bannedAt || new Date().toISOString();

          const sanitizedReason = banReason.trim();

          const originalGuest = { ...target };

          set((state) => {
            const guestIndex = state.guests.findIndex((g) => g.id === guestId);
            if (guestIndex !== -1) {
              state.guests[guestIndex] = {
                ...state.guests[guestIndex],
                banReason: sanitizedReason,
                bannedUntil: normalizedUntil,
                bannedAt: normalizedBannedAt,
                isBanned: true,
                bannedFromBicycle,
                bannedFromMeals,
                bannedFromShower,
                bannedFromLaundry,
              };
            }
          });

          if (isSupabaseEnabled() && supabase) {
            try {
              const { data, error } = await supabase
                .from('guests')
                .update({
                  ban_reason: sanitizedReason || null,
                  banned_until: normalizedUntil,
                  banned_at: normalizedBannedAt,
                  banned_from_bicycle: bannedFromBicycle,
                  banned_from_meals: bannedFromMeals,
                  banned_from_shower: bannedFromShower,
                  banned_from_laundry: bannedFromLaundry,
                })
                .eq('id', guestId)
                .select()
                .single();

              if (error) throw error;

              if (data) {
                const mapped = mapGuestRow(data);
                set((state) => {
                  const guestIndex = state.guests.findIndex(
                    (g) => g.id === guestId
                  );
                  if (guestIndex !== -1) {
                    state.guests[guestIndex] = mapped;
                  }
                });
              }
            } catch (error) {
              console.error('Failed to update guest ban in Supabase:', error);
              set((state) => {
                const guestIndex = state.guests.findIndex((g) => g.id === guestId);
                if (guestIndex !== -1) {
                  state.guests[guestIndex] = originalGuest;
                }
              });
              throw new Error('Unable to update ban status. Please try again.');
            }
          }

          return true;
        },

        clearGuestBan: async (guestId) => {
          const { guests } = get();

          if (!guestId) throw new Error('Guest ID is required.');

          const target = guests.find((guest) => guest.id === guestId);
          if (!target) throw new Error('Guest not found.');

          const originalGuest = { ...target };

          set((state) => {
            const guestIndex = state.guests.findIndex((g) => g.id === guestId);
            if (guestIndex !== -1) {
              state.guests[guestIndex] = {
                ...state.guests[guestIndex],
                banReason: '',
                bannedUntil: null,
                bannedAt: null,
                isBanned: false,
                bannedFromBicycle: false,
                bannedFromMeals: false,
                bannedFromShower: false,
                bannedFromLaundry: false,
              };
            }
          });

          if (isSupabaseEnabled() && supabase) {
            try {
              const { data, error } = await supabase
                .from('guests')
                .update({
                  ban_reason: null,
                  banned_until: null,
                  banned_at: null,
                  banned_from_bicycle: false,
                  banned_from_meals: false,
                  banned_from_shower: false,
                  banned_from_laundry: false,
                })
                .eq('id', guestId)
                .select()
                .single();

              if (error) throw error;

              if (data) {
                const mapped = mapGuestRow(data);
                set((state) => {
                  const guestIndex = state.guests.findIndex(
                    (g) => g.id === guestId
                  );
                  if (guestIndex !== -1) {
                    state.guests[guestIndex] = mapped;
                  }
                });
              }
            } catch (error) {
              console.error('Failed to clear guest ban in Supabase:', error);
              set((state) => {
                const guestIndex = state.guests.findIndex((g) => g.id === guestId);
                if (guestIndex !== -1) {
                  state.guests[guestIndex] = originalGuest;
                }
              });
              throw new Error('Unable to clear ban. Please try again.');
            }
          }

          return true;
        },

        importGuestsFromCSV: async (csvData) => {
          const { guests, generateUniqueGuestId } = get();

          if (!csvData || csvData.length === 0) {
            throw new Error('No valid CSV data provided');
          }

          const normalizeKey = (k) => k.toLowerCase().replace(/\s+/g, '_');

          const takenIds = new Set(guests.map((g) => g.guestId));
          const baseTimestamp = Date.now();
          const newGuests = csvData.map((rawRow, rowIndex) => {
            const row = Object.keys(rawRow).reduce((acc, key) => {
              acc[normalizeKey(key)] = rawRow[key];
              return acc;
            }, {});

            const csvRowNumber = rowIndex + 2;
            const guestIdFromCSV = (row.guest_id || '').trim();
            const recordIdentifier = guestIdFromCSV
              ? `Guest ID: ${guestIdFromCSV}, Row: ${csvRowNumber}`
              : `Row: ${csvRowNumber}`;

            let firstName = toTitleCase((row.first_name || '').trim());
            let lastName = toTitleCase((row.last_name || '').trim());
            let fullName = (row.full_name || '').trim();

            if (!fullName) {
              fullName = `${firstName} ${lastName}`.trim();
            } else if (!firstName || !lastName) {
              const parts = fullName.split(/\s+/);
              firstName = firstName || toTitleCase(parts[0] || '');
              lastName = lastName || toTitleCase(parts.slice(1).join(' ') || '');
            }

            if (!firstName) {
              throw new Error(
                `Missing first name (${recordIdentifier}). Data: ${JSON.stringify(
                  rawRow
                )}`
              );
            }

            if (!lastName) {
              lastName = firstName.charAt(0).toUpperCase();
            }

            fullName = `${firstName} ${lastName}`.trim();

            const housingStatusRaw = (row.housing_status || '').trim();
            let housingStatus = housingStatusRaw
              ? normalizeHousingStatus(housingStatusRaw)
              : 'Unhoused';
            if (housingStatusRaw && !HOUSING_STATUSES.includes(housingStatus)) {
              const caseInsensitiveMatch = HOUSING_STATUSES.find(
                (status) => status.toLowerCase() === housingStatusRaw.toLowerCase()
              );
              housingStatus = caseInsensitiveMatch || housingStatus;
            }

            let age = (row.age || '').trim() || 'Adult 18-59';
            if (row.age && !AGE_GROUPS.includes(age)) {
              const caseInsensitiveMatch = AGE_GROUPS.find(
                (ag) => ag.toLowerCase() === age.toLowerCase()
              );
              age = caseInsensitiveMatch || age;
            }

            const genderRaw = (row.gender || '').trim();
            let gender = genderRaw ? genderRaw : 'Unknown';
            if (genderRaw && !GENDERS.includes(gender)) {
              const caseInsensitiveMatch = GENDERS.find(
                (g) => g.toLowerCase() === gender.toLowerCase()
              );
              gender = caseInsensitiveMatch || gender;
            }

            const location =
              (row.city || row.location || '').trim() || 'Mountain View';

            if (!AGE_GROUPS.includes(age)) {
              throw new Error(
                `Invalid Age value '${age}' (${recordIdentifier}). Valid values: ${AGE_GROUPS.join(', ')}`
              );
            }

            if (!GENDERS.includes(gender)) {
              throw new Error(
                `Invalid Gender value '${gender}' (${recordIdentifier}). Allowed: ${GENDERS.join(', ')}`
              );
            }

            const guestId = generateUniqueGuestId(guestIdFromCSV || null, takenIds);

            return {
              id: baseTimestamp + rowIndex * 1000 + Math.floor(Math.random() * 100),
              guestId,
              firstName,
              lastName,
              name: `${firstName} ${lastName}`.trim(),
              housingStatus,
              age,
              gender,
              location,
              preferredName: normalizePreferredName(
                row.preferred_name || row.preferredName
              ),
              notes: (row.notes || '').trim(),
              bicycleDescription: normalizeBicycleDescription(
                row.bicycle_description || row.bicycleDescription
              ),
              createdAt: new Date().toISOString(),
            };
          });

          if (isSupabaseEnabled() && supabase) {
            const insertedRecords = [];
            let encounteredError = null;
            const guestIdToNewData = new Map();

            newGuests.forEach((g) => {
              guestIdToNewData.set(g.guestId, {
                external_id: g.guestId,
                first_name: g.firstName,
                last_name: g.lastName,
                full_name: g.name,
                preferred_name: g.preferredName,
                housing_status: g.housingStatus,
                age_group: g.age,
                gender: g.gender,
                location: g.location,
                notes: g.notes || '',
                bicycle_description: g.bicycleDescription,
              });
            });

            const guestIds = Array.from(guestIdToNewData.keys());

            let existingGuests = [];
            let fetchError = null;

            for (let i = 0; i < guestIds.length; i += GUEST_IMPORT_CHUNK_SIZE) {
              const chunk = guestIds.slice(i, i + GUEST_IMPORT_CHUNK_SIZE);
              const { data, error } = await supabase
                .from('guests')
                .select('id, external_id')
                .in('external_id', chunk);

              if (error) {
                fetchError = error;
                break;
              }
              if (data) {
                existingGuests.push(...data);
              }
            }

            if (fetchError) {
              console.error('Failed to check for existing guests:', fetchError);
              encounteredError = fetchError;
            } else {
              const existingIds = new Set(existingGuests.map((g) => g.external_id));
              const idsToInsert = guestIds.filter((id) => !existingIds.has(id));
              const idsToUpdate = guestIds.filter((id) => existingIds.has(id));

              console.log(
                `Guest import: ${idsToInsert.length} new, ${idsToUpdate.length} existing (to update)`
              );

              if (idsToInsert.length > 0) {
                const insertPayload = idsToInsert.map((id) =>
                  guestIdToNewData.get(id)
                );

                for (
                  let start = 0;
                  start < insertPayload.length;
                  start += GUEST_IMPORT_CHUNK_SIZE
                ) {
                  const chunk = insertPayload.slice(
                    start,
                    start + GUEST_IMPORT_CHUNK_SIZE
                  );
                  try {
                    const { data, error } = await supabase
                      .from('guests')
                      .insert(chunk)
                      .select();

                    if (error) {
                      encounteredError = error;
                      break;
                    }

                    if (data) {
                      const mapped = data.map(mapGuestRow);
                      insertedRecords.push(...mapped);
                    }
                  } catch (error) {
                    encounteredError = error;
                    break;
                  }
                }
              }

              if (!encounteredError && idsToUpdate.length > 0) {
                for (const guestId of idsToUpdate) {
                  const updateData = guestIdToNewData.get(guestId);
                  try {
                    const { data, error } = await supabase
                      .from('guests')
                      .update(updateData)
                      .eq('external_id', guestId)
                      .select();

                    if (error) {
                      encounteredError = error;
                      break;
                    }

                    if (data && data.length > 0) {
                      const mapped = data.map(mapGuestRow);
                      insertedRecords.push(...mapped);
                    }
                  } catch (error) {
                    encounteredError = error;
                    break;
                  }
                }
              }
            }

            if (insertedRecords.length > 0) {
              set((state) => {
                const existingIds = new Set(insertedRecords.map((g) => g.guestId));
                const filtered = state.guests.filter(
                  (g) => !existingIds.has(g.guestId)
                );
                state.guests = [...filtered, ...insertedRecords];
              });
              // Clear search cache after bulk import
              clearSearchIndexCache();
            }

            const failedCount = newGuests.length - insertedRecords.length;
            const partialFailure = failedCount > 0;
            let errorMessage = null;

            if (encounteredError) {
              console.error(
                'Failed to bulk import guests to Supabase:',
                encounteredError
              );

              console.error('Supabase error details:', {
                message: encounteredError.message,
                code: encounteredError.code,
                details: encounteredError.details,
                hint: encounteredError.hint,
                status: encounteredError.status,
                failedCount,
                totalGuests: newGuests.length,
                insertedRecords: insertedRecords.length,
              });

              let errorDetail = '';
              if (encounteredError.code === '23514') {
                errorDetail =
                  ' (Constraint violation - verify enum values: age_group, gender, housing_status match allowed values)';
              } else if (encounteredError.code === '42P01') {
                errorDetail =
                  ' (Table not found - check Supabase connection and table permissions)';
              }

              errorMessage =
                failedCount === newGuests.length
                  ? `Unable to sync guest import with Supabase. No records were saved.${errorDetail}`
                  : `Unable to sync ${failedCount} guest${failedCount === 1 ? '' : 's'} with Supabase. ${insertedRecords.length} imported.${errorDetail}`;
            }

            return {
              importedGuests: insertedRecords,
              failedCount,
              partialFailure,
              error: errorMessage,
            };
          }

          set((state) => {
            state.guests = [...state.guests, ...newGuests];
          });
          
          // Clear search cache after bulk import
          clearSearchIndexCache();

          return {
            importedGuests: newGuests,
            failedCount: 0,
            partialFailure: false,
            error: null,
          };
        },

        // Load guests from Supabase
        loadFromSupabase: async () => {
          const { migrateGuestData } = get();

          if (!isSupabaseEnabled() || !supabase) return;

          try {
            const guestColumns = [
              'id',
              'external_id',
              'first_name',
              'last_name',
              'full_name',
              'preferred_name',
              'housing_status',
              'age_group',
              'gender',
              'location',
              'notes',
              'bicycle_description',
              'banned_until',
              'banned_at',
              'ban_reason',
              'banned_from_bicycle',
              'banned_from_meals',
              'banned_from_shower',
              'banned_from_laundry',
              'created_at',
              'updated_at',
            ].join(',');

            const guestsData = await fetchAllPaginated(supabase, {
              table: 'guests',
              select: guestColumns,
              orderBy: 'updated_at',
              ascending: false,
              pageSize: 1000,
              mapper: mapGuestRow,
            });

            const migratedGuests = migrateGuestData(guestsData || []);

            set((state) => {
              state.guests = migratedGuests.map((g) => ({
                ...g,
                housingStatus: normalizeHousingStatus(g.housingStatus),
              }));
            });
            
            // Clear search cache after loading guests from Supabase
            // This ensures the search index is rebuilt with the latest data
            clearSearchIndexCache();
          } catch (error) {
            console.error('Failed to load guests from Supabase:', error);
          }
        },

        // Load guest warnings from Supabase
        loadGuestWarningsFromSupabase: async () => {
          if (!isSupabaseEnabled() || !supabase) return;
          try {
            const warningsData = await fetchAllPaginated(supabase, {
              table: 'guest_warnings',
              select: 'id, guest_id, message, severity, issued_by, active, created_at, updated_at',
              orderBy: 'created_at',
              ascending: false,
              pageSize: 1000,
              mapper: (r) => mapGuestWarningRow(r),
            });

            set((state) => {
              state.warnings = warningsData || [];
            });
          } catch (error) {
            console.error('Failed to load guest warnings from Supabase:', error);
          }
        },

        // Clear all guests
        clearGuests: () => {
          set((state) => {
            state.guests = [];
          });
          // Clear search cache when clearing all guests
          clearSearchIndexCache();
        },

        // Get warnings for a guest
        getWarningsForGuest: (guestId) => {
          const { warnings } = get();
          if (!guestId) return [];
          return (warnings || []).filter((w) => w.guestId === guestId && w.active);
        },

        // Add a warning for a guest (persisted to Supabase when enabled)
        addGuestWarning: async (guestId, { message, severity = 1, issuedBy = null } = {}) => {
          if (!guestId) throw new Error('guestId is required');
          if (!message || !String(message).trim()) throw new Error('Warning message is required');

          const payload = {
            guest_id: guestId,
            message: String(message).trim(),
            severity: Number(severity) || 1,
            issued_by: issuedBy || null,
            active: true,
          };

          // Optimistic local update
          const localWarning = {
            id: `local-${Date.now()}`,
            guestId,
            message: payload.message,
            severity: payload.severity,
            issuedBy: payload.issued_by,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set((state) => {
            state.warnings = [localWarning, ...(state.warnings || [])];
          });

          if (isSupabaseEnabled() && supabase) {
            try {
              const { data, error } = await supabase
                .from('guest_warnings')
                .insert(payload)
                .select()
                .single();

              if (error) throw error;

              const mapped = mapGuestWarningRow(data);

              // Replace local with persisted
              set((state) => {
                state.warnings = [mapped, ...(state.warnings || []).filter((w) => !String(w.id).startsWith('local-'))];
              });

              return mapped;
            } catch (error) {
              console.error('Failed to persist guest warning:', error);
              enhancedToast.error('Unable to save warning. It will remain locally until sync.');
              return localWarning;
            }
          }

          return localWarning;
        },

        // Remove (delete) a guest warning by ID
        removeGuestWarning: async (warningId) => {
          if (!warningId) return false;

          const existing = (get().warnings || []).find((w) => w.id === warningId);
          if (!existing) return false;

          // Optimistic remove
          set((state) => {
            state.warnings = (state.warnings || []).filter((w) => w.id !== warningId);
          });

          if (isSupabaseEnabled() && supabase && !String(warningId).startsWith('local-')) {
            try {
              const { error } = await supabase.from('guest_warnings').delete().eq('id', warningId);
              if (error) throw error;
            } catch (error) {
              console.error('Failed to delete guest warning from Supabase:', error);
              enhancedToast.error('Unable to delete warning from server');
              // Note: we won't re-add automatically; user can reload or re-sync
              return false;
            }
          }

          return true;
        },

        // Clear warnings (useful for tests)
        clearGuestWarnings: () => {
          set((state) => {
            state.warnings = [];
          });
        },

        // ============ Guest Proxy (Linked Guests) Functions ============

        // Get all linked guests for a specific guest
        getLinkedGuests: (guestId) => {
          const { guests, guestProxies } = get();
          if (!guestId) return [];
          
          // Find all proxy relationships where this guest is involved
          const linkedGuestIds = new Set();
          guestProxies.forEach((proxy) => {
            if (proxy.guestId === guestId) {
              linkedGuestIds.add(proxy.proxyId);
            } else if (proxy.proxyId === guestId) {
              linkedGuestIds.add(proxy.guestId);
            }
          });

          // Return the actual guest objects
          return guests.filter((g) => linkedGuestIds.has(g.id));
        },

        // Get count of linked guests for a specific guest
        getLinkedGuestsCount: (guestId) => {
          const { guestProxies } = get();
          if (!guestId) return 0;
          
          const linkedGuestIds = new Set();
          guestProxies.forEach((proxy) => {
            if (proxy.guestId === guestId) {
              linkedGuestIds.add(proxy.proxyId);
            } else if (proxy.proxyId === guestId) {
              linkedGuestIds.add(proxy.guestId);
            }
          });

          return linkedGuestIds.size;
        },

        // Link two guests together
        linkGuests: async (guestId, proxyId) => {
          const { guests, guestProxies, getLinkedGuestsCount } = get();

          if (!guestId || !proxyId) {
            throw new Error('Both guest IDs are required');
          }

          if (guestId === proxyId) {
            throw new Error('Cannot link a guest to themselves');
          }

          // Check if both guests exist
          const guest1 = guests.find((g) => g.id === guestId);
          const guest2 = guests.find((g) => g.id === proxyId);

          if (!guest1 || !guest2) {
            throw new Error('One or both guests not found');
          }

          // Check if already linked
          const existingLink = guestProxies.find(
            (p) =>
              (p.guestId === guestId && p.proxyId === proxyId) ||
              (p.guestId === proxyId && p.proxyId === guestId)
          );

          if (existingLink) {
            throw new Error('These guests are already linked');
          }

          // Check if either guest has reached the limit
          const guest1Count = getLinkedGuestsCount(guestId);
          const guest2Count = getLinkedGuestsCount(proxyId);

          if (guest1Count >= MAX_LINKED_GUESTS) {
            throw new Error(`${guest1.preferredName || guest1.name} already has ${MAX_LINKED_GUESTS} linked accounts`);
          }

          if (guest2Count >= MAX_LINKED_GUESTS) {
            throw new Error(`${guest2.preferredName || guest2.name} already has ${MAX_LINKED_GUESTS} linked accounts`);
          }

          if (isSupabaseEnabled() && supabase) {
            try {
              // Insert only one direction - the trigger in the database handles symmetry
              const { data, error } = await supabase
                .from('guest_proxies')
                .insert({ guest_id: guestId, proxy_id: proxyId })
                .select()
                .single();

              if (error) {
                console.error('Failed to link guests in Supabase:', error);
                throw new Error(error.message || 'Failed to link guests');
              }

              // The database trigger creates the symmetric link, so we add both
              const mapped = mapGuestProxyRow(data);
              set((state) => {
                state.guestProxies.push(mapped);
                // Add symmetric link to local state
                state.guestProxies.push({
                  id: `${mapped.id}-reverse`,
                  guestId: proxyId,
                  proxyId: guestId,
                  createdAt: mapped.createdAt,
                });
              });

              return mapped;
            } catch (error) {
              console.error('Failed to link guests:', error);
              throw error;
            }
          }

          // Fallback for local-only storage
          const localId = `local-proxy-${Date.now()}`;
          const newProxy = {
            id: localId,
            guestId,
            proxyId,
            createdAt: new Date().toISOString(),
          };

          set((state) => {
            state.guestProxies.push(newProxy);
            // Add symmetric link
            state.guestProxies.push({
              id: `${localId}-reverse`,
              guestId: proxyId,
              proxyId: guestId,
              createdAt: newProxy.createdAt,
            });
          });

          return newProxy;
        },

        // Unlink two guests
        unlinkGuests: async (guestId, proxyId) => {
          const { guestProxies } = get();

          if (!guestId || !proxyId) {
            throw new Error('Both guest IDs are required');
          }

          // Find the existing links (both directions)
          const linksToRemove = guestProxies.filter(
            (p) =>
              (p.guestId === guestId && p.proxyId === proxyId) ||
              (p.guestId === proxyId && p.proxyId === guestId)
          );

          if (linksToRemove.length === 0) {
            throw new Error('These guests are not linked');
          }

          if (isSupabaseEnabled() && supabase) {
            try {
              // Delete only one direction - the trigger handles the symmetric delete
              const { error } = await supabase
                .from('guest_proxies')
                .delete()
                .eq('guest_id', guestId)
                .eq('proxy_id', proxyId);

              if (error) {
                console.error('Failed to unlink guests in Supabase:', error);
                throw new Error(error.message || 'Failed to unlink guests');
              }

              // Remove both directions from local state
              set((state) => {
                state.guestProxies = state.guestProxies.filter(
                  (p) =>
                    !(p.guestId === guestId && p.proxyId === proxyId) &&
                    !(p.guestId === proxyId && p.proxyId === guestId)
                );
              });

              return true;
            } catch (error) {
              console.error('Failed to unlink guests:', error);
              throw error;
            }
          }

          // Fallback for local-only storage
          set((state) => {
            state.guestProxies = state.guestProxies.filter(
              (p) =>
                !(p.guestId === guestId && p.proxyId === proxyId) &&
                !(p.guestId === proxyId && p.proxyId === guestId)
            );
          });

          return true;
        },

        // Load guest proxies from Supabase
        loadGuestProxiesFromSupabase: async () => {
          if (!isSupabaseEnabled() || !supabase) return;

          try {
            const { data, error } = await supabase
              .from('guest_proxies')
              .select('id, guest_id, proxy_id, created_at');

            if (error) {
              console.error('Failed to load guest proxies:', error);
              return;
            }

            const mappedProxies = (data || []).map(mapGuestProxyRow);

            set((state) => {
              state.guestProxies = mappedProxies;
            });
          } catch (error) {
            console.error('Failed to load guest proxies from Supabase:', error);
          }
        },

        // Clear all guest proxies
        clearGuestProxies: () => {
          set((state) => {
            state.guestProxies = [];
          });
        },
      })),
      createPersistConfig('hopes-corner-guests')
    ),
    { name: 'GuestsStore' }
  )
);