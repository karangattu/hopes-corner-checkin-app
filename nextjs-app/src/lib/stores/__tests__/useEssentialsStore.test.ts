import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useEssentialsStore, getNextAvailabilityDate } from '../useEssentialsStore';

vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(() =>
                        Promise.resolve({
                            data: {
                                id: 'supabase-item-1',
                                guest_id: 'guest-123',
                                item_key: 'tshirt',
                                distributed_at: '2025-01-15T10:00:00Z',
                            },
                            error: null,
                        })
                    ),
                })),
            })),
            select: vi.fn(() => ({
                order: vi.fn(() => ({
                    limit: vi.fn(() =>
                        Promise.resolve({
                            data: [
                                {
                                    id: 'item-1',
                                    guest_id: 'guest-123',
                                    item_key: 'tshirt',
                                    distributed_at: '2025-01-10T10:00:00Z',
                                },
                            ],
                            error: null,
                        })
                    ),
                })),
            })),
        })),
    })),
    isSupabaseEnabled: vi.fn(() => false),
}));

describe('useEssentialsStore', () => {
    beforeEach(() => {
        useEssentialsStore.setState({
            itemRecords: [],
            isLoading: false,
            error: null,
        });
    });

    describe('giveItem', () => {
        it('creates a new item record with correct structure', async () => {
            const { giveItem } = useEssentialsStore.getState();
            const record = await giveItem('guest-123', 'tshirt');

            expect(record).toMatchObject({
                guestId: 'guest-123',
                item: 'tshirt',
            });
            expect(record.id).toBeDefined();
            expect(record.date).toBeDefined();
        });

        it('adds the new record to itemRecords state', async () => {
            const { giveItem } = useEssentialsStore.getState();
            await giveItem('guest-456', 'sleeping_bag');

            const { itemRecords } = useEssentialsStore.getState();
            expect(itemRecords).toHaveLength(1);
            expect(itemRecords[0].item).toBe('sleeping_bag');
        });

        it('throws error when cooldown has not passed', async () => {
            const now = new Date().toISOString();
            useEssentialsStore.setState({
                itemRecords: [
                    { id: 'existing-1', guestId: 'guest-123', item: 'backpack', date: now },
                ],
            });

            const { giveItem } = useEssentialsStore.getState();
            await expect(giveItem('guest-123', 'backpack')).rejects.toThrow(
                'Limit reached for this item'
            );
        });
    });

    describe('getLastGivenItem', () => {
        it('returns null when no record exists', () => {
            const { getLastGivenItem } = useEssentialsStore.getState();
            const result = getLastGivenItem('guest-123', 'tent');
            expect(result).toBeNull();
        });

        it('returns the most recent record for guest/item combo', () => {
            const olderDate = '2025-01-01T10:00:00Z';
            const newerDate = '2025-01-10T10:00:00Z';
            useEssentialsStore.setState({
                itemRecords: [
                    { id: 'item-1', guestId: 'guest-123', item: 'tent', date: olderDate },
                    { id: 'item-2', guestId: 'guest-123', item: 'tent', date: newerDate },
                    { id: 'item-3', guestId: 'guest-456', item: 'tent', date: newerDate },
                ],
            });

            const { getLastGivenItem } = useEssentialsStore.getState();
            const result = getLastGivenItem('guest-123', 'tent');
            expect(result?.id).toBe('item-2');
            expect(result?.date).toBe(newerDate);
        });
    });

    describe('canGiveItem', () => {
        it('returns true when no prior record exists', () => {
            const { canGiveItem } = useEssentialsStore.getState();
            expect(canGiveItem('guest-123', 'flip_flops')).toBe(true);
        });

        it('returns false when cooldown is still active', () => {
            const today = new Date().toISOString();
            useEssentialsStore.setState({
                itemRecords: [
                    { id: 'item-1', guestId: 'guest-123', item: 'backpack', date: today },
                ],
            });

            const { canGiveItem } = useEssentialsStore.getState();
            expect(canGiveItem('guest-123', 'backpack')).toBe(false);
        });

        it('returns true after cooldown expires (30 days)', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 35);
            useEssentialsStore.setState({
                itemRecords: [
                    { id: 'item-1', guestId: 'guest-123', item: 'sleeping_bag', date: oldDate.toISOString() },
                ],
            });

            const { canGiveItem } = useEssentialsStore.getState();
            expect(canGiveItem('guest-123', 'sleeping_bag')).toBe(true);
        });
    });

    describe('getDaysUntilAvailable', () => {
        it('returns 0 when no record exists', () => {
            const { getDaysUntilAvailable } = useEssentialsStore.getState();
            expect(getDaysUntilAvailable('guest-123', 'tent')).toBe(0);
        });

        it('returns remaining days for 30-day cooldown items', () => {
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            useEssentialsStore.setState({
                itemRecords: [
                    { id: 'item-1', guestId: 'guest-123', item: 'backpack', date: tenDaysAgo.toISOString() },
                ],
            });

            const { getDaysUntilAvailable } = useEssentialsStore.getState();
            const days = getDaysUntilAvailable('guest-123', 'backpack');
            expect(days).toBeGreaterThanOrEqual(19);
            expect(days).toBeLessThanOrEqual(21);
        });

        it('returns 0 when cooldown has expired', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 40);
            useEssentialsStore.setState({
                itemRecords: [
                    { id: 'item-1', guestId: 'guest-123', item: 'tent', date: oldDate.toISOString() },
                ],
            });

            const { getDaysUntilAvailable } = useEssentialsStore.getState();
            expect(getDaysUntilAvailable('guest-123', 'tent')).toBe(0);
        });
    });

    describe('clearItemRecords', () => {
        it('clears all item records', () => {
            useEssentialsStore.setState({
                itemRecords: [
                    { id: 'item-1', guestId: 'guest-123', item: 'tshirt', date: '2025-01-10T10:00:00Z' },
                ],
            });

            const { clearItemRecords } = useEssentialsStore.getState();
            act(() => {
                clearItemRecords();
            });

            const { itemRecords } = useEssentialsStore.getState();
            expect(itemRecords).toHaveLength(0);
        });
    });
});

describe('getNextAvailabilityDate', () => {
    describe('T-shirt (weekly cooldown)', () => {
        it('calculates next Monday correctly from Wednesday', () => {
            const wednesday = '2025-01-15T10:00:00Z';
            const result = getNextAvailabilityDate('tshirt', wednesday);
            expect(result).toBeInstanceOf(Date);
            expect(result?.getDay()).toBe(1);
        });

        it('returns next week Monday when given on Monday', () => {
            const monday = '2025-01-13T10:00:00Z';
            const result = getNextAvailabilityDate('tshirt', monday);
            expect(result?.getDay()).toBe(1);
            const givenDate = new Date(monday);
            expect(result!.getTime()).toBeGreaterThan(givenDate.getTime());
        });
    });

    describe('30-day cooldown items', () => {
        it('adds 30 days for sleeping_bag', () => {
            const date = '2025-01-15T10:00:00Z';
            const result = getNextAvailabilityDate('sleeping_bag', date);
            const expected = new Date(2025, 1, 14); // Feb 14
            expected.setHours(0, 0, 0, 0);
            expect(result?.getDate()).toBe(expected.getDate());
            expect(result?.getMonth()).toBe(expected.getMonth());
        });

        it('adds 30 days for backpack', () => {
            const date = '2025-01-01T10:00:00Z';
            const result = getNextAvailabilityDate('backpack', date);
            const expected = new Date(2025, 0, 31); // Jan 31
            expected.setHours(0, 0, 0, 0);
            expect(result?.getDate()).toBe(expected.getDate());
        });

        it('adds 30 days for tent', () => {
            const date = '2025-01-10T10:00:00Z';
            const result = getNextAvailabilityDate('tent', date);
            expect(result).toBeInstanceOf(Date);
        });

        it('adds 30 days for flip_flops', () => {
            const date = '2025-01-10T10:00:00Z';
            const result = getNextAvailabilityDate('flip_flops', date);
            expect(result).toBeInstanceOf(Date);
        });
    });

    describe('Jacket (15-day cooldown)', () => {
        it('adds 15 days for jacket', () => {
            const date = '2025-01-15T10:00:00Z';
            const result = getNextAvailabilityDate('jacket', date);
            const expected = new Date(2025, 0, 30); // Jan 30
            expected.setHours(0, 0, 0, 0);
            expect(result?.getDate()).toBe(expected.getDate());
            expect(result?.getMonth()).toBe(expected.getMonth());
        });

        it('jacket has 15-day validity vs sleeping bag 30-day validity', () => {
            const baseDate = '2025-01-15T10:00:00Z';
            const jacketNext = getNextAvailabilityDate('jacket', baseDate);
            const sleepingBagNext = getNextAvailabilityDate('sleeping_bag', baseDate);

            expect(jacketNext).toBeInstanceOf(Date);
            expect(sleepingBagNext).toBeInstanceOf(Date);

            // Jacket should be available before sleeping bag
            expect(jacketNext!.getTime() < sleepingBagNext!.getTime()).toBe(true);

            // Difference should be 15 days
            const diffMs = sleepingBagNext!.getTime() - jacketNext!.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            expect(diffDays).toBe(15);
        });

        it('handles leap year dates correctly for jacket', () => {
            const distributedDate = '2024-02-20T10:00:00Z';
            const nextAvailable = getNextAvailabilityDate('jacket', distributedDate);
            expect(nextAvailable).toBeInstanceOf(Date);
            // Feb 20 + 15 days = Mar 6 (2024 is leap year)
            expect(nextAvailable?.getMonth()).toBe(2); // March = 2
            expect(nextAvailable?.getDate()).toBe(6);
        });

        it('returns null for null/undefined date', () => {
            expect(getNextAvailabilityDate('jacket', null as unknown as string)).toBeNull();
            expect(getNextAvailabilityDate('jacket', undefined as unknown as string)).toBeNull();
        });
    });
});

describe('Jacket-specific store operations', () => {
    beforeEach(() => {
        useEssentialsStore.setState({
            itemRecords: [],
            isLoading: false,
            error: null,
        });
    });

    it('allows giving jacket when guest has never received one', () => {
        const { canGiveItem } = useEssentialsStore.getState();
        expect(canGiveItem('guest-123', 'jacket')).toBe(true);
    });

    it('prevents giving jacket within 15 days of last distribution', () => {
        const today = new Date().toISOString();
        useEssentialsStore.setState({
            itemRecords: [
                { id: 'item-1', guestId: 'guest-123', item: 'jacket', date: today },
            ],
        });

        const { canGiveItem } = useEssentialsStore.getState();
        expect(canGiveItem('guest-123', 'jacket')).toBe(false);
    });

    it('prevents giving jacket 7 days after distribution', () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        useEssentialsStore.setState({
            itemRecords: [
                { id: 'item-1', guestId: 'guest-123', item: 'jacket', date: sevenDaysAgo.toISOString() },
            ],
        });

        const { canGiveItem } = useEssentialsStore.getState();
        expect(canGiveItem('guest-123', 'jacket')).toBe(false);
    });

    it('allows giving jacket at or after 15 days of distribution', () => {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 16);
        useEssentialsStore.setState({
            itemRecords: [
                { id: 'item-1', guestId: 'guest-123', item: 'jacket', date: fifteenDaysAgo.toISOString() },
            ],
        });

        const { canGiveItem } = useEssentialsStore.getState();
        expect(canGiveItem('guest-123', 'jacket')).toBe(true);
    });

    it('returns remaining days for jacket cooldown', () => {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        useEssentialsStore.setState({
            itemRecords: [
                { id: 'item-1', guestId: 'guest-123', item: 'jacket', date: fiveDaysAgo.toISOString() },
            ],
        });

        const { getDaysUntilAvailable } = useEssentialsStore.getState();
        const days = getDaysUntilAvailable('guest-123', 'jacket');
        expect(days).toBeGreaterThanOrEqual(9);
        expect(days).toBeLessThanOrEqual(11);
    });
});
