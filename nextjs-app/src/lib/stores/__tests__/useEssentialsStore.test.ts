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
            const expected = new Date('2025-02-14');
            expected.setHours(0, 0, 0, 0);
            expect(result?.getDate()).toBe(expected.getDate());
            expect(result?.getMonth()).toBe(expected.getMonth());
        });

        it('adds 30 days for backpack', () => {
            const date = '2025-01-01T10:00:00Z';
            const result = getNextAvailabilityDate('backpack', date);
            const expected = new Date('2025-01-31');
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
});
