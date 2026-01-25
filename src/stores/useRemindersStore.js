import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import { fetchAllPaginated } from '../utils/supabasePagination';
import enhancedToast from '../utils/toast';
import { getRealtimeClient, isRealtimeAvailable } from '../hooks/useRealtimeSubscription';

// Store active realtime subscriptions for cleanup
let remindersRealtimeChannels = [];

/**
 * Maps a database reminder row to the application's reminder object format.
 * @param {object} row - Database row from guest_reminders table
 * @returns {object} Mapped reminder object
 */
export const mapReminderRow = (row) => ({
  id: row.id,
  guestId: row.guest_id,
  message: row.message,
  createdBy: row.created_by || null,
  createdAt: row.created_at,
  dismissedBy: row.dismissed_by || null,
  dismissedAt: row.dismissed_at || null,
  active: row.active,
});

export const useRemindersStore = create(
  devtools(
    immer((set, get) => ({
      // State
      reminders: [],
      isLoading: false,
      lastFetchedAt: null,

      // Load all reminders from Supabase
      fetchReminders: async () => {
        if (!isSupabaseEnabled() || !supabase) return;

        set((state) => {
          state.isLoading = true;
        });

        try {
          const remindersData = await fetchAllPaginated(supabase, {
            table: 'guest_reminders',
            select: 'id, guest_id, message, created_by, created_at, dismissed_by, dismissed_at, active',
            orderBy: 'created_at',
            ascending: false,
            pageSize: 1000,
            mapper: mapReminderRow,
          });

          set((state) => {
            state.reminders = remindersData || [];
            state.lastFetchedAt = new Date().toISOString();
            state.isLoading = false;
          });
        } catch (error) {
          console.error('Failed to load guest reminders from Supabase:', error);
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      // Get active (non-dismissed) reminders for a specific guest
      getActiveReminders: (guestId) => {
        const { reminders } = get();
        if (!guestId) return [];
        return (reminders || []).filter((r) => r.guestId === guestId && r.active);
      },

      // Get all reminders for a specific guest (including dismissed)
      getAllRemindersForGuest: (guestId) => {
        const { reminders } = get();
        if (!guestId) return [];
        return (reminders || []).filter((r) => r.guestId === guestId);
      },

      // Check if a guest has any active reminders
      hasActiveReminders: (guestId) => {
        const { getActiveReminders } = get();
        return getActiveReminders(guestId).length > 0;
      },

      // Add a new reminder for a guest
      addReminder: async (guestId, { message, createdBy = null } = {}) => {
        if (!guestId) throw new Error('guestId is required');
        if (!message || !String(message).trim()) throw new Error('Reminder message is required');

        const payload = {
          guest_id: guestId,
          message: String(message).trim(),
          created_by: createdBy || null,
          active: true,
        };

        // Optimistic local update
        const localReminder = {
          id: `local-${Date.now()}`,
          guestId,
          message: payload.message,
          createdBy: payload.created_by,
          createdAt: new Date().toISOString(),
          dismissedBy: null,
          dismissedAt: null,
          active: true,
        };

        set((state) => {
          state.reminders = [localReminder, ...(state.reminders || [])];
        });

        if (isSupabaseEnabled() && supabase) {
          try {
            const { data, error } = await supabase
              .from('guest_reminders')
              .insert(payload)
              .select()
              .single();

            if (error) throw error;

            const mapped = mapReminderRow(data);

            // Replace local with persisted
            set((state) => {
              state.reminders = [
                mapped,
                ...(state.reminders || []).filter((r) => !String(r.id).startsWith('local-')),
              ];
            });

            return mapped;
          } catch (error) {
            console.error('Failed to persist guest reminder:', error);
            enhancedToast.error('Unable to save reminder. It will remain locally until sync.');
            return localReminder;
          }
        }

        return localReminder;
      },

      // Dismiss a reminder (sets active=false, records who dismissed and when)
      dismissReminder: async (reminderId, dismissedBy) => {
        if (!reminderId) return false;
        if (!dismissedBy || !String(dismissedBy).trim()) {
          throw new Error('Staff name is required to dismiss a reminder');
        }

        const existing = (get().reminders || []).find((r) => r.id === reminderId);
        if (!existing) return false;

        const dismissedAt = new Date().toISOString();
        const dismissedByTrimmed = String(dismissedBy).trim();

        // Optimistic update
        set((state) => {
          const idx = state.reminders.findIndex((r) => r.id === reminderId);
          if (idx !== -1) {
            state.reminders[idx].active = false;
            state.reminders[idx].dismissedBy = dismissedByTrimmed;
            state.reminders[idx].dismissedAt = dismissedAt;
          }
        });

        if (isSupabaseEnabled() && supabase && !String(reminderId).startsWith('local-')) {
          try {
            const { error } = await supabase
              .from('guest_reminders')
              .update({
                active: false,
                dismissed_by: dismissedByTrimmed,
                dismissed_at: dismissedAt,
              })
              .eq('id', reminderId);

            if (error) throw error;
          } catch (error) {
            console.error('Failed to dismiss reminder in Supabase:', error);
            enhancedToast.error('Unable to save dismissal to server');
            // Rollback
            set((state) => {
              const idx = state.reminders.findIndex((r) => r.id === reminderId);
              if (idx !== -1) {
                state.reminders[idx].active = true;
                state.reminders[idx].dismissedBy = null;
                state.reminders[idx].dismissedAt = null;
              }
            });
            return false;
          }
        }

        return true;
      },

      // Delete a reminder permanently (for admin cleanup)
      deleteReminder: async (reminderId) => {
        if (!reminderId) return false;

        const existing = (get().reminders || []).find((r) => r.id === reminderId);
        if (!existing) return false;

        // Optimistic remove
        set((state) => {
          state.reminders = (state.reminders || []).filter((r) => r.id !== reminderId);
        });

        if (isSupabaseEnabled() && supabase && !String(reminderId).startsWith('local-')) {
          try {
            const { error } = await supabase
              .from('guest_reminders')
              .delete()
              .eq('id', reminderId);

            if (error) throw error;
          } catch (error) {
            console.error('Failed to delete reminder from Supabase:', error);
            enhancedToast.error('Unable to delete reminder from server');
            // Re-add
            set((state) => {
              state.reminders = [existing, ...(state.reminders || [])];
            });
            return false;
          }
        }

        return true;
      },

      // Clear all reminders (useful for tests)
      clearReminders: () => {
        set((state) => {
          state.reminders = [];
        });
      },

      // Realtime subscription methods
      subscribeToRealtime: () => {
        if (!isSupabaseEnabled() || !isRealtimeAvailable()) {
          console.log('[Reminders] Realtime not available, skipping subscription');
          return () => {};
        }

        const client = getRealtimeClient();
        if (!client) return () => {};

        // Clean up any existing subscriptions
        get().unsubscribeFromRealtime();

        const handleReminderChange = (eventType, payload) => {
          const { new: newRecord, old: oldRecord } = payload;
          set((state) => {
            if (eventType === 'INSERT' && newRecord) {
              const mapped = mapReminderRow(newRecord);
              const exists = state.reminders.some((r) => r.id === mapped.id);
              if (!exists) {
                state.reminders = [mapped, ...state.reminders];
                console.log('[Realtime] Reminder INSERT:', mapped.id);
              }
            } else if (eventType === 'UPDATE' && newRecord) {
              const mapped = mapReminderRow(newRecord);
              const idx = state.reminders.findIndex((r) => r.id === mapped.id);
              if (idx >= 0) {
                state.reminders[idx] = mapped;
                console.log('[Realtime] Reminder UPDATE:', mapped.id);
              }
            } else if (eventType === 'DELETE' && oldRecord) {
              state.reminders = state.reminders.filter((r) => r.id !== oldRecord.id);
              console.log('[Realtime] Reminder DELETE:', oldRecord.id);
            }
          });
        };

        // Subscribe to guest_reminders table
        const remindersChannel = client
          .channel('reminders-main')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_reminders' }, (payload) => {
            handleReminderChange(payload.eventType, payload);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('[Reminders] Subscribed to guest_reminders realtime');
            }
          });

        remindersRealtimeChannels = [remindersChannel];

        // Return cleanup function
        return () => get().unsubscribeFromRealtime();
      },

      unsubscribeFromRealtime: () => {
        const client = getRealtimeClient();
        if (client && remindersRealtimeChannels.length > 0) {
          remindersRealtimeChannels.forEach((channel) => {
            client.removeChannel(channel);
          });
          remindersRealtimeChannels = [];
          console.log('[Reminders] Unsubscribed from realtime');
        }
      },
    })),
    { name: 'reminders-store' }
  )
);
