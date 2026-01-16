import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDonationsStore } from '../useDonationsStore';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: (table: string) => ({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockImplementation(() => {
                        if (table === 'donations') {
                            return Promise.resolve({
                                data: {
                                    id: 'donation-1',
                                    donation_type: 'Regular',
                                    item_name: 'Rice',
                                    trays: 2,
                                    weight_lbs: 20,
                                    servings: 50,
                                    temperature: 'Hot',
                                    donor: 'Food Bank',
                                    donated_at: new Date().toISOString(),
                                    date_key: '2024-01-15',
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                },
                                error: null
                            });
                        }
                        if (table === 'la_plaza_donations') {
                            return Promise.resolve({
                                data: {
                                    id: 'laplaza-1',
                                    category: 'Produce',
                                    weight_lbs: 100,
                                    notes: 'Fresh apples',
                                    received_at: new Date().toISOString(),
                                    date_key: '2024-01-15',
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                },
                                error: null
                            });
                        }
                        return Promise.resolve({ data: null, error: null });
                    }),
                }),
            }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
        }),
    }),
    isSupabaseEnabled: () => true,
}));

describe('useDonationsStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useDonationsStore.setState({
            donationRecords: [],
            laPlazaRecords: [],
            itemRecords: [],
            isLoading: false,
            error: null,
        });
    });

    describe('initial state', () => {
        it('should have empty arrays for records', () => {
            const state = useDonationsStore.getState();
            expect(state.donationRecords).toEqual([]);
            expect(state.laPlazaRecords).toEqual([]);
            expect(state.itemRecords).toEqual([]);
        });

        it('should not be loading initially', () => {
            const state = useDonationsStore.getState();
            expect(state.isLoading).toBe(false);
        });
    });

    describe('donation records', () => {
        it('should add a donation record', async () => {
            const { addDonation } = useDonationsStore.getState();
            const input = {
                type: 'Regular' as any,
                itemName: 'Rice',
                trays: 2,
                weightLbs: 20,
                servings: 50,
                temperature: 'Hot',
                donor: 'Food Bank',
            };

            await addDonation(input);
            const state = useDonationsStore.getState();
            expect(state.donationRecords).toHaveLength(1);
            expect(state.donationRecords[0].itemName).toBe('Rice');
        });

        it('should update a donation record', async () => {
            useDonationsStore.setState({
                donationRecords: [
                    {
                        id: 'donation-1',
                        type: 'Regular' as any,
                        itemName: 'Rice',
                        trays: 2,
                        weightLbs: 20,
                        servings: 50,
                        temperature: 'Hot',
                        donor: 'Food Bank',
                        donatedAt: new Date().toISOString(),
                        dateKey: '2024-01-15',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    }
                ]
            });

            const { updateDonation } = useDonationsStore.getState();
            await updateDonation('donation-1', { itemName: 'Brown Rice' });

            const state = useDonationsStore.getState();
            expect(state.donationRecords[0].itemName).toBe('Brown Rice');
        });
    });

    describe('La Plaza records', () => {
        it('should add a La Plaza donation', async () => {
            const { addLaPlazaDonation } = useDonationsStore.getState();
            const input = {
                category: 'Produce' as any,
                weightLbs: 100,
                notes: 'Fresh apples',
            };

            await addLaPlazaDonation(input);
            const state = useDonationsStore.getState();
            expect(state.laPlazaRecords).toHaveLength(1);
            expect(state.laPlazaRecords[0].category).toBe('Produce');
        });
    });

    describe('selectors', () => {
        it('should return arrays from today selectors', () => {
            const state = useDonationsStore.getState();
            expect(Array.isArray(state.getTodayDonations())).toBe(true);
            expect(Array.isArray(state.getTodayLaPlaza())).toBe(true);
        });
    });
});
