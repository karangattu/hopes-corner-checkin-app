import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { temporal } from 'zundo';
import { createPersistConfig } from './middleware/persistentStorage';

const MAX_HISTORY_LENGTH = 50;

export const useHistoryStore = create(
  devtools(
    persist(
      temporal(
        (set, get) => ({
          // State
          actionHistory: [],

          // Actions
          pushAction: (action) => {
            if (!action || !action.type) {
              console.warn('Invalid action pushed to history:', action);
              return;
            }

            const newAction = {
              ...action,
              timestamp: action.timestamp || new Date().toISOString(),
              id: action.id || `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };

            set((state) => ({
              actionHistory: [newAction, ...state.actionHistory].slice(
                0,
                MAX_HISTORY_LENGTH
              ),
            }));
          },

          clearHistory: () => {
            set({ actionHistory: [] });
          },

          removeAction: (actionId) => {
            set((state) => ({
              actionHistory: state.actionHistory.filter(
                (action) => action.id !== actionId
              ),
            }));
          },

          getRecentActions: (count = 10) => {
            return get().actionHistory.slice(0, count);
          },

          getActionsByType: (type) => {
            return get().actionHistory.filter((action) => action.type === type);
          },

          getActionsByGuestId: (guestId) => {
            return get().actionHistory.filter(
              (action) => action.data?.guestId === guestId
            );
          },
        }),
        {
          limit: 50,
          equality: (pastState, currentState) =>
            pastState.actionHistory.length === currentState.actionHistory.length,
        }
      ),
      createPersistConfig('hopes-corner-history', {
        // Only persist actionHistory, not temporal state
        partialize: (state) => ({ actionHistory: state.actionHistory }),
      })
    ),
    { name: 'HistoryStore' }
  )
);

// Export temporal store for undo/redo functionality
export const useTemporalStore = create(temporal.useStore);

// Action type constants for consistency
export const ACTION_TYPES = {
  // Guest actions
  GUEST_ADDED: 'GUEST_ADDED',
  GUEST_UPDATED: 'GUEST_UPDATED',
  GUEST_REMOVED: 'GUEST_REMOVED',
  GUEST_BANNED: 'GUEST_BANNED',
  GUEST_BAN_CLEARED: 'GUEST_BAN_CLEARED',

  // Meal actions
  MEAL_ADDED: 'MEAL_ADDED',
  MEAL_DELETED: 'MEAL_DELETED',
  BREAKFAST_ADDED: 'BREAKFAST_ADDED',
  BREAKFAST_DELETED: 'BREAKFAST_DELETED',
  SUPPER_ADDED: 'SUPPER_ADDED',
  SUPPER_DELETED: 'SUPPER_DELETED',
  RV_MEAL_ADDED: 'RV_MEAL_ADDED',
  RV_MEAL_DELETED: 'RV_MEAL_DELETED',
  SPECIAL_ADDED: 'SPECIAL_ADDED',
  SPECIAL_DELETED: 'SPECIAL_DELETED',

  // Service actions
  SHOWER_ADDED: 'SHOWER_ADDED',
  SHOWER_DELETED: 'SHOWER_DELETED',
  LAUNDRY_ADDED: 'LAUNDRY_ADDED',
  LAUNDRY_DELETED: 'LAUNDRY_DELETED',
  BICYCLE_CHECKOUT: 'BICYCLE_CHECKOUT',
  BICYCLE_RETURNED: 'BICYCLE_RETURNED',
  BICYCLE_DELETED: 'BICYCLE_DELETED',

  // Donation/Item actions
  DONATION_ADDED: 'DONATION_ADDED',
  DONATION_UPDATED: 'DONATION_UPDATED',
  DONATION_DELETED: 'DONATION_DELETED',
  ITEM_ADDED: 'ITEM_ADDED',
  ITEM_DELETED: 'ITEM_DELETED',

  // Settings actions
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  SETTINGS_RESET: 'SETTINGS_RESET',

  // Bulk operations
  GUESTS_IMPORTED: 'GUESTS_IMPORTED',
  DATA_SYNCED: 'DATA_SYNCED',
};

/**
 * Helper function to create action objects
 */
export const createAction = (type, data, metadata = {}) => ({
  type,
  data,
  metadata,
  timestamp: new Date().toISOString(),
  id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
});
