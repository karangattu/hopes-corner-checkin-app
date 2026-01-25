import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the Supabase client before importing the hook
vi.mock('../supabaseClient', () => ({
  supabase: null,
  isSupabaseEnabled: vi.fn(() => true),
}));

// Create shared mock functions
const mockRemoveChannel = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn((callback) => {
          // Simulate successful subscription synchronously for testing
          if (callback) {
            callback('SUBSCRIBED');
          }
          return { unsubscribe: vi.fn() };
        }),
      })),
    })),
    removeChannel: mockRemoveChannel,
  })),
}));

import { useRealtimeSubscription, isRealtimeAvailable, getRealtimeClient } from '../useRealtimeSubscription';

describe('useRealtimeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isRealtimeAvailable', () => {
    it('returns true when Supabase credentials are configured', () => {
      expect(isRealtimeAvailable()).toBe(true);
    });
  });

  describe('getRealtimeClient', () => {
    it('returns a Supabase client instance', () => {
      const client = getRealtimeClient();
      expect(client).toBeDefined();
      expect(client.channel).toBeDefined();
    });

    it('returns the same client on subsequent calls (singleton)', () => {
      const client1 = getRealtimeClient();
      const client2 = getRealtimeClient();
      expect(client1).toBe(client2);
    });
  });

  describe('useRealtimeSubscription hook', () => {
    it('does not subscribe when disabled', () => {
      const { result } = renderHook(() =>
        useRealtimeSubscription({
          table: 'test_table',
          enabled: false,
        })
      );

      expect(result.current.isConnected).toBe(false);
    });

    it('returns hook interface with isConnected, error, and reconnect', () => {
      const { result } = renderHook(() =>
        useRealtimeSubscription({
          table: 'test_table',
          enabled: false,
        })
      );

      expect(result.current).toHaveProperty('isConnected');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('reconnect');
      expect(typeof result.current.reconnect).toBe('function');
    });

    it('initializes with isConnected false and error null', () => {
      const { result } = renderHook(() =>
        useRealtimeSubscription({
          table: 'test_table',
          enabled: false,
        })
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });
});
