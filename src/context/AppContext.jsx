import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  supabase,
  isSupabaseEnabled,
  checkIfSupabaseConfigured,
} from "../supabaseClient";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";
import {
  getBicycleServiceCount,
  isBicycleStatusCountable,
} from "../utils/bicycles";
import toast from "react-hot-toast";
import enhancedToast from "../utils/toast";
import {
  HOUSING_STATUSES,
  AGE_GROUPS,
  GENDERS,
  LAUNDRY_STATUS,
  DONATION_TYPES,
  BICYCLE_REPAIR_STATUS,
} from "./constants";

import AppContext from "./internalContext";
import { createShowerMutations } from "./utils/showerMutations";
import { createLaundryMutations } from "./utils/laundryMutations";
import {
  toTitleCase,
  normalizePreferredName,
  normalizeBicycleDescription,
  normalizeHousingStatus,
  combineDateAndTimeISO,
  createLocalId,
  extractLaundrySlotStart,
  computeIsGuestBanned,
  normalizeDateInputToISO,
  resolveDonationDateParts,
  ensureDonationRecordShape,
} from "./utils/normalizers";
import {
  DEFAULT_TARGETS,
  createDefaultSettings,
  mergeSettings,
} from "./utils/settings";
import {
  mapGuestRow as mapGuestRowPure,
  mapMealRow as mapMealRowPure,
  mapShowerRow as mapShowerRowPure,
  mapLaundryRow as mapLaundryRowPure,
  mapBicycleRow as mapBicycleRowPure,
  mapHolidayRow as mapHolidayRowPure,
  mapHaircutRow as mapHaircutRowPure,
  mapItemRow as mapItemRowPure,
  mapDonationRow as mapDonationRowPure,
} from "./utils/mappers";

const GUEST_IMPORT_CHUNK_SIZE = 100;

export const AppProvider = ({ children }) => {
  const [guests, setGuests] = useState([]);
  const [settings, setSettings] = useState(() => createDefaultSettings());

  const [mealRecords, setMealRecords] = useState([]);
  const [rvMealRecords, setRvMealRecords] = useState([]);
  const [shelterMealRecords, setShelterMealRecords] = useState([]);
  const [unitedEffortMealRecords, setUnitedEffortMealRecords] = useState([]);
  const [extraMealRecords, setExtraMealRecords] = useState([]);
  const [dayWorkerMealRecords, setDayWorkerMealRecords] = useState([]);
  const [lunchBagRecords, setLunchBagRecords] = useState([]);
  const [showerRecords, setShowerRecords] = useState([]);
  const [laundryRecords, setLaundryRecords] = useState([]);
  const [bicycleRecords, setBicycleRecords] = useState([]);
  const [holidayRecords, setHolidayRecords] = useState([]);
  const [haircutRecords, setHaircutRecords] = useState([]);
  const [itemGivenRecords, setItemGivenRecords] = useState([]);
  const [donationRecords, setDonationRecords] = useState([]);

  const [showerSlots, setShowerSlots] = useState([]);
  const [laundrySlots, setLaundrySlots] = useState([]);

  const [activeTab, setActiveTab] = useState("check-in");
  const [showerPickerGuest, setShowerPickerGuest] = useState(null);
  const [laundryPickerGuest, setLaundryPickerGuest] = useState(null);
  const [bicyclePickerGuest, setBicyclePickerGuest] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);

  const pushAction = useCallback((action) => {
    if (!action) return;
    setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
  }, []);

  const migrateGuestData = (guestList) => {
    return guestList.map((guest) => {
      const bannedUntil = guest?.bannedUntil ?? guest?.banned_until ?? null;
      const bannedAt = guest?.bannedAt ?? guest?.banned_at ?? null;
      const banReason = guest?.banReason ?? guest?.ban_reason ?? "";
      const withBanMetadata = {
        ...guest,
        bannedUntil,
        bannedAt,
        banReason,
        isBanned: computeIsGuestBanned(bannedUntil),
      };

      const baseGuest = withBanMetadata;

      if (baseGuest.firstName && baseGuest.lastName) {
        return {
          ...baseGuest,
          firstName: toTitleCase(baseGuest.firstName),
          lastName: toTitleCase(baseGuest.lastName),
          name: toTitleCase(
            baseGuest.name || `${baseGuest.firstName} ${baseGuest.lastName}`,
          ),
          preferredName: normalizePreferredName(baseGuest.preferredName),
          bicycleDescription: normalizeBicycleDescription(
            baseGuest.bicycleDescription,
          ),
        };
      }

      const nameParts = (baseGuest.name || "").trim().split(/\s+/);
      const firstName = toTitleCase(nameParts[0] || "");
      const lastName = toTitleCase(nameParts.slice(1).join(" ") || "");

      return {
        ...baseGuest,
        firstName,
        lastName,
        name: toTitleCase(baseGuest.name || ""),
        preferredName: normalizePreferredName(baseGuest.preferredName),
        bicycleDescription: normalizeBicycleDescription(
          baseGuest.bicycleDescription,
        ),
      };
    });
  };

  const supabaseEnabled = isSupabaseEnabled();
  const supabaseConfigured = checkIfSupabaseConfigured();

  const banDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    [],
  );

  const mapGuestRow = useCallback(mapGuestRowPure, []);

  const mapMealRow = useCallback(mapMealRowPure, []);

  const mapShowerRow = useCallback(mapShowerRowPure, []);

  const mapLaundryRow = useCallback(mapLaundryRowPure, []);

  const mapBicycleRow = useCallback(mapBicycleRowPure, []);

  const mapHolidayRow = useCallback(mapHolidayRowPure, []);

  const mapHaircutRow = useCallback(mapHaircutRowPure, []);

  const mapItemRow = useCallback(mapItemRowPure, []);

  const mapDonationRow = useCallback(mapDonationRowPure, []);

  const ensureGuestServiceEligible = useCallback(
    (guestId, serviceLabel = "this service") => {
      if (!guestId) return;
      const guest = guests.find((candidate) => candidate.id === guestId);
      if (!guest) return;

      const bannedUntilRaw = guest.bannedUntil;
      if (!bannedUntilRaw) return;

      const bannedUntil = new Date(bannedUntilRaw);
      if (Number.isNaN(bannedUntil.getTime())) return;

      if (bannedUntil.getTime() <= Date.now()) {
        return;
      }

      const formatted = banDateFormatter.format(bannedUntil);
      const reasonSuffix = guest.banReason
        ? ` Reason: ${guest.banReason}`
        : "";
      const nameLabel = guest.name || guest.preferredName || "Guest";
      throw new Error(
        `${nameLabel} is banned from ${serviceLabel} until ${formatted}.${reasonSuffix ? ` ${reasonSuffix}` : ""}`,
      );
    },
    [guests, banDateFormatter],
  );

  const getDonationDateKey = useCallback((record) => {
    if (!record) return null;
    if (record.dateKey) return record.dateKey;
    const primary =
      record.date ?? record.createdAt ?? record.created_at ?? null;
    const { dateKey } = resolveDonationDateParts(primary);
    return dateKey;
  }, []);

  const insertMealAttendance = async (payload) => {
    if (!supabaseEnabled || !supabase) return null;
    if (payload?.guest_id) {
      ensureGuestServiceEligible(payload.guest_id, "meal service");
    }
    const { data, error } = await supabase
      .from("meal_attendance")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data ? mapMealRow(data) : null;
  };

  /**
   * Batch insert meal attendance records
   * Supabase has a limit of ~1000 rows per insert, so we chunk the data
   * @param {Array} payloads - Array of meal attendance payloads
   * @returns {Promise<Array>} - Array of inserted records
   */
  const insertMealAttendanceBatch = async (payloads) => {
    if (!supabaseEnabled || !supabase) return [];
    if (!payloads || payloads.length === 0) return [];

    const BATCH_SIZE = 500; // Conservative batch size to avoid Supabase limits
    const results = [];

    // Process in chunks
    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const chunk = payloads.slice(i, i + BATCH_SIZE);

      chunk.forEach((row) => {
        if (row?.guest_id) {
          ensureGuestServiceEligible(row.guest_id, "meal service");
        }
      });

      const { data, error } = await supabase
        .from("meal_attendance")
        .insert(chunk)
        .select();

      if (error) {
        console.error(
          `Batch insert error (chunk ${i / BATCH_SIZE + 1}):`,
          error,
        );
        throw error;
      }

      if (data) {
        results.push(...data.map(mapMealRow));
      }
    }

    return results;
  };

  /**
   * Batch insert shower reservations
   * @param {Array} payloads - Array of shower reservation payloads
   * @returns {Promise<Array>} - Array of inserted records
   */
  const insertShowerReservationsBatch = async (payloads) => {
    if (!supabaseEnabled || !supabase) return [];
    if (!payloads || payloads.length === 0) return [];

    const BATCH_SIZE = 500;
    const results = [];

    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const chunk = payloads.slice(i, i + BATCH_SIZE);

      chunk.forEach((row) => {
        if (row?.guest_id) {
          ensureGuestServiceEligible(row.guest_id, "shower bookings");
        }
      });

      const { data, error } = await supabase
        .from("shower_reservations")
        .insert(chunk)
        .select();

      if (error) {
        console.error(
          `Batch insert error (chunk ${i / BATCH_SIZE + 1}):`,
          error,
        );
        throw error;
      }

      if (data) {
        results.push(...data.map(mapShowerRow));
      }
    }

    return results;
  };

  /**
   * Batch insert laundry bookings
   * @param {Array} payloads - Array of laundry booking payloads
   * @returns {Promise<Array>} - Array of inserted records
   */
  const insertLaundryBookingsBatch = async (payloads) => {
    if (!supabaseEnabled || !supabase) return [];
    if (!payloads || payloads.length === 0) return [];

    const BATCH_SIZE = 500;
    const results = [];

    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const chunk = payloads.slice(i, i + BATCH_SIZE);

      chunk.forEach((row) => {
        if (row?.guest_id) {
          ensureGuestServiceEligible(row.guest_id, "laundry bookings");
        }
      });

      const { data, error } = await supabase
        .from("laundry_bookings")
        .insert(chunk)
        .select();

      if (error) {
        console.error(
          `Batch insert error (chunk ${i / BATCH_SIZE + 1}):`,
          error,
        );
        throw error;
      }

      if (data) {
        results.push(...data.map(mapLaundryRow));
      }
    }

    return results;
  };

  /**
   * Batch insert bicycle repairs
   * @param {Array} payloads - Array of bicycle repair payloads
   * @returns {Promise<Array>} - Array of inserted records
   */
  const insertBicycleRepairsBatch = async (payloads) => {
    if (!supabaseEnabled || !supabase) return [];
    if (!payloads || payloads.length === 0) return [];

    const BATCH_SIZE = 500;
    const results = [];

    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const chunk = payloads.slice(i, i + BATCH_SIZE);

      chunk.forEach((row) => {
        if (row?.guest_id) {
          ensureGuestServiceEligible(row.guest_id, "bicycle repairs");
        }
      });

      const { data, error } = await supabase
        .from("bicycle_repairs")
        .insert(chunk)
        .select();

      if (error) {
        console.error(
          `Batch insert error (chunk ${i / BATCH_SIZE + 1}):`,
          error,
        );
        throw error;
      }

      if (data) {
        results.push(...data.map(mapBicycleRow));
      }
    }

    return results;
  };

  /**
   * Batch insert haircut visits
   * @param {Array} payloads - Array of haircut visit payloads
   * @returns {Promise<Array>} - Array of inserted records
   */
  const insertHaircutVisitsBatch = async (payloads) => {
    if (!supabaseEnabled || !supabase) return [];
    if (!payloads || payloads.length === 0) return [];

    const BATCH_SIZE = 500;
    const results = [];

    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const chunk = payloads.slice(i, i + BATCH_SIZE);

      chunk.forEach((row) => {
        if (row?.guest_id) {
          ensureGuestServiceEligible(row.guest_id, "haircut services");
        }
      });

      const { data, error } = await supabase
        .from("haircut_visits")
        .insert(chunk)
        .select();

      if (error) {
        console.error(
          `Batch insert error (chunk ${i / BATCH_SIZE + 1}):`,
          error,
        );
        throw error;
      }

      if (data) {
        results.push(...data.map(mapHaircutRow));
      }
    }

    return results;
  };

  /**
   * Batch insert holiday visits
   * @param {Array} payloads - Array of holiday visit payloads
   * @returns {Promise<Array>} - Array of inserted records
   */
  const insertHolidayVisitsBatch = async (payloads) => {
    if (!supabaseEnabled || !supabase) return [];
    if (!payloads || payloads.length === 0) return [];

    const BATCH_SIZE = 500;
    const results = [];

    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const chunk = payloads.slice(i, i + BATCH_SIZE);

      chunk.forEach((row) => {
        if (row?.guest_id) {
          ensureGuestServiceEligible(row.guest_id, "holiday services");
        }
      });

      const { data, error } = await supabase
        .from("holiday_visits")
        .insert(chunk)
        .select();

      if (error) {
        console.error(
          `Batch insert error (chunk ${i / BATCH_SIZE + 1}):`,
          error,
        );
        throw error;
      }

      if (data) {
        results.push(...data.map(mapHolidayRow));
      }
    }

    return results;
  };

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;

    let cancelled = false;

    const fetchCloudData = async () => {
      try {
        const [
          guestsRes,
          mealsRes,
          showersRes,
          laundryRes,
          bicyclesRes,
          holidaysRes,
          haircutsRes,
          itemsRes,
          donationsRes,
          settingsRes,
        ] = await Promise.all([
          supabase
            .from("guests")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("meal_attendance")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("shower_reservations")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("laundry_bookings")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("bicycle_repairs")
            .select("*")
            .order("requested_at", { ascending: false }),
          supabase
            .from("holiday_visits")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("haircut_visits")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("items_distributed")
            .select("*")
            .order("distributed_at", { ascending: false }),
          supabase
            .from("donations")
            .select("*")
            .order("donated_at", { ascending: false }),
          supabase
            .from("app_settings")
            .select("*")
            .eq("id", "global")
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const guestRows = guestsRes.data?.map(mapGuestRow) || [];
        const migratedGuests = migrateGuestData(guestRows);
        setGuests(
          migratedGuests.map((g) => ({
            ...g,
            housingStatus: normalizeHousingStatus(g.housingStatus),
          })),
        );

        const allMealRows = mealsRes.data?.map(mapMealRow) || [];
        setMealRecords(allMealRows.filter((r) => r.type === "guest"));
        setRvMealRecords(allMealRows.filter((r) => r.type === "rv"));
        setShelterMealRecords(allMealRows.filter((r) => r.type === "shelter"));
        setUnitedEffortMealRecords(
          allMealRows.filter((r) => r.type === "united_effort"),
        );
        setExtraMealRecords(allMealRows.filter((r) => r.type === "extra"));
        setDayWorkerMealRecords(
          allMealRows.filter((r) => r.type === "day_worker"),
        );
        setLunchBagRecords(allMealRows.filter((r) => r.type === "lunch_bag"));

        setShowerRecords(showersRes.data?.map(mapShowerRow) || []);
        setLaundryRecords(laundryRes.data?.map(mapLaundryRow) || []);
        setBicycleRecords(bicyclesRes.data?.map(mapBicycleRow) || []);
        setHolidayRecords(holidaysRes.data?.map(mapHolidayRow) || []);
        setHaircutRecords(haircutsRes.data?.map(mapHaircutRow) || []);
        setItemGivenRecords(itemsRes.data?.map(mapItemRow) || []);
        setDonationRecords(donationsRes.data?.map(mapDonationRow) || []);

        const settingsRow = settingsRes?.data;
        if (settingsRow) {
          const nextSettings = mergeSettings(createDefaultSettings(), {
            siteName: settingsRow.site_name,
            maxOnsiteLaundrySlots: settingsRow.max_onsite_laundry_slots,
            enableOffsiteLaundry: settingsRow.enable_offsite_laundry,
            uiDensity: settingsRow.ui_density,
            showCharts: settingsRow.show_charts,
            defaultReportDays: settingsRow.default_report_days,
            donationAutofill: settingsRow.donation_autofill,
            defaultDonationType: settingsRow.default_donation_type,
            targets: settingsRow.targets,
          });
          setSettings(nextSettings);
        }
      } catch (error) {
        console.error("Failed to load Supabase data:", error);
      }
    };

    fetchCloudData();

    return () => {
      cancelled = true;
    };
  }, [
    supabaseEnabled,
    mapGuestRow,
    mapMealRow,
    mapShowerRow,
    mapLaundryRow,
    mapBicycleRow,
    mapHolidayRow,
    mapHaircutRow,
    mapItemRow,
    mapDonationRow,
  ]);

  // Fallback to localStorage only if Supabase is disabled or fails
  useEffect(() => {
    if (supabaseEnabled) return; // Skip localStorage if cloud sync is enabled

    try {
      const savedGuests = localStorage.getItem("hopes-corner-guests");
      const savedMealRecords = localStorage.getItem(
        "hopes-corner-meal-records",
      );
      const savedRvMealRecords = localStorage.getItem(
        "hopes-corner-rv-meal-records",
      );
      const savedUnitedEffortMealRecords = localStorage.getItem(
        "hopes-corner-united-effort-meal-records",
      );
      const savedExtraMealRecords = localStorage.getItem(
        "hopes-corner-extra-meal-records",
      );
      const savedDayWorkerMealRecords = localStorage.getItem(
        "hopes-corner-day-worker-meal-records",
      );
      const savedShowerRecords = localStorage.getItem(
        "hopes-corner-shower-records",
      );
      const savedLaundryRecords = localStorage.getItem(
        "hopes-corner-laundry-records",
      );
      const savedBicycleRecords = localStorage.getItem(
        "hopes-corner-bicycle-records",
      );
      const savedHolidayRecords = localStorage.getItem(
        "hopes-corner-holiday-records",
      );
      const savedHaircutRecords = localStorage.getItem(
        "hopes-corner-haircut-records",
      );
      const savedItemRecords = localStorage.getItem(
        "hopes-corner-item-records",
      );
      const savedSettings = localStorage.getItem("hopes-corner-settings");
      const savedDonations = localStorage.getItem(
        "hopes-corner-donation-records",
      );
      const savedLunchBags = localStorage.getItem(
        "hopes-corner-lunch-bag-records",
      );

      if (savedGuests) {
        const parsedGuests = JSON.parse(savedGuests);
        const migratedGuests = migrateGuestData(parsedGuests);
        const normalizedGuests = (migratedGuests || []).map((g) => ({
          ...g,
          housingStatus: normalizeHousingStatus(g.housingStatus),
        }));
        setGuests(normalizedGuests);
      }
      if (savedMealRecords) setMealRecords(JSON.parse(savedMealRecords));
      if (savedRvMealRecords) setRvMealRecords(JSON.parse(savedRvMealRecords));
      if (savedUnitedEffortMealRecords)
        setUnitedEffortMealRecords(JSON.parse(savedUnitedEffortMealRecords));
      if (savedExtraMealRecords)
        setExtraMealRecords(JSON.parse(savedExtraMealRecords));
      if (savedDayWorkerMealRecords)
        setDayWorkerMealRecords(JSON.parse(savedDayWorkerMealRecords));
      if (savedShowerRecords) setShowerRecords(JSON.parse(savedShowerRecords));
      if (savedLaundryRecords)
        setLaundryRecords(JSON.parse(savedLaundryRecords));
      if (savedBicycleRecords)
        setBicycleRecords(JSON.parse(savedBicycleRecords));
      if (savedHolidayRecords)
        setHolidayRecords(JSON.parse(savedHolidayRecords));
      if (savedHaircutRecords)
        setHaircutRecords(JSON.parse(savedHaircutRecords));
      if (savedItemRecords) setItemGivenRecords(JSON.parse(savedItemRecords));
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings((prev) => mergeSettings(prev, parsedSettings));
      }
      if (savedDonations)
        setDonationRecords(
          JSON.parse(savedDonations).map(ensureDonationRecordShape),
        );
      if (savedLunchBags) setLunchBagRecords(JSON.parse(savedLunchBags));
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
    }
  }, [supabaseEnabled]);

  // Cache to localStorage only when Supabase is disabled - cloud sync handles persistence
  useEffect(() => {
    if (supabaseEnabled) return; // Skip localStorage caching when using cloud sync

    try {
      localStorage.setItem("hopes-corner-guests", JSON.stringify(guests));
      localStorage.setItem(
        "hopes-corner-meal-records",
        JSON.stringify(mealRecords),
      );
      localStorage.setItem(
        "hopes-corner-rv-meal-records",
        JSON.stringify(rvMealRecords),
      );
      localStorage.setItem(
        "hopes-corner-united-effort-meal-records",
        JSON.stringify(unitedEffortMealRecords),
      );
      localStorage.setItem(
        "hopes-corner-extra-meal-records",
        JSON.stringify(extraMealRecords),
      );
      localStorage.setItem(
        "hopes-corner-day-worker-meal-records",
        JSON.stringify(dayWorkerMealRecords),
      );
      localStorage.setItem(
        "hopes-corner-shower-records",
        JSON.stringify(showerRecords),
      );
      localStorage.setItem(
        "hopes-corner-laundry-records",
        JSON.stringify(laundryRecords),
      );
      localStorage.setItem(
        "hopes-corner-bicycle-records",
        JSON.stringify(bicycleRecords),
      );
      localStorage.setItem(
        "hopes-corner-holiday-records",
        JSON.stringify(holidayRecords),
      );
      localStorage.setItem(
        "hopes-corner-haircut-records",
        JSON.stringify(haircutRecords),
      );
      localStorage.setItem(
        "hopes-corner-item-records",
        JSON.stringify(itemGivenRecords),
      );
      localStorage.setItem(
        "hopes-corner-donation-records",
        JSON.stringify(donationRecords),
      );
      localStorage.setItem("hopes-corner-settings", JSON.stringify(settings));
      localStorage.setItem(
        "hopes-corner-lunch-bag-records",
        JSON.stringify(lunchBagRecords),
      );
    } catch (error) {
      console.error("Error saving data to localStorage:", error);
    }
  }, [
    guests,
    mealRecords,
    rvMealRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    holidayRecords,
    haircutRecords,
    itemGivenRecords,
    donationRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    settings,
    supabaseEnabled,
  ]);

  const persistSettingsToSupabase = useCallback(
    async (nextSettings) => {
      if (!supabaseEnabled || !supabase) return;

      try {
        const payload = {
          id: "global",
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
          .from("app_settings")
          .upsert(payload, { onConflict: "id" });

        if (error) {
          console.error("Failed to persist settings to Supabase:", error);
        }
      } catch (error) {
        console.error("Failed to persist settings to Supabase:", error);
      }
    },
    [supabaseEnabled],
  );

  const updateSettings = useCallback(
    (partial) => {
      if (!partial) return;

      setSettings((prev) => {
        const next = mergeSettings(prev, partial);
        persistSettingsToSupabase(next);
        return next;
      });
    },
    [persistSettingsToSupabase],
  );

  const generateShowerSlots = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.

    // Monday and Wednesday (day 1 or day 3) or any day that's not Saturday
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek !== 6) {
      const start = 7.5 * 60; // 07:30 AM
      const end = 12.5 * 60; // 12:30 PM
      const slots = [];
      for (let t = start; t < end; t += 30) {
        // 30 minute slots
        const hours = Math.floor(t / 60);
        const minutes = t % 60;
        slots.push(`${hours}:${minutes.toString().padStart(2, "0")}`);
      }
      return slots;
    }
    // Saturday (day 6)
    else {
      const start = 8.5 * 60; // 08:30 AM
      const end = 13.5 * 60; // 01:30 PM
      const slots = [];
      for (let t = start; t < end; t += 30) {
        // 30 minute slots
        const hours = Math.floor(t / 60);
        const minutes = t % 60;
        slots.push(`${hours}:${minutes.toString().padStart(2, "0")}`);
      }
      return slots;
    }
  };

  const generateLaundrySlots = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.

    // Saturday (day 6)
    if (dayOfWeek === 6) {
      return [
        "08:30 - 10:00",
        "09:00 - 10:30",
        "09:30 - 11:00",
        "10:00 - 11:30",
        "10:30 - 12:00",
      ];
    }
    // Monday, Wednesday, and all other days
    else {
      return [
        "07:30 - 08:30",
        "08:00 - 09:00",
        "08:30 - 09:45",
        "09:00 - 10:15",
        "09:30 - 11:45",
      ];
    }
  };

  const allShowerSlots = generateShowerSlots();
  const allLaundrySlots = generateLaundrySlots();

  const generateGuestId = () => {
    return (
      "G" +
      Date.now().toString(36).toUpperCase() +
      Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")
    );
  };

  const generateUniqueGuestId = (preferredId, takenSet) => {
    let id =
      preferredId && !takenSet.has(preferredId)
        ? preferredId
        : generateGuestId();
    while (takenSet.has(id)) {
      id = generateGuestId();
    }
    takenSet.add(id);
    return id;
  };

  const addGuest = async (guest) => {
    let firstName = "";
    let lastName = "";

    if (guest.firstName && guest.lastName) {
      firstName = toTitleCase(guest.firstName.trim());
      lastName = toTitleCase(guest.lastName.trim());
    } else if (guest.name) {
      const nameParts = guest.name.trim().split(/\s+/);
      firstName = toTitleCase(nameParts[0] || "");
      lastName = toTitleCase(nameParts.slice(1).join(" ") || "");
    }

    const requiredFields = ["location", "age", "gender"];
    for (const field of requiredFields) {
      if (
        !guest[field] ||
        (typeof guest[field] === "string" && !guest[field].trim())
      ) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const normalizedHousing = normalizeHousingStatus(guest.housingStatus);
    if (!HOUSING_STATUSES.includes(normalizedHousing)) {
      throw new Error("Invalid housing status");
    }
    guest.housingStatus = normalizedHousing;
    if (!AGE_GROUPS.includes(guest.age)) {
      throw new Error("Invalid age category");
    }
    if (!GENDERS.includes(guest.gender)) {
      throw new Error("Invalid gender");
    }

    const preferredName = normalizePreferredName(guest.preferredName);
    const bicycleDescription = normalizeBicycleDescription(
      guest.bicycleDescription,
    );
    const legalName = `${firstName} ${lastName}`.trim();

    const takenIds = new Set(guests.map((g) => g.guestId));
    const finalGuestId = generateUniqueGuestId(guest.guestId, takenIds);

    if (supabaseEnabled && supabase) {
      const payload = {
        external_id: finalGuestId,
        first_name: firstName,
        last_name: lastName,
        full_name: legalName,
        preferred_name: preferredName,
        housing_status: normalizedHousing,
        age_group: guest.age,
        gender: guest.gender,
        location: guest.location,
        notes: guest.notes || "",
        bicycle_description: bicycleDescription,
      };

      const { data, error } = await supabase
        .from("guests")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Failed to add guest to Supabase:", error);
        throw new Error("Unable to save guest. Please try again.");
      }

      const mapped = mapGuestRow(data);
      setGuests((prev) => [...prev, mapped]);
      return mapped;
    }

    const fallbackGuest = {
      id: `local-${Date.now()}`,
      guestId: finalGuestId,
      ...guest,
      firstName,
      lastName,
      name: legalName,
      preferredName,
      bicycleDescription,
      createdAt: new Date().toISOString(),
    };

    setGuests((prev) => [...prev, fallbackGuest]);
    return fallbackGuest;
  };

  const importGuestsFromCSV = async (csvData) => {
    if (!csvData || csvData.length === 0) {
      throw new Error("No valid CSV data provided");
    }

    const normalizeKey = (k) => k.toLowerCase().replace(/\s+/g, "_");

    const takenIds = new Set(guests.map((g) => g.guestId));
    const baseTimestamp = Date.now();
    const newGuests = csvData.map((rawRow, rowIndex) => {
      const row = Object.keys(rawRow).reduce((acc, key) => {
        acc[normalizeKey(key)] = rawRow[key];
        return acc;
      }, {});

      const csvRowNumber = rowIndex + 2;
      const guestIdFromCSV = (row.guest_id || "").trim();
      const recordIdentifier = guestIdFromCSV
        ? `Guest ID: ${guestIdFromCSV}, Row: ${csvRowNumber}`
        : `Row: ${csvRowNumber}`;

      let firstName = toTitleCase((row.first_name || "").trim());
      let lastName = toTitleCase((row.last_name || "").trim());
      let fullName = (row.full_name || "").trim();

      if (!fullName) {
        fullName = `${firstName} ${lastName}`.trim();
      } else if (!firstName || !lastName) {
        const parts = fullName.split(/\s+/);
        firstName = firstName || toTitleCase(parts[0] || "");
        lastName = lastName || toTitleCase(parts.slice(1).join(" ") || "");
      }

      if (!firstName) {
        throw new Error(
          `Missing first name (${recordIdentifier}). Data: ${JSON.stringify(
            rawRow,
          )}`,
        );
      }

      if (!lastName) {
        lastName = firstName.charAt(0).toUpperCase();
      }

      fullName = `${firstName} ${lastName}`.trim();

      const housingStatusRaw = (row.housing_status || "").trim();
      const housingStatus = normalizeHousingStatus(housingStatusRaw);
      const age = (row.age || "").trim();
      const genderRaw = (row.gender || "").trim();
      const gender = genderRaw ? genderRaw : "Unknown";
      const location =
        (row.city || row.location || "").trim() || "Mountain View";

      if (!AGE_GROUPS.includes(age)) {
        throw new Error(
          `Invalid or missing Age value '${age}' (${recordIdentifier}). Valid values: ${AGE_GROUPS.join(", ")}`,
        );
      }

      if (!GENDERS.includes(gender)) {
        throw new Error(
          `Invalid Gender value '${gender}' (${recordIdentifier}). Allowed: ${GENDERS.join(", ")}`,
        );
      }

      const guestId = generateUniqueGuestId(guestIdFromCSV || null, takenIds);

      return {
        id: baseTimestamp + rowIndex * 1000 + Math.floor(Math.random() * 100),
        guestId,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        housingStatus,
        age,
        gender,
        location,
        preferredName: normalizePreferredName(
          row.preferred_name || row.preferredName,
        ),
        notes: (row.notes || "").trim(),
        bicycleDescription: normalizeBicycleDescription(
          row.bicycle_description || row.bicycleDescription,
        ),
        createdAt: new Date().toISOString(),
      };
    });

    if (supabaseEnabled && supabase) {
      const payload = newGuests.map((g) => ({
        external_id: g.guestId,
        first_name: g.firstName,
        last_name: g.lastName,
        full_name: g.name,
        preferred_name: g.preferredName,
        housing_status: g.housingStatus,
        age_group: g.age,
        gender: g.gender,
        location: g.location,
        notes: g.notes || "",
        bicycle_description: g.bicycleDescription,
      }));

      const insertedRecords = [];
      let encounteredError = null;

      for (
        let start = 0;
        start < payload.length;
        start += GUEST_IMPORT_CHUNK_SIZE
      ) {
        const chunk = payload.slice(start, start + GUEST_IMPORT_CHUNK_SIZE);
        try {
          const { data, error } = await supabase
            .from("guests")
            .insert(chunk)
            .select();

          if (error) {
            encounteredError = error;
            break;
          }

          if (data) {
            const mapped = data.map(mapGuestRow);
            insertedRecords.push(...mapped);
          }
        } catch (error) {
          encounteredError = error;
          break;
        }
      }

      if (insertedRecords.length > 0) {
        setGuests((prev) => [...prev, ...insertedRecords]);
      }

      const failedCount = newGuests.length - insertedRecords.length;
      const partialFailure = failedCount > 0;
      let errorMessage = null;

      if (encounteredError) {
        console.error(
          "Failed to bulk import guests to Supabase:",
          encounteredError,
        );
        errorMessage =
          failedCount === newGuests.length
            ? "Unable to sync guest import with Supabase. No records were saved."
            : `Unable to sync ${failedCount} guest${failedCount === 1 ? "" : "s"} with Supabase. ${insertedRecords.length} imported before the error.`;
      }

      return {
        importedGuests: insertedRecords,
        failedCount,
        partialFailure,
        error: errorMessage,
      };
    }

    setGuests((prev) => [...prev, ...newGuests]);

    return {
      importedGuests: newGuests,
      failedCount: 0,
      partialFailure: false,
      error: null,
    };
  };

  const isSameDay = (iso1, iso2) => iso1.split("T")[0] === iso2.split("T")[0];
  const addBicycleRecord = async (
    guestId,
    {
      repairType = "Flat Tire",
      repairTypes = null,
      notes = "",
      dateOverride = null,
      statusOverride = null,
      completedAtOverride = null,
    } = {},
  ) => {
    const now = dateOverride || new Date().toISOString();
    const status =
      statusOverride && Object.values(BICYCLE_REPAIR_STATUS).includes(statusOverride)
        ? statusOverride
        : BICYCLE_REPAIR_STATUS.PENDING;
    const completedAt =
      completedAtOverride ||
      (status === BICYCLE_REPAIR_STATUS.DONE ? now : null);
    const priority = (bicycleRecords[0]?.priority || 0) + 1;

    // Support both old single repairType and new multiple repairTypes
    const typesToInsert = repairTypes || [repairType];
    const displayTypes = typesToInsert.join(", ");

    ensureGuestServiceEligible(guestId, "bicycle repairs");

    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("bicycle_repairs")
          .insert({
            guest_id: guestId,
            repair_types: typesToInsert,
            notes,
            status,
            priority,
            requested_at: now,
            completed_at: completedAt,
          })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapBicycleRow(data);
        setBicycleRecords((prev) => [mapped, ...prev]);
        setActionHistory((prev) => [
          {
            id: Date.now() + Math.random(),
            type: "BICYCLE_LOGGED",
            timestamp: now,
            data: { recordId: mapped.id, guestId },
            description: `Logged bicycle repair (${displayTypes})`,
          },
          ...prev.slice(0, 49),
        ]);
        enhancedToast.success(
          `Bicycle repair logged (${typesToInsert.length} service${typesToInsert.length > 1 ? "s" : ""})`,
        );
        return mapped;
      } catch (error) {
        console.error("Failed to log bicycle repair:", error);
        enhancedToast.error("Unable to log bicycle repair.");
        throw error;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      guestId,
      date: now,
      type: "bicycle",
      repairTypes: typesToInsert,
      completedRepairs:
        status === BICYCLE_REPAIR_STATUS.DONE ? [...typesToInsert] : [],
      notes,
      status,
      priority,
      doneAt: completedAt,
    };
    setBicycleRecords((prev) => [record, ...prev]);
    setActionHistory((prev) => [
      {
        id: Date.now() + Math.random(),
        type: "BICYCLE_LOGGED",
        timestamp: now,
        data: { recordId: record.id, guestId },
        description: `Logged bicycle repair (${displayTypes})`,
      },
      ...prev.slice(0, 49),
    ]);
    toast.success(
      `Bicycle repair logged (${typesToInsert.length} service${typesToInsert.length > 1 ? "s" : ""})`,
    );
    return record;
  };

  const updateBicycleRecord = async (recordId, updates) => {
    const mergedUpdates = { ...updates };
    if (!mergedUpdates.lastUpdated)
      mergedUpdates.lastUpdated = new Date().toISOString();
    const originalRecord = bicycleRecords.find((r) => r.id === recordId);
    const previousRecord = originalRecord ? { ...originalRecord } : null;
    setBicycleRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, ...mergedUpdates } : r)),
    );
    if (supabaseEnabled && supabase && !String(recordId).startsWith("local-")) {
      try {
        const payload = {};
        if (mergedUpdates.repairType !== undefined)
          payload.repair_type = mergedUpdates.repairType;
        if (mergedUpdates.repairTypes !== undefined)
          payload.repair_types = mergedUpdates.repairTypes;
        if (mergedUpdates.completedRepairs !== undefined)
          payload.completed_repairs = mergedUpdates.completedRepairs;
        if (mergedUpdates.notes !== undefined)
          payload.notes = mergedUpdates.notes;
        if (mergedUpdates.status !== undefined)
          payload.status = mergedUpdates.status;
        if (mergedUpdates.priority !== undefined)
          payload.priority = mergedUpdates.priority;
        if (mergedUpdates.doneAt !== undefined)
          payload.completed_at = mergedUpdates.doneAt;
        if (mergedUpdates.lastUpdated !== undefined)
          payload.updated_at = mergedUpdates.lastUpdated;
        if (Object.keys(payload).length === 0) return;
        const { data, error } = await supabase
          .from("bicycle_repairs")
          .update(payload)
          .eq("id", recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapBicycleRow(data);
          setBicycleRecords((prev) =>
            prev.map((r) => (r.id === recordId ? mapped : r)),
          );
        }
      } catch (error) {
        console.error("Failed to update bicycle record:", error);
        if (previousRecord) {
          setBicycleRecords((prev) =>
            prev.map((r) => (r.id === recordId ? previousRecord : r)),
          );
        }
        enhancedToast.error(
          "Unable to update bicycle record. Changes were reverted.",
        );
        return false;
      }
    }
    return true;
  };

  const deleteBicycleRecord = async (recordId) => {
    setBicycleRecords((prev) => prev.filter((r) => r.id !== recordId));
    if (supabaseEnabled && supabase && !String(recordId).startsWith("local-")) {
      try {
        const { error } = await supabase
          .from("bicycle_repairs")
          .delete()
          .eq("id", recordId);
        if (error) throw error;
      } catch (error) {
        console.error("Failed to delete bicycle record:", error);
        toast.error("Unable to delete bicycle record.");
        return false;
      }
    }
    return true;
  };

  const setBicycleStatus = (recordId, status) => {
    if (!Object.values(BICYCLE_REPAIR_STATUS).includes(status)) return;
    updateBicycleRecord(recordId, {
      status,
      doneAt:
        status === BICYCLE_REPAIR_STATUS.DONE
          ? new Date().toISOString()
          : undefined,
    });
  };

  const moveBicycleRecord = (recordId, direction) => {
    setBicycleRecords((prev) => {
      const list = [...prev];
      const idx = list.findIndex((r) => r.id === recordId);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= list.length) return prev;
      [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
      // Recalculate priorities (descending)
      const total = list.length;
      list.forEach((r, i) => (r.priority = total - i));
      return list;
    });
  };
  const addHolidayRecord = async (guestId, dateOverride = null) => {
    const now = dateOverride || new Date().toISOString();
    const already = holidayRecords.some(
      (r) => r.guestId === guestId && isSameDay(r.date, now),
    );
    if (already) {
      toast.error("Holiday already logged today");
      return null;
    }
    ensureGuestServiceEligible(guestId, "holiday services");
    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("holiday_visits")
          .insert({ guest_id: guestId, served_at: now })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapHolidayRow(data);
        setHolidayRecords((prev) => [mapped, ...prev]);
        setActionHistory((prev) => [
          {
            id: Date.now() + Math.random(),
            type: "HOLIDAY_LOGGED",
            timestamp: now,
            data: { recordId: mapped.id, guestId },
            description: "Logged holiday service",
          },
          ...prev.slice(0, 49),
        ]);
        toast.success("Holiday logged");
        return mapped;
      } catch (error) {
        console.error("Failed to log holiday in Supabase:", error);
        toast.error("Unable to log holiday.");
        throw error;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      guestId,
      date: now,
      type: "holiday",
    };
    setHolidayRecords((prev) => [record, ...prev]);
    setActionHistory((prev) => [
      {
        id: Date.now() + Math.random(),
        type: "HOLIDAY_LOGGED",
        timestamp: now,
        data: { recordId: record.id, guestId },
        description: "Logged holiday service",
      },
      ...prev.slice(0, 49),
    ]);
    toast.success("Holiday logged");
    return record;
  };
  const addHaircutRecord = async (guestId, dateOverride = null) => {
    const now = dateOverride || new Date().toISOString();
    const already = haircutRecords.some(
      (r) => r.guestId === guestId && isSameDay(r.date, now),
    );
    if (already) {
      toast.error("Haircut already logged today");
      return null;
    }
    ensureGuestServiceEligible(guestId, "haircut services");
    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("haircut_visits")
          .insert({ guest_id: guestId, served_at: now })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapHaircutRow(data);
        setHaircutRecords((prev) => [mapped, ...prev]);
        setActionHistory((prev) => [
          {
            id: Date.now() + Math.random(),
            type: "HAIRCUT_LOGGED",
            timestamp: now,
            data: { recordId: mapped.id, guestId },
            description: "Logged haircut service",
          },
          ...prev.slice(0, 49),
        ]);
        toast.success("Haircut logged");
        return mapped;
      } catch (error) {
        console.error("Failed to log haircut in Supabase:", error);
        toast.error("Unable to log haircut.");
        throw error;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      guestId,
      date: now,
      type: "haircut",
    };
    setHaircutRecords((prev) => [record, ...prev]);
    setActionHistory((prev) => [
      {
        id: Date.now() + Math.random(),
        type: "HAIRCUT_LOGGED",
        timestamp: now,
        data: { recordId: record.id, guestId },
        description: "Logged haircut service",
      },
      ...prev.slice(0, 49),
    ]);
    toast.success("Haircut logged");
    return record;
  };

  const getLastGivenItem = (guestId, item) => {
    const recs = itemGivenRecords.filter(
      (r) => r.guestId === guestId && r.item === item,
    );
    if (recs.length === 0) return null;
    return recs.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b));
  };
  const getNextAvailabilityDate = (item, lastDateISO) => {
    if (!lastDateISO) return null;
    const last = new Date(lastDateISO);
    last.setHours(0, 0, 0, 0);
    if (item === "tshirt") {
      const day = last.getDay();
      let daysUntilNextMon = (8 - day) % 7;
      if (daysUntilNextMon === 0) daysUntilNextMon = 7;
      const next = new Date(last);
      next.setDate(last.getDate() + daysUntilNextMon);
      return next;
    }
    if (
      item === "sleeping_bag" ||
      item === "backpack" ||
      item === "tent" ||
      item === "flipflops" ||
      item === "flip_flops"
    ) {
      const next = new Date(last);
      next.setDate(next.getDate() + 30);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    return null;
  };
  const canGiveItem = (guestId, item) => {
    const last = getLastGivenItem(guestId, item);
    if (!last) return true;
    const next = getNextAvailabilityDate(item, last.date);
    if (!next) return true;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now >= next;
  };

  const getDaysUntilAvailable = (guestId, item) => {
    const last = getLastGivenItem(guestId, item);
    if (!last) return 0;
    const next = getNextAvailabilityDate(item, last.date);
    if (!next) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffMs = next.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };
  const giveItem = async (guestId, item) => {
    if (!canGiveItem(guestId, item)) {
      throw new Error("Limit reached for this item based on last given date.");
    }
    const now = new Date().toISOString();

    if (supabaseEnabled && supabase) {
      const { data, error } = await supabase
        .from("items_distributed")
        .insert({ guest_id: guestId, item_key: item, distributed_at: now })
        .select()
        .single();

      if (error) {
        console.error("Failed to record distributed item in Supabase:", error);
        throw new Error("Unable to log item distribution.");
      }

      const record = mapItemRow(data);
      setItemGivenRecords((prev) => [record, ...prev]);
      setActionHistory((prev) => [
        {
          id: Date.now() + Math.random(),
          type: "ITEM_GIVEN",
          timestamp: now,
          data: { recordId: record.id, guestId, item },
          description: `Gave ${item.replace("_", " ")}`,
        },
        ...prev.slice(0, 49),
      ]);
      return record;
    }

    const fallbackRecord = {
      id: `local-${Date.now()}`,
      guestId,
      item,
      date: now,
    };
    setItemGivenRecords((prev) => [fallbackRecord, ...prev]);
    setActionHistory((prev) => [
      {
        id: Date.now() + Math.random(),
        type: "ITEM_GIVEN",
        timestamp: now,
        data: { recordId: fallbackRecord.id, guestId, item },
        description: `Gave ${item.replace("_", " ")}`,
      },
      ...prev.slice(0, 49),
    ]);
    return fallbackRecord;
  };

  const updateGuest = async (id, updates) => {
    const normalizedUpdates = {
      ...updates,
      bicycleDescription:
        updates?.bicycleDescription !== undefined
          ? normalizeBicycleDescription(updates.bicycleDescription)
          : undefined,
    };
    if (normalizedUpdates.bicycleDescription === undefined) {
      delete normalizedUpdates.bicycleDescription;
    }
    const target = guests.find((g) => g.id === id);
    const originalGuest = target ? { ...target } : null;
    setGuests((prev) =>
      prev.map((guest) =>
        guest.id === id ? { ...guest, ...normalizedUpdates } : guest,
      ),
    );

    if (supabaseEnabled && supabase && target) {
      const payload = {};
      if (normalizedUpdates.firstName !== undefined)
        payload.first_name = toTitleCase(normalizedUpdates.firstName);
      if (normalizedUpdates.lastName !== undefined)
        payload.last_name = toTitleCase(normalizedUpdates.lastName);
      if (normalizedUpdates.name !== undefined)
        payload.full_name = toTitleCase(normalizedUpdates.name);
      if (normalizedUpdates.preferredName !== undefined)
        payload.preferred_name = normalizePreferredName(
          normalizedUpdates.preferredName,
        );
      if (normalizedUpdates.housingStatus !== undefined)
        payload.housing_status = normalizeHousingStatus(
          normalizedUpdates.housingStatus,
        );
      if (normalizedUpdates.age !== undefined)
        payload.age_group = normalizedUpdates.age;
      if (normalizedUpdates.gender !== undefined)
        payload.gender = normalizedUpdates.gender;
      if (normalizedUpdates.location !== undefined)
        payload.location = normalizedUpdates.location;
      if (normalizedUpdates.notes !== undefined)
        payload.notes = normalizedUpdates.notes;
      if (normalizedUpdates.bicycleDescription !== undefined)
        payload.bicycle_description = normalizedUpdates.bicycleDescription;
      if (normalizedUpdates.guestId !== undefined)
        payload.external_id = normalizedUpdates.guestId;

      if (Object.keys(payload).length === 0) return true;

      try {
        const { data, error } = await supabase
          .from("guests")
          .update(payload)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const mapped = mapGuestRow(data);
          setGuests((prev) =>
            prev.map((guest) => (guest.id === id ? mapped : guest)),
          );
        }
      } catch (error) {
        console.error("Failed to update guest in Supabase:", error);
        if (originalGuest) {
          setGuests((prev) =>
            prev.map((guest) => (guest.id === id ? originalGuest : guest)),
          );
        }
        enhancedToast.error("Unable to update guest. Changes were reverted.");
        return false;
      }
    }

    return true;
  };

  const banGuest = async (
    guestId,
    { bannedUntil, banReason = "", bannedAt: bannedAtOverride } = {},
  ) => {
    if (!guestId) throw new Error("Guest ID is required.");

    const target = guests.find((guest) => guest.id === guestId);
    if (!target) throw new Error("Guest not found.");

    const normalizedUntil = normalizeDateInputToISO(bannedUntil);
    if (!normalizedUntil) throw new Error("Ban end time is required.");

    const untilDate = new Date(normalizedUntil);
    if (Number.isNaN(untilDate.getTime()))
      throw new Error("Ban end time is invalid.");
    if (untilDate.getTime() <= Date.now())
      throw new Error("Ban end time must be in the future.");

    const normalizedBannedAt = bannedAtOverride
      ? normalizeDateInputToISO(bannedAtOverride)
      : target.bannedAt || new Date().toISOString();

    const sanitizedReason = banReason.trim();

    const originalGuest = { ...target };

    const applyLocal = (guest) => ({
      ...guest,
      banReason: sanitizedReason,
      bannedUntil: normalizedUntil,
      bannedAt: normalizedBannedAt,
      isBanned: true,
    });

    setGuests((prev) =>
      prev.map((guest) => (guest.id === guestId ? applyLocal(guest) : guest)),
    );

    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("guests")
          .update({
            ban_reason: sanitizedReason || null,
            banned_until: normalizedUntil,
            banned_at: normalizedBannedAt,
          })
          .eq("id", guestId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const mapped = mapGuestRow(data);
          setGuests((prev) =>
            prev.map((guest) => (guest.id === guestId ? mapped : guest)),
          );
        }
      } catch (error) {
        console.error("Failed to update guest ban in Supabase:", error);
        setGuests((prev) =>
          prev.map((guest) => (guest.id === guestId ? originalGuest : guest)),
        );
        throw new Error("Unable to update ban status. Please try again.");
      }
    }

    return true;
  };

  const clearGuestBan = async (guestId) => {
    if (!guestId) throw new Error("Guest ID is required.");

    const target = guests.find((guest) => guest.id === guestId);
    if (!target) throw new Error("Guest not found.");

    const originalGuest = { ...target };

    const clearedGuest = {
      ...target,
      banReason: "",
      bannedUntil: null,
      bannedAt: null,
      isBanned: false,
    };

    setGuests((prev) =>
      prev.map((guest) => (guest.id === guestId ? clearedGuest : guest)),
    );

    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("guests")
          .update({
            ban_reason: null,
            banned_until: null,
            banned_at: null,
          })
          .eq("id", guestId)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const mapped = mapGuestRow(data);
          setGuests((prev) =>
            prev.map((guest) => (guest.id === guestId ? mapped : guest)),
          );
        }
      } catch (error) {
        console.error("Failed to clear guest ban in Supabase:", error);
        setGuests((prev) =>
          prev.map((guest) => (guest.id === guestId ? originalGuest : guest)),
        );
        throw new Error("Unable to clear ban. Please try again.");
      }
    }

    return true;
  };

  const removeGuest = async (id) => {
    const target = guests.find((g) => g.id === id);
    setGuests(guests.filter((guest) => guest.id !== id));
    if (supabaseEnabled && supabase && target) {
      const { error } = await supabase.from("guests").delete().eq("id", id);

      if (error) {
        console.error("Failed to delete guest from Supabase:", error);
      }
    }
  };

  const addMealRecord = async (guestId, count, dateOverride = null) => {
    const timestamp = dateOverride || new Date().toISOString();
    const today = pacificDateStringFrom(timestamp);
    const already = mealRecords.some(
      (r) => r.guestId === guestId && pacificDateStringFrom(r.date) === today,
    );
    if (already) return null;

    if (guestId) {
      ensureGuestServiceEligible(guestId, "meal service");
    }

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: "guest",
          guest_id: guestId,
          quantity: count,
          served_on: timestamp.slice(0, 10),
          recorded_at: timestamp,
        });

        if (!inserted) {
          throw new Error("Failed to insert meal attendance");
        }

        setMealRecords((prev) => [...prev, inserted]);

        const action = {
          id: Date.now() + Math.random(),
          type: "MEAL_ADDED",
          timestamp,
          data: { recordId: inserted.id, guestId, count },
          description: `Added ${count} meal${count > 1 ? "s" : ""} for guest`,
        };
        setActionHistory((prev) => [action, ...prev.slice(0, 49)]);

        return inserted;
      } catch (error) {
        console.error("Failed to add meal record in Supabase:", error);
        toast.error("Unable to save meal record.");
        return null;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      guestId,
      count,
      date: timestamp,
      recordedAt: timestamp,
      servedOn: timestamp.slice(0, 10),
      createdAt: timestamp,
      type: "guest",
    };

    setMealRecords((prev) => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: "MEAL_ADDED",
      timestamp,
      data: { recordId: record.id, guestId, count },
      description: `Added ${count} meal${count > 1 ? "s" : ""} for guest`,
    };
    setActionHistory((prev) => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const addRvMealRecord = async (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => {
      // If already an ISO string, return as-is
      if (typeof dateStr === "string" && dateStr.includes("T")) {
        return dateStr;
      }
      // Otherwise assume YYYY-MM-DD format
      return new Date(`${dateStr}T12:00:00`).toISOString();
    };
    const iso = dateOverride
      ? makeISOForDate(dateOverride)
      : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (quantity <= 0) throw new Error("Invalid meal count");

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: "rv",
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error("Insert returned no data");
        setRvMealRecords((prev) => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: "RV_MEALS_ADDED",
          timestamp: iso,
          data: { recordId: inserted.id, count: quantity },
          description: `Added ${quantity} RV meals`,
        };
        setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error("Failed to log RV meals in Supabase:", error);
        toast.error("Unable to record RV meals.");
        return null;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      count: quantity,
      date: iso,
      recordedAt: iso,
      servedOn: iso.slice(0, 10),
      type: "rv",
    };
    setRvMealRecords((prev) => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: "RV_MEALS_ADDED",
      timestamp: iso,
      data: { recordId: record.id, count: quantity },
      description: `Added ${quantity} RV meals`,
    };
    setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addShelterMealRecord = async (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => {
      // If already an ISO string, return as-is
      if (typeof dateStr === "string" && dateStr.includes("T")) {
        return dateStr;
      }
      // Otherwise assume YYYY-MM-DD format
      return new Date(`${dateStr}T12:00:00`).toISOString();
    };
    const iso = dateOverride
      ? makeISOForDate(dateOverride)
      : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (quantity <= 0) throw new Error("Invalid meal count");

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: "shelter",
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error("Insert returned no data");
        setShelterMealRecords((prev) => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: "SHELTER_MEALS_ADDED",
          timestamp: iso,
          data: { recordId: inserted.id, count: quantity },
          description: `Added ${quantity} Shelter meals`,
        };
        setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error("Failed to log Shelter meals in Supabase:", error);
        toast.error("Unable to record Shelter meals.");
        return null;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      count: quantity,
      date: iso,
      recordedAt: iso,
      servedOn: iso.slice(0, 10),
      type: "shelter",
    };
    setShelterMealRecords((prev) => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: "SHELTER_MEALS_ADDED",
      timestamp: iso,
      data: { recordId: record.id, count: quantity },
      description: `Added ${quantity} Shelter meals`,
    };
    setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addUnitedEffortMealRecord = async (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => {
      // If already an ISO string, return as-is
      if (typeof dateStr === "string" && dateStr.includes("T")) {
        return dateStr;
      }
      // Otherwise assume YYYY-MM-DD format
      return new Date(`${dateStr}T12:00:00`).toISOString();
    };
    const iso = dateOverride
      ? makeISOForDate(dateOverride)
      : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (quantity <= 0) throw new Error("Invalid meal count");

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: "united_effort",
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error("Insert returned no data");
        setUnitedEffortMealRecords((prev) => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: "UNITED_EFFORT_MEALS_ADDED",
          timestamp: iso,
          data: { recordId: inserted.id, count: quantity },
          description: `Added ${quantity} United Effort meals`,
        };
        setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error("Failed to log United Effort meals:", error);
        toast.error("Unable to record United Effort meals.");
        return null;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      count: quantity,
      date: iso,
      recordedAt: iso,
      servedOn: iso.slice(0, 10),
      type: "united_effort",
    };
    setUnitedEffortMealRecords((prev) => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: "UNITED_EFFORT_MEALS_ADDED",
      timestamp: iso,
      data: { recordId: record.id, count: quantity },
      description: `Added ${quantity} United Effort meals`,
    };
    setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addExtraMealRecord = async (guestId, count, dateOverride = null) => {
    if (
      typeof count === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(count) &&
      dateOverride == null
    ) {
      dateOverride = count;
      count = guestId;
      guestId = null;
    }
    const makeISOForDate = (dateStr) => {
      // If already an ISO string, return as-is
      if (typeof dateStr === "string" && dateStr.includes("T")) {
        return dateStr;
      }
      // Otherwise assume YYYY-MM-DD format
      return new Date(`${dateStr}T12:00:00`).toISOString();
    };
    const iso = dateOverride
      ? makeISOForDate(dateOverride)
      : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (quantity <= 0) throw new Error("Invalid extra meal count");

    if (guestId) {
      ensureGuestServiceEligible(guestId, "meal service");
    }

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: "extra",
          guest_id: guestId,
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error("Insert returned no data");
        setExtraMealRecords((prev) => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: "EXTRA_MEALS_ADDED",
          timestamp: iso,
          data: { recordId: inserted.id, guestId, count: quantity },
          description: `Added ${quantity} extra meal${quantity > 1 ? "s" : ""}${guestId ? " for guest" : ""}`,
        };
        setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error("Failed to log extra meals:", error);
        toast.error("Unable to record extra meals.");
        return null;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      guestId,
      count: quantity,
      date: iso,
      recordedAt: iso,
      servedOn: iso.slice(0, 10),
      type: "extra",
    };
    setExtraMealRecords((prev) => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: "EXTRA_MEALS_ADDED",
      timestamp: iso,
      data: { recordId: record.id, guestId, count: quantity },
      description: `Added ${quantity} extra meal${quantity > 1 ? "s" : ""}${guestId ? " for guest" : ""}`,
    };
    setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addDayWorkerMealRecord = async (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => {
      // If already an ISO string, return as-is
      if (typeof dateStr === "string" && dateStr.includes("T")) {
        return dateStr;
      }
      // Otherwise assume YYYY-MM-DD format
      return new Date(`${dateStr}T12:00:00`).toISOString();
    };
    const iso = dateOverride
      ? makeISOForDate(dateOverride)
      : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (quantity <= 0) throw new Error("Invalid meal count");

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: "day_worker",
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error("Insert returned no data");
        setDayWorkerMealRecords((prev) => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: "DAY_WORKER_MEALS_ADDED",
          timestamp: iso,
          data: { recordId: inserted.id, count: quantity },
          description: `Added ${quantity} day worker meals`,
        };
        setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error("Failed to log day worker meals:", error);
        toast.error("Unable to record day worker meals.");
        return null;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      count: quantity,
      date: iso,
      recordedAt: iso,
      servedOn: iso.slice(0, 10),
      type: "day_worker",
    };
    setDayWorkerMealRecords((prev) => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: "DAY_WORKER_MEALS_ADDED",
      timestamp: iso,
      data: { recordId: record.id, count: quantity },
      description: `Added ${quantity} day worker meals`,
    };
    setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addLunchBagRecord = async (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => {
      // If already an ISO string, return as-is
      if (typeof dateStr === "string" && dateStr.includes("T")) {
        return dateStr;
      }
      // Otherwise assume YYYY-MM-DD format
      const d = new Date(`${dateStr}T12:00:00`);
      return d.toISOString();
    };
    const iso = dateOverride
      ? makeISOForDate(dateOverride)
      : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (!quantity || quantity <= 0) throw new Error("Invalid lunch bag count");

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: "lunch_bag",
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error("Insert returned no data");
        setLunchBagRecords((prev) => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: "LUNCH_BAGS_ADDED",
          timestamp: iso,
          data: { recordId: inserted.id, count: quantity, date: dateOverride },
          description: `Added ${quantity} lunch bag${quantity > 1 ? "s" : ""}${dateOverride ? ` on ${dateOverride}` : ""}`,
        };
        setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error("Failed to log lunch bags:", error);
        toast.error("Unable to record lunch bags.");
        return null;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      count: quantity,
      date: iso,
      recordedAt: iso,
      servedOn: iso.slice(0, 10),
      type: "lunch_bag",
    };
    setLunchBagRecords((prev) => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: "LUNCH_BAGS_ADDED",
      timestamp: iso,
      data: { recordId: record.id, count: record.count, date: dateOverride },
      description: `Added ${record.count} lunch bag${record.count > 1 ? "s" : ""}${dateOverride ? ` on ${dateOverride}` : ""}`,
    };
    setActionHistory((prev) => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const {
    addShowerRecord,
    addShowerWaitlist,
    cancelShowerRecord,
    rescheduleShower,
    updateShowerStatus,
    importShowerAttendanceRecord,
  } = useMemo(
    () =>
      createShowerMutations({
        supabaseEnabled,
        supabaseClient: supabase,
        mapShowerRow,
        ensureGuestServiceEligible,
        showerRecords,
        setShowerRecords,
        showerSlots,
        setShowerSlots,
        pacificDateStringFrom,
        todayPacificDateString,
        combineDateAndTimeISO,
        createLocalId,
        pushAction,
        toast,
        enhancedToast,
        normalizeDateInputToISO,
      }),
    [
      supabaseEnabled,
      mapShowerRow,
      ensureGuestServiceEligible,
      showerRecords,
      showerSlots,
      pushAction,
    ],
  );

  const {
    addLaundryRecord,
    cancelLaundryRecord,
    rescheduleLaundry,
    updateLaundryStatus,
    updateLaundryBagNumber,
    importLaundryAttendanceRecord,
  } = useMemo(
    () =>
      createLaundryMutations({
        supabaseEnabled,
        supabaseClient: supabase,
        mapLaundryRow,
        laundryRecords,
        setLaundryRecords,
        laundrySlots,
        setLaundrySlots,
        settings,
        LAUNDRY_STATUS,
        extractLaundrySlotStart,
        pacificDateStringFrom,
        todayPacificDateString,
        combineDateAndTimeISO,
        ensureGuestServiceEligible,
        createLocalId,
        pushAction,
        toast,
        enhancedToast,
        normalizeDateInputToISO,
      }),
    [
      supabaseEnabled,
      mapLaundryRow,
      laundryRecords,
      laundrySlots,
      settings,
      ensureGuestServiceEligible,
      pushAction,
    ],
  );

  const getTodayMetrics = () => {
    const today = todayPacificDateString();

    const todayMeals = mealRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );
    const todayRvMeals = rvMealRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );
    const todayUeMeals = unitedEffortMealRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );
    const todayExtraMeals = extraMealRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );
    const todayDayWorkerMeals = dayWorkerMealRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );

    const todayShowers = showerRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );
    const todayDoneShowers = todayShowers.filter((r) => r.status === "done");

    const todayLaundry = laundryRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );
    const countsAsLaundryLoad = (rec) => {
      if (rec.laundryType === "onsite") {
        return (
          rec.status === LAUNDRY_STATUS.DONE ||
          rec.status === LAUNDRY_STATUS.PICKED_UP
        );
      }
      return true;
    };

    const todayHaircuts = haircutRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );
    const todayHolidays = holidayRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );
    const todayBicycles = bicycleRecords.filter(
      (r) =>
        pacificDateStringFrom(r.date) === today &&
        isBicycleStatusCountable(r.status),
    );
    const todayBicycleCount = todayBicycles.reduce(
      (sum, record) => sum + getBicycleServiceCount(record),
      0,
    );

    return {
      mealsServed:
        todayMeals.reduce((sum, record) => sum + record.count, 0) +
        todayRvMeals.reduce((s, r) => s + (r.count || 0), 0) +
        todayUeMeals.reduce((s, r) => s + (r.count || 0), 0) +
        todayExtraMeals.reduce((s, r) => s + (r.count || 0), 0) +
        todayDayWorkerMeals.reduce((s, r) => s + (r.count || 0), 0),
      showersBooked: todayDoneShowers.length,
      laundryLoads: todayLaundry.reduce(
        (sum, r) => sum + (countsAsLaundryLoad(r) ? 1 : 0),
        0,
      ),
      haircuts: todayHaircuts.length,
      holidays: todayHolidays.length,
      bicycles: todayBicycleCount,
    };
  };

  const getDateRangeMetrics = (startDate, endDate) => {
    const inRange = (iso) => {
      const d = pacificDateStringFrom(iso);
      return d >= startDate && d <= endDate;
    };

    const periodMeals = mealRecords.filter((r) => inRange(r.date));
    const periodRvMeals = rvMealRecords.filter((r) => inRange(r.date));
    const periodShelterMeals = shelterMealRecords.filter((r) =>
      inRange(r.date),
    );
    const periodUeMeals = unitedEffortMealRecords.filter((r) =>
      inRange(r.date),
    );
    const periodExtraMeals = extraMealRecords.filter((r) => inRange(r.date));
    const periodDayWorkerMeals = dayWorkerMealRecords.filter((r) =>
      inRange(r.date),
    );
    const periodLunchBags = lunchBagRecords.filter((r) => inRange(r.date));
    const periodShowers = showerRecords.filter((r) => inRange(r.date));
    const periodLaundry = laundryRecords.filter((r) => inRange(r.date));
    const periodHaircuts = haircutRecords.filter((r) => inRange(r.date));
    const periodHolidays = holidayRecords.filter((r) => inRange(r.date));
    const periodBicycles = bicycleRecords.filter(
      (r) =>
        inRange(r.date) &&
        isBicycleStatusCountable(r.status),
    );

    const dailyMetrics = {};

    const countsAsLaundryLoad = (rec) => {
      if (rec.laundryType === "onsite") {
        return (
          rec.status === LAUNDRY_STATUS.DONE ||
          rec.status === LAUNDRY_STATUS.PICKED_UP
        );
      }
      return true;
    };

    const initDailyMetric = () => ({
      meals: 0,
      mealsByType: {
        guest: 0,
        rv: 0,
        shelter: 0,
        unitedEffort: 0,
        extras: 0,
        dayWorker: 0,
        lunchBags: 0,
      },
      showers: 0,
      laundry: 0,
      haircuts: 0,
      holidays: 0,
      bicycles: 0,
    });

    // Process guest meals
    periodMeals.forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].meals += record.count;
      dailyMetrics[date].mealsByType.guest += record.count;
    });

    // Process RV meals
    periodRvMeals.forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].meals += record.count || 0;
      dailyMetrics[date].mealsByType.rv += record.count || 0;
    });

    // Process shelter meals
    periodShelterMeals.forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].meals += record.count || 0;
      dailyMetrics[date].mealsByType.shelter += record.count || 0;
    });

    // Process united effort meals
    periodUeMeals.forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].meals += record.count || 0;
      dailyMetrics[date].mealsByType.unitedEffort += record.count || 0;
    });

    // Process extra meals
    periodExtraMeals.forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].meals += record.count || 0;
      dailyMetrics[date].mealsByType.extras += record.count || 0;
    });

    // Process day worker meals
    periodDayWorkerMeals.forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].meals += record.count || 0;
      dailyMetrics[date].mealsByType.dayWorker += record.count || 0;
    });

    // Process lunch bags
    periodLunchBags.forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].meals += record.count || 0;
      dailyMetrics[date].mealsByType.lunchBags += record.count || 0;
    });

    // Process showers
    periodShowers.forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].showers += 1;
    });

    // Process laundry
    periodLaundry.forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      if (countsAsLaundryLoad(record)) dailyMetrics[date].laundry += 1;
    });
    // Process haircuts
    periodHaircuts.forEach((r) => {
      const date = pacificDateStringFrom(r.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].haircuts += 1;
    });

    // Process holidays
    periodHolidays.forEach((r) => {
      const date = pacificDateStringFrom(r.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].holidays += 1;
    });

    // Process bicycles (count each repair type as a separate service)
    periodBicycles.forEach((r) => {
      const date = pacificDateStringFrom(r.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
      dailyMetrics[date].bicycles += getBicycleServiceCount(r);
    });

    const dailyBreakdown = Object.entries(dailyMetrics)
      .map(([date, metrics]) => ({ date, ...metrics }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const guestMealsCount = periodMeals.reduce(
      (sum, record) => sum + record.count,
      0,
    );
    const rvMealsCount = periodRvMeals.reduce((s, r) => s + (r.count || 0), 0);
    const shelterMealsCount = periodShelterMeals.reduce(
      (s, r) => s + (r.count || 0),
      0,
    );
    const unitedEffortMealsCount = periodUeMeals.reduce(
      (s, r) => s + (r.count || 0),
      0,
    );
    const extraMealsCount = periodExtraMeals.reduce(
      (s, r) => s + (r.count || 0),
      0,
    );
    const dayWorkerMealsCount = periodDayWorkerMeals.reduce(
      (s, r) => s + (r.count || 0),
      0,
    );
    const lunchBagsCount = periodLunchBags.reduce(
      (s, r) => s + (r.count || 0),
      0,
    );

    return {
      mealsServed:
        guestMealsCount +
        rvMealsCount +
        shelterMealsCount +
        unitedEffortMealsCount +
        extraMealsCount +
        dayWorkerMealsCount +
        lunchBagsCount,
      mealsByType: {
        guest: guestMealsCount,
        rv: rvMealsCount,
        shelter: shelterMealsCount,
        unitedEffort: unitedEffortMealsCount,
        extras: extraMealsCount,
        dayWorker: dayWorkerMealsCount,
        lunchBags: lunchBagsCount,
      },
      showersBooked: periodShowers.length,
      laundryLoads: periodLaundry.reduce(
        (sum, r) => sum + (countsAsLaundryLoad(r) ? 1 : 0),
        0,
      ),
      haircuts: periodHaircuts.length,
      holidays: periodHolidays.length,
      bicycles: periodBicycles.reduce(
        (sum, r) => sum + getBicycleServiceCount(r),
        0,
      ),
      dailyBreakdown,
    };
  };

  /**
   * Universal time-range metrics with enhanced filtering options
   * Supports program selection, day-of-week filtering, and comparison mode
   *
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {Object} options - Optional filtering parameters
   * @param {Array<string>} options.programs - Array of program names to include (e.g., ['meals', 'showers', 'laundry'])
   * @param {Array<number>} options.selectedDays - Array of day-of-week numbers (0=Sunday, 6=Saturday)
   * @param {boolean} options.includeComparison - Include comparison period metrics
   * @returns {Object} Comprehensive metrics object
   */
  const getUniversalTimeRangeMetrics = (startDate, endDate, options = {}) => {
    const {
      programs = [
        "meals",
        "showers",
        "laundry",
        "bicycles",
        "haircuts",
        "holidays",
        "donations",
      ],
      selectedDays = null,
      includeComparison = false,
    } = options;

    const inRange = (iso) => {
      const d = pacificDateStringFrom(iso);
      if (d < startDate || d > endDate) return false;

      // Apply day-of-week filter if specified
      if (selectedDays && selectedDays.length > 0) {
        const date = new Date(iso);
        const dayOfWeek = date.getDay();
        return selectedDays.includes(dayOfWeek);
      }

      return true;
    };

    const countsAsLaundryLoad = (rec) => {
      if (rec.laundryType === "onsite") {
        return (
          rec.status === LAUNDRY_STATUS.DONE ||
          rec.status === LAUNDRY_STATUS.PICKED_UP
        );
      }
      return true;
    };

    const initDailyMetric = () => ({
      meals: 0,
      mealsByType: {
        guest: 0,
        rv: 0,
        shelter: 0,
        unitedEffort: 0,
        extras: 0,
        dayWorker: 0,
        lunchBags: 0,
      },
      showers: 0,
      laundry: 0,
      haircuts: 0,
      holidays: 0,
      bicycles: 0,
      donationsCount: 0,
      donationTrays: 0,
      donationWeightLbs: 0,
    });

    const dailyMetrics = {};

    // Process meals if included
    if (programs.includes("meals")) {
      const periodMeals = mealRecords.filter((r) => inRange(r.date));
      const periodRvMeals = rvMealRecords.filter((r) => inRange(r.date));
      const periodShelterMeals = shelterMealRecords.filter((r) =>
        inRange(r.date),
      );
      const periodUeMeals = unitedEffortMealRecords.filter((r) =>
        inRange(r.date),
      );
      const periodExtraMeals = extraMealRecords.filter((r) => inRange(r.date));
      const periodDayWorkerMeals = dayWorkerMealRecords.filter((r) =>
        inRange(r.date),
      );
      const periodLunchBags = lunchBagRecords.filter((r) => inRange(r.date));

      periodMeals.forEach((record) => {
        const date = pacificDateStringFrom(record.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].meals += record.count;
        dailyMetrics[date].mealsByType.guest += record.count;
      });

      periodRvMeals.forEach((record) => {
        const date = pacificDateStringFrom(record.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].meals += record.count || 0;
        dailyMetrics[date].mealsByType.rv += record.count || 0;
      });

      periodShelterMeals.forEach((record) => {
        const date = pacificDateStringFrom(record.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].meals += record.count || 0;
        dailyMetrics[date].mealsByType.shelter += record.count || 0;
      });

      periodUeMeals.forEach((record) => {
        const date = pacificDateStringFrom(record.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].meals += record.count || 0;
        dailyMetrics[date].mealsByType.unitedEffort += record.count || 0;
      });

      periodExtraMeals.forEach((record) => {
        const date = pacificDateStringFrom(record.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].meals += record.count || 0;
        dailyMetrics[date].mealsByType.extras += record.count || 0;
      });

      periodDayWorkerMeals.forEach((record) => {
        const date = pacificDateStringFrom(record.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].meals += record.count || 0;
        dailyMetrics[date].mealsByType.dayWorker += record.count || 0;
      });

      periodLunchBags.forEach((record) => {
        const date = pacificDateStringFrom(record.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].meals += record.count || 0;
        dailyMetrics[date].mealsByType.lunchBags += record.count || 0;
      });
    }

    // Process showers if included
    if (programs.includes("showers")) {
      const periodShowers = showerRecords.filter((r) => inRange(r.date));
      periodShowers.forEach((record) => {
        const date = pacificDateStringFrom(record.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].showers += 1;
      });
    }

    // Process laundry if included
    if (programs.includes("laundry")) {
      const periodLaundry = laundryRecords.filter((r) => inRange(r.date));
      periodLaundry.forEach((record) => {
        const date = pacificDateStringFrom(record.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        if (countsAsLaundryLoad(record)) dailyMetrics[date].laundry += 1;
      });
    }

    // Process haircuts if included
    if (programs.includes("haircuts")) {
      const periodHaircuts = haircutRecords.filter((r) => inRange(r.date));
      periodHaircuts.forEach((r) => {
        const date = pacificDateStringFrom(r.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].haircuts += 1;
      });
    }

    // Process holidays if included
    if (programs.includes("holidays")) {
      const periodHolidays = holidayRecords.filter((r) => inRange(r.date));
      periodHolidays.forEach((r) => {
        const date = pacificDateStringFrom(r.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].holidays += 1;
      });
    }

    // Process bicycles if included
    if (programs.includes("bicycles")) {
      const periodBicycles = bicycleRecords.filter(
        (r) =>
          inRange(r.date) &&
          isBicycleStatusCountable(r.status),
      );
      periodBicycles.forEach((r) => {
        const date = pacificDateStringFrom(r.date);
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].bicycles += getBicycleServiceCount(r);
      });
    }

    // Process donations if included
    if (programs.includes("donations")) {
      const periodDonations = donationRecords.filter((record) => {
        const isoLike = record?.date || record?.dateKey;
        if (!isoLike) return false;
        return inRange(isoLike);
      });

      periodDonations.forEach((record) => {
        const isoLike = record?.date || record?.dateKey;
        const date =
          record?.dateKey || (isoLike ? pacificDateStringFrom(isoLike) : null);
        if (!date) return;
        if (!dailyMetrics[date]) dailyMetrics[date] = initDailyMetric();
        dailyMetrics[date].donationsCount += 1;
        dailyMetrics[date].donationTrays += Number(record?.trays) || 0;
        dailyMetrics[date].donationWeightLbs += Number(record?.weightLbs) || 0;
      });
    }

    const dailyBreakdown = Object.entries(dailyMetrics)
      .map(([date, metrics]) => ({ date, ...metrics }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals
    const totals = dailyBreakdown.reduce(
      (acc, day) => ({
        meals: acc.meals + day.meals,
        mealsByType: {
          guest: acc.mealsByType.guest + day.mealsByType.guest,
          rv: acc.mealsByType.rv + day.mealsByType.rv,
          shelter: acc.mealsByType.shelter + day.mealsByType.shelter,
          unitedEffort:
            acc.mealsByType.unitedEffort + day.mealsByType.unitedEffort,
          extras: acc.mealsByType.extras + day.mealsByType.extras,
          dayWorker: acc.mealsByType.dayWorker + day.mealsByType.dayWorker,
          lunchBags: acc.mealsByType.lunchBags + day.mealsByType.lunchBags,
        },
        showers: acc.showers + day.showers,
        laundry: acc.laundry + day.laundry,
        haircuts: acc.haircuts + day.haircuts,
        holidays: acc.holidays + day.holidays,
        bicycles: acc.bicycles + day.bicycles,
        donationsCount: acc.donationsCount + (day.donationsCount || 0),
        donationTrays: acc.donationTrays + (day.donationTrays || 0),
        donationWeightLbs: acc.donationWeightLbs + (day.donationWeightLbs || 0),
      }),
      initDailyMetric(),
    );

    const result = {
      startDate,
      endDate,
      programs,
      selectedDays,
      dailyBreakdown,
      totals: {
        mealsServed: totals.meals,
        mealsByType: totals.mealsByType,
        showersBooked: totals.showers,
        laundryLoads: totals.laundry,
        haircuts: totals.haircuts,
        holidays: totals.holidays,
        bicycles: totals.bicycles,
        donationsLogged: totals.donationsCount,
        donationTrays: totals.donationTrays,
        donationWeightLbs: totals.donationWeightLbs,
      },
      daysInRange: dailyBreakdown.length,
    };

    // Add comparison period if requested
    if (includeComparison) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const compStart = new Date(start);
      compStart.setDate(start.getDate() - daysDiff);
      const compEnd = new Date(start);
      compEnd.setDate(start.getDate() - 1);

      const comparisonMetrics = getUniversalTimeRangeMetrics(
        compStart.toISOString().split("T")[0],
        compEnd.toISOString().split("T")[0],
        { programs, selectedDays, includeComparison: false },
      );

      result.comparison = comparisonMetrics;
      const changes = {
        meals: totals.meals - comparisonMetrics.totals.mealsServed,
        showers: totals.showers - comparisonMetrics.totals.showersBooked,
        laundry: totals.laundry - comparisonMetrics.totals.laundryLoads,
        haircuts: totals.haircuts - comparisonMetrics.totals.haircuts,
        holidays: totals.holidays - comparisonMetrics.totals.holidays,
        bicycles: totals.bicycles - comparisonMetrics.totals.bicycles,
      };
      if (programs.includes("donations")) {
        changes.donationWeightLbs =
          totals.donationWeightLbs -
          (comparisonMetrics.totals.donationWeightLbs || 0);
        changes.donationsLogged =
          totals.donationsCount -
          (comparisonMetrics.totals.donationsLogged || 0);
        changes.donationTrays =
          totals.donationTrays - (comparisonMetrics.totals.donationTrays || 0);
      }
      result.changes = changes;
    }

    return result;
  };

  const getTodayLaundryWithGuests = () => {
    const today = todayPacificDateString();

    const todayLaundry = laundryRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today,
    );

    return todayLaundry.map((record) => {
      const guest = guests.find((g) => g.id === record.guestId) || null;
      const legalName =
        guest?.name ||
        `${toTitleCase(guest?.firstName || "")} ${toTitleCase(guest?.lastName || "")}`.trim() ||
        "Unknown Guest";
      const preferredName = normalizePreferredName(guest?.preferredName);
      const hasPreferred =
        Boolean(preferredName) &&
        preferredName.toLowerCase() !== legalName.toLowerCase();
      const displayName = hasPreferred
        ? `${preferredName} (${legalName})`
        : legalName;
      return {
        ...record,
        guestName: displayName,
        guestLegalName: legalName,
        guestPreferredName: preferredName,
        guestHasPreferred: hasPreferred,
        guestSortKey: legalName.toLowerCase(),
      };
    });
  };

  const exportDataAsCSV = (data, filename) => {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }

    const headerSet = new Set();
    const headers = [];

    const collectHeaders = (row) => {
      Object.keys(row || {}).forEach((key) => {
        if (!headerSet.has(key)) {
          headerSet.add(key);
          headers.push(key);
        }
      });
    };

    data.forEach(collectHeaders);

    const serializeValue = (value) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value).replace(/\r?\n/g, "\n");
      const needsQuoting = /[",\n]/.test(stringValue);
      const escaped = stringValue.replace(/"/g, '""');
      return needsQuoting ? `"${escaped}"` : escaped;
    };

    const csvLines = [
      headers.map(serializeValue).join(","),
      ...data.map((row) =>
        headers.map((header) => serializeValue(row?.[header])).join(","),
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    requestAnimationFrame(() => URL.revokeObjectURL(url));

    return true;
  };

  const normalizeDonation = (str) => toTitleCase((str || "").trim());
  const isValidDonationType = (type) => DONATION_TYPES.includes(type);

  const addDonation = async ({
    type,
    itemName,
    trays = 0,
    weightLbs = 0,
    donor,
    date,
  }) => {
    const now = new Date();
    const { timestamp: resolvedTimestamp, dateKey } = resolveDonationDateParts(
      date,
      now,
    );
    const recordedAt = resolvedTimestamp ?? now.toISOString();
    const recordedDateKey =
      dateKey ??
      (recordedAt ? pacificDateStringFrom(new Date(recordedAt)) : null);
    const actionTimestamp = now.toISOString();
    const clean = {
      type: normalizeDonation(type),
      itemName: normalizeDonation(itemName),
      trays: Number(trays) || 0,
      weightLbs: Number(weightLbs) || 0,
      donor: normalizeDonation(donor),
      date: recordedAt,
      dateKey: recordedDateKey,
    };
    if (!isValidDonationType(clean.type)) {
      throw new Error(
        `Invalid donation type. Allowed: ${DONATION_TYPES.join(", ")}`,
      );
    }
    if (!clean.itemName) throw new Error("Donation item name is required");
    if (!clean.donor) throw new Error("Donation source (donor) is required");
    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from("donations")
          .insert({
            donation_type: clean.type,
            item_name: clean.itemName,
            trays: clean.trays,
            weight_lbs: clean.weightLbs,
            donor: clean.donor,
            donated_at: recordedAt,
          })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapDonationRow(data);
        setDonationRecords((prev) => [mapped, ...prev]);
        setActionHistory((prev) => [
          {
            id: Date.now() + Math.random(),
            type: "DONATION_ADDED",
            timestamp: actionTimestamp,
            data: { recordId: mapped.id },
            description: `Donation: ${clean.itemName} (${clean.type})`,
          },
          ...prev.slice(0, 49),
        ]);
        toast.success("Donation recorded");
        return mapped;
      } catch (error) {
        console.error("Failed to log donation in Supabase:", error);
        toast.error("Unable to record donation.");
        throw error;
      }
    }

    const fallback = { id: `local-${Date.now()}`, ...clean };
    setDonationRecords((prev) => [fallback, ...prev]);
    setActionHistory((prev) => [
      {
        id: Date.now() + Math.random(),
        type: "DONATION_ADDED",
        timestamp: actionTimestamp,
        data: { recordId: fallback.id },
        description: `Donation: ${clean.itemName} (${clean.type})`,
      },
      ...prev.slice(0, 49),
    ]);
    toast.success("Donation recorded");
    return fallback;
  };

  const getRecentDonations = (limit = 10) => {
    const seen = new Set();
    const out = [];
    for (const r of donationRecords) {
      const key = `${r.itemName}|${r.donor}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ itemName: r.itemName, donor: r.donor, type: r.type });
      }
      if (out.length >= limit) break;
    }
    return out;
  };

  const getTodayDonationsConsolidated = () => {
    const today = todayPacificDateString();
    const todayRecs = donationRecords.filter(
      (r) => getDonationDateKey(r) === today,
    );
    const map = new Map();
    for (const r of todayRecs) {
      const key = `${r.itemName}|${r.donor}`;
      if (!map.has(key)) {
        map.set(key, {
          itemName: r.itemName,
          donor: r.donor,
          type: r.type,
          trays: 0,
          weightLbs: 0,
          entries: 0,
        });
      }
      const entry = map.get(key);
      entry.trays += Number(r.trays) || 0;
      entry.weightLbs += Number(r.weightLbs) || 0;
      entry.entries += 1;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.itemName.localeCompare(b.itemName),
    );
  };

  const getTodayDonationsByItem = () => {
    const today = todayPacificDateString();
    const todayRecs = donationRecords.filter(
      (r) => getDonationDateKey(r) === today,
    );
    const map = new Map();
    for (const r of todayRecs) {
      const key = r.itemName;
      if (!map.has(key)) {
        map.set(key, {
          itemName: r.itemName,
          trays: 0,
          weightLbs: 0,
          entries: 0,
        });
      }
      const entry = map.get(key);
      entry.trays += Number(r.trays) || 0;
      entry.weightLbs += Number(r.weightLbs) || 0;
      entry.entries += 1;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.itemName.localeCompare(b.itemName),
    );
  };

  const deleteSupabaseRecord = async (table, recordId, errorMessage) => {
    if (!supabaseEnabled || !supabase || recordId == null) return true;
    if (typeof recordId === "string" && recordId.startsWith("local-"))
      return true;

    try {
      const { error } = await supabase.from(table).delete().eq("id", recordId);

      if (error) {
        console.error(
          `Failed to delete record ${recordId} from ${table}:`,
          error,
        );
        if (errorMessage) toast.error(errorMessage);
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        `Failed to delete record ${recordId} from ${table}:`,
        error,
      );
      if (errorMessage) toast.error(errorMessage);
      return false;
    }
  };

  const removeMealAttendanceRecord = async (recordId, mealType = "guest") => {
    if (!recordId) return false;

    const shouldDeleteRemote =
      supabaseEnabled &&
      supabase &&
      !(typeof recordId === "string" && recordId.startsWith("local-"));
    if (shouldDeleteRemote) {
      const deleted = await deleteSupabaseRecord(
        "meal_attendance",
        recordId,
        "Unable to remove meal entry.",
      );
      if (!deleted) return false;
    }

    const applyRemoval = (setter) =>
      setter((prev) => prev.filter((r) => r.id !== recordId));
    switch (mealType) {
      case "rv":
        applyRemoval(setRvMealRecords);
        break;
      case "united_effort":
        applyRemoval(setUnitedEffortMealRecords);
        break;
      case "extra":
        applyRemoval(setExtraMealRecords);
        break;
      case "day_worker":
        applyRemoval(setDayWorkerMealRecords);
        break;
      case "lunch_bag":
        applyRemoval(setLunchBagRecords);
        break;
      case "guest":
      default:
        applyRemoval(setMealRecords);
        break;
    }

    setActionHistory((prev) =>
      prev.filter((entry) => entry?.data?.recordId !== recordId),
    );
    return true;
  };

  const undoAction = async (actionId) => {
    const action = actionHistory.find((a) => a.id === actionId);
    if (!action) return false;

    try {
      switch (action.type) {
        case "MEAL_ADDED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "meal_attendance",
            recordId,
            "Unable to undo meal entry.",
          );
          if (!deleted) return false;
          setMealRecords((prev) => prev.filter((r) => r.id !== recordId));
          break;
        }

        case "RV_MEALS_ADDED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "meal_attendance",
            recordId,
            "Unable to undo RV meal entry.",
          );
          if (!deleted) return false;
          setRvMealRecords((prev) => prev.filter((r) => r.id !== recordId));
          break;
        }

        case "SHELTER_MEALS_ADDED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "meal_attendance",
            recordId,
            "Unable to undo Shelter meal entry.",
          );
          if (!deleted) return false;
          setShelterMealRecords((prev) =>
            prev.filter((r) => r.id !== recordId),
          );
          break;
        }

        case "UNITED_EFFORT_MEALS_ADDED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "meal_attendance",
            recordId,
            "Unable to undo United Effort meal entry.",
          );
          if (!deleted) return false;
          setUnitedEffortMealRecords((prev) =>
            prev.filter((r) => r.id !== recordId),
          );
          break;
        }

        case "EXTRA_MEALS_ADDED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "meal_attendance",
            recordId,
            "Unable to undo extra meal entry.",
          );
          if (!deleted) return false;
          setExtraMealRecords((prev) => prev.filter((r) => r.id !== recordId));
          break;
        }
        case "DAY_WORKER_MEALS_ADDED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "meal_attendance",
            recordId,
            "Unable to undo day worker meal entry.",
          );
          if (!deleted) return false;
          setDayWorkerMealRecords((prev) =>
            prev.filter((r) => r.id !== recordId),
          );
          break;
        }

        case "BICYCLE_LOGGED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "bicycle_repairs",
            recordId,
            "Unable to undo bicycle repair.",
          );
          if (!deleted) return false;
          setBicycleRecords((prev) => prev.filter((r) => r.id !== recordId));
          toast.success("Reverted bicycle repair");
          break;
        }

        case "HOLIDAY_LOGGED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "holiday_visits",
            recordId,
            "Unable to undo holiday entry.",
          );
          if (!deleted) return false;
          setHolidayRecords((prev) => prev.filter((r) => r.id !== recordId));
          toast.success("Reverted holiday service");
          break;
        }

        case "HAIRCUT_LOGGED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "haircut_visits",
            recordId,
            "Unable to undo haircut entry.",
          );
          if (!deleted) return false;
          setHaircutRecords((prev) => prev.filter((r) => r.id !== recordId));
          toast.success("Reverted haircut service");
          break;
        }

        case "SHOWER_BOOKED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "shower_reservations",
            recordId,
            "Unable to undo shower booking.",
          );
          if (!deleted) return false;
          setShowerRecords((prev) => prev.filter((r) => r.id !== recordId));
          setShowerSlots((prev) =>
            prev.filter(
              (s) =>
                !(
                  s.guestId === action.data.guestId &&
                  s.time === action.data.time
                ),
            ),
          );
          toast.success("Removed shower booking");
          break;
        }

        case "LAUNDRY_BOOKED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "laundry_bookings",
            recordId,
            "Unable to undo laundry booking.",
          );
          if (!deleted) return false;
          setLaundryRecords((prev) => prev.filter((r) => r.id !== recordId));
          setLaundrySlots((prev) =>
            prev.filter(
              (s) =>
                !(
                  s.guestId === action.data.guestId &&
                  s.time === action.data.time
                ),
            ),
          );
          toast.success("Removed laundry booking");
          break;
        }

        case "SHOWER_WAITLISTED": {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord(
            "shower_reservations",
            recordId,
            "Unable to undo shower waitlist entry.",
          );
          if (!deleted) return false;
          setShowerRecords((prev) => prev.filter((r) => r.id !== recordId));
          toast.success("Removed shower waitlist entry");
          break;
        }
        case "SHOWER_CANCELLED": {
          const snap = action.data?.snapshot;
          if (!snap) return false;
          let restored = snap;
          if (
            supabaseEnabled &&
            supabase &&
            snap.id &&
            !(typeof snap.id === "string" && snap.id.startsWith("local-"))
          ) {
            const payload = {
              id: snap.id,
              guest_id: snap.guestId,
              scheduled_time: snap.time ?? null,
              scheduled_for: snap.date
                ? snap.date.split("T")[0]
                : todayPacificDateString(),
              status: snap.status || "booked",
              created_at: snap.createdAt || snap.date,
              updated_at: snap.lastUpdated || new Date().toISOString(),
            };
            try {
              const { data, error } = await supabase
                .from("shower_reservations")
                .upsert(payload, { onConflict: "id" })
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                restored = mapShowerRow(data);
              }
            } catch (error) {
              console.error(
                "Failed to restore shower booking in Supabase:",
                error,
              );
              toast.error("Unable to restore shower booking.");
              return false;
            }
          }
          setShowerRecords((prev) => [...prev, restored]);
          if (restored.time) {
            setShowerSlots((prev) => [
              ...prev,
              { guestId: restored.guestId, time: restored.time },
            ]);
          }
          toast.success("Restored cancelled shower");
          break;
        }

        case "SHOWER_RESCHEDULED": {
          const { recordId, guestId, from, to } = action.data || {};
          if (!recordId) return false;
          const targetTime = from ?? null;
          const timestamp = new Date().toISOString();
          let restoredRecord = null;
          if (
            supabaseEnabled &&
            supabase &&
            !(typeof recordId === "string" && recordId.startsWith("local-"))
          ) {
            try {
              const { data, error } = await supabase
                .from("shower_reservations")
                .update({ scheduled_time: targetTime, updated_at: timestamp })
                .eq("id", recordId)
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                restoredRecord = mapShowerRow(data);
              }
            } catch (error) {
              console.error(
                "Failed to revert shower schedule in Supabase:",
                error,
              );
              toast.error("Unable to undo shower reschedule.");
              return false;
            }
          }
          setShowerRecords((prev) =>
            prev.map((r) => {
              if (r.id !== recordId) return r;
              if (restoredRecord) return restoredRecord;
              return { ...r, time: targetTime, lastUpdated: timestamp };
            }),
          );
          setShowerSlots((prev) => {
            const withoutNew = prev.filter(
              (s) => !(s.guestId === guestId && s.time === to),
            );
            if (targetTime) {
              return [...withoutNew, { guestId, time: targetTime }];
            }
            return withoutNew;
          });
          toast.success("Reverted shower schedule");
          break;
        }

        case "ITEM_GIVEN":
          {
            const recordId = action.data?.recordId;
            const deleted = await deleteSupabaseRecord(
              "items_distributed",
              recordId,
              "Unable to undo item distribution.",
            );
            if (!deleted) return false;
            setItemGivenRecords((prev) =>
              prev.filter((r) => r.id !== recordId),
            );
            toast.success("Reverted item distribution");
          }
          break;
        case "DONATION_ADDED":
          {
            const recordId = action.data?.recordId;
            const deleted = await deleteSupabaseRecord(
              "donations",
              recordId,
              "Unable to undo donation entry.",
            );
            if (!deleted) return false;
            setDonationRecords((prev) => prev.filter((r) => r.id !== recordId));
            toast.success("Reverted donation");
          }
          break;
        case "LAUNDRY_CANCELLED": {
          const snap = action.data?.snapshot;
          if (!snap) return false;
          let restored = snap;
          if (
            supabaseEnabled &&
            supabase &&
            snap.id &&
            !(typeof snap.id === "string" && snap.id.startsWith("local-"))
          ) {
            const payload = {
              id: snap.id,
              guest_id: snap.guestId,
              slot_label: snap.laundryType === "onsite" ? snap.time : null,
              laundry_type: snap.laundryType,
              bag_number: snap.bagNumber || null,
              scheduled_for: snap.date
                ? snap.date.split("T")[0]
                : todayPacificDateString(),
              status: snap.status,
              created_at: snap.createdAt || snap.date,
              updated_at: snap.lastUpdated || new Date().toISOString(),
            };
            try {
              const { data, error } = await supabase
                .from("laundry_bookings")
                .upsert(payload, { onConflict: "id" })
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                restored = mapLaundryRow(data);
              }
            } catch (error) {
              console.error(
                "Failed to restore laundry booking in Supabase:",
                error,
              );
              toast.error("Unable to restore laundry booking.");
              return false;
            }
          }
          setLaundryRecords((prev) => [...prev, restored]);
          if (restored.laundryType === "onsite" && restored.time) {
            setLaundrySlots((prev) => [
              ...prev,
              {
                guestId: restored.guestId,
                time: restored.time,
                laundryType: "onsite",
                bagNumber: restored.bagNumber,
                status: restored.status,
              },
            ]);
          }
          toast.success("Restored cancelled laundry");
          break;
        }

        case "LAUNDRY_RESCHEDULED": {
          const { recordId, guestId, from, to } = action.data || {};
          if (!recordId) return false;
          const previousType = from?.type || null;
          const previousTime = from?.time || null;
          const timestamp = new Date().toISOString();
          const existingRecord = laundryRecords.find((r) => r.id === recordId);
          let restoredRecord = null;
          if (
            supabaseEnabled &&
            supabase &&
            !(typeof recordId === "string" && recordId.startsWith("local-"))
          ) {
            try {
              const { data, error } = await supabase
                .from("laundry_bookings")
                .update({
                  laundry_type: previousType,
                  slot_label: previousType === "onsite" ? previousTime : null,
                  status:
                    previousType === "onsite"
                      ? LAUNDRY_STATUS.WAITING
                      : LAUNDRY_STATUS.PENDING,
                  updated_at: timestamp,
                })
                .eq("id", recordId)
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                restoredRecord = mapLaundryRow(data);
              }
            } catch (error) {
              console.error(
                "Failed to revert laundry booking in Supabase:",
                error,
              );
              toast.error("Unable to undo laundry reschedule.");
              return false;
            }
          }
          setLaundryRecords((prev) =>
            prev.map((r) => {
              if (r.id !== recordId) return r;
              if (restoredRecord) return restoredRecord;
              return {
                ...r,
                laundryType: previousType,
                time: previousTime,
                status:
                  previousType === "onsite"
                    ? LAUNDRY_STATUS.WAITING
                    : LAUNDRY_STATUS.PENDING,
                lastUpdated: timestamp,
              };
            }),
          );
          setLaundrySlots((prev) => {
            const withoutNew = prev.filter(
              (s) => !(s.guestId === guestId && s.time === to?.time),
            );
            if (previousType === "onsite" && previousTime) {
              const slotBagNumber =
                restoredRecord?.bagNumber ?? existingRecord?.bagNumber ?? "";
              return [
                ...withoutNew,
                {
                  guestId,
                  time: previousTime,
                  laundryType: "onsite",
                  bagNumber: slotBagNumber,
                  status: LAUNDRY_STATUS.WAITING,
                },
              ];
            }
            return withoutNew;
          });
          toast.success("Reverted laundry booking changes");
          break;
        }

        case "LUNCH_BAGS_ADDED":
          {
            const recordId = action.data?.recordId;
            const deleted = await deleteSupabaseRecord(
              "meal_attendance",
              recordId,
              "Unable to undo lunch bag entry.",
            );
            if (!deleted) return false;
            setLunchBagRecords((prev) => prev.filter((r) => r.id !== recordId));
            toast.success("Reverted lunch bag entry");
          }
          break;

        default:
          return false;
      }

      setActionHistory((prev) => prev.filter((a) => a.id !== actionId));
      return true;
    } catch (error) {
      console.error("Error undoing action:", error);
      return false;
    }
  };

  const clearActionHistory = () => {
    setActionHistory([]);
  };

  // TODO: Reintroduce multi-admin real-time sync using Supabase channels if needed

  const resetAllData = async (
    options = { local: true, supabase: false, keepGuests: false },
  ) => {
    try {
      const {
        local = true,
        supabase: supabaseReset = false,
        keepGuests = false,
      } = options || {};

      if (local) {
        if (!keepGuests) setGuests([]);
        setMealRecords([]);
        setRvMealRecords([]);
        setShelterMealRecords([]);
        setUnitedEffortMealRecords([]);
        setExtraMealRecords([]);
        setDayWorkerMealRecords([]);
        setLunchBagRecords([]);
        setShowerRecords([]);
        setLaundryRecords([]);
        setBicycleRecords([]);
        setHolidayRecords([]);
        setHaircutRecords([]);
        setItemGivenRecords([]);
        setDonationRecords([]);
        setShowerSlots([]);
        setLaundrySlots([]);
        setActionHistory([]);

        // Clear localStorage keys
        if (!keepGuests) localStorage.removeItem("hopes-corner-guests");
        localStorage.removeItem("hopes-corner-meal-records");
        localStorage.removeItem("hopes-corner-rv-meal-records");
        localStorage.removeItem("hopes-corner-united-effort-meal-records");
        localStorage.removeItem("hopes-corner-extra-meal-records");
        localStorage.removeItem("hopes-corner-day-worker-meal-records");
        localStorage.removeItem("hopes-corner-shower-records");
        localStorage.removeItem("hopes-corner-laundry-records");
        localStorage.removeItem("hopes-corner-bicycle-records");
        localStorage.removeItem("hopes-corner-holiday-records");
        localStorage.removeItem("hopes-corner-haircut-records");
        localStorage.removeItem("hopes-corner-item-records");
        localStorage.removeItem("hopes-corner-donation-records");
        localStorage.removeItem("hopes-corner-lunch-bag-records");
        // keep settings by default
      }

      if (supabaseReset && supabaseEnabled && supabase) {
        const deletionErrors = [];
        try {
          const tables = [
            { name: "guests", keep: keepGuests },
            { name: "meal_attendance" },
            { name: "shower_reservations" },
            { name: "laundry_bookings" },
            { name: "bicycle_repairs" },
            { name: "holiday_visits" },
            { name: "haircut_visits" },
            { name: "items_distributed" },
            { name: "donations" },
          ];

          for (const table of tables) {
            if (table.keep) continue;

            // Delete all rows using a simple delete query
            const { error: deleteError } = await supabase
              .from(table.name)
              .delete()
              .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows (id will never be this value)

            if (deleteError) {
              console.error(
                `Failed to delete rows from ${table.name}:`,
                deleteError,
              );
              deletionErrors.push(`${table.name}: ${deleteError.message}`);
            } else {
              console.log(`Successfully deleted all rows from ${table.name}`);
            }
          }

          const defaults = createDefaultSettings();
          const { error: settingsError } = await supabase
            .from("app_settings")
            .upsert({
              id: "global",
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
          if (settingsError) {
            console.warn(
              "Failed to reset settings in Supabase:",
              settingsError,
            );
          }

          // Report any deletion errors
          if (deletionErrors.length > 0) {
            throw new Error(
              `Failed to delete from Supabase tables: ${deletionErrors.join(", ")}`,
            );
          }
        } catch (err) {
          console.error("Supabase reset failed:", err);
          throw new Error(`Supabase reset failed: ${err.message}`);
        }
      }

      toast.success("Data reset complete");
      return true;
    } catch (e) {
      console.error("Error resetting data:", e);
      toast.error("Failed to reset data");
      return false;
    }
  };

  const value = {
    // State
    guests,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    showerRecords,
    laundryRecords,
    showerSlots,
    laundrySlots,
    bicycleRecords,
    holidayRecords,
    haircutRecords,
    itemGivenRecords,
    donationRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    activeTab,
    showerPickerGuest,
    laundryPickerGuest,
    bicyclePickerGuest,
    settings,

    LAUNDRY_STATUS,
    HOUSING_STATUSES,
    AGE_GROUPS,
    GENDERS,
    DONATION_TYPES,
    BICYCLE_REPAIR_STATUS,

    allShowerSlots,
    allLaundrySlots,

    setActiveTab,
    setShowerPickerGuest,
    setLaundryPickerGuest,
    setBicyclePickerGuest,
    setLaundryRecords,
    setMealRecords,
    setItemGivenRecords,
    setDonationRecords,
    updateSettings,

    addGuest,
    importGuestsFromCSV,
    updateGuest,
    removeGuest,
  banGuest,
  clearGuestBan,
    addMealRecord,
    addRvMealRecord,
    addShelterMealRecord,
    addUnitedEffortMealRecord,
    addExtraMealRecord,
    addDayWorkerMealRecord,
    addLunchBagRecord,
    removeMealAttendanceRecord,
    addShowerRecord,
    importShowerAttendanceRecord,
    addShowerWaitlist,
    addLaundryRecord,
    importLaundryAttendanceRecord,
    updateLaundryStatus,
    updateLaundryBagNumber,
    addBicycleRecord,
    updateBicycleRecord,
    deleteBicycleRecord,
    setBicycleStatus,
    moveBicycleRecord,
    addHolidayRecord,
    addHaircutRecord,
    // Batch insert functions
    insertMealAttendanceBatch,
    insertShowerReservationsBatch,
    insertLaundryBookingsBatch,
    insertBicycleRepairsBatch,
    insertHaircutVisitsBatch,
    insertHolidayVisitsBatch,
    giveItem,
    canGiveItem,
    getLastGivenItem,
    getNextAvailabilityDate,
    getDaysUntilAvailable,
    addDonation,
    getRecentDonations,
    getTodayDonationsConsolidated,
    cancelShowerRecord,
    rescheduleShower,
    updateShowerStatus,
    cancelLaundryRecord,
    rescheduleLaundry,
    getTodayMetrics,
    getDateRangeMetrics,
    getUniversalTimeRangeMetrics,
    getTodayLaundryWithGuests,
    exportDataAsCSV,
    getTodayDonationsByItem,
    actionHistory,
    undoAction,
    clearActionHistory,
    resetAllData,
    supabaseEnabled,
    supabaseConfigured,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
