'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

type ServiceType = 'shower' | 'laundry' | 'bicycle';

interface WaiverState {
    waiverVersion: number;
    guestNeedsWaiverReminder: (guestId: string, serviceType: ServiceType) => Promise<boolean>;
    dismissWaiver: (guestId: string, serviceType: ServiceType, reason?: string) => Promise<boolean>;
    hasActiveWaiver: (guestId: string, serviceType: ServiceType) => Promise<boolean>;
    incrementWaiverVersion: () => void;
}

/**
 * Waiver Store
 * 
 * Manages service waiver tracking for shower, laundry, and bicycle services.
 * - Shower and laundry share a common waiver (signing one covers both)
 * - Bicycle has a separate waiver
 * - Waivers reset on January 1st each year
 */
export const useWaiverStore = create<WaiverState>()((set, get) => ({
    waiverVersion: 0,

    /**
     * Check if a guest needs a waiver reminder for a service
     * Calls the database function `guest_needs_waiver_reminder`
     */
    guestNeedsWaiverReminder: async (guestId: string, serviceType: ServiceType): Promise<boolean> => {
        if (!guestId || !serviceType) return false;

        try {
            const supabase = createClient();
            const { data, error } = await supabase.rpc('guest_needs_waiver_reminder', {
                p_guest_id: guestId,
                p_service_type: serviceType,
            });

            if (error) {
                console.error('[WaiverStore] Error checking waiver reminder:', error);
                return false;
            }

            return data || false;
        } catch (error) {
            console.error('[WaiverStore] Exception in guestNeedsWaiverReminder:', error);
            return false;
        }
    },

    /**
     * Dismiss/acknowledge a waiver for a guest
     * Staff dismisses after confirming external waiver is signed
     * Calls the database function `dismiss_waiver`
     */
    dismissWaiver: async (guestId: string, serviceType: ServiceType, reason: string = 'signed_by_staff'): Promise<boolean> => {
        if (!guestId || !serviceType) return false;

        try {
            const supabase = createClient();
            const { error } = await supabase.rpc('dismiss_waiver', {
                p_guest_id: guestId,
                p_service_type: serviceType,
                p_dismissed_reason: reason,
            });

            if (error) {
                console.error('[WaiverStore] Error dismissing waiver:', error);
                return false;
            }

            // Increment version to trigger re-renders in components
            get().incrementWaiverVersion();
            return true;
        } catch (error) {
            console.error('[WaiverStore] Exception in dismissWaiver:', error);
            return false;
        }
    },

    /**
     * Check if a guest has an active (signed) waiver for a service this year
     * Calls the database function `has_active_waiver`
     */
    hasActiveWaiver: async (guestId: string, serviceType: ServiceType): Promise<boolean> => {
        if (!guestId || !serviceType) return false;

        try {
            const supabase = createClient();
            const { data, error } = await supabase.rpc('has_active_waiver', {
                p_guest_id: guestId,
                p_service_type: serviceType,
            });

            if (error) {
                console.error('[WaiverStore] Error checking active waiver:', error);
                return false;
            }

            return data || false;
        } catch (error) {
            console.error('[WaiverStore] Exception in hasActiveWaiver:', error);
            return false;
        }
    },

    /**
     * Increment waiver version to trigger component re-renders
     */
    incrementWaiverVersion: () => {
        set((state) => ({ waiverVersion: state.waiverVersion + 1 }));
    },
}));
