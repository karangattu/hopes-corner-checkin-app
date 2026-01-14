import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';

interface Targets {
    monthlyMeals: number;
    yearlyMeals: number;
    monthlyShowers: number;
    yearlyShowers: number;
    monthlyLaundry: number;
    yearlyLaundry: number;
    monthlyBicycles: number;
    yearlyBicycles: number;
    monthlyHaircuts: number;
    yearlyHaircuts: number;
    monthlyHolidays: number;
    yearlyHolidays: number;
    maxOnsiteLaundrySlots: number;
}

interface SettingsState {
    targets: Targets;
    updateTargets: (newTargets: Partial<Targets>) => Promise<void>;
    loadSettings: () => Promise<void>;
}

const DEFAULT_TARGETS: Targets = {
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
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            targets: DEFAULT_TARGETS,

            updateTargets: async (newTargets) => {
                const updated = { ...get().targets, ...newTargets };
                set({ targets: updated });

                const supabase = createClient();
                const { error } = await supabase
                    .from('app_settings')
                    .upsert({ id: 'global', targets: updated });

                if (error) {
                    console.error('Failed to save settings to Supabase:', error);
                }
            },

            loadSettings: async () => {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('targets')
                    .eq('id', 'global')
                    .single();

                if (data && data.targets) {
                    set({ targets: data.targets });
                } else if (error && error.code !== 'PGRST116') {
                    console.error('Failed to load settings from Supabase:', error);
                }
            },
        }),
        {
            name: 'hopes-corner-settings',
        }
    )
);
