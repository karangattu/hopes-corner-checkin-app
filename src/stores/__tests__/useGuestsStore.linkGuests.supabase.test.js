import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';

const insertMock = vi.fn();
const selectMock = vi.fn();
const singleMock = vi.fn();
const fromMock = vi.fn();

// Mock Supabase enabled + a minimal query chain used by linkGuests
vi.mock('../../supabaseClient', () => ({
  isSupabaseEnabled: () => true,
  supabase: {
    from: (...args) => fromMock(...args),
  },
}));

describe('useGuestsStore.linkGuests - Supabase persistence', () => {
  beforeEach(async () => {
    insertMock.mockReset();
    selectMock.mockReset();
    singleMock.mockReset();
    fromMock.mockReset();

    fromMock.mockReturnValue({
      insert: (...args) => insertMock(...args),
    });

    insertMock.mockReturnValue({
      select: (...args) => selectMock(...args),
    });

    selectMock.mockReturnValue({
      single: (...args) => singleMock(...args),
    });

    singleMock.mockResolvedValue({
      data: {
        id: 'p1',
        guest_id: 'g1',
        proxy_id: 'g2',
        created_at: '2025-01-02T12:00:00Z',
      },
      error: null,
    });

    const { useGuestsStore } = await import('../useGuestsStore');

    act(() => {
      useGuestsStore.setState({
        guests: [
          { id: 'g1', name: 'Guest 1', firstName: 'Guest', lastName: '1', preferredName: '' },
          { id: 'g2', name: 'Guest 2', firstName: 'Guest', lastName: '2', preferredName: '' },
        ],
        guestProxies: [],
      });
    });
  });

  it('writes to guest_proxies table and updates local state with symmetric link', async () => {
    const { useGuestsStore } = await import('../useGuestsStore');

    await act(async () => {
      await useGuestsStore.getState().linkGuests('g1', 'g2');
    });

    expect(fromMock).toHaveBeenCalledWith('guest_proxies');
    expect(insertMock).toHaveBeenCalledWith({ guest_id: 'g1', proxy_id: 'g2' });

    const proxies = useGuestsStore.getState().guestProxies;
    expect(proxies).toHaveLength(2);

    // forward row mapped from Supabase
    expect(proxies.some((p) => p.guestId === 'g1' && p.proxyId === 'g2')).toBe(true);
    // symmetric row added locally
    expect(proxies.some((p) => p.guestId === 'g2' && p.proxyId === 'g1')).toBe(true);
  });
});
