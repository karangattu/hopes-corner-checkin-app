import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWaiverStore } from '../useWaiverStore';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        rpc: vi.fn((fn, args) => {
            if (fn === 'guest_needs_waiver_reminder') {
                return Promise.resolve({ data: args.p_guest_id === 'needs-remind', error: null });
            }
            if (fn === 'has_active_waiver') {
                return Promise.resolve({ data: args.p_guest_id === 'has-waiver', error: null });
            }
            if (fn === 'dismiss_waiver') {
                return Promise.resolve({ data: true, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        }),
    }),
}));

describe('useWaiverStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with default version', () => {
        const state = useWaiverStore.getState();
        expect(state.waiverVersion).toBe(0);
    });

    it('checks if guest needs waiver reminder', async () => {
        const { guestNeedsWaiverReminder } = useWaiverStore.getState();

        const needs = await guestNeedsWaiverReminder('needs-remind', 'shower');
        expect(needs).toBe(true);

        const noNeeds = await guestNeedsWaiverReminder('safe-guest', 'shower');
        expect(noNeeds).toBe(false);
    });

    it('checks if guest has active waiver', async () => {
        const { hasActiveWaiver } = useWaiverStore.getState();

        const has = await hasActiveWaiver('has-waiver', 'bicycle');
        expect(has).toBe(true);

        const notHas = await hasActiveWaiver('no-waiver', 'bicycle');
        expect(notHas).toBe(false);
    });

    it('dismisses waiver and increments version', async () => {
        const { dismissWaiver, waiverVersion } = useWaiverStore.getState();
        const initialVersion = waiverVersion;

        const success = await dismissWaiver('g1', 'shower', 'test-reason');
        expect(success).toBe(true);
        expect(useWaiverStore.getState().waiverVersion).toBe(initialVersion + 1);
    });

    it('increments waiver version manually', () => {
        const { incrementWaiverVersion, waiverVersion } = useWaiverStore.getState();
        const initialVersion = waiverVersion;
        incrementWaiverVersion();
        expect(useWaiverStore.getState().waiverVersion).toBe(initialVersion + 1);
    });
});
