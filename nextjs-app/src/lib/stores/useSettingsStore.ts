import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { createClient, isSupabaseEnabled } from '@/lib/supabase/client';
import type { AppSettings, ServiceTargets, DonationType } from '@/lib/types';

// Default targets
const DEFAULT_TARGETS: ServiceTargets = {
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
};

// Default settings factory
function createDefaultSettings(): Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'> & { 
  isLoading: boolean; 
  error: string | null 
} {
  return {
    siteName: "Hope's Corner",
    maxOnsiteLaundrySlots: 5,
    enableOffsiteLaundry: true,
    uiDensity: 'comfortable',
    showCharts: true,
    defaultReportDays: 7,
    donationAutofill: true,
    defaultDonationType: 'Protein',
    targets: { ...DEFAULT_TARGETS },
    isLoading: false,
    error: null,
  };
}

// Merge settings helper - use explicit typing
function mergeSettingsState(
  current: SettingsState, 
  partial: SettingsInput
): SettingsState {
  const currentTargets = current.targets || DEFAULT_TARGETS;
  const partialTargets = partial.targets || {};
  
  return {
    ...current,
    ...(partial.siteName !== undefined && { siteName: partial.siteName }),
    ...(partial.maxOnsiteLaundrySlots !== undefined && { maxOnsiteLaundrySlots: partial.maxOnsiteLaundrySlots }),
    ...(partial.enableOffsiteLaundry !== undefined && { enableOffsiteLaundry: partial.enableOffsiteLaundry }),
    ...(partial.uiDensity !== undefined && { uiDensity: partial.uiDensity }),
    ...(partial.showCharts !== undefined && { showCharts: partial.showCharts }),
    ...(partial.defaultReportDays !== undefined && { defaultReportDays: partial.defaultReportDays }),
    ...(partial.donationAutofill !== undefined && { donationAutofill: partial.donationAutofill }),
    ...(partial.defaultDonationType !== undefined && { defaultDonationType: partial.defaultDonationType }),
    targets: {
      ...currentTargets,
      ...partialTargets,
    },
  };
}

// Database row type
interface AppSettingsRow {
  id: string;
  site_name: string;
  max_onsite_laundry_slots: number;
  enable_offsite_laundry: boolean;
  ui_density: string;
  show_charts: boolean;
  default_report_days: number;
  donation_autofill: boolean;
  default_donation_type: DonationType;
  targets: ServiceTargets;
  created_at: string;
  updated_at: string;
}

// Store state interface
interface SettingsState {
  siteName: string;
  maxOnsiteLaundrySlots: number;
  enableOffsiteLaundry: boolean;
  uiDensity: 'comfortable' | 'compact';
  showCharts: boolean;
  defaultReportDays: number;
  donationAutofill: boolean;
  defaultDonationType: DonationType;
  targets: ServiceTargets;
  isLoading: boolean;
  error: string | null;
}

// Partial settings input
interface SettingsInput {
  siteName?: string;
  maxOnsiteLaundrySlots?: number;
  enableOffsiteLaundry?: boolean;
  uiDensity?: 'comfortable' | 'compact';
  showCharts?: boolean;
  defaultReportDays?: number;
  donationAutofill?: boolean;
  defaultDonationType?: DonationType;
  targets?: Partial<ServiceTargets>;
}

// Store actions interface
interface SettingsActions {
  updateSettings: (partial: SettingsInput) => Promise<void>;
  loadFromSupabase: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...createDefaultSettings(),

        // Update settings
        updateSettings: async (partial: SettingsInput): Promise<void> => {
          if (!partial) return;

          const currentSettings = get();
          const nextSettings = mergeSettingsState(currentSettings, partial);

          // Update local state immediately
          set(nextSettings);

          // Persist to Supabase if enabled
          if (isSupabaseEnabled()) {
            try {
              const supabase = createClient();
              const payload = {
                id: 'global',
                site_name: nextSettings.siteName,
                max_onsite_laundry_slots: nextSettings.maxOnsiteLaundrySlots,
                enable_offsite_laundry: nextSettings.enableOffsiteLaundry,
                ui_density: nextSettings.uiDensity,
                show_charts: nextSettings.showCharts,
                default_report_days: nextSettings.defaultReportDays,
                donation_autofill: nextSettings.donationAutofill,
                default_donation_type: nextSettings.defaultDonationType,
                targets: nextSettings.targets || { ...DEFAULT_TARGETS },
                updated_at: new Date().toISOString(),
              };

              const { error } = await supabase
                .from('app_settings')
                .upsert(payload, { onConflict: 'id' });

              if (error) {
                console.error('Failed to persist settings to Supabase:', error);
              }
            } catch (error) {
              console.error('Failed to persist settings to Supabase:', error);
            }
          }
        },

        // Load from Supabase
        loadFromSupabase: async (): Promise<void> => {
          if (!isSupabaseEnabled()) return;

          set({ isLoading: true, error: null });

          try {
            const supabase = createClient();
            const { data, error } = await supabase
              .from('app_settings')
              .select('*')
              .eq('id', 'global')
              .maybeSingle();

            if (error) throw error;

            if (data) {
              const row = data as AppSettingsRow;
              const defaults = createDefaultSettings();
              const nextSettings = mergeSettingsState(defaults, {
                siteName: row.site_name,
                maxOnsiteLaundrySlots: row.max_onsite_laundry_slots,
                enableOffsiteLaundry: row.enable_offsite_laundry,
                uiDensity: row.ui_density as 'comfortable' | 'compact',
                showCharts: row.show_charts,
                defaultReportDays: row.default_report_days,
                donationAutofill: row.donation_autofill,
                defaultDonationType: row.default_donation_type,
                targets: row.targets,
              });

              set({ ...nextSettings, isLoading: false });
            } else {
              set({ isLoading: false });
            }
          } catch (error) {
            console.error('Failed to load settings from Supabase:', error);
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load settings',
            });
          }
        },

        // Reset to defaults
        resetToDefaults: async (): Promise<void> => {
          const defaults = createDefaultSettings();
          set(defaults);

          // Also reset in Supabase
          if (isSupabaseEnabled()) {
            try {
              const supabase = createClient();
              const { error } = await supabase
                .from('app_settings')
                .upsert({
                  id: 'global',
                  site_name: defaults.siteName,
                  max_onsite_laundry_slots: defaults.maxOnsiteLaundrySlots,
                  enable_offsite_laundry: defaults.enableOffsiteLaundry,
                  ui_density: defaults.uiDensity,
                  show_charts: defaults.showCharts,
                  default_report_days: defaults.defaultReportDays,
                  donation_autofill: defaults.donationAutofill,
                  default_donation_type: defaults.defaultDonationType,
                  targets: defaults.targets,
                });

              if (error) {
                console.warn('Failed to reset settings in Supabase:', error);
              }
            } catch (error) {
              console.warn('Failed to reset settings in Supabase:', error);
            }
          }
        },
      }),
      {
        name: 'hopes-corner-settings',
        partialize: (state) => ({
          siteName: state.siteName,
          maxOnsiteLaundrySlots: state.maxOnsiteLaundrySlots,
          enableOffsiteLaundry: state.enableOffsiteLaundry,
          uiDensity: state.uiDensity,
          showCharts: state.showCharts,
          defaultReportDays: state.defaultReportDays,
          donationAutofill: state.donationAutofill,
          defaultDonationType: state.defaultDonationType,
          targets: state.targets,
        }),
      }
    ),
    { name: 'SettingsStore' }
  )
);

// Export defaults for use elsewhere
export { DEFAULT_TARGETS, createDefaultSettings };
