import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase enabled
vi.mock('../../supabaseClient', () => ({
  supabase: {},
  isSupabaseEnabled: () => true,
}));

const fetchAllPaginatedMock = vi.fn().mockResolvedValue([]);
vi.mock('../../utils/supabasePagination', () => ({
  fetchAllPaginated: (...args) => fetchAllPaginatedMock(...args),
}));

describe('useMealsStore.loadFromSupabase - proxy pickup column', () => {
  beforeEach(() => {
    fetchAllPaginatedMock.mockClear();
  });

  it('requests picked_up_by_guest_id so proxy pickups can be rendered after reload', async () => {
    const { useMealsStore } = await import('../useMealsStore');

    await useMealsStore.getState().loadFromSupabase();

    // First call is for meal_attendance
    expect(fetchAllPaginatedMock).toHaveBeenCalled();
    const firstCallArgs = fetchAllPaginatedMock.mock.calls.find(
      (c) => c?.[1]?.table === 'meal_attendance',
    );
    expect(firstCallArgs).toBeTruthy();

    const config = firstCallArgs[1];
    expect(config.select).toContain('picked_up_by_guest_id');
  });
});
