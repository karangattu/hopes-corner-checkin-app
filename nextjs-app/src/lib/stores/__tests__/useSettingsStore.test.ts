import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore, DEFAULT_TARGETS } from '../useSettingsStore';
import { act } from 'react';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            upsert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
            })),
        })),
    })),
    isSupabaseEnabled: vi.fn(() => true),
}));

describe('useSettingsStore', () => {
    beforeEach(() => {
        act(() => {
            useSettingsStore.getState().resetToDefaults();
        });
        vi.clearAllMocks();
    });

    it('should have initial default values', () => {
        const state = useSettingsStore.getState();
        expect(state.siteName).toBe("Hope's Corner");
        expect(state.maxOnsiteLaundrySlots).toBe(5);
        expect(state.uiDensity).toBe('comfortable');
        expect(state.targets).toEqual(DEFAULT_TARGETS);
    });

    it('should update settings', async () => {
        const { updateSettings } = useSettingsStore.getState();

        await act(async () => {
            await updateSettings({
                siteName: 'New Name',
                maxOnsiteLaundrySlots: 10,
                uiDensity: 'compact'
            });
        });

        const state = useSettingsStore.getState();
        expect(state.siteName).toBe('New Name');
        expect(state.maxOnsiteLaundrySlots).toBe(10);
        expect(state.uiDensity).toBe('compact');
    });

    it('should update targets partially', async () => {
        const { updateSettings } = useSettingsStore.getState();

        await act(async () => {
            await updateSettings({
                targets: { monthlyMeals: 2000 }
            });
        });

        const state = useSettingsStore.getState();
        expect(state.targets.monthlyMeals).toBe(2000);
        expect(state.targets.yearlyMeals).toBe(DEFAULT_TARGETS.yearlyMeals); // Should remain default
    });

    it('should reset to defaults', async () => {
        const { updateSettings, resetToDefaults } = useSettingsStore.getState();

        await act(async () => {
            await updateSettings({ siteName: 'Modified Name' });
        });

        expect(useSettingsStore.getState().siteName).toBe('Modified Name');

        await act(async () => {
            await resetToDefaults();
        });

        expect(useSettingsStore.getState().siteName).toBe("Hope's Corner");
    });
});
