/**
 * Cross-tab synchronization using BroadcastChannel API.
 * 
 * When a mutation occurs on one tab/device, this broadcasts the change
 * to all other open tabs on the SAME browser via BroadcastChannel.
 * This provides instant cross-tab sync even when Supabase realtime is unavailable.
 * 
 * For cross-DEVICE sync, Supabase realtime handles it via WebSocket subscriptions.
 * This utility is a complementary backup for same-browser multi-tab scenarios.
 */

const CHANNEL_NAME = 'hopes-corner-sync';

let channel = null;
let listeners = new Map();

/**
 * Get or create the BroadcastChannel singleton.
 * Returns null if BroadcastChannel is not supported (e.g., some older browsers).
 */
const getChannel = () => {
  if (channel) return channel;
  
  if (typeof BroadcastChannel === 'undefined') {
    console.log('[CrossTabSync] BroadcastChannel not supported');
    return null;
  }
  
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      const { store, action, data, timestamp } = event.data || {};
      if (!store || !action) return;
      
      console.log(`[CrossTabSync] Received: ${store}.${action}`, data?.id || '');
      
      // Notify registered listeners
      const storeListeners = listeners.get(store) || [];
      storeListeners.forEach((listener) => {
        try {
          listener(action, data, timestamp);
        } catch (err) {
          console.error('[CrossTabSync] Listener error:', err);
        }
      });
    };
    
    channel.onmessageerror = (err) => {
      console.error('[CrossTabSync] Message error:', err);
    };
    
    return channel;
  } catch (err) {
    console.warn('[CrossTabSync] Failed to create channel:', err);
    return null;
  }
};

/**
 * Broadcast a data change to other tabs.
 * @param {string} store - Store name (e.g., 'showers', 'laundry', 'meals')
 * @param {string} action - Action type ('add', 'update', 'remove', 'bulkRemove', 'bulkUpdate')
 * @param {object|array} data - The record(s) that changed
 */
export const broadcastChange = (store, action, data) => {
  const ch = getChannel();
  if (!ch) return;
  
  try {
    ch.postMessage({
      store,
      action,
      data,
      timestamp: Date.now(),
      tabId: getTabId(),
    });
  } catch (err) {
    // BroadcastChannel can fail if data is not cloneable
    console.warn('[CrossTabSync] Failed to broadcast:', err);
  }
};

/**
 * Register a listener for cross-tab changes on a specific store.
 * @param {string} store - Store name to listen for
 * @param {function} callback - Called with (action, data, timestamp)
 * @returns {function} Unsubscribe function
 */
export const onCrossTabChange = (store, callback) => {
  // Ensure channel is initialized
  getChannel();
  
  if (!listeners.has(store)) {
    listeners.set(store, []);
  }
  listeners.get(store).push(callback);
  
  return () => {
    const storeListeners = listeners.get(store) || [];
    const idx = storeListeners.indexOf(callback);
    if (idx >= 0) {
      storeListeners.splice(idx, 1);
    }
  };
};

/**
 * Clean up the BroadcastChannel.
 */
export const closeCrossTabSync = () => {
  if (channel) {
    channel.close();
    channel = null;
  }
  listeners.clear();
};

// Unique tab ID for dedup
let tabId = null;
const getTabId = () => {
  if (!tabId) {
    tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return tabId;
};

export default {
  broadcastChange,
  onCrossTabChange,
  closeCrossTabSync,
};
