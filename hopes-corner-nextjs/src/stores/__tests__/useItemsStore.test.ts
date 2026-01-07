import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useItemsStore } from '../useItemsStore';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
                single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: { id: '1', guest_id: 'g1', item_key: 'tshirt', distributed_at: new Date().toISOString() }, error: null })),
                })),
            })),
        })),
    }),
}));

describe('useItemsStore', () => {
    beforeEach(() => {
        // Reset store manually if needed, but Zustand usually keeps state in memory
        // unless we find a way to reset it.
    });

    it('initializes with default state', () => {
        const state = useItemsStore.getState();
        expect(state.distributedItems).toEqual([]);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe(null);
    });

    it('calculates availability for never-given item', () => {
        const { checkAvailability } = useItemsStore.getState();
        const result = checkAvailability('g1', 'tshirt');
        expect(result.available).toBe(true);
    });

    it('calculates cooldown for big-ticket items', () => {
        const { checkAvailability } = useItemsStore.getState();
        const now = new Date();
        const recently = new Date(now);
        recently.setDate(now.getDate() - 5); // 5 days ago

        // Manually inject state for testing logic
        useItemsStore.setState({
            distributedItems: [
                { id: '1', guestId: 'g1', itemKey: 'sleeping_bag', distributedAt: recently.toISOString(), createdAt: recently.toISOString() }
            ]
        });

        const result = checkAvailability('g1', 'sleeping_bag');
        expect(result.available).toBe(false);
        expect(result.daysRemaining).toBe(25);
    });

    it('allows item after cooldown', () => {
        const { checkAvailability } = useItemsStore.getState();
        const longAgo = new Date();
        longAgo.setDate(longAgo.getDate() - 35);

        useItemsStore.setState({
            distributedItems: [
                { id: '2', guestId: 'g1', itemKey: 'sleeping_bag', distributedAt: longAgo.toISOString(), createdAt: longAgo.toISOString() }
            ]
        });

        const result = checkAvailability('g1', 'sleeping_bag');
        expect(result.available).toBe(true);
    });

    it('handles tshirt weekly reset correctly (Monday logic)', () => {
        const { checkAvailability } = useItemsStore.getState();
        // Set a last given date to a Saturday (day 6)
        const lastSat = new Date('2024-01-06T12:00:00Z'); // 2024-01-06 was Saturday

        useItemsStore.setState({
            distributedItems: [
                { id: '3', guestId: 'g1', itemKey: 'tshirt', distributedAt: lastSat.toISOString(), createdAt: lastSat.toISOString() }
            ]
        });

        // Current date is Sunday (day 0) 2024-01-07
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-07T10:00:00Z'));

        const result = checkAvailability('g1', 'tshirt');
        expect(result.available).toBe(false); // Not Monday yet

        // Advance to Monday
        vi.setSystemTime(new Date('2024-01-08T10:00:00Z'));
        const resultMon = checkAvailability('g1', 'tshirt');
        expect(resultMon.available).toBe(true); // Is Monday

        vi.useRealTimers();
    });
});
