import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import { fetchAllPaginated } from '../utils/supabasePagination';
import enhancedToast from '../utils/toast';
import { getRealtimeClient, isRealtimeAvailable } from '../hooks/useRealtimeSubscription';
import { mapDailyNoteRow } from '../types/dailyNotes';

// Store active realtime subscriptions for cleanup
let dailyNotesRealtimeChannels = [];

/**
 * Zustand store for managing daily notes.
 * Daily notes capture operational context (weather, staffing, events) to explain data anomalies.
 */
export const useDailyNotesStore = create(
  devtools(
    immer((set, get) => ({
      // State
      notes: [],
      isLoading: false,
      lastFetchedAt: null,

      /**
       * Load all daily notes from Supabase
       */
      fetchNotes: async () => {
        if (!isSupabaseEnabled() || !supabase) return;

        set((state) => {
          state.isLoading = true;
        });

        try {
          const notesData = await fetchAllPaginated(supabase, {
            table: 'daily_notes',
            select: 'id, note_date, service_type, note_text, created_by, updated_by, created_at, updated_at',
            orderBy: 'note_date',
            ascending: false,
            pageSize: 1000,
            mapper: mapDailyNoteRow,
          });

          set((state) => {
            state.notes = notesData || [];
            state.lastFetchedAt = new Date().toISOString();
            state.isLoading = false;
          });
        } catch (error) {
          console.error('Failed to load daily notes from Supabase:', error);
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      /**
       * Get all notes for a specific date
       * @param {string} date - Date in YYYY-MM-DD format
       * @returns {Array} Notes for the given date
       */
      getNotesForDate: (date) => {
        const { notes } = get();
        if (!date) return [];
        return (notes || []).filter((n) => n.noteDate === date);
      },

      /**
       * Get note for a specific date and service type
       * @param {string} date - Date in YYYY-MM-DD format
       * @param {string} serviceType - One of: 'meals', 'showers', 'laundry', 'general'
       * @returns {Object|null} The note or null if not found
       */
      getNoteForDateAndService: (date, serviceType) => {
        const { notes } = get();
        if (!date || !serviceType) return null;
        return (notes || []).find(
          (n) => n.noteDate === date && n.serviceType === serviceType
        ) || null;
      },

      /**
       * Get all notes for a date range
       * @param {string} startDate - Start date in YYYY-MM-DD format
       * @param {string} endDate - End date in YYYY-MM-DD format
       * @returns {Array} Notes within the date range
       */
      getNotesForDateRange: (startDate, endDate) => {
        const { notes } = get();
        if (!startDate || !endDate) return [];
        return (notes || []).filter(
          (n) => n.noteDate >= startDate && n.noteDate <= endDate
        );
      },

      /**
       * Check if any note exists for a specific date
       * @param {string} date - Date in YYYY-MM-DD format
       * @returns {boolean}
       */
      hasNoteForDate: (date) => {
        const { getNotesForDate } = get();
        return getNotesForDate(date).length > 0;
      },

      /**
       * Add or update a daily note (upsert behavior)
       * @param {string} noteDate - Date in YYYY-MM-DD format
       * @param {string} serviceType - One of: 'meals', 'showers', 'laundry', 'general'
       * @param {string} noteText - The note content
       * @param {string} userId - User ID/email creating/updating the note
       * @returns {Object} The created/updated note
       */
      addOrUpdateNote: async (noteDate, serviceType, noteText, userId) => {
        if (!noteDate) throw new Error('Note date is required');
        if (!serviceType) throw new Error('Service type is required');
        if (!noteText || !String(noteText).trim()) {
          throw new Error('Note text is required');
        }

        const trimmedText = String(noteText).trim();
        if (trimmedText.length > 2000) {
          throw new Error('Note text exceeds maximum length of 2000 characters');
        }

        const existingNote = get().getNoteForDateAndService(noteDate, serviceType);
        const isUpdate = Boolean(existingNote);

        // Optimistic local update
        const localNote = {
          id: existingNote?.id || `local-${Date.now()}`,
          noteDate,
          serviceType,
          noteText: trimmedText,
          createdBy: existingNote?.createdBy || userId || null,
          updatedBy: userId || null,
          createdAt: existingNote?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => {
          if (isUpdate) {
            const idx = state.notes.findIndex((n) => n.id === existingNote.id);
            if (idx !== -1) {
              state.notes[idx] = localNote;
            }
          } else {
            state.notes = [localNote, ...(state.notes || [])];
          }
        });

        if (isSupabaseEnabled() && supabase) {
          try {
            const payload = {
              note_date: noteDate,
              service_type: serviceType,
              note_text: trimmedText,
              updated_by: userId || null,
            };

            // Only set created_by on insert
            if (!isUpdate) {
              payload.created_by = userId || null;
            }

            const { data, error } = await supabase
              .from('daily_notes')
              .upsert(payload, {
                onConflict: 'note_date,service_type',
                ignoreDuplicates: false,
              })
              .select()
              .single();

            if (error) throw error;

            const mapped = mapDailyNoteRow(data);

            // Replace local with persisted
            set((state) => {
              // Remove any local versions
              state.notes = state.notes.filter(
                (n) => !String(n.id).startsWith('local-') && n.id !== existingNote?.id
              );
              // Add the persisted version
              const exists = state.notes.some((n) => n.id === mapped.id);
              if (!exists) {
                state.notes = [mapped, ...state.notes];
              }
            });

            enhancedToast.success(isUpdate ? 'Note updated' : 'Note added');
            return mapped;
          } catch (error) {
            console.error('Failed to save daily note:', error);
            enhancedToast.error('Unable to save note to server');

            // Rollback optimistic update on error
            if (isUpdate && existingNote) {
              set((state) => {
                const idx = state.notes.findIndex((n) => n.id === localNote.id);
                if (idx !== -1) {
                  state.notes[idx] = existingNote;
                }
              });
            } else {
              set((state) => {
                state.notes = state.notes.filter((n) => n.id !== localNote.id);
              });
            }
            throw error;
          }
        }

        return localNote;
      },

      /**
       * Delete a daily note
       * @param {string} noteId - The note ID to delete
       * @returns {boolean} True if deleted successfully
       */
      deleteNote: async (noteId) => {
        if (!noteId) return false;

        const existing = (get().notes || []).find((n) => n.id === noteId);
        if (!existing) return false;

        // Optimistic remove
        set((state) => {
          state.notes = (state.notes || []).filter((n) => n.id !== noteId);
        });

        if (isSupabaseEnabled() && supabase && !String(noteId).startsWith('local-')) {
          try {
            const { error } = await supabase
              .from('daily_notes')
              .delete()
              .eq('id', noteId);

            if (error) throw error;

            enhancedToast.success('Note deleted');
          } catch (error) {
            console.error('Failed to delete daily note:', error);
            enhancedToast.error('Unable to delete note from server');
            // Re-add on failure
            set((state) => {
              state.notes = [existing, ...(state.notes || [])];
            });
            return false;
          }
        }

        return true;
      },

      /**
       * Clear all notes (useful for tests)
       */
      clearNotes: () => {
        set((state) => {
          state.notes = [];
        });
      },

      /**
       * Subscribe to realtime changes for daily notes
       * @returns {Function} Cleanup function
       */
      subscribeToRealtime: () => {
        if (!isSupabaseEnabled() || !isRealtimeAvailable()) {
          console.log('[DailyNotes] Realtime not available, skipping subscription');
          return () => {};
        }

        const client = getRealtimeClient();
        if (!client) return () => {};

        // Clean up any existing subscriptions
        get().unsubscribeFromRealtime();

        const handleNoteChange = (eventType, payload) => {
          const { new: newRecord, old: oldRecord } = payload;
          set((state) => {
            if (eventType === 'INSERT' && newRecord) {
              const mapped = mapDailyNoteRow(newRecord);
              const exists = state.notes.some((n) => n.id === mapped.id);
              if (!exists) {
                state.notes = [mapped, ...state.notes];
                console.log('[Realtime] DailyNote INSERT:', mapped.id);
              }
            } else if (eventType === 'UPDATE' && newRecord) {
              const mapped = mapDailyNoteRow(newRecord);
              const idx = state.notes.findIndex((n) => n.id === mapped.id);
              if (idx >= 0) {
                state.notes[idx] = mapped;
                console.log('[Realtime] DailyNote UPDATE:', mapped.id);
              } else {
                // Note may not exist locally yet (created on another device)
                state.notes = [mapped, ...state.notes];
              }
            } else if (eventType === 'DELETE' && oldRecord) {
              state.notes = state.notes.filter((n) => n.id !== oldRecord.id);
              console.log('[Realtime] DailyNote DELETE:', oldRecord.id);
            }
          });
        };

        // Subscribe to daily_notes table
        const notesChannel = client
          .channel('daily-notes-main')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_notes' }, (payload) => {
            handleNoteChange(payload.eventType, payload);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('[DailyNotes] Subscribed to daily_notes realtime');
            }
          });

        dailyNotesRealtimeChannels = [notesChannel];

        // Return cleanup function
        return () => get().unsubscribeFromRealtime();
      },

      /**
       * Unsubscribe from realtime updates
       */
      unsubscribeFromRealtime: () => {
        const client = getRealtimeClient();
        if (client && dailyNotesRealtimeChannels.length > 0) {
          dailyNotesRealtimeChannels.forEach((channel) => {
            client.removeChannel(channel);
          });
          dailyNotesRealtimeChannels = [];
          console.log('[DailyNotes] Unsubscribed from realtime');
        }
      },
    })),
    { name: 'daily-notes-store' }
  )
);
