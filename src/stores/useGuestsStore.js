import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
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
import { mapGuestRow } from '../context/utils/mappers';
import {
  HOUSING_STATUSES,
  AGE_GROUPS,
  GENDERS,
} from '../context/constants';

const GUEST_IMPORT_CHUNK_SIZE = 100;

export const useGuestsStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        guests: [],

        // Helper functions
        migrateGuestData: (guestList) => {
          return guestList.map((guest) => {
            const bannedUntil = guest?.bannedUntil ?? guest?.banned_until ?? null;
            const bannedAt = guest?.bannedAt ?? guest?.banned_at ?? null;
            const banReason = guest?.banReason ?? guest?.ban_reason ?? '';
            const withBanMetadata = {
              ...guest,
              bannedUntil,
              bannedAt,
              banReason,
              isBanned: computeIsGuestBanned(bannedUntil),
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
          return fallbackGuest;
        },

        updateGuest: async (id, updates) => {
          const { guests } = get();

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

          if (isSupabaseEnabled() && supabase && target) {
            const { error } = await supabase.from('guests').delete().eq('id', id);

            if (error) {
              console.error('Failed to delete guest from Supabase:', error);
            }
          }
        },

        banGuest: async (
          guestId,
          { bannedUntil, banReason = '', bannedAt: bannedAtOverride } = {}
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
            const fetchAllGuests = async () => {
              const pageSize = 1000;
              let allGuests = [];
              let offset = 0;
              let hasMore = true;

              while (hasMore) {
                const { data, error } = await supabase
                  .from('guests')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .range(offset, offset + pageSize - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                  allGuests = allGuests.concat(data);
                  offset += data.length;
                  hasMore = data.length === pageSize;
                } else {
                  hasMore = false;
                }
              }

              return allGuests;
            };

            const guestsData = await fetchAllGuests();
            const guestRows = guestsData?.map(mapGuestRow) || [];
            const migratedGuests = migrateGuestData(guestRows);

            set((state) => {
              state.guests = migratedGuests.map((g) => ({
                ...g,
                housingStatus: normalizeHousingStatus(g.housingStatus),
              }));
            });
          } catch (error) {
            console.error('Failed to load guests from Supabase:', error);
          }
        },

        // Clear all guests
        clearGuests: () => {
          set((state) => {
            state.guests = [];
          });
        },
      })),
      createPersistConfig('hopes-corner-guests')
    ),
    { name: 'GuestsStore' }
  )
);
