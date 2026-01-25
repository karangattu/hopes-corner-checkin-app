import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseEnabled } from '../supabaseClient';

/**
 * Create a direct Supabase client for realtime subscriptions.
 * The proxy client can't handle realtime, so we need a direct connection.
 * This uses read-only anon key which is safe for client-side realtime.
 */
const createRealtimeClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // No auth needed for realtime subscriptions
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
};

// Singleton realtime client
let realtimeClient = null;

export const getRealtimeClient = () => {
  if (!realtimeClient) {
    realtimeClient = createRealtimeClient();
  }
  return realtimeClient;
};

/**
 * Check if realtime subscriptions are available.
 * Realtime requires direct Supabase connection (not proxy) with valid credentials.
 */
export const isRealtimeAvailable = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/**
 * Subscribe to Supabase realtime changes for a table.
 * @param {object} options - Subscription options
 * @param {string} options.table - Table name to subscribe to
 * @param {string} options.schema - Schema name (default: 'public')
 * @param {string} options.event - Event type: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * @param {function} options.onInsert - Callback for INSERT events
 * @param {function} options.onUpdate - Callback for UPDATE events
 * @param {function} options.onDelete - Callback for DELETE events
 * @param {function} options.onAny - Callback for any event (receives eventType, payload)
 * @param {string} options.filter - Optional PostgREST filter (e.g., 'guest_id=eq.123')
 * @param {boolean} options.enabled - Whether subscription is active (default: true)
 * @returns {object} - { isConnected, error, reconnect }
 */
export const useRealtimeSubscription = ({
  table,
  schema = 'public',
  event = '*',
  onInsert,
  onUpdate,
  onDelete,
  onAny,
  filter,
  enabled = true,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (channelRef.current) {
      const client = getRealtimeClient();
      if (client) {
        client.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const subscribe = useCallback(() => {
    if (!enabled || !isSupabaseEnabled() || !isRealtimeAvailable()) {
      return;
    }

    const client = getRealtimeClient();
    if (!client) {
      setError(new Error('Realtime client not available'));
      return;
    }

    // Clean up existing subscription
    cleanup();

    const channelName = filter
      ? `${table}-${filter}-${Date.now()}`
      : `${table}-all-${Date.now()}`;

    const channelConfig = {
      event,
      schema,
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = client
      .channel(channelName)
      .on('postgres_changes', channelConfig, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        // Call specific handlers
        if (eventType === 'INSERT' && onInsert) {
          onInsert(newRecord, payload);
        } else if (eventType === 'UPDATE' && onUpdate) {
          onUpdate(newRecord, oldRecord, payload);
        } else if (eventType === 'DELETE' && onDelete) {
          onDelete(oldRecord, payload);
        }

        // Call generic handler
        if (onAny) {
          onAny(eventType, payload);
        }
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          console.log(`[Realtime] Subscribed to ${table}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setError(err || new Error(`Subscription error: ${status}`));
          console.error(`[Realtime] Error on ${table}:`, status, err);

          // Auto-reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[Realtime] Attempting to reconnect to ${table}...`);
            subscribe();
          }, 5000);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          console.log(`[Realtime] Channel closed for ${table}`);
        }
      });

    channelRef.current = channel;
  }, [enabled, table, schema, event, filter, onInsert, onUpdate, onDelete, onAny, cleanup]);

  // Subscribe on mount and when dependencies change
  useEffect(() => {
    subscribe();
    return cleanup;
  }, [subscribe, cleanup]);

  const reconnect = useCallback(() => {
    cleanup();
    subscribe();
  }, [cleanup, subscribe]);

  return {
    isConnected,
    error,
    reconnect,
  };
};

/**
 * Hook to subscribe to multiple tables at once.
 * Useful for subscribing to all service tables together.
 */
export const useMultiTableRealtimeSubscription = (subscriptions, enabled = true) => {
  const [statuses, setStatuses] = useState({});
  const channelsRef = useRef(new Map());
  const reconnectTimeoutsRef = useRef(new Map());

  const cleanup = useCallback(() => {
    reconnectTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    reconnectTimeoutsRef.current.clear();

    const client = getRealtimeClient();
    if (client) {
      channelsRef.current.forEach((channel) => {
        client.removeChannel(channel);
      });
    }
    channelsRef.current.clear();
    setStatuses({});
  }, []);

  const subscribeAll = useCallback(() => {
    if (!enabled || !isSupabaseEnabled() || !isRealtimeAvailable()) {
      return;
    }

    const client = getRealtimeClient();
    if (!client) return;

    cleanup();

    subscriptions.forEach(({ table, schema = 'public', event = '*', filter, onInsert, onUpdate, onDelete, onAny }) => {
      const channelName = `${table}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const channelConfig = {
        event,
        schema,
        table,
      };

      if (filter) {
        channelConfig.filter = filter;
      }

      const channel = client
        .channel(channelName)
        .on('postgres_changes', channelConfig, (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT' && onInsert) onInsert(newRecord, payload);
          else if (eventType === 'UPDATE' && onUpdate) onUpdate(newRecord, oldRecord, payload);
          else if (eventType === 'DELETE' && onDelete) onDelete(oldRecord, payload);

          if (onAny) onAny(eventType, payload);
        })
        .subscribe((status, err) => {
          setStatuses((prev) => ({
            ...prev,
            [table]: { isConnected: status === 'SUBSCRIBED', error: err || null },
          }));

          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Subscribed to ${table}`);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[Realtime] Error on ${table}:`, status, err);
          }
        });

      channelsRef.current.set(table, channel);
    });
  }, [enabled, subscriptions, cleanup]);

  useEffect(() => {
    subscribeAll();
    return cleanup;
  }, [subscribeAll, cleanup]);

  const isAllConnected = Object.values(statuses).every((s) => s.isConnected);
  const hasErrors = Object.values(statuses).some((s) => s.error);

  return {
    statuses,
    isAllConnected,
    hasErrors,
    reconnectAll: () => {
      cleanup();
      subscribeAll();
    },
  };
};

export default useRealtimeSubscription;
