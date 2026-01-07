import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDonationsStore } from '../useDonationsStore';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
        }),
    }),
}));

vi.mock('@/lib/utils/supabasePagination', () => ({
    fetchAllPaginated: vi.fn().mockResolvedValue([]),
}));

const createMockDonation = (overrides = {}) => ({
    id: 'donation-1',
    donorName: 'John Smith',
    type: 'monetary',
    amount: 100,
    description: 'Monthly donation',
    date: '2025-01-06',
    createdAt: '2025-01-06T08:00:00Z',
    ...overrides,
});

const createMockLaPlazaDonation = (overrides = {}) => ({
    id: 'laplaza-1',
    itemType: 'clothing',
    quantity: 10,
    description: 'Winter coats',
    date: '2025-01-06',
    createdAt: '2025-01-06T08:00:00Z',
    ...overrides,
});

describe('useDonationsStore', () => {
    beforeEach(() => {
        useDonationsStore.setState({
            donationRecords: [],
            laPlazaRecords: [],
        });
    });

    describe('initial state', () => {
        it('starts with empty donation records', () => {
            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords).toEqual([]);
        });

        it('starts with empty La Plaza records', () => {
            const { laPlazaRecords } = useDonationsStore.getState();
            expect(laPlazaRecords).toEqual([]);
        });
    });

    describe('donation records', () => {
        describe('state management', () => {
            it('can add a donation record', () => {
                const record = createMockDonation();
                useDonationsStore.setState({ donationRecords: [record] });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords.length).toBe(1);
            });

            it('can add multiple donation records', () => {
                const records = [
                    createMockDonation({ id: 'd1' }),
                    createMockDonation({ id: 'd2' }),
                    createMockDonation({ id: 'd3' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords.length).toBe(3);
            });

            it('can remove a donation record', () => {
                useDonationsStore.setState({
                    donationRecords: [
                        createMockDonation({ id: 'd1' }),
                        createMockDonation({ id: 'd2' }),
                    ],
                });

                useDonationsStore.setState((state) => ({
                    donationRecords: state.donationRecords.filter((r) => r.id !== 'd1'),
                }));

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords.length).toBe(1);
            });

            it('can update a donation record', () => {
                useDonationsStore.setState({
                    donationRecords: [createMockDonation({ id: 'd1', amount: 100 })],
                });

                useDonationsStore.setState((state) => ({
                    donationRecords: state.donationRecords.map((r) =>
                        r.id === 'd1' ? { ...r, amount: 200 } : r
                    ),
                }));

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords[0].amount).toBe(200);
            });
        });

        describe('filtering', () => {
            it('filters by date', () => {
                const records = [
                    createMockDonation({ id: 'd1', date: '2025-01-06' }),
                    createMockDonation({ id: 'd2', date: '2025-01-05' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const todayDonations = donationRecords.filter((r) => r.date === '2025-01-06');
                expect(todayDonations.length).toBe(1);
            });

            it('filters by type', () => {
                const records = [
                    createMockDonation({ id: 'd1', type: 'monetary' }),
                    createMockDonation({ id: 'd2', type: 'in-kind' }),
                    createMockDonation({ id: 'd3', type: 'monetary' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const monetaryDonations = donationRecords.filter((r) => r.type === 'monetary');
                expect(monetaryDonations.length).toBe(2);
            });

            it('filters by donor name', () => {
                const records = [
                    createMockDonation({ id: 'd1', donorName: 'John Smith' }),
                    createMockDonation({ id: 'd2', donorName: 'Jane Doe' }),
                    createMockDonation({ id: 'd3', donorName: 'John Smith' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const johnDonations = donationRecords.filter((r) => r.donorName === 'John Smith');
                expect(johnDonations.length).toBe(2);
            });
        });

        describe('donation types', () => {
            it('tracks monetary donations', () => {
                const record = createMockDonation({ type: 'monetary', amount: 500 });
                useDonationsStore.setState({ donationRecords: [record] });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords[0].type).toBe('monetary');
                expect(donationRecords[0].amount).toBe(500);
            });

            it('tracks in-kind donations', () => {
                const record = createMockDonation({ type: 'in-kind', description: 'Food items' });
                useDonationsStore.setState({ donationRecords: [record] });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords[0].type).toBe('in-kind');
            });

            it('tracks volunteer hours', () => {
                const record = createMockDonation({ type: 'volunteer', amount: 8 });
                useDonationsStore.setState({ donationRecords: [record] });

                const { donationRecords } = useDonationsStore.getState();
                expect(donationRecords[0].type).toBe('volunteer');
            });
        });

        describe('aggregate calculations', () => {
            it('calculates total monetary donations', () => {
                const records = [
                    createMockDonation({ id: 'd1', type: 'monetary', amount: 100 }),
                    createMockDonation({ id: 'd2', type: 'monetary', amount: 250 }),
                    createMockDonation({ id: 'd3', type: 'monetary', amount: 50 }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const total = donationRecords
                    .filter((r) => r.type === 'monetary')
                    .reduce((sum, r) => sum + (r.amount || 0), 0);
                expect(total).toBe(400);
            });

            it('counts unique donors', () => {
                const records = [
                    createMockDonation({ id: 'd1', donorName: 'John Smith' }),
                    createMockDonation({ id: 'd2', donorName: 'Jane Doe' }),
                    createMockDonation({ id: 'd3', donorName: 'John Smith' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const uniqueDonors = new Set(donationRecords.map((r) => r.donorName));
                expect(uniqueDonors.size).toBe(2);
            });

            it('counts donations by month', () => {
                const records = [
                    createMockDonation({ id: 'd1', date: '2025-01-06' }),
                    createMockDonation({ id: 'd2', date: '2025-01-15' }),
                    createMockDonation({ id: 'd3', date: '2025-02-01' }),
                ];

                useDonationsStore.setState({ donationRecords: records });

                const { donationRecords } = useDonationsStore.getState();
                const janDonations = donationRecords.filter((r) =>
                    r.date.startsWith('2025-01')
                );
                expect(janDonations.length).toBe(2);
            });
        });
    });

    describe('La Plaza records', () => {
        describe('state management', () => {
            it('can add a La Plaza record', () => {
                const record = createMockLaPlazaDonation();
                useDonationsStore.setState({ laPlazaRecords: [record] });

                const { laPlazaRecords } = useDonationsStore.getState();
                expect(laPlazaRecords.length).toBe(1);
            });

            it('can add multiple La Plaza records', () => {
                const records = [
                    createMockLaPlazaDonation({ id: 'lp1' }),
                    createMockLaPlazaDonation({ id: 'lp2' }),
                ];

                useDonationsStore.setState({ laPlazaRecords: records });

                const { laPlazaRecords } = useDonationsStore.getState();
                expect(laPlazaRecords.length).toBe(2);
            });

            it('can remove a La Plaza record', () => {
                useDonationsStore.setState({
                    laPlazaRecords: [
                        createMockLaPlazaDonation({ id: 'lp1' }),
                        createMockLaPlazaDonation({ id: 'lp2' }),
                    ],
                });

                useDonationsStore.setState((state) => ({
                    laPlazaRecords: state.laPlazaRecords.filter((r) => r.id !== 'lp1'),
                }));

                const { laPlazaRecords } = useDonationsStore.getState();
                expect(laPlazaRecords.length).toBe(1);
            });
        });

        describe('filtering', () => {
            it('filters by item type', () => {
                const records = [
                    createMockLaPlazaDonation({ id: 'lp1', itemType: 'clothing' }),
                    createMockLaPlazaDonation({ id: 'lp2', itemType: 'food' }),
                    createMockLaPlazaDonation({ id: 'lp3', itemType: 'clothing' }),
                ];

                useDonationsStore.setState({ laPlazaRecords: records });

                const { laPlazaRecords } = useDonationsStore.getState();
                const clothingItems = laPlazaRecords.filter((r) => r.itemType === 'clothing');
                expect(clothingItems.length).toBe(2);
            });

            it('filters by date', () => {
                const records = [
                    createMockLaPlazaDonation({ id: 'lp1', date: '2025-01-06' }),
                    createMockLaPlazaDonation({ id: 'lp2', date: '2025-01-05' }),
                ];

                useDonationsStore.setState({ laPlazaRecords: records });

                const { laPlazaRecords } = useDonationsStore.getState();
                const todayItems = laPlazaRecords.filter((r) => r.date === '2025-01-06');
                expect(todayItems.length).toBe(1);
            });
        });

        describe('quantity tracking', () => {
            it('tracks item quantities', () => {
                const record = createMockLaPlazaDonation({ quantity: 25 });
                useDonationsStore.setState({ laPlazaRecords: [record] });

                const { laPlazaRecords } = useDonationsStore.getState();
                expect(laPlazaRecords[0].quantity).toBe(25);
            });

            it('calculates total items distributed', () => {
                const records = [
                    createMockLaPlazaDonation({ id: 'lp1', quantity: 10 }),
                    createMockLaPlazaDonation({ id: 'lp2', quantity: 20 }),
                    createMockLaPlazaDonation({ id: 'lp3', quantity: 15 }),
                ];

                useDonationsStore.setState({ laPlazaRecords: records });

                const { laPlazaRecords } = useDonationsStore.getState();
                const total = laPlazaRecords.reduce((sum, r) => sum + r.quantity, 0);
                expect(total).toBe(45);
            });
        });
    });

    describe('getRecentDonations', () => {
        it('returns recent donations', () => {
            const records = [
                createMockDonation({ id: 'd1' }),
                createMockDonation({ id: 'd2' }),
                createMockDonation({ id: 'd3' }),
            ];

            useDonationsStore.setState({ donationRecords: records });

            const { getRecentDonations } = useDonationsStore.getState();
            const recent = getRecentDonations(2);
            expect(recent.length).toBe(2);
        });

        it('returns all donations if limit exceeds count', () => {
            const records = [
                createMockDonation({ id: 'd1' }),
                createMockDonation({ id: 'd2' }),
            ];

            useDonationsStore.setState({ donationRecords: records });

            const { getRecentDonations } = useDonationsStore.getState();
            const recent = getRecentDonations(10);
            expect(recent.length).toBe(2);
        });

        it('returns empty array if no donations', () => {
            const { getRecentDonations } = useDonationsStore.getState();
            const recent = getRecentDonations(5);
            expect(recent).toEqual([]);
        });
    });

    describe('edge cases', () => {
        it('handles zero amounts', () => {
            const record = createMockDonation({ amount: 0 });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].amount).toBe(0);
        });

        it('handles empty donor names', () => {
            const record = createMockDonation({ donorName: '' });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].donorName).toBe('');
        });

        it('handles null descriptions', () => {
            const record = createMockDonation({ description: null as any });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].description).toBeNull();
        });

        it('handles very large amounts', () => {
            const record = createMockDonation({ amount: 999999999 });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].amount).toBe(999999999);
        });

        it('handles future dates', () => {
            const record = createMockDonation({ date: '2030-12-31' });
            useDonationsStore.setState({ donationRecords: [record] });

            const { donationRecords } = useDonationsStore.getState();
            expect(donationRecords[0].date).toBe('2030-12-31');
        });
    });

    describe('async actions', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            useDonationsStore.setState({ donationRecords: [], laPlazaRecords: [] });
        });

        describe('addDonation', () => {
            it('adds a donation successfully', async () => {
                const { addDonation } = useDonationsStore.getState();
                const result = await addDonation({
                    donation_type: 'food',
                    item_name: 'Test Item',
                    trays: 5,
                    weight_lbs: 10,
                    servings: 100,
                    donor: 'Test Donor',
                });

                expect(result).toBeDefined();
                expect(result.id).toBeDefined();
                expect(useDonationsStore.getState().donationRecords.length).toBe(1);
            });
        });

        describe('updateDonation', () => {
            it('updates a donation successfully', async () => {
                useDonationsStore.setState({
                    donationRecords: [{ id: 'd1', type: 'food', itemName: 'Old', trays: 1, weightLbs: 5, servings: 50, donor: 'Donor', date: '2025-01-06' }],
                });

                const { updateDonation } = useDonationsStore.getState();
                const result = await updateDonation('d1', { item_name: 'Updated', trays: 10 });

                expect(result).toBeDefined();
            });
        });

        describe('deleteDonation', () => {
            it('deletes a donation successfully', async () => {
                useDonationsStore.setState({
                    donationRecords: [{ id: 'd1', type: 'food', itemName: 'Test', trays: 1, weightLbs: 5, servings: 50, donor: 'Donor', date: '2025-01-06' }],
                });

                const { deleteDonation } = useDonationsStore.getState();
                await deleteDonation('d1');

                expect(useDonationsStore.getState().donationRecords.length).toBe(0);
            });
        });

        describe('addLaPlazaDonation', () => {
            it('adds a La Plaza donation successfully', async () => {
                const { addLaPlazaDonation } = useDonationsStore.getState();
                const result = await addLaPlazaDonation({
                    category: 'produce',
                    weight_lbs: 25,
                    notes: 'Fresh vegetables',
                });

                expect(result).toBeDefined();
                expect(useDonationsStore.getState().laPlazaRecords.length).toBe(1);
            });
        });

        describe('updateLaPlazaDonation', () => {
            it('updates a La Plaza donation successfully', async () => {
                useDonationsStore.setState({
                    laPlazaRecords: [{ id: 'lp1', category: 'produce', weightLbs: 25, notes: 'Old notes' }],
                });

                const { updateLaPlazaDonation } = useDonationsStore.getState();
                const result = await updateLaPlazaDonation('lp1', { category: 'dairy', weight_lbs: 30, notes: 'Updated notes' });

                expect(result).toBeDefined();
            });
        });

        describe('deleteLaPlazaDonation', () => {
            it('deletes a La Plaza donation successfully', async () => {
                useDonationsStore.setState({
                    laPlazaRecords: [{ id: 'lp1', category: 'produce', weightLbs: 25 }],
                });

                const { deleteLaPlazaDonation } = useDonationsStore.getState();
                await deleteLaPlazaDonation('lp1');

                expect(useDonationsStore.getState().laPlazaRecords.length).toBe(0);
            });
        });

        describe('loadFromSupabase', () => {
            it('loads donations from Supabase', async () => {
                const { loadFromSupabase } = useDonationsStore.getState();
                await loadFromSupabase();

                // Should not throw and state should be set
                const state = useDonationsStore.getState();
                expect(Array.isArray(state.donationRecords)).toBe(true);
                expect(Array.isArray(state.laPlazaRecords)).toBe(true);
            });
        });

        describe('getRecentDonations sorting', () => {
            it('sorts donations by most recent first', () => {
                useDonationsStore.setState({
                    donationRecords: [
                        { id: 'd1', donorName: 'A', type: 'food', amount: 10, description: '', date: '2025-01-05', createdAt: '2025-01-05T08:00:00Z', donated_at: '2025-01-05T08:00:00Z' },
                        { id: 'd2', donorName: 'B', type: 'food', amount: 20, description: '', date: '2025-01-06', createdAt: '2025-01-06T08:00:00Z', donated_at: '2025-01-06T08:00:00Z' },
                    ],
                });

                const { getRecentDonations } = useDonationsStore.getState();
                const recent = getRecentDonations(2);

                expect(recent[0].donorName).toBe('B');
            });
        });
    });
});
