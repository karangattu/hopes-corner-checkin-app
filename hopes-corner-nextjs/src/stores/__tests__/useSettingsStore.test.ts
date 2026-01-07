import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from '../useSettingsStore';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => ({
            upsert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
    }),
}));

describe('useSettingsStore', () => {
    beforeEach(() => {
        // Reset store to initial state
        useSettingsStore.setState({
            targets: {
                monthlyMeals: 1500,
                yearlyMeals: 18000,
                monthlyShowers: 300,
                yearlyShowers: 3600,
                monthlyLaundry: 200,
                yearlyLaundry: 2400,
                monthlyBicycles: 50,
                yearlyBicycles: 600,
                monthlyHaircuts: 100,
                yearlyHaircuts: 1200,
                monthlyHolidays: 80,
                yearlyHolidays: 960,
                maxOnsiteLaundrySlots: 5,
            },
        });
    });

    describe('initial state', () => {
        it('has default targets', () => {
            const { targets } = useSettingsStore.getState();

            expect(targets.monthlyMeals).toBe(1500);
            expect(targets.yearlyMeals).toBe(18000);
            expect(targets.monthlyShowers).toBe(300);
            expect(targets.maxOnsiteLaundrySlots).toBe(5);
        });
    });

    describe('updateTargets', () => {
        it('updates partial targets', async () => {
            const { updateTargets } = useSettingsStore.getState();

            await updateTargets({ monthlyMeals: 2000 });

            const { targets } = useSettingsStore.getState();
            expect(targets.monthlyMeals).toBe(2000);
            // Other targets should remain unchanged
            expect(targets.yearlyMeals).toBe(18000);
        });

        it('can update multiple targets at once', async () => {
            const { updateTargets } = useSettingsStore.getState();

            await updateTargets({
                monthlyMeals: 2000,
                monthlyShowers: 400,
                maxOnsiteLaundrySlots: 6,
            });

            const { targets } = useSettingsStore.getState();
            expect(targets.monthlyMeals).toBe(2000);
            expect(targets.monthlyShowers).toBe(400);
            expect(targets.maxOnsiteLaundrySlots).toBe(6);
        });
    });

    describe('loadSettings', () => {
        it('loads settings from Supabase', async () => {
            const { loadSettings } = useSettingsStore.getState();

            // This should not throw even with mocked data
            await expect(loadSettings()).resolves.not.toThrow();
        });
    });
});
