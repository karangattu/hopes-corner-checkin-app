import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock the stores
const mockSubscribeServices = vi.fn(() => vi.fn());
const mockSubscribeMeals = vi.fn(() => vi.fn());
const mockSubscribeGuests = vi.fn(() => vi.fn());
const mockSubscribeDonations = vi.fn(() => vi.fn());
const mockSubscribeReminders = vi.fn(() => vi.fn());
const mockSubscribeDailyNotes = vi.fn(() => vi.fn());

const mockUnsubscribeServices = vi.fn();
const mockUnsubscribeMeals = vi.fn();
const mockUnsubscribeGuests = vi.fn();
const mockUnsubscribeDonations = vi.fn();
const mockUnsubscribeReminders = vi.fn();
const mockUnsubscribeDailyNotes = vi.fn();

vi.mock('../../stores/useServicesStore', () => ({
  useServicesStore: vi.fn((selector) => {
    const state = {
      subscribeToRealtime: mockSubscribeServices,
      unsubscribeFromRealtime: mockUnsubscribeServices,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../stores/useMealsStore', () => ({
  useMealsStore: vi.fn((selector) => {
    const state = {
      subscribeToRealtime: mockSubscribeMeals,
      unsubscribeFromRealtime: mockUnsubscribeMeals,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../stores/useGuestsStore', () => ({
  useGuestsStore: vi.fn((selector) => {
    const state = {
      subscribeToRealtime: mockSubscribeGuests,
      unsubscribeFromRealtime: mockUnsubscribeGuests,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../stores/useDonationsStore', () => ({
  useDonationsStore: vi.fn((selector) => {
    const state = {
      subscribeToRealtime: mockSubscribeDonations,
      unsubscribeFromRealtime: mockUnsubscribeDonations,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../stores/useRemindersStore', () => ({
  useRemindersStore: vi.fn((selector) => {
    const state = {
      subscribeToRealtime: mockSubscribeReminders,
      unsubscribeFromRealtime: mockUnsubscribeReminders,
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../../stores/useDailyNotesStore', () => ({
  useDailyNotesStore: vi.fn((selector) => {
    const state = {
      subscribeToRealtime: mockSubscribeDailyNotes,
      unsubscribeFromRealtime: mockUnsubscribeDailyNotes,
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock supabase client
vi.mock('../../supabaseClient', () => ({
  isSupabaseEnabled: vi.fn(() => true),
}));

// Mock realtime hook
vi.mock('../../hooks/useRealtimeSubscription', () => ({
  isRealtimeAvailable: vi.fn(() => true),
  getRealtimeClient: vi.fn(() => null),
}));

// Mock useAuth to return authenticated user
vi.mock('../useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com' },
    authLoading: false,
  })),
}));

import { RealtimeProvider } from '../RealtimeProvider';
import { useRealtimeContext } from '../realtimeContext';

// Test component to consume context
const TestConsumer = () => {
  const { isConnected, isRealtimeEnabled, subscribedStores } = useRealtimeContext();
  return (
    <div>
      <span data-testid="connected">{isConnected ? 'connected' : 'disconnected'}</span>
      <span data-testid="enabled">{isRealtimeEnabled ? 'enabled' : 'disabled'}</span>
      <span data-testid="stores">{subscribedStores.join(',')}</span>
    </div>
  );
};

describe('RealtimeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <RealtimeProvider>
        <div data-testid="child">Child content</div>
      </RealtimeProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('provides isRealtimeEnabled through context', () => {
    render(
      <RealtimeProvider>
        <TestConsumer />
      </RealtimeProvider>
    );

    expect(screen.getByTestId('enabled')).toHaveTextContent('enabled');
  });

  it('provides context values through consumer', () => {
    render(
      <RealtimeProvider>
        <TestConsumer />
      </RealtimeProvider>
    );

    // The context should have these elements
    expect(screen.getByTestId('connected')).toBeInTheDocument();
    expect(screen.getByTestId('enabled')).toBeInTheDocument();
    expect(screen.getByTestId('stores')).toBeInTheDocument();
  });
});

describe('useRealtimeContext', () => {
  it('returns default values when used outside provider', () => {
    // Render without provider
    const TestOutsideProvider = () => {
      const context = useRealtimeContext();
      return (
        <div>
          <span data-testid="default-connected">{context.isConnected ? 'yes' : 'no'}</span>
          <span data-testid="default-enabled">{context.isRealtimeEnabled ? 'yes' : 'no'}</span>
        </div>
      );
    };

    render(<TestOutsideProvider />);

    expect(screen.getByTestId('default-connected')).toHaveTextContent('no');
    expect(screen.getByTestId('default-enabled')).toHaveTextContent('no');
  });
});
