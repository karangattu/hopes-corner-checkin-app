import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import { createPersistConfig } from './middleware/persistentStorage';
import {
  DEFAULT_TARGETS,
  createDefaultSettings,
  mergeSettings,
} from '../context/utils/settings';

export const useSettingsStore = create(
  devtools(
    persist(
      (set, get) => ({
        // State
        ...createDefaultSettings(),

        // Actions
        updateSettings: async (partial) => {
          if (!partial) return;

          const currentSettings = get();
          const nextSettings = mergeSettings(currentSettings, partial);

          // Update local state
          set(nextSettings);

          // Persist to Supabase if enabled
          if (isSupabaseEnabled() && supabase) {
            try {
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

        // Load settings from Supabase
        loadFromSupabase: async () => {
          if (!isSupabaseEnabled() || !supabase) return;

          try {
            const { data, error } = await supabase
              .from('app_settings')
              .select('*')
              .eq('id', 'global')
              .maybeSingle();

            if (error) throw error;

            if (data) {
              const nextSettings = mergeSettings(createDefaultSettings(), {
                siteName: data.site_name,
                maxOnsiteLaundrySlots: data.max_onsite_laundry_slots,
                enableOffsiteLaundry: data.enable_offsite_laundry,
                uiDensity: data.ui_density,
                showCharts: data.show_charts,
                defaultReportDays: data.default_report_days,
                donationAutofill: data.donation_autofill,
                defaultDonationType: data.default_donation_type,
                targets: data.targets,
              });

              set(nextSettings);
            }
          } catch (error) {
            console.error('Failed to load settings from Supabase:', error);
          }
        },

        resetToDefaults: async () => {
          const defaults = createDefaultSettings();
          set(defaults);

          // Also reset in Supabase
          if (isSupabaseEnabled() && supabase) {
            try {
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
      createPersistConfig('hopes-corner-settings')
    ),
    { name: 'SettingsStore' }
  )
);
