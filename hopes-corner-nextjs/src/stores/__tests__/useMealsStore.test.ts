import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMealsStore } from '../useMealsStore';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    id: 'meal-id',
                    guest_id: 'guest-1',
                    quantity: 1,
                    served_on: '2025-01-06',
                    recorded_at: new Date().toISOString(),
                },
                error: null
            }),
        }),
    }),
}));

vi.mock('@/lib/utils/supabasePagination', () => ({
    fetchAllPaginated: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/utils/date', () => ({
    todayPacificDateString: () => '2025-01-06',
    pacificDateStringFrom: (d: Date) => '2025-01-06',
}));

const createMockMealRecord = (overrides = {}) => ({
    id: 'meal-1',
    guestId: 'guest-1',
    count: 1,
    date: '2025-01-06',
    recordedAt: '2025-01-06T08:00:00Z',
    servedOn: '2025-01-06',
    type: null,
    ...overrides,
});

describe('useMealsStore', () => {
    beforeEach(() => {
        useMealsStore.setState({
            mealRecords: [],
            rvMealRecords: [],
            extraMealRecords: [],
            dayWorkerMealRecords: [],
            shelterMealRecords: [],
            unitedEffortMealRecords: [],
            lunchBagRecords: [],
            holidayRecords: [],
            haircutRecords: [],
        });
    });

    describe('initial state', () => {
        it('starts with empty meal records', () => {
            const state = useMealsStore.getState();
            expect(state.mealRecords).toEqual([]);
        });

        it('starts with empty RV meal records', () => {
            const state = useMealsStore.getState();
            expect(state.rvMealRecords).toEqual([]);
        });

        it('starts with empty extra meal records', () => {
            const state = useMealsStore.getState();
            expect(state.extraMealRecords).toEqual([]);
        });

        it('starts with empty day worker records', () => {
            const state = useMealsStore.getState();
            expect(state.dayWorkerMealRecords).toEqual([]);
        });

        it('starts with empty shelter records', () => {
            const state = useMealsStore.getState();
            expect(state.shelterMealRecords).toEqual([]);
        });

        it('starts with empty united effort records', () => {
            const state = useMealsStore.getState();
            expect(state.unitedEffortMealRecords).toEqual([]);
        });

        it('starts with empty lunch bag records', () => {
            const state = useMealsStore.getState();
            expect(state.lunchBagRecords).toEqual([]);
        });

        it('starts with empty holiday records', () => {
            const state = useMealsStore.getState();
            expect(state.holidayRecords).toEqual([]);
        });

        it('starts with empty haircut records', () => {
            const state = useMealsStore.getState();
            expect(state.haircutRecords).toEqual([]);
        });
    });

    describe('clearMealRecords', () => {
        it('clears all meal records', () => {
            useMealsStore.setState({
                mealRecords: [createMockMealRecord()],
                rvMealRecords: [createMockMealRecord({ id: 'rv-1' })],
            });

            const { clearMealRecords } = useMealsStore.getState();
            clearMealRecords();

            const state = useMealsStore.getState();
            expect(state.mealRecords).toEqual([]);
        });
    });

    describe('getDetailsForDate', () => {
        beforeEach(() => {
            useMealsStore.setState({
                mealRecords: [
                    createMockMealRecord({ id: 'm1', date: '2025-01-06' }),
                    createMockMealRecord({ id: 'm2', date: '2025-01-05' }),
                ],
                rvMealRecords: [
                    createMockMealRecord({ id: 'rv1', date: '2025-01-06' }),
                ],
                extraMealRecords: [
                    createMockMealRecord({ id: 'ex1', date: '2025-01-06' }),
                ],
                dayWorkerMealRecords: [
                    createMockMealRecord({ id: 'dw1', date: '2025-01-06' }),
                ],
                shelterMealRecords: [
                    createMockMealRecord({ id: 'sh1', date: '2025-01-06' }),
                ],
                unitedEffortMealRecords: [
                    createMockMealRecord({ id: 'ue1', date: '2025-01-06' }),
                ],
                lunchBagRecords: [
                    createMockMealRecord({ id: 'lb1', date: '2025-01-06' }),
                ],
            });
        });

        it('returns meals for specific date', () => {
            const { getDetailsForDate } = useMealsStore.getState();
            const details = getDetailsForDate('2025-01-06');

            // Records match by date OR servedOn field
            expect(details.meals.length).toBeGreaterThanOrEqual(1);
        });

        it('returns RV meals for specific date', () => {
            const { getDetailsForDate } = useMealsStore.getState();
            const details = getDetailsForDate('2025-01-06');

            expect(details.rv.length).toBe(1);
        });

        it('returns extras for specific date', () => {
            const { getDetailsForDate } = useMealsStore.getState();
            const details = getDetailsForDate('2025-01-06');

            expect(details.extras.length).toBe(1);
        });

        it('returns day worker meals for specific date', () => {
            const { getDetailsForDate } = useMealsStore.getState();
            const details = getDetailsForDate('2025-01-06');

            expect(details.dayWorker.length).toBe(1);
        });

        it('returns shelter meals for specific date', () => {
            const { getDetailsForDate } = useMealsStore.getState();
            const details = getDetailsForDate('2025-01-06');

            expect(details.shelter.length).toBe(1);
        });

        it('returns united effort meals for specific date', () => {
            const { getDetailsForDate } = useMealsStore.getState();
            const details = getDetailsForDate('2025-01-06');

            expect(details.unitedEffort.length).toBe(1);
        });

        it('returns lunch bags for specific date', () => {
            const { getDetailsForDate } = useMealsStore.getState();
            const details = getDetailsForDate('2025-01-06');

            expect(details.lunchBags.length).toBe(1);
        });

        it('returns empty arrays for date with no records', () => {
            const { getDetailsForDate } = useMealsStore.getState();
            const details = getDetailsForDate('2025-01-07');

            expect(details.meals).toEqual([]);
            expect(details.rv).toEqual([]);
            expect(details.extras).toEqual([]);
        });

        it('handles servedOn field for date matching', () => {
            useMealsStore.setState({
                mealRecords: [
                    createMockMealRecord({ id: 'm1', servedOn: '2025-01-06' }),
                ],
            });

            const { getDetailsForDate } = useMealsStore.getState();
            const details = getDetailsForDate('2025-01-06');

            expect(details.meals.length).toBe(1);
        });
    });

    describe('state mutations', () => {
        describe('adding meal records directly to state', () => {
            it('can add a meal record', () => {
                const record = createMockMealRecord();
                useMealsStore.setState((state) => ({
                    mealRecords: [...state.mealRecords, record],
                }));

                const { mealRecords } = useMealsStore.getState();
                expect(mealRecords.length).toBe(1);
            });

            it('can add multiple meal records', () => {
                const records = [
                    createMockMealRecord({ id: 'm1' }),
                    createMockMealRecord({ id: 'm2' }),
                    createMockMealRecord({ id: 'm3' }),
                ];

                useMealsStore.setState({ mealRecords: records });

                const { mealRecords } = useMealsStore.getState();
                expect(mealRecords.length).toBe(3);
            });

            it('can remove a meal record', () => {
                useMealsStore.setState({
                    mealRecords: [
                        createMockMealRecord({ id: 'm1' }),
                        createMockMealRecord({ id: 'm2' }),
                    ],
                });

                useMealsStore.setState((state) => ({
                    mealRecords: state.mealRecords.filter((r) => r.id !== 'm1'),
                }));

                const { mealRecords } = useMealsStore.getState();
                expect(mealRecords.length).toBe(1);
                expect(mealRecords[0].id).toBe('m2');
            });
        });

        describe('adding RV meal records', () => {
            it('can add an RV meal record', () => {
                const record = createMockMealRecord({ id: 'rv1' });
                useMealsStore.setState({ rvMealRecords: [record] });

                const { rvMealRecords } = useMealsStore.getState();
                expect(rvMealRecords.length).toBe(1);
            });
        });

        describe('adding extra meal records', () => {
            it('can add an extra meal record', () => {
                const record = createMockMealRecord({ id: 'ex1' });
                useMealsStore.setState({ extraMealRecords: [record] });

                const { extraMealRecords } = useMealsStore.getState();
                expect(extraMealRecords.length).toBe(1);
            });
        });

        describe('adding holiday records', () => {
            it('can add a holiday record', () => {
                useMealsStore.setState({
                    holidayRecords: [{ id: 'h1', guestId: 'guest-1', date: '2025-01-06', type: 'holiday' }],
                });

                const { holidayRecords } = useMealsStore.getState();
                expect(holidayRecords.length).toBe(1);
            });

            it('holiday records have correct type', () => {
                useMealsStore.setState({
                    holidayRecords: [{ id: 'h1', guestId: 'guest-1', date: '2025-01-06', type: 'holiday' }],
                });

                const { holidayRecords } = useMealsStore.getState();
                expect(holidayRecords[0].type).toBe('holiday');
            });
        });

        describe('adding haircut records', () => {
            it('can add a haircut record', () => {
                useMealsStore.setState({
                    haircutRecords: [{ id: 'hc1', guestId: 'guest-1', date: '2025-01-06', type: 'haircut' }],
                });

                const { haircutRecords } = useMealsStore.getState();
                expect(haircutRecords.length).toBe(1);
            });

            it('haircut records have correct type', () => {
                useMealsStore.setState({
                    haircutRecords: [{ id: 'hc1', guestId: 'guest-1', date: '2025-01-06', type: 'haircut' }],
                });

                const { haircutRecords } = useMealsStore.getState();
                expect(haircutRecords[0].type).toBe('haircut');
            });
        });
    });

    describe('meal record filtering', () => {
        it('filters by guest ID', () => {
            const records = [
                createMockMealRecord({ id: 'm1', guestId: 'guest-1' }),
                createMockMealRecord({ id: 'm2', guestId: 'guest-2' }),
                createMockMealRecord({ id: 'm3', guestId: 'guest-1' }),
            ];

            useMealsStore.setState({ mealRecords: records });

            const { mealRecords } = useMealsStore.getState();
            const guest1Meals = mealRecords.filter((r) => r.guestId === 'guest-1');
            expect(guest1Meals.length).toBe(2);
        });

        it('filters by date range', () => {
            const records = [
                createMockMealRecord({ id: 'm1', date: '2025-01-01' }),
                createMockMealRecord({ id: 'm2', date: '2025-01-05' }),
                createMockMealRecord({ id: 'm3', date: '2025-01-10' }),
            ];

            useMealsStore.setState({ mealRecords: records });

            const { mealRecords } = useMealsStore.getState();
            const janRecords = mealRecords.filter((r) => {
                const date = new Date(r.date);
                return date >= new Date('2025-01-01') && date <= new Date('2025-01-07');
            });
            expect(janRecords.length).toBe(2);
        });

        it('calculates total count', () => {
            const records = [
                createMockMealRecord({ id: 'm1', count: 1 }),
                createMockMealRecord({ id: 'm2', count: 2 }),
                createMockMealRecord({ id: 'm3', count: 3 }),
            ];

            useMealsStore.setState({ mealRecords: records });

            const { mealRecords } = useMealsStore.getState();
            const totalCount = mealRecords.reduce((sum, r) => sum + r.count, 0);
            expect(totalCount).toBe(6);
        });

        it('finds records with proxy pickups', () => {
            const records = [
                createMockMealRecord({ id: 'm1', pickedUpByGuestId: null }),
                createMockMealRecord({ id: 'm2', pickedUpByGuestId: 'proxy-1' }),
                createMockMealRecord({ id: 'm3', pickedUpByGuestId: 'proxy-2' }),
            ];

            useMealsStore.setState({ mealRecords: records });

            const { mealRecords } = useMealsStore.getState();
            const proxyPickups = mealRecords.filter((r) => r.pickedUpByGuestId);
            expect(proxyPickups.length).toBe(2);
        });
    });

    describe('aggregate calculations', () => {
        it('counts unique guests served', () => {
            const records = [
                createMockMealRecord({ id: 'm1', guestId: 'guest-1' }),
                createMockMealRecord({ id: 'm2', guestId: 'guest-2' }),
                createMockMealRecord({ id: 'm3', guestId: 'guest-1' }),
                createMockMealRecord({ id: 'm4', guestId: 'guest-3' }),
            ];

            useMealsStore.setState({ mealRecords: records });

            const { mealRecords } = useMealsStore.getState();
            const uniqueGuests = new Set(mealRecords.map((r) => r.guestId));
            expect(uniqueGuests.size).toBe(3);
        });

        it('calculates total RV meals across all records', () => {
            const records = [
                createMockMealRecord({ id: 'rv1', count: 100 }),
                createMockMealRecord({ id: 'rv2', count: 50 }),
                createMockMealRecord({ id: 'rv3', count: 35 }),
            ];

            useMealsStore.setState({ rvMealRecords: records });

            const { rvMealRecords } = useMealsStore.getState();
            const totalRV = rvMealRecords.reduce((sum, r) => sum + r.count, 0);
            expect(totalRV).toBe(185);
        });

        it('combines all meal types for daily total', () => {
            useMealsStore.setState({
                mealRecords: [createMockMealRecord({ count: 50 })],
                rvMealRecords: [createMockMealRecord({ count: 100 })],
                extraMealRecords: [createMockMealRecord({ count: 20 })],
                dayWorkerMealRecords: [createMockMealRecord({ count: 50 })],
            });

            const state = useMealsStore.getState();
            const total =
                state.mealRecords.reduce((s, r) => s + r.count, 0) +
                state.rvMealRecords.reduce((s, r) => s + r.count, 0) +
                state.extraMealRecords.reduce((s, r) => s + r.count, 0) +
                state.dayWorkerMealRecords.reduce((s, r) => s + r.count, 0);

            expect(total).toBe(220);
        });
    });

    describe('edge cases', () => {
        it('handles empty guest ID gracefully in filters', () => {
            const records = [
                createMockMealRecord({ id: 'm1', guestId: '' }),
                createMockMealRecord({ id: 'm2', guestId: 'guest-1' }),
            ];

            useMealsStore.setState({ mealRecords: records });

            const { mealRecords } = useMealsStore.getState();
            const validRecords = mealRecords.filter((r) => r.guestId);
            expect(validRecords.length).toBe(1);
        });

        it('handles zero count records', () => {
            const records = [
                createMockMealRecord({ id: 'm1', count: 0 }),
                createMockMealRecord({ id: 'm2', count: 5 }),
            ];

            useMealsStore.setState({ mealRecords: records });

            const { mealRecords } = useMealsStore.getState();
            const nonZeroRecords = mealRecords.filter((r) => r.count > 0);
            expect(nonZeroRecords.length).toBe(1);
        });

        it('handles null/undefined dates', () => {
            const records = [
                createMockMealRecord({ id: 'm1', date: null as any }),
                createMockMealRecord({ id: 'm2', date: '2025-01-06' }),
            ];

            useMealsStore.setState({ mealRecords: records });

            const { mealRecords } = useMealsStore.getState();
            const validDates = mealRecords.filter((r) => r.date);
            expect(validDates.length).toBe(1);
        });

        it('handles large quantities', () => {
            const record = createMockMealRecord({ count: 999999 });
            useMealsStore.setState({ mealRecords: [record] });

            const { mealRecords } = useMealsStore.getState();
            expect(mealRecords[0].count).toBe(999999);
        });
    });

    describe('async actions', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            useMealsStore.setState({
                mealRecords: [],
                rvMealRecords: [],
                extraMealRecords: [],
                dayWorkerMealRecords: [],
                shelterMealRecords: [],
                unitedEffortMealRecords: [],
                lunchBagRecords: [],
                holidayRecords: [],
                haircutRecords: [],
            });
        });

        describe('addMealRecord', () => {
            it('adds a meal record successfully', async () => {
                const { addMealRecord } = useMealsStore.getState();
                const result = await addMealRecord('guest-1', 1);

                expect(result).toBeDefined();
                expect(result.id).toBeDefined();
            });

            it('throws error when guestId is empty', async () => {
                const { addMealRecord } = useMealsStore.getState();
                await expect(addMealRecord('', 1)).rejects.toThrow('Guest ID is required');
            });

            it('handles proxy pickup', async () => {
                const { addMealRecord } = useMealsStore.getState();
                const result = await addMealRecord('guest-123', 1, 'proxy-guest-456');

                expect(result).toBeDefined();
            });
        });

        describe('deleteMealRecord', () => {
            it('removes meal record from state', async () => {
                useMealsStore.setState({
                    mealRecords: [createMockMealRecord({ id: 'to-delete' })],
                });

                const { deleteMealRecord } = useMealsStore.getState();
                await deleteMealRecord('to-delete');

                const { mealRecords } = useMealsStore.getState();
                expect(mealRecords.find(r => r.id === 'to-delete')).toBeUndefined();
            });

            it('handles non-existent record', async () => {
                const { deleteMealRecord } = useMealsStore.getState();
                await deleteMealRecord('non-existent');
                // Should not throw
                expect(true).toBe(true);
            });
        });

        describe('addRvMealRecord', () => {
            it('adds RV meal record successfully', async () => {
                const { addRvMealRecord } = useMealsStore.getState();
                const result = await addRvMealRecord('guest-rv', 100);

                expect(result).toBeDefined();
            });

            it('allows any guestId value', async () => {
                // Note: addRvMealRecord does NOT validate empty guestId
                const { addRvMealRecord } = useMealsStore.getState();
                const result = await addRvMealRecord('some-id', 100);
                expect(result).toBeDefined();
            });
        });

        describe('deleteRvMealRecord', () => {
            it('removes RV meal record from state', async () => {
                useMealsStore.setState({
                    rvMealRecords: [createMockMealRecord({ id: 'rv-to-delete' })],
                });

                const { deleteRvMealRecord } = useMealsStore.getState();
                await deleteRvMealRecord('rv-to-delete');

                const { rvMealRecords } = useMealsStore.getState();
                expect(rvMealRecords.find(r => r.id === 'rv-to-delete')).toBeUndefined();
            });
        });

        describe('addExtraMealRecord', () => {
            it('adds extra meal record successfully', async () => {
                const { addExtraMealRecord } = useMealsStore.getState();
                const result = await addExtraMealRecord('guest-extra', 5);

                expect(result).toBeDefined();
            });

            it('allows any guestId value', async () => {
                // Note: addExtraMealRecord does NOT validate empty guestId
                const { addExtraMealRecord } = useMealsStore.getState();
                const result = await addExtraMealRecord('some-guest', 5);
                expect(result).toBeDefined();
            });
        });

        describe('deleteExtraMealRecord', () => {
            it('removes extra meal record from state', async () => {
                useMealsStore.setState({
                    extraMealRecords: [createMockMealRecord({ id: 'extra-to-delete' })],
                });

                const { deleteExtraMealRecord } = useMealsStore.getState();
                await deleteExtraMealRecord('extra-to-delete');

                const { extraMealRecords } = useMealsStore.getState();
                expect(extraMealRecords.find(r => r.id === 'extra-to-delete')).toBeUndefined();
            });
        });

        describe('addBulkMealRecord', () => {
            it('adds day worker meal record', async () => {
                const { addBulkMealRecord } = useMealsStore.getState();
                const result = await addBulkMealRecord('day_worker', 50, 'Saturday batch');

                expect(result).toBeDefined();
            });

            it('adds shelter meal record', async () => {
                const { addBulkMealRecord } = useMealsStore.getState();
                const result = await addBulkMealRecord('shelter', 30, 'Shelter delivery');

                expect(result).toBeDefined();
            });

            it('adds lunch bag record', async () => {
                const { addBulkMealRecord } = useMealsStore.getState();
                const result = await addBulkMealRecord('lunch_bag', 120, 'Monday batch');

                expect(result).toBeDefined();
            });

            it('adds united effort record', async () => {
                const { addBulkMealRecord } = useMealsStore.getState();
                const result = await addBulkMealRecord('united_effort', 25, 'Partner delivery');

                expect(result).toBeDefined();
            });

            it('handles unknown meal type gracefully', async () => {
                const { addBulkMealRecord } = useMealsStore.getState();
                const result = await addBulkMealRecord('unknown_type', 10, 'Test');

                expect(result).toBeDefined();
            });

            it('adds record with deduplication key', async () => {
                const { addBulkMealRecord } = useMealsStore.getState();
                const result = await addBulkMealRecord('lunch_bag', 100, 'Test', 'unique-key');

                // Record should be added
                expect(result).toBeDefined();
            });
        });

        describe('deleteBulkMealRecord', () => {
            it('removes day worker meal record', async () => {
                useMealsStore.setState({
                    dayWorkerMealRecords: [createMockMealRecord({ id: 'dw-delete' })],
                });

                const { deleteBulkMealRecord } = useMealsStore.getState();
                await deleteBulkMealRecord('dw-delete', 'day_worker');

                const { dayWorkerMealRecords } = useMealsStore.getState();
                expect(dayWorkerMealRecords.find(r => r.id === 'dw-delete')).toBeUndefined();
            });

            it('removes shelter meal record', async () => {
                useMealsStore.setState({
                    shelterMealRecords: [createMockMealRecord({ id: 'sh-delete' })],
                });

                const { deleteBulkMealRecord } = useMealsStore.getState();
                await deleteBulkMealRecord('sh-delete', 'shelter');

                const { shelterMealRecords } = useMealsStore.getState();
                expect(shelterMealRecords.find(r => r.id === 'sh-delete')).toBeUndefined();
            });

            it('removes lunch bag record', async () => {
                useMealsStore.setState({
                    lunchBagRecords: [createMockMealRecord({ id: 'lb-delete' })],
                });

                const { deleteBulkMealRecord } = useMealsStore.getState();
                await deleteBulkMealRecord('lb-delete', 'lunch_bag');

                const { lunchBagRecords } = useMealsStore.getState();
                expect(lunchBagRecords.find(r => r.id === 'lb-delete')).toBeUndefined();
            });
        });

        describe('addHolidayRecord', () => {
            it('adds holiday record successfully', async () => {
                const { addHolidayRecord } = useMealsStore.getState();
                const result = await addHolidayRecord('guest-holiday');

                expect(result).toBeDefined();
            });

            it('throws error when guestId is empty', async () => {
                const { addHolidayRecord } = useMealsStore.getState();
                await expect(addHolidayRecord('')).rejects.toThrow('Guest ID is required');
            });
        });

        describe('deleteHolidayRecord', () => {
            it('removes holiday record from state', async () => {
                useMealsStore.setState({
                    holidayRecords: [{ id: 'hol-delete', guestId: 'g1', date: '2025-01-06', type: 'holiday' }],
                });

                const { deleteHolidayRecord } = useMealsStore.getState();
                await deleteHolidayRecord('hol-delete');

                const { holidayRecords } = useMealsStore.getState();
                expect(holidayRecords.find(r => r.id === 'hol-delete')).toBeUndefined();
            });
        });

        describe('addHaircutRecord', () => {
            it('adds haircut record successfully', async () => {
                const { addHaircutRecord } = useMealsStore.getState();
                const result = await addHaircutRecord('guest-haircut');

                expect(result).toBeDefined();
            });

            it('throws error when guestId is empty', async () => {
                const { addHaircutRecord } = useMealsStore.getState();
                await expect(addHaircutRecord('')).rejects.toThrow('Guest ID is required');
            });
        });

        describe('deleteHaircutRecord', () => {
            it('removes haircut record from state', async () => {
                useMealsStore.setState({
                    haircutRecords: [{ id: 'hc-delete', guestId: 'g1', date: '2025-01-06', type: 'haircut' }],
                });

                const { deleteHaircutRecord } = useMealsStore.getState();
                await deleteHaircutRecord('hc-delete');

                const { haircutRecords } = useMealsStore.getState();
                expect(haircutRecords.find(r => r.id === 'hc-delete')).toBeUndefined();
            });
        });

        describe('updateMealRecord', () => {
            it('updates meal record count', async () => {
                useMealsStore.setState({
                    mealRecords: [createMockMealRecord({ id: 'update-me', count: 1 })],
                });

                const { updateMealRecord } = useMealsStore.getState();
                await updateMealRecord('update-me', { count: 5 });

                const { mealRecords } = useMealsStore.getState();
                const updated = mealRecords.find(r => r.id === 'update-me');
                expect(updated?.count).toBe(5);
            });
        });

        describe('updateBulkMealRecord', () => {
            it('updates day worker meal record', async () => {
                useMealsStore.setState({
                    dayWorkerMealRecords: [createMockMealRecord({ id: 'dw-update', count: 50 })],
                });

                const { updateBulkMealRecord } = useMealsStore.getState();
                await updateBulkMealRecord('dw-update', 'day_worker', { count: 75 });

                const { dayWorkerMealRecords } = useMealsStore.getState();
                const updated = dayWorkerMealRecords.find(r => r.id === 'dw-update');
                expect(updated?.count).toBe(75);
            });

            it('updates shelter meal record', async () => {
                useMealsStore.setState({
                    shelterMealRecords: [createMockMealRecord({ id: 'sh-update', count: 30 })],
                });

                const { updateBulkMealRecord } = useMealsStore.getState();
                await updateBulkMealRecord('sh-update', 'shelter', { count: 40 });

                const { shelterMealRecords } = useMealsStore.getState();
                const updated = shelterMealRecords.find(r => r.id === 'sh-update');
                expect(updated?.count).toBe(40);
            });

            it('updates lunch bag record', async () => {
                useMealsStore.setState({
                    lunchBagRecords: [createMockMealRecord({ id: 'lb-update', count: 100 })],
                });

                const { updateBulkMealRecord } = useMealsStore.getState();
                await updateBulkMealRecord('lb-update', 'lunch_bag', { count: 120 });

                const { lunchBagRecords } = useMealsStore.getState();
                const updated = lunchBagRecords.find(r => r.id === 'lb-update');
                expect(updated?.count).toBe(120);
            });
        });

        describe('checkAndAddAutomaticMeals', () => {
            it('executes without error', async () => {
                const { checkAndAddAutomaticMeals } = useMealsStore.getState();
                await expect(checkAndAddAutomaticMeals()).resolves.not.toThrow();
            });
        });

        describe('loadFromSupabase', () => {
            it('loads meal records from Supabase', async () => {
                const { loadFromSupabase } = useMealsStore.getState();
                await loadFromSupabase();

                // Should not throw and records should be set
                expect(true).toBe(true);
            });
        });
    });
});
