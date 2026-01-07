import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlockedSlotsStore } from '../useBlockedSlotsStore';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
            match: vi.fn().mockResolvedValue({ error: null }),
            single: vi.fn().mockResolvedValue({
                data: { id: 'new-id', created_at: new Date().toISOString() },
                error: null
            }),
        }),
    }),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('useBlockedSlotsStore', () => {
    beforeEach(() => {
        // Reset store
        useBlockedSlotsStore.setState({
            blockedSlots: [],
            loading: false,
            initialized: false,
        });
    });

    describe('initial state', () => {
        it('starts with empty blocked slots', () => {
            const { blockedSlots, loading, initialized } = useBlockedSlotsStore.getState();

            expect(blockedSlots).toEqual([]);
            expect(loading).toBe(false);
            expect(initialized).toBe(false);
        });
    });

    describe('isSlotBlocked', () => {
        it('returns false for non-blocked slot', () => {
            const { isSlotBlocked } = useBlockedSlotsStore.getState();

            expect(isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(false);
        });

        it('returns true for blocked slot', () => {
            // Set up a blocked slot
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    {
                        id: '1',
                        serviceType: 'shower',
                        slotTime: '08:00',
                        date: '2025-01-06'
                    }
                ],
            });

            const { isSlotBlocked } = useBlockedSlotsStore.getState();
            expect(isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
        });

        it('distinguishes between service types', () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' }
                ],
            });

            const { isSlotBlocked } = useBlockedSlotsStore.getState();
            expect(isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
            expect(isSlotBlocked('laundry', '08:00', '2025-01-06')).toBe(false);
        });

        it('distinguishes between dates', () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' }
                ],
            });

            const { isSlotBlocked } = useBlockedSlotsStore.getState();
            expect(isSlotBlocked('shower', '08:00', '2025-01-06')).toBe(true);
            expect(isSlotBlocked('shower', '08:00', '2025-01-07')).toBe(false);
        });
    });

    describe('blockSlot', () => {
        it('adds slot optimistically', async () => {
            const { blockSlot } = useBlockedSlotsStore.getState();

            // Don't await - check optimistic state first
            const promise = blockSlot('laundry', '09:00', '2025-01-06');

            // Check optimistic update
            const { blockedSlots } = useBlockedSlotsStore.getState();
            expect(blockedSlots.length).toBe(1);
            expect(blockedSlots[0].serviceType).toBe('laundry');
            expect(blockedSlots[0].slotTime).toBe('09:00');

            await promise;
        });

        it('returns true on success', async () => {
            const { blockSlot } = useBlockedSlotsStore.getState();
            const result = await blockSlot('shower', '10:00', '2025-01-06');

            expect(result).toBe(true);
        });
    });

    describe('unblockSlot', () => {
        it('removes slot optimistically', async () => {
            // Set up initial blocked slot
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'shower', slotTime: '08:00', date: '2025-01-06' }
                ],
            });

            const { unblockSlot } = useBlockedSlotsStore.getState();

            // Start unblocking
            const promise = unblockSlot('shower', '08:00', '2025-01-06');

            // Check optimistic removal
            const { blockedSlots } = useBlockedSlotsStore.getState();
            expect(blockedSlots.length).toBe(0);

            await promise;
        });

        it('returns true on success', async () => {
            useBlockedSlotsStore.setState({
                blockedSlots: [
                    { id: '1', serviceType: 'laundry', slotTime: '09:00', date: '2025-01-06' }
                ],
            });

            const { unblockSlot } = useBlockedSlotsStore.getState();
            const result = await unblockSlot('laundry', '09:00', '2025-01-06');

            expect(result).toBe(true);
        });
    });

    describe('fetchBlockedSlots', () => {
        it('sets loading state during fetch', async () => {
            const { fetchBlockedSlots } = useBlockedSlotsStore.getState();

            const promise = fetchBlockedSlots();

            // Should be loading
            expect(useBlockedSlotsStore.getState().loading).toBe(true);

            await promise;

            // Should finish loading
            expect(useBlockedSlotsStore.getState().loading).toBe(false);
        });

        it('sets initialized to true after fetch', async () => {
            const { fetchBlockedSlots } = useBlockedSlotsStore.getState();

            expect(useBlockedSlotsStore.getState().initialized).toBe(false);

            await fetchBlockedSlots();

            expect(useBlockedSlotsStore.getState().initialized).toBe(true);
        });
    });
});
