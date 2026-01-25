import { createContext, useContext } from 'react';

/**
 * Context for realtime subscription status
 */
export const RealtimeContext = createContext({
  isConnected: false,
  isRealtimeEnabled: false,
  reconnectAll: () => {},
  subscribedStores: [],
});

/**
 * Hook to access realtime context
 */
export const useRealtimeContext = () => useContext(RealtimeContext);
