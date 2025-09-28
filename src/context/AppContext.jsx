import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import { todayPacificDateString, pacificDateStringFrom } from '../utils/date';
import toast from 'react-hot-toast';
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS, LAUNDRY_STATUS, DONATION_TYPES, BICYCLE_REPAIR_STATUS } from './constants';

import AppContext from './internalContext';

const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
};

const normalizePreferredName = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim();
};

const normalizeBicycleDescription = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim();
};

const normalizeHousingStatus = (value) => {
  const v = (value || '').toString().trim().toLowerCase();
  if (!v) return 'Unhoused';
  if (HOUSING_STATUSES.map(s => s.toLowerCase()).includes(v)) {
    return HOUSING_STATUSES.find(s => s.toLowerCase() === v) || 'Unhoused';
  }
  if (/(temp|temporary).*(shelter)/.test(v) || /shelter(ed)?/.test(v)) return 'Temp. shelter';
  if (/(rv|vehicle|car|van|truck)/.test(v)) return 'RV or vehicle';
  if (/house(d)?|apartment|home/.test(v)) return 'Housed';
  if (/unhouse(d)?|unshelter(ed)?|street|tent/.test(v)) return 'Unhoused';
  return 'Unhoused';
};

const DEFAULT_TARGETS = {
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
  yearlyHolidays: 960
};

const createDefaultSettings = () => ({
  siteName: "Hope's Corner",
  maxOnsiteLaundrySlots: 5,
  enableOffsiteLaundry: true,
  uiDensity: 'comfortable',
  showCharts: true,
  defaultReportDays: 7,
  donationAutofill: true,
  defaultDonationType: 'Protein',
  targets: { ...DEFAULT_TARGETS }
});

const mergeSettings = (base, incoming = {}) => {
  if (!incoming || typeof incoming !== 'object') return base;

  const next = {
    ...base,
    ...incoming,
  };

  if (incoming.targets) {
    next.targets = {
      ...(base.targets ?? {}),
      ...(incoming.targets ?? {}),
    };
  }

  if (!next.targets) {
    next.targets = { ...DEFAULT_TARGETS };
  }

  return next;
};

export const AppProvider = ({ children }) => {
  const [guests, setGuests] = useState([]);
  const [settings, setSettings] = useState(() => createDefaultSettings());

  const [mealRecords, setMealRecords] = useState([]);
  const [rvMealRecords, setRvMealRecords] = useState([]);
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

  const [activeTab, setActiveTab] = useState('check-in');
  const [showerPickerGuest, setShowerPickerGuest] = useState(null);
  const [laundryPickerGuest, setLaundryPickerGuest] = useState(null);
  const [bicyclePickerGuest, setBicyclePickerGuest] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);

  const migrateGuestData = (guestList) => {
    return guestList.map(guest => {
      if (guest.firstName && guest.lastName) {
        return {
          ...guest,
          firstName: toTitleCase(guest.firstName),
          lastName: toTitleCase(guest.lastName),
          name: toTitleCase(guest.name || `${guest.firstName} ${guest.lastName}`),
          preferredName: normalizePreferredName(guest.preferredName),
          bicycleDescription: normalizeBicycleDescription(guest.bicycleDescription),
        };
      }

      const nameParts = (guest.name || '').trim().split(/\s+/);
      const firstName = toTitleCase(nameParts[0] || '');
      const lastName = toTitleCase(nameParts.slice(1).join(' ') || '');

      return {
        ...guest,
        firstName,
        lastName,
        name: toTitleCase(guest.name || ''),
        preferredName: normalizePreferredName(guest.preferredName),
        bicycleDescription: normalizeBicycleDescription(guest.bicycleDescription),
      };
    });
  };

  const supabaseEnabled = isSupabaseEnabled;

  const mapGuestRow = useCallback((row) => ({
    id: row.id,
    guestId: row.external_id,
    firstName: toTitleCase(row.first_name || ''),
    lastName: toTitleCase(row.last_name || ''),
    name: toTitleCase(row.full_name || `${row.first_name || ''} ${row.last_name || ''}`),
    preferredName: normalizePreferredName(row.preferred_name),
    housingStatus: normalizeHousingStatus(row.housing_status),
    age: row.age_group,
    gender: row.gender,
    location: row.location || 'Mountain View',
    notes: row.notes || '',
    bicycleDescription: normalizeBicycleDescription(row.bicycle_description),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    docId: row.id,
  }), []);

  const mapMealRow = useCallback((row) => ({
    id: row.id,
    guestId: row.guest_id,
    count: row.quantity || 1,
    date: row.served_on ? new Date(`${row.served_on}T12:00:00`).toISOString() : row.recorded_at || row.created_at,
    createdAt: row.created_at,
    type: row.meal_type,
  }), []);

  const mapShowerRow = useCallback((row) => ({
    id: row.id,
    guestId: row.guest_id,
    time: row.scheduled_time,
    date: row.scheduled_for ? new Date(`${row.scheduled_for}T12:00:00`).toISOString() : row.created_at,
    status: row.status || 'booked',
    createdAt: row.created_at,
    lastUpdated: row.updated_at,
  }), []);

  const mapLaundryRow = useCallback((row) => ({
    id: row.id,
    guestId: row.guest_id,
    time: row.slot_label,
    laundryType: row.laundry_type,
    bagNumber: row.bag_number || '',
    date: row.scheduled_for ? new Date(`${row.scheduled_for}T12:00:00`).toISOString() : row.created_at,
    status: row.status,
    lastUpdated: row.updated_at,
  }), []);

  const mapBicycleRow = useCallback((row) => ({
    id: row.id,
    guestId: row.guest_id,
    date: row.requested_at,
    type: 'bicycle',
    repairType: row.repair_type,
    notes: row.notes,
    status: row.status,
    priority: row.priority || 0,
    doneAt: row.completed_at,
    lastUpdated: row.updated_at,
  }), []);

  const mapHolidayRow = useCallback((row) => ({
    id: row.id,
    guestId: row.guest_id,
    date: row.served_at,
    type: 'holiday',
  }), []);

  const mapHaircutRow = useCallback((row) => ({
    id: row.id,
    guestId: row.guest_id,
    date: row.served_at,
    type: 'haircut',
  }), []);

  const mapItemRow = useCallback((row) => ({
    id: row.id,
    guestId: row.guest_id,
    item: row.item_key,
    date: row.distributed_at,
  }), []);

  const mapDonationRow = useCallback((row) => ({
    id: row.id,
    type: row.donation_type,
    itemName: row.item_name,
    trays: Number(row.trays) || 0,
    weightLbs: Number(row.weight_lbs) || 0,
    donor: row.donor,
    date: row.donated_at,
    createdAt: row.created_at,
  }), []);

  const insertMealAttendance = async (payload) => {
    if (!supabaseEnabled || !supabase) return null;
    const { data, error } = await supabase
      .from('meal_attendance')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data ? mapMealRow(data) : null;
  };

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;

    let cancelled = false;

    const fetchCloudData = async () => {
      try {
        const [guestsRes, mealsRes, showersRes, laundryRes, bicyclesRes, holidaysRes, haircutsRes, itemsRes, donationsRes, settingsRes] = await Promise.all([
          supabase.from('guests').select('*').order('created_at', { ascending: false }),
          supabase.from('meal_attendance').select('*').order('created_at', { ascending: false }),
          supabase.from('shower_reservations').select('*').order('created_at', { ascending: false }),
          supabase.from('laundry_bookings').select('*').order('created_at', { ascending: false }),
          supabase.from('bicycle_repairs').select('*').order('requested_at', { ascending: false }),
          supabase.from('holiday_visits').select('*').order('created_at', { ascending: false }),
          supabase.from('haircut_visits').select('*').order('created_at', { ascending: false }),
          supabase.from('items_distributed').select('*').order('distributed_at', { ascending: false }),
          supabase.from('donations').select('*').order('donated_at', { ascending: false }),
          supabase.from('app_settings').select('*').eq('id', 'global').maybeSingle(),
        ]);

        if (cancelled) return;

        const guestRows = guestsRes.data?.map(mapGuestRow) || [];
        const migratedGuests = migrateGuestData(guestRows);
        setGuests(migratedGuests.map(g => ({
          ...g,
          housingStatus: normalizeHousingStatus(g.housingStatus),
        })));

        const allMealRows = mealsRes.data?.map(mapMealRow) || [];
        setMealRecords(allMealRows.filter(r => r.type === 'guest'));
        setRvMealRecords(allMealRows.filter(r => r.type === 'rv'));
        setUnitedEffortMealRecords(allMealRows.filter(r => r.type === 'united_effort'));
        setExtraMealRecords(allMealRows.filter(r => r.type === 'extra'));
        setDayWorkerMealRecords(allMealRows.filter(r => r.type === 'day_worker'));
        setLunchBagRecords(allMealRows.filter(r => r.type === 'lunch_bag'));

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
        console.error('Failed to load Supabase data:', error);
      }
    };

    fetchCloudData();

    return () => {
      cancelled = true;
    };
  }, [supabaseEnabled, mapGuestRow, mapMealRow, mapShowerRow, mapLaundryRow, mapBicycleRow, mapHolidayRow, mapHaircutRow, mapItemRow, mapDonationRow]);

  // Fallback to localStorage only if Supabase is disabled or fails
  useEffect(() => {
  if (supabaseEnabled) return; // Skip localStorage if cloud sync is enabled

    try {
      const savedGuests = localStorage.getItem('hopes-corner-guests');
      const savedMealRecords = localStorage.getItem('hopes-corner-meal-records');
      const savedRvMealRecords = localStorage.getItem('hopes-corner-rv-meal-records');
      const savedUnitedEffortMealRecords = localStorage.getItem('hopes-corner-united-effort-meal-records');
      const savedExtraMealRecords = localStorage.getItem('hopes-corner-extra-meal-records');
      const savedDayWorkerMealRecords = localStorage.getItem('hopes-corner-day-worker-meal-records');
      const savedShowerRecords = localStorage.getItem('hopes-corner-shower-records');
      const savedLaundryRecords = localStorage.getItem('hopes-corner-laundry-records');
      const savedBicycleRecords = localStorage.getItem('hopes-corner-bicycle-records');
      const savedHolidayRecords = localStorage.getItem('hopes-corner-holiday-records');
      const savedHaircutRecords = localStorage.getItem('hopes-corner-haircut-records');
      const savedItemRecords = localStorage.getItem('hopes-corner-item-records');
      const savedSettings = localStorage.getItem('hopes-corner-settings');
      const savedDonations = localStorage.getItem('hopes-corner-donation-records');
      const savedLunchBags = localStorage.getItem('hopes-corner-lunch-bag-records');

      if (savedGuests) {
        const parsedGuests = JSON.parse(savedGuests);
        const migratedGuests = migrateGuestData(parsedGuests);
        const normalizedGuests = (migratedGuests || []).map(g => ({
          ...g,
          housingStatus: normalizeHousingStatus(g.housingStatus),
        }));
        setGuests(normalizedGuests);
      }
      if (savedMealRecords) setMealRecords(JSON.parse(savedMealRecords));
      if (savedRvMealRecords) setRvMealRecords(JSON.parse(savedRvMealRecords));
      if (savedUnitedEffortMealRecords) setUnitedEffortMealRecords(JSON.parse(savedUnitedEffortMealRecords));
      if (savedExtraMealRecords) setExtraMealRecords(JSON.parse(savedExtraMealRecords));
      if (savedDayWorkerMealRecords) setDayWorkerMealRecords(JSON.parse(savedDayWorkerMealRecords));
      if (savedShowerRecords) setShowerRecords(JSON.parse(savedShowerRecords));
      if (savedLaundryRecords) setLaundryRecords(JSON.parse(savedLaundryRecords));
      if (savedBicycleRecords) setBicycleRecords(JSON.parse(savedBicycleRecords));
      if (savedHolidayRecords) setHolidayRecords(JSON.parse(savedHolidayRecords));
      if (savedHaircutRecords) setHaircutRecords(JSON.parse(savedHaircutRecords));
      if (savedItemRecords) setItemGivenRecords(JSON.parse(savedItemRecords));
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => mergeSettings(prev, parsedSettings));
      }
      if (savedDonations) setDonationRecords(JSON.parse(savedDonations));
      if (savedLunchBags) setLunchBagRecords(JSON.parse(savedLunchBags));
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, [supabaseEnabled]);

  // Cache to localStorage only when Supabase is disabled - cloud sync handles persistence
  useEffect(() => {
  if (supabaseEnabled) return; // Skip localStorage caching when using cloud sync

    try {
      localStorage.setItem('hopes-corner-guests', JSON.stringify(guests));
      localStorage.setItem('hopes-corner-meal-records', JSON.stringify(mealRecords));
      localStorage.setItem('hopes-corner-rv-meal-records', JSON.stringify(rvMealRecords));
      localStorage.setItem('hopes-corner-united-effort-meal-records', JSON.stringify(unitedEffortMealRecords));
      localStorage.setItem('hopes-corner-extra-meal-records', JSON.stringify(extraMealRecords));
      localStorage.setItem('hopes-corner-day-worker-meal-records', JSON.stringify(dayWorkerMealRecords));
      localStorage.setItem('hopes-corner-shower-records', JSON.stringify(showerRecords));
      localStorage.setItem('hopes-corner-laundry-records', JSON.stringify(laundryRecords));
      localStorage.setItem('hopes-corner-bicycle-records', JSON.stringify(bicycleRecords));
      localStorage.setItem('hopes-corner-holiday-records', JSON.stringify(holidayRecords));
      localStorage.setItem('hopes-corner-haircut-records', JSON.stringify(haircutRecords));
      localStorage.setItem('hopes-corner-item-records', JSON.stringify(itemGivenRecords));
      localStorage.setItem('hopes-corner-donation-records', JSON.stringify(donationRecords));
      localStorage.setItem('hopes-corner-settings', JSON.stringify(settings));
      localStorage.setItem('hopes-corner-lunch-bag-records', JSON.stringify(lunchBagRecords));
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  }, [guests, mealRecords, rvMealRecords, showerRecords, laundryRecords, bicycleRecords, holidayRecords, haircutRecords, itemGivenRecords, donationRecords, unitedEffortMealRecords, extraMealRecords, dayWorkerMealRecords, lunchBagRecords, settings, supabaseEnabled]);

  const persistSettingsToSupabase = useCallback(async (nextSettings) => {
    if (!supabaseEnabled || !supabase) return;

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
  }, [supabaseEnabled]);

  const updateSettings = useCallback((partial) => {
    if (!partial) return;

    setSettings(prev => {
      const next = mergeSettings(prev, partial);
      persistSettingsToSupabase(next);
      return next;
    });
  }, [persistSettingsToSupabase]);


  const generateShowerSlots = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.

    // Monday and Wednesday (day 1 or day 3) or any day that's not Saturday
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek !== 6) {
      const start = 7.5 * 60; // 07:30 AM
      const end = 12.5 * 60;  // 12:30 PM
      const slots = [];
      for (let t = start; t < end; t += 30) { // 30 minute slots
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
      for (let t = start; t < end; t += 30) { // 30 minute slots
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

    // Monday and Wednesday (day 1 or day 3) or any day that's not Saturday
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek !== 6) {
      return [
        '07:30 - 08:30',
        '08:00 - 09:00',
        '08:30 - 09:45',
        '09:00 - 10:15',
        '09:30 - 11:45'
      ];
    }
    // Saturday (day 6)
    else {
      return [
        '08:30 - 10:00',
        '09:00 - 10:30',
        '09:30 - 11:00',
        '10:00 - 11:30',
        '10:30 - 12:00'
      ];
    }
  };

  const allShowerSlots = generateShowerSlots();
  const allLaundrySlots = generateLaundrySlots();

  const generateGuestId = () => {
    return 'G' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  };

  const generateUniqueGuestId = (preferredId, takenSet) => {
    let id = preferredId && !takenSet.has(preferredId) ? preferredId : generateGuestId();
    while (takenSet.has(id)) {
      id = generateGuestId();
    }
    takenSet.add(id);
    return id;
  };

  const addGuest = async (guest) => {
    let firstName = '';
    let lastName = '';

    if (guest.firstName && guest.lastName) {
      firstName = toTitleCase(guest.firstName.trim());
      lastName = toTitleCase(guest.lastName.trim());
    } else if (guest.name) {
      const nameParts = guest.name.trim().split(/\s+/);
      firstName = toTitleCase(nameParts[0] || '');
      lastName = toTitleCase(nameParts.slice(1).join(' ') || '');
    }

    const requiredFields = ['location', 'age', 'gender'];
    for (const field of requiredFields) {
      if (!guest[field] || (typeof guest[field] === 'string' && !guest[field].trim())) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const normalizedHousing = normalizeHousingStatus(guest.housingStatus);
    if (!HOUSING_STATUSES.includes(normalizedHousing)) {
      throw new Error('Invalid housing status');
    }
    guest.housingStatus = normalizedHousing;
    if (!AGE_GROUPS.includes(guest.age)) {
      throw new Error('Invalid age category');
    }
    if (!GENDERS.includes(guest.gender)) {
      throw new Error('Invalid gender');
    }

    const preferredName = normalizePreferredName(guest.preferredName);
    const bicycleDescription = normalizeBicycleDescription(guest.bicycleDescription);
    const legalName = `${firstName} ${lastName}`.trim();

    const takenIds = new Set(guests.map(g => g.guestId));
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
        notes: guest.notes || '',
        bicycle_description: bicycleDescription,
      };

      const { data, error } = await supabase
        .from('guests')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Failed to add guest to Supabase:', error);
        throw new Error('Unable to save guest. Please try again.');
      }

      const mapped = mapGuestRow(data);
      setGuests(prev => [...prev, mapped]);
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

    setGuests(prev => [...prev, fallbackGuest]);
    return fallbackGuest;
  };

  const importGuestsFromCSV = (csvData) => {
    if (!csvData || csvData.length === 0) {
      throw new Error("No valid CSV data provided");
    }

    const normalizeKey = (k) => k.toLowerCase().replace(/\s+/g, '_');

    const takenIds = new Set(guests.map(g => g.guestId));
    const newGuests = csvData.map(rawRow => {
      const row = Object.keys(rawRow).reduce((acc, key) => {
        acc[normalizeKey(key)] = rawRow[key];
        return acc;
      }, {});

      let firstName = toTitleCase((row.first_name || '').trim());
      let lastName = toTitleCase((row.last_name || '').trim());
      let fullName = (row.full_name || '').trim();
      if (!fullName) {
        fullName = `${firstName} ${lastName}`.trim();
      } else {
        if (!firstName || !lastName) {
          const parts = fullName.split(/\s+/);
          firstName = firstName || toTitleCase(parts[0] || '');
          lastName = lastName || toTitleCase(parts.slice(1).join(' ') || '');
        }
      }
      if (!firstName || !lastName) {
        throw new Error(`Missing name fields in CSV row: ${JSON.stringify(rawRow)}`);
      }

      const housingStatusRaw = (row.housing_status || '').trim();
      const housingStatus = normalizeHousingStatus(housingStatusRaw);
      const age = (row.age || '').trim();
      const genderRaw = (row.gender || '').trim();
      const gender = genderRaw ? genderRaw : 'Unknown';
      const location = ((row.city || row.location || '').trim()) || 'Mountain View';
      if (!AGE_GROUPS.includes(age)) {
        throw new Error(`Invalid or missing Age value '${age}'.`);
      }
      if (!GENDERS.includes(gender)) {
        throw new Error(`Invalid Gender value '${gender}'. Allowed: ${GENDERS.join(', ')}`);
      }

      const guestId = generateUniqueGuestId((row.guest_id || '').trim() || null, takenIds);
      return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        guestId,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        housingStatus,
        age,
        gender,
        location,
        preferredName: normalizePreferredName(row.preferred_name || row.preferredName),
        notes: (row.notes || '').trim(),
        bicycleDescription: normalizeBicycleDescription(row.bicycle_description || row.bicycleDescription),
        createdAt: new Date().toISOString(),
      };
    });

    if (supabaseEnabled && supabase) {
      const payload = newGuests.map(g => ({
        external_id: g.guestId,
        first_name: g.firstName,
        last_name: g.lastName,
        full_name: g.name,
        preferred_name: g.preferredName,
        housing_status: g.housingStatus,
        age_group: g.age,
        gender: g.gender,
        location: g.location,
        notes: g.notes || '',
        bicycle_description: g.bicycleDescription,
      }));

      supabase
        .from('guests')
        .insert(payload)
        .select()
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to bulk import guests to Supabase:', error);
            setGuests(prev => [...prev, ...newGuests]);
          } else if (data) {
            const mapped = data.map(mapGuestRow);
            setGuests(prev => [...prev, ...mapped]);
          }
        })
        .catch((error) => {
          console.error('Bulk import error:', error);
          setGuests(prev => [...prev, ...newGuests]);
        });
    } else {
      setGuests(prev => [...prev, ...newGuests]);
    }

    return newGuests;
  };

  const isSameDay = (iso1, iso2) => iso1.split('T')[0] === iso2.split('T')[0];
  const addBicycleRecord = async (guestId, { repairType = 'Flat Tire', notes = '' } = {}) => {
    const now = new Date().toISOString();
    // Allow multiple repairs per day; no uniqueness constraint.
    const priority = (bicycleRecords[0]?.priority || 0) + 1;

    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('bicycle_repairs')
          .insert({
            guest_id: guestId,
            repair_type: repairType,
            notes,
            status: BICYCLE_REPAIR_STATUS.PENDING,
            priority,
            requested_at: now,
          })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapBicycleRow(data);
        setBicycleRecords(prev => [mapped, ...prev]);
        setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'BICYCLE_LOGGED', timestamp: now, data: { recordId: mapped.id, guestId }, description: `Logged bicycle repair (${repairType})` }, ...prev.slice(0, 49)]);
        toast.success('Bicycle repair logged');
        return mapped;
      } catch (error) {
        console.error('Failed to log bicycle repair:', error);
        toast.error('Unable to log bicycle repair.');
        throw error;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      guestId,
      date: now,
      type: 'bicycle',
      repairType,
      notes,
      status: BICYCLE_REPAIR_STATUS.PENDING,
      priority,
    };
    setBicycleRecords(prev => [record, ...prev]);
    setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'BICYCLE_LOGGED', timestamp: now, data: { recordId: record.id, guestId }, description: `Logged bicycle repair (${repairType})` }, ...prev.slice(0, 49)]);
    toast.success('Bicycle repair logged');
    return record;
  };

  const updateBicycleRecord = async (recordId, updates) => {
    const mergedUpdates = { ...updates };
    if (!mergedUpdates.lastUpdated) mergedUpdates.lastUpdated = new Date().toISOString();
    setBicycleRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...mergedUpdates } : r));
    if (supabaseEnabled && supabase && !String(recordId).startsWith('local-')) {
      try {
        const payload = {};
        if (mergedUpdates.repairType !== undefined) payload.repair_type = mergedUpdates.repairType;
        if (mergedUpdates.notes !== undefined) payload.notes = mergedUpdates.notes;
        if (mergedUpdates.status !== undefined) payload.status = mergedUpdates.status;
        if (mergedUpdates.priority !== undefined) payload.priority = mergedUpdates.priority;
        if (mergedUpdates.doneAt !== undefined) payload.completed_at = mergedUpdates.doneAt;
        if (mergedUpdates.lastUpdated !== undefined) payload.updated_at = mergedUpdates.lastUpdated;
        if (Object.keys(payload).length === 0) return;
        const { data, error } = await supabase
          .from('bicycle_repairs')
          .update(payload)
          .eq('id', recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapBicycleRow(data);
          setBicycleRecords(prev => prev.map(r => r.id === recordId ? mapped : r));
        }
      } catch (error) {
        console.error('Failed to update bicycle record:', error);
        toast.error('Unable to update bicycle record.');
      }
    }
  };

  const deleteBicycleRecord = async (recordId) => {
    setBicycleRecords(prev => prev.filter(r => r.id !== recordId));
    if (supabaseEnabled && supabase && !String(recordId).startsWith('local-')) {
      try {
  const { error } = await supabase.from('bicycle_repairs').delete().eq('id', recordId);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete bicycle record:', error);
        toast.error('Unable to delete bicycle record.');
        return false;
      }
    }
    return true;
  };

  const setBicycleStatus = (recordId, status) => {
    if (!Object.values(BICYCLE_REPAIR_STATUS).includes(status)) return;
    updateBicycleRecord(recordId, { status, doneAt: status === BICYCLE_REPAIR_STATUS.DONE ? new Date().toISOString() : undefined });
  };

  const moveBicycleRecord = (recordId, direction) => {
    setBicycleRecords(prev => {
      const list = [...prev];
      const idx = list.findIndex(r => r.id === recordId);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= list.length) return prev;
      [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
      // Recalculate priorities (descending)
      const total = list.length;
      list.forEach((r, i) => r.priority = total - i);
      return list;
    });
  };
  const addHolidayRecord = async (guestId) => {
    const now = new Date().toISOString();
    const already = holidayRecords.some(r => r.guestId === guestId && isSameDay(r.date, now));
    if (already) {
      toast.error('Holiday already logged today');
      return null;
    }
    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('holiday_visits')
          .insert({ guest_id: guestId, served_at: now })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapHolidayRow(data);
        setHolidayRecords(prev => [mapped, ...prev]);
        setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'HOLIDAY_LOGGED', timestamp: now, data: { recordId: mapped.id, guestId }, description: 'Logged holiday service' }, ...prev.slice(0, 49)]);
        toast.success('Holiday logged');
        return mapped;
      } catch (error) {
        console.error('Failed to log holiday in Supabase:', error);
        toast.error('Unable to log holiday.');
        throw error;
      }
    }

    const record = { id: `local-${Date.now()}`, guestId, date: now, type: 'holiday' };
    setHolidayRecords(prev => [record, ...prev]);
    setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'HOLIDAY_LOGGED', timestamp: now, data: { recordId: record.id, guestId }, description: 'Logged holiday service' }, ...prev.slice(0, 49)]);
    toast.success('Holiday logged');
    return record;
  };
  const addHaircutRecord = async (guestId) => {
    const now = new Date().toISOString();
    const already = haircutRecords.some(r => r.guestId === guestId && isSameDay(r.date, now));
    if (already) {
      toast.error('Haircut already logged today');
      return null;
    }
    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('haircut_visits')
          .insert({ guest_id: guestId, served_at: now })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapHaircutRow(data);
        setHaircutRecords(prev => [mapped, ...prev]);
        setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'HAIRCUT_LOGGED', timestamp: now, data: { recordId: mapped.id, guestId }, description: 'Logged haircut service' }, ...prev.slice(0, 49)]);
        toast.success('Haircut logged');
        return mapped;
      } catch (error) {
        console.error('Failed to log haircut in Supabase:', error);
        toast.error('Unable to log haircut.');
        throw error;
      }
    }

    const record = { id: `local-${Date.now()}`, guestId, date: now, type: 'haircut' };
    setHaircutRecords(prev => [record, ...prev]);
    setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'HAIRCUT_LOGGED', timestamp: now, data: { recordId: record.id, guestId }, description: 'Logged haircut service' }, ...prev.slice(0, 49)]);
    toast.success('Haircut logged');
    return record;
  };

  const getLastGivenItem = (guestId, item) => {
    const recs = itemGivenRecords.filter(r => r.guestId === guestId && r.item === item);
    if (recs.length === 0) return null;
    return recs.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b);
  };
  const getNextAvailabilityDate = (item, lastDateISO) => {
    if (!lastDateISO) return null;
    const last = new Date(lastDateISO);
    last.setHours(0, 0, 0, 0);
    if (item === 'tshirt') {
      const day = last.getDay();
      let daysUntilNextMon = (8 - day) % 7;
      if (daysUntilNextMon === 0) daysUntilNextMon = 7;
      const next = new Date(last);
      next.setDate(last.getDate() + daysUntilNextMon);
      return next;
    }
    if (item === 'sleeping_bag' || item === 'backpack' || item === 'tent' || item === 'flipflops' || item === 'flip_flops') {
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
      throw new Error('Limit reached for this item based on last given date.');
    }
    const now = new Date().toISOString();

    if (supabaseEnabled && supabase) {
      const { data, error } = await supabase
        .from('items_distributed')
        .insert({ guest_id: guestId, item_key: item, distributed_at: now })
        .select()
        .single();

      if (error) {
        console.error('Failed to record distributed item in Supabase:', error);
        throw new Error('Unable to log item distribution.');
      }

      const record = mapItemRow(data);
      setItemGivenRecords(prev => [record, ...prev]);
      setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'ITEM_GIVEN', timestamp: now, data: { recordId: record.id, guestId, item }, description: `Gave ${item.replace('_', ' ')}` }, ...prev.slice(0, 49)]);
      return record;
    }

    const fallbackRecord = { id: `local-${Date.now()}`, guestId, item, date: now };
    setItemGivenRecords(prev => [fallbackRecord, ...prev]);
    setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'ITEM_GIVEN', timestamp: now, data: { recordId: fallbackRecord.id, guestId, item }, description: `Gave ${item.replace('_', ' ')}` }, ...prev.slice(0, 49)]);
    return fallbackRecord;
  };

  const updateGuest = async (id, updates) => {
    const normalizedUpdates = {
      ...updates,
      bicycleDescription: updates?.bicycleDescription !== undefined
        ? normalizeBicycleDescription(updates.bicycleDescription)
        : undefined,
    };
    if (normalizedUpdates.bicycleDescription === undefined) {
      delete normalizedUpdates.bicycleDescription;
    }
    const target = guests.find(g => g.id === id);
    setGuests(prev => prev.map((guest) => (guest.id === id ? { ...guest, ...normalizedUpdates } : guest)));

    if (supabaseEnabled && supabase && target) {
      const payload = {};
      if (normalizedUpdates.firstName !== undefined) payload.first_name = toTitleCase(normalizedUpdates.firstName);
      if (normalizedUpdates.lastName !== undefined) payload.last_name = toTitleCase(normalizedUpdates.lastName);
      if (normalizedUpdates.name !== undefined) payload.full_name = toTitleCase(normalizedUpdates.name);
      if (normalizedUpdates.preferredName !== undefined) payload.preferred_name = normalizePreferredName(normalizedUpdates.preferredName);
      if (normalizedUpdates.housingStatus !== undefined) payload.housing_status = normalizeHousingStatus(normalizedUpdates.housingStatus);
      if (normalizedUpdates.age !== undefined) payload.age_group = normalizedUpdates.age;
      if (normalizedUpdates.gender !== undefined) payload.gender = normalizedUpdates.gender;
      if (normalizedUpdates.location !== undefined) payload.location = normalizedUpdates.location;
      if (normalizedUpdates.notes !== undefined) payload.notes = normalizedUpdates.notes;
      if (normalizedUpdates.bicycleDescription !== undefined) payload.bicycle_description = normalizedUpdates.bicycleDescription;
      if (normalizedUpdates.guestId !== undefined) payload.external_id = normalizedUpdates.guestId;

      if (Object.keys(payload).length === 0) return;

      const { data, error } = await supabase
        .from('guests')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update guest in Supabase:', error);
      } else if (data) {
        const mapped = mapGuestRow(data);
        setGuests(prev => prev.map(guest => (guest.id === id ? mapped : guest)));
      }
    }
  };

  const removeGuest = async (id) => {
    const target = guests.find(g => g.id === id);
    setGuests(guests.filter((guest) => guest.id !== id));
    if (supabaseEnabled && supabase && target) {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete guest from Supabase:', error);
      }
    }
  };

  const addMealRecord = async (guestId, count) => {
    const today = pacificDateStringFrom(new Date());
    const already = mealRecords.some(r => r.guestId === guestId && pacificDateStringFrom(r.date) === today);
    if (already) return null;
    const timestamp = new Date().toISOString();

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: 'guest',
          guest_id: guestId,
          quantity: count,
          served_on: timestamp.slice(0, 10),
          recorded_at: timestamp,
        });

        if (!inserted) {
          throw new Error('Failed to insert meal attendance');
        }

        setMealRecords(prev => [...prev, inserted]);

        const action = {
          id: Date.now() + Math.random(),
          type: 'MEAL_ADDED',
          timestamp,
          data: { recordId: inserted.id, guestId, count },
          description: `Added ${count} meal${count > 1 ? 's' : ''} for guest`
        };
        setActionHistory(prev => [action, ...prev.slice(0, 49)]);

        return inserted;
      } catch (error) {
        console.error('Failed to add meal record in Supabase:', error);
        toast.error('Unable to save meal record.');
        return null;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      guestId,
      count,
      date: timestamp,
      createdAt: timestamp,
      type: 'guest',
    };

    setMealRecords(prev => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: 'MEAL_ADDED',
      timestamp,
      data: { recordId: record.id, guestId, count },
      description: `Added ${count} meal${count > 1 ? 's' : ''} for guest`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const addRvMealRecord = async (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();
    const iso = dateOverride ? makeISOForDate(dateOverride) : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (quantity <= 0) throw new Error('Invalid meal count');

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: 'rv',
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error('Insert returned no data');
        setRvMealRecords(prev => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: 'RV_MEALS_ADDED',
          timestamp: iso,
          data: { recordId: inserted.id, count: quantity },
          description: `Added ${quantity} RV meals`
        };
        setActionHistory(prev => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error('Failed to log RV meals in Supabase:', error);
        toast.error('Unable to record RV meals.');
        return null;
      }
    }

    const record = { id: `local-${Date.now()}`, count: quantity, date: iso, type: 'rv' };
    setRvMealRecords(prev => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: 'RV_MEALS_ADDED',
      timestamp: iso,
      data: { recordId: record.id, count: quantity },
      description: `Added ${quantity} RV meals`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addUnitedEffortMealRecord = async (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();
    const iso = dateOverride ? makeISOForDate(dateOverride) : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (quantity <= 0) throw new Error('Invalid meal count');

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: 'united_effort',
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error('Insert returned no data');
        setUnitedEffortMealRecords(prev => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: 'UNITED_EFFORT_MEALS_ADDED',
          timestamp: iso,
          data: { recordId: inserted.id, count: quantity },
          description: `Added ${quantity} United Effort meals`
        };
        setActionHistory(prev => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error('Failed to log United Effort meals:', error);
        toast.error('Unable to record United Effort meals.');
        return null;
      }
    }

    const record = { id: `local-${Date.now()}`, count: quantity, date: iso, type: 'united_effort' };
    setUnitedEffortMealRecords(prev => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: 'UNITED_EFFORT_MEALS_ADDED',
      timestamp: iso,
      data: { recordId: record.id, count: quantity },
      description: `Added ${quantity} United Effort meals`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addExtraMealRecord = async (guestId, count, dateOverride = null) => {
    if (typeof count === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(count) && (dateOverride == null)) {
      dateOverride = count;
      count = guestId;
      guestId = null;
    }
    const makeISOForDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();
    const iso = dateOverride ? makeISOForDate(dateOverride) : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (quantity <= 0) throw new Error('Invalid extra meal count');

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: 'extra',
          guest_id: guestId,
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error('Insert returned no data');
        setExtraMealRecords(prev => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: 'EXTRA_MEALS_ADDED',
          timestamp: iso,
          data: { recordId: inserted.id, guestId, count: quantity },
          description: `Added ${quantity} extra meal${quantity > 1 ? 's' : ''}${guestId ? ' for guest' : ''}`
        };
        setActionHistory(prev => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error('Failed to log extra meals:', error);
        toast.error('Unable to record extra meals.');
        return null;
      }
    }

    const record = { id: `local-${Date.now()}`, guestId, count: quantity, date: iso, type: 'extra' };
    setExtraMealRecords(prev => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: 'EXTRA_MEALS_ADDED',
      timestamp: iso,
      data: { recordId: record.id, guestId, count: quantity },
      description: `Added ${quantity} extra meal${quantity > 1 ? 's' : ''}${guestId ? ' for guest' : ''}`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addDayWorkerMealRecord = async (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();
    const iso = dateOverride ? makeISOForDate(dateOverride) : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (quantity <= 0) throw new Error('Invalid meal count');

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: 'day_worker',
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error('Insert returned no data');
        setDayWorkerMealRecords(prev => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: 'DAY_WORKER_MEALS_ADDED',
          timestamp: iso,
          data: { recordId: inserted.id, count: quantity },
          description: `Added ${quantity} day worker meals`
        };
        setActionHistory(prev => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error('Failed to log day worker meals:', error);
        toast.error('Unable to record day worker meals.');
        return null;
      }
    }

    const record = { id: `local-${Date.now()}`, count: quantity, date: iso, type: 'day_worker' };
    setDayWorkerMealRecords(prev => [...prev, record]);
    const action = { id: Date.now() + Math.random(), type: 'DAY_WORKER_MEALS_ADDED', timestamp: iso, data: { recordId: record.id, count: quantity }, description: `Added ${quantity} day worker meals` };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addLunchBagRecord = async (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => {
      const d = new Date(`${dateStr}T12:00:00`);
      return d.toISOString();
    };
    const iso = dateOverride ? makeISOForDate(dateOverride) : new Date().toISOString();
    const servedOn = iso.slice(0, 10);
    const quantity = Number(count) || 0;
    if (!quantity || quantity <= 0) throw new Error('Invalid lunch bag count');

    if (supabaseEnabled && supabase) {
      try {
        const inserted = await insertMealAttendance({
          meal_type: 'lunch_bag',
          quantity,
          served_on: servedOn,
          recorded_at: iso,
        });
        if (!inserted) throw new Error('Insert returned no data');
        setLunchBagRecords(prev => [...prev, inserted]);
        const action = {
          id: Date.now() + Math.random(),
          type: 'LUNCH_BAGS_ADDED',
          timestamp: iso,
          data: { recordId: inserted.id, count: quantity, date: dateOverride },
          description: `Added ${quantity} lunch bag${quantity > 1 ? 's' : ''}${dateOverride ? ` on ${dateOverride}` : ''}`
        };
        setActionHistory(prev => [action, ...prev.slice(0, 49)]);
        return inserted;
      } catch (error) {
        console.error('Failed to log lunch bags:', error);
        toast.error('Unable to record lunch bags.');
        return null;
      }
    }

    const record = { id: `local-${Date.now()}`, count: quantity, date: iso, type: 'lunch_bag' };
    setLunchBagRecords(prev => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: 'LUNCH_BAGS_ADDED',
      timestamp: iso,
      data: { recordId: record.id, count: record.count, date: dateOverride },
      description: `Added ${record.count} lunch bag${record.count > 1 ? 's' : ''}${dateOverride ? ` on ${dateOverride}` : ''}`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addShowerRecord = async (guestId, time) => {
    const count = showerSlots.filter((s) => s.time === time).length;
    if (count >= 2) {
      throw new Error("That time slot is full.");
    }

    const today = todayPacificDateString();
    const alreadyBooked = showerRecords.some(
      (r) => r.guestId === guestId && pacificDateStringFrom(r.date) === today
    );

    if (alreadyBooked) {
      throw new Error("Guest already has a shower booking today.");
    }

    const timestamp = new Date().toISOString();
    const scheduledFor = todayPacificDateString();

    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('shower_reservations')
          .insert({
            guest_id: guestId,
            scheduled_time: time,
            scheduled_for: scheduledFor,
            status: 'booked',
          })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapShowerRow(data);
        setShowerRecords(prev => [...prev, mapped]);
        setShowerSlots(prev => [...prev, { guestId, time }]);
        const action = {
          id: Date.now() + Math.random(),
          type: 'SHOWER_BOOKED',
          timestamp,
          data: { recordId: mapped.id, guestId, time },
          description: `Booked shower at ${time} for guest`
        };
        setActionHistory(prev => [action, ...prev.slice(0, 49)]);
        return mapped;
      } catch (error) {
        console.error('Failed to create shower booking:', error);
        toast.error('Unable to save shower booking.');
        throw error;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      guestId,
      time,
      date: timestamp,
      status: 'booked',
    };

    setShowerRecords(prev => [...prev, record]);
    setShowerSlots(prev => [...prev, { guestId, time }]);

    const action = {
      id: Date.now() + Math.random(),
      type: 'SHOWER_BOOKED',
      timestamp,
      data: { recordId: record.id, guestId, time },
      description: `Booked shower at ${time} for guest`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const addShowerWaitlist = async (guestId) => {
    const today = todayPacificDateString();
    const already = showerRecords.some((r) => r.guestId === guestId && pacificDateStringFrom(r.date) === today);
    if (already) {
      throw new Error('Guest already has a shower entry today.');
    }
    const record = {
      id: Date.now(),
      guestId,
      time: null,
      date: new Date().toISOString(),
      status: 'waitlisted',
    };
    const timestamp = record.date;

    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('shower_reservations')
          .insert({
            guest_id: guestId,
            scheduled_time: null,
            scheduled_for: today,
            status: 'waitlisted',
          })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapShowerRow(data);
        setShowerRecords(prev => [...prev, mapped]);
        const action = {
          id: Date.now() + Math.random(),
          type: 'SHOWER_WAITLISTED',
          timestamp,
          data: { recordId: mapped.id, guestId },
          description: 'Added to shower waitlist'
        };
        setActionHistory(prev => [action, ...prev.slice(0, 49)]);
        return mapped;
      } catch (error) {
        console.error('Failed to add shower waitlist entry:', error);
        toast.error('Unable to add to shower waitlist.');
        throw error;
      }
    }

    setShowerRecords(prev => [...prev, { ...record, id: `local-${record.id}` }]);
    const action = {
      id: Date.now() + Math.random(),
      type: 'SHOWER_WAITLISTED',
      timestamp,
      data: { recordId: `local-${record.id}`, guestId },
      description: 'Added to shower waitlist'
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return { ...record, id: `local-${record.id}` };
  };

  const cancelShowerRecord = async (recordId) => {
    const record = showerRecords.find(r => r.id === recordId);
    if (!record) return false;
    setShowerRecords(prev => prev.filter(r => r.id !== recordId));
    setShowerSlots(prev => prev.filter(s => !(s.guestId === record.guestId && s.time === record.time)));
    if (supabaseEnabled && supabase && !String(recordId).startsWith('local-')) {
      try {
  const { error } = await supabase.from('shower_reservations').delete().eq('id', recordId);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to cancel shower booking:', error);
        toast.error('Unable to cancel shower booking.');
        return false;
      }
    }
    const action = {
      id: Date.now() + Math.random(),
      type: 'SHOWER_CANCELLED',
      timestamp: new Date().toISOString(),
      data: { recordId, guestId: record.guestId, time: record.time, snapshot: { ...record } },
      description: `Cancelled shower at ${record.time}`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return true;
  };

  const rescheduleShower = async (recordId, newTime) => {
    const record = showerRecords.find(r => r.id === recordId);
    if (!record) throw new Error('Shower booking not found');
    if (record.time === newTime) return record;
    const countAtNew = showerSlots.filter(s => s.time === newTime && s.guestId !== record.guestId).length;
    if (countAtNew >= 2) throw new Error('That time slot is full.');
    let updatedRecord = { ...record, time: newTime, lastUpdated: new Date().toISOString() };
    setShowerRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r));
    setShowerSlots(prev => {
      const filtered = prev.filter(s => !(s.guestId === record.guestId && s.time === record.time));
      return [...filtered, { guestId: record.guestId, time: newTime }];
    });
    if (supabaseEnabled && supabase && !String(recordId).startsWith('local-')) {
      try {
        const { data, error } = await supabase
          .from('shower_reservations')
          .update({ scheduled_time: newTime, updated_at: new Date().toISOString() })
          .eq('id', recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapShowerRow(data);
          updatedRecord = mapped;
          setShowerRecords(prev => prev.map(r => r.id === recordId ? mapped : r));
        }
      } catch (error) {
        console.error('Failed to reschedule shower:', error);
        toast.error('Unable to reschedule shower.');
      }
    }
    const action = {
      id: Date.now() + Math.random(),
      type: 'SHOWER_RESCHEDULED',
      timestamp: new Date().toISOString(),
      data: { recordId, guestId: record.guestId, from: record.time, to: newTime },
      description: `Rescheduled shower ${record.time} → ${newTime}`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return updatedRecord;
  };

  const updateShowerStatus = async (recordId, newStatus) => {
    const timestamp = new Date().toISOString();
    setShowerRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: newStatus, lastUpdated: timestamp } : r));
    if (supabaseEnabled && supabase && !String(recordId).startsWith('local-')) {
      try {
        const { data, error } = await supabase
          .from('shower_reservations')
          .update({ status: newStatus, updated_at: timestamp })
          .eq('id', recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapShowerRow(data);
          setShowerRecords(prev => prev.map(r => r.id === recordId ? mapped : r));
        }
      } catch (error) {
        console.error('Failed to update shower status:', error);
        toast.error('Unable to update shower status.');
      }
    }
  };

  const addLaundryRecord = async (guestId, time, laundryType, bagNumber = '') => {
    if (laundryType === 'onsite') {
      const slotTaken = laundrySlots.some((slot) => slot.time === time);
      if (slotTaken) {
        throw new Error("That laundry slot is already taken.");
      }

      const onsiteSlots = laundrySlots.filter(slot => slot.laundryType === 'onsite');
      if (onsiteSlots.length >= settings.maxOnsiteLaundrySlots) {
        throw new Error("All on-site laundry slots are taken for today.");
      }
    }

    const today = todayPacificDateString();
    const alreadyBooked = laundryRecords.some(
      (r) => r.guestId === guestId && pacificDateStringFrom(r.date) === today
    );

    if (alreadyBooked) {
      throw new Error("Guest already has a laundry booking today.");
    }

    const timestamp = new Date().toISOString();
    const scheduledFor = todayPacificDateString();

    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('laundry_bookings')
          .insert({
            guest_id: guestId,
            slot_label: laundryType === 'onsite' ? time : null,
            laundry_type: laundryType,
            bag_number: bagNumber,
            scheduled_for: scheduledFor,
            status: laundryType === 'onsite' ? LAUNDRY_STATUS.WAITING : LAUNDRY_STATUS.PENDING,
          })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapLaundryRow(data);
        setLaundryRecords(prev => [...prev, mapped]);
        if (laundryType === 'onsite') {
          setLaundrySlots(prev => [...prev, { guestId, time, laundryType, bagNumber, status: mapped.status }]);
        }
        const action = {
          id: Date.now() + Math.random(),
          type: 'LAUNDRY_BOOKED',
          timestamp,
          data: { recordId: mapped.id, guestId, time, laundryType, bagNumber },
          description: `Booked ${laundryType} laundry${time ? ` at ${time}` : ''} for guest`
        };
        setActionHistory(prev => [action, ...prev.slice(0, 49)]);
        return mapped;
      } catch (error) {
        console.error('Failed to create laundry booking:', error);
        toast.error('Unable to save laundry booking.');
        throw error;
      }
    }

    const record = {
      id: `local-${Date.now()}`,
      guestId,
      time: laundryType === 'onsite' ? time : null,
      laundryType,
      bagNumber,
      date: timestamp,
      status: laundryType === 'onsite' ? LAUNDRY_STATUS.WAITING : LAUNDRY_STATUS.PENDING,
    };

    setLaundryRecords(prev => [...prev, record]);
    if (laundryType === 'onsite') {
      setLaundrySlots(prev => [...prev, { guestId, time, laundryType, bagNumber, status: record.status }]);
    }

    const action = {
      id: Date.now() + Math.random(),
      type: 'LAUNDRY_BOOKED',
      timestamp,
      data: { recordId: record.id, guestId, time, laundryType, bagNumber },
      description: `Booked ${laundryType} laundry${time ? ` at ${time}` : ''} for guest`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const cancelLaundryRecord = async (recordId) => {
    const record = laundryRecords.find(r => r.id === recordId);
    if (!record) return false;
    setLaundryRecords(prev => prev.filter(r => r.id !== recordId));
    if (record.laundryType === 'onsite') {
      setLaundrySlots(prev => prev.filter(s => !(s.guestId === record.guestId && s.time === record.time)));
    }
    if (supabaseEnabled && supabase && !String(recordId).startsWith('local-')) {
      try {
  const { error } = await supabase.from('laundry_bookings').delete().eq('id', recordId);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to cancel laundry booking:', error);
        toast.error('Unable to cancel laundry booking.');
        return false;
      }
    }
    const action = {
      id: Date.now() + Math.random(),
      type: 'LAUNDRY_CANCELLED',
      timestamp: new Date().toISOString(),
      data: { recordId, guestId: record.guestId, time: record.time, laundryType: record.laundryType, snapshot: { ...record } },
      description: `Cancelled ${record.laundryType} laundry${record.time ? ` at ${record.time}` : ''}`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return true;
  };

  const rescheduleLaundry = async (recordId, { newTime = null, newLaundryType = null } = {}) => {
    const record = laundryRecords.find(r => r.id === recordId);
    if (!record) throw new Error('Laundry booking not found');
    const targetType = newLaundryType || record.laundryType;
    const targetTime = targetType === 'onsite' ? (newTime ?? record.time) : null;

    if (targetType === 'onsite') {
      if (!targetTime) throw new Error('A time slot is required for on-site laundry.');
      const slotTakenByOther = laundrySlots.some(s => s.time === targetTime && s.guestId !== record.guestId);
      if (slotTakenByOther) throw new Error('That laundry slot is already taken.');
      const onsiteSlots = laundrySlots.filter(s => s.laundryType === 'onsite');
      const isNewToOnsite = record.laundryType !== 'onsite';
      if (isNewToOnsite && onsiteSlots.length >= settings.maxOnsiteLaundrySlots) throw new Error('All on-site laundry slots are taken for today.');
    }

    const timestamp = new Date().toISOString();
    let updatedRecord = {
      ...record,
      laundryType: targetType,
      time: targetTime,
      status: targetType === 'onsite' ? LAUNDRY_STATUS.WAITING : LAUNDRY_STATUS.PENDING,
      lastUpdated: timestamp,
    };

    setLaundryRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r));

    setLaundrySlots(prev => {
      let next = prev.filter(s => !(s.guestId === record.guestId && s.time === record.time));
      if (targetType === 'onsite') {
        next = [...next, { guestId: record.guestId, time: targetTime, laundryType: 'onsite', bagNumber: record.bagNumber, status: LAUNDRY_STATUS.WAITING }];
      }
      return next;
    });

    if (supabaseEnabled && supabase && !String(recordId).startsWith('local-')) {
      try {
        const { data, error } = await supabase
          .from('laundry_bookings')
          .update({
            laundry_type: targetType,
            slot_label: targetTime,
            status: targetType === 'onsite' ? LAUNDRY_STATUS.WAITING : LAUNDRY_STATUS.PENDING,
            updated_at: timestamp,
          })
          .eq('id', recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapLaundryRow(data);
          updatedRecord = mapped;
          setLaundryRecords(prev => prev.map(r => r.id === recordId ? mapped : r));
        }
      } catch (error) {
        console.error('Failed to update laundry booking:', error);
        toast.error('Unable to update laundry booking.');
      }
    }
    const action = {
      id: Date.now() + Math.random(),
      type: 'LAUNDRY_RESCHEDULED',
      timestamp: new Date().toISOString(),
      data: { recordId, guestId: record.guestId, from: { type: record.laundryType, time: record.time }, to: { type: targetType, time: targetTime } },
      description: `Updated laundry to ${targetType}${targetTime ? ` at ${targetTime}` : ''}`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return updatedRecord;
  };

  const updateLaundryStatus = async (recordId, newStatus) => {
    let updatedRecordRef = null;
    setLaundryRecords(prev => prev.map(record => {
      if (record.id !== recordId) return record;
      const updated = { ...record, status: newStatus, lastUpdated: new Date().toISOString() };
      updatedRecordRef = updated;
      return updated;
    }));

    setLaundrySlots(prev => prev.map(slot => {
      const r = updatedRecordRef;
      if (r && slot.guestId === r.guestId && slot.time === r.time) {
        return { ...slot, status: newStatus, bagNumber: r.bagNumber };
      }
      return slot;
    }));
    if (supabaseEnabled && supabase && !String(recordId).startsWith('local-')) {
      try {
        const timestamp = new Date().toISOString();
        const { data, error } = await supabase
          .from('laundry_bookings')
          .update({ status: newStatus, updated_at: timestamp })
          .eq('id', recordId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const mapped = mapLaundryRow(data);
          setLaundryRecords(prev => prev.map(r => r.id === recordId ? mapped : r));
        }
      } catch (error) {
        console.error('Failed to update laundry status:', error);
        toast.error('Unable to update laundry status.');
      }
    }
  };

  const getTodayMetrics = () => {
    const today = todayPacificDateString();

    const todayMeals = mealRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today
    );
    const todayRvMeals = rvMealRecords.filter((r) => pacificDateStringFrom(r.date) === today);
    const todayUeMeals = unitedEffortMealRecords.filter((r) => pacificDateStringFrom(r.date) === today);
    const todayExtraMeals = extraMealRecords.filter((r) => pacificDateStringFrom(r.date) === today);
    const todayDayWorkerMeals = dayWorkerMealRecords.filter((r) => pacificDateStringFrom(r.date) === today);

    const todayShowers = showerRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today
    );
    const todayDoneShowers = todayShowers.filter((r) => r.status === 'done');

    const todayLaundry = laundryRecords.filter((r) => pacificDateStringFrom(r.date) === today);
    const countsAsLaundryLoad = (rec) => {
      if (rec.laundryType === 'onsite') {
        return rec.status === LAUNDRY_STATUS.DONE || rec.status === LAUNDRY_STATUS.PICKED_UP;
      }
      return true;
    };

    const todayHaircuts = haircutRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today
    );
    const todayHolidays = holidayRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today
    );
    const todayBicycles = bicycleRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today && (r.status ? r.status === BICYCLE_REPAIR_STATUS.DONE : true)
    );

    return {
      mealsServed: todayMeals.reduce((sum, record) => sum + record.count, 0)
        + todayRvMeals.reduce((s, r) => s + (r.count || 0), 0)
        + todayUeMeals.reduce((s, r) => s + (r.count || 0), 0)
        + todayExtraMeals.reduce((s, r) => s + (r.count || 0), 0)
        + todayDayWorkerMeals.reduce((s, r) => s + (r.count || 0), 0),
      showersBooked: todayDoneShowers.length,
      laundryLoads: todayLaundry.reduce((sum, r) => sum + (countsAsLaundryLoad(r) ? 1 : 0), 0),
      haircuts: todayHaircuts.length,
      holidays: todayHolidays.length,
      bicycles: todayBicycles.length,
    };
  };

  const getDateRangeMetrics = (startDate, endDate) => {
    const inRange = (iso) => {
      const d = pacificDateStringFrom(iso);
      return d >= startDate && d <= endDate;
    };

    const periodMeals = mealRecords.filter((r) => inRange(r.date));
    const periodRvMeals = rvMealRecords.filter((r) => inRange(r.date));
    const periodUeMeals = unitedEffortMealRecords.filter((r) => inRange(r.date));
    const periodExtraMeals = extraMealRecords.filter((r) => inRange(r.date));
    const periodDayWorkerMeals = dayWorkerMealRecords.filter((r) => inRange(r.date));
    const periodShowers = showerRecords.filter((r) => inRange(r.date));
    const periodLaundry = laundryRecords.filter((r) => inRange(r.date));
    const periodHaircuts = haircutRecords.filter((r) => inRange(r.date));
    const periodHolidays = holidayRecords.filter((r) => inRange(r.date));
    const periodBicycles = bicycleRecords.filter((r) => inRange(r.date) && (r.status ? r.status === BICYCLE_REPAIR_STATUS.DONE : true));

    const dailyMetrics = {};

    const countsAsLaundryLoad = (rec) => {
      if (rec.laundryType === 'onsite') {
        return rec.status === LAUNDRY_STATUS.DONE || rec.status === LAUNDRY_STATUS.PICKED_UP;
      }
      return true;
    };

    [...periodMeals, ...periodRvMeals, ...periodUeMeals, ...periodExtraMeals, ...periodDayWorkerMeals, ...periodShowers, ...periodLaundry].forEach((record) => {
      const date = pacificDateStringFrom(record.date);
      if (!dailyMetrics[date]) {
        dailyMetrics[date] = { meals: 0, showers: 0, laundry: 0, haircuts: 0, holidays: 0, bicycles: 0 };
      }

      if ('count' in record) {
        dailyMetrics[date].meals += record.count;
      } else if (periodShowers.some(s => s.id === record.id)) {
        dailyMetrics[date].showers += 1;
      } else if (periodLaundry.some(l => l.id === record.id)) {
        if (countsAsLaundryLoad(record)) dailyMetrics[date].laundry += 1;
      }
    });
    periodHaircuts.forEach((r) => {
      const date = pacificDateStringFrom(r.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = { meals: 0, showers: 0, laundry: 0, haircuts: 0, holidays: 0, bicycles: 0 };
      dailyMetrics[date].haircuts += 1;
    });
    periodHolidays.forEach((r) => {
      const date = pacificDateStringFrom(r.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = { meals: 0, showers: 0, laundry: 0, haircuts: 0, holidays: 0, bicycles: 0 };
      dailyMetrics[date].holidays += 1;
    });
    periodBicycles.forEach((r) => {
      const date = pacificDateStringFrom(r.date);
      if (!dailyMetrics[date]) dailyMetrics[date] = { meals: 0, showers: 0, laundry: 0, haircuts: 0, holidays: 0, bicycles: 0 };
      dailyMetrics[date].bicycles += 1;
    });

    const dailyBreakdown = Object.entries(dailyMetrics)
      .map(([date, metrics]) => ({ date, ...metrics }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      mealsServed: periodMeals.reduce((sum, record) => sum + record.count, 0)
        + periodRvMeals.reduce((s, r) => s + (r.count || 0), 0)
        + periodUeMeals.reduce((s, r) => s + (r.count || 0), 0)
        + periodExtraMeals.reduce((s, r) => s + (r.count || 0), 0)
        + periodDayWorkerMeals.reduce((s, r) => s + (r.count || 0), 0),
      showersBooked: periodShowers.length,
      laundryLoads: periodLaundry.reduce((sum, r) => sum + (countsAsLaundryLoad(r) ? 1 : 0), 0),
      haircuts: periodHaircuts.length,
      holidays: periodHolidays.length,
      bicycles: periodBicycles.length,
      dailyBreakdown,
    };
  };

  const getTodayLaundryWithGuests = () => {
    const today = todayPacificDateString();

    const todayLaundry = laundryRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today
    );

    return todayLaundry.map(record => {
      const guest = guests.find(g => g.id === record.guestId) || null;
      const legalName = guest?.name || `${toTitleCase(guest?.firstName || '')} ${toTitleCase(guest?.lastName || '')}`.trim() || 'Unknown Guest';
      const preferredName = normalizePreferredName(guest?.preferredName);
      const hasPreferred = Boolean(preferredName) && preferredName.toLowerCase() !== legalName.toLowerCase();
      const displayName = hasPreferred ? `${preferredName} (${legalName})` : legalName;
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
    if (!data || !data.length) return null;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(key => {
        const value = row[key];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  };

  const normalizeDonation = (str) => toTitleCase((str || '').trim());
  const isValidDonationType = (type) => DONATION_TYPES.includes(type);

  const addDonation = async ({ type, itemName, trays = 0, weightLbs = 0, donor }) => {
    const now = new Date().toISOString();
    const clean = {
      type: normalizeDonation(type),
      itemName: normalizeDonation(itemName),
      trays: Number(trays) || 0,
      weightLbs: Number(weightLbs) || 0,
      donor: normalizeDonation(donor),
      date: now,
    };
    if (!isValidDonationType(clean.type)) {
      throw new Error(`Invalid donation type. Allowed: ${DONATION_TYPES.join(', ')}`);
    }
    if (!clean.itemName) throw new Error('Donation item name is required');
    if (!clean.donor) throw new Error('Donation source (donor) is required');
    if (supabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('donations')
          .insert({
            donation_type: clean.type,
            item_name: clean.itemName,
            trays: clean.trays,
            weight_lbs: clean.weightLbs,
            donor: clean.donor,
            donated_at: now,
          })
          .select()
          .single();
        if (error) throw error;
        const mapped = mapDonationRow(data);
        setDonationRecords(prev => [mapped, ...prev]);
        setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'DONATION_ADDED', timestamp: now, data: { recordId: mapped.id }, description: `Donation: ${clean.itemName} (${clean.type})` }, ...prev.slice(0, 49)]);
        toast.success('Donation recorded');
        return mapped;
      } catch (error) {
        console.error('Failed to log donation in Supabase:', error);
        toast.error('Unable to record donation.');
        throw error;
      }
    }

    const fallback = { id: `local-${Date.now()}`, ...clean };
    setDonationRecords(prev => [fallback, ...prev]);
    setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'DONATION_ADDED', timestamp: now, data: { recordId: fallback.id }, description: `Donation: ${clean.itemName} (${clean.type})` }, ...prev.slice(0, 49)]);
    toast.success('Donation recorded');
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
    const todayRecs = donationRecords.filter(r => pacificDateStringFrom(r.date) === today);
    const map = new Map();
    for (const r of todayRecs) {
      const key = `${r.itemName}|${r.donor}`;
      if (!map.has(key)) {
        map.set(key, { itemName: r.itemName, donor: r.donor, type: r.type, trays: 0, weightLbs: 0, entries: 0 });
      }
      const entry = map.get(key);
      entry.trays += Number(r.trays) || 0;
      entry.weightLbs += Number(r.weightLbs) || 0;
      entry.entries += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
  };

  const getTodayDonationsByItem = () => {
    const today = todayPacificDateString();
    const todayRecs = donationRecords.filter(r => pacificDateStringFrom(r.date) === today);
    const map = new Map();
    for (const r of todayRecs) {
      const key = r.itemName;
      if (!map.has(key)) {
        map.set(key, { itemName: r.itemName, trays: 0, weightLbs: 0, entries: 0 });
      }
      const entry = map.get(key);
      entry.trays += Number(r.trays) || 0;
      entry.weightLbs += Number(r.weightLbs) || 0;
      entry.entries += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
  };

  const deleteSupabaseRecord = async (table, recordId, errorMessage) => {
    if (!supabaseEnabled || !supabase || recordId == null) return true;
    if (typeof recordId === 'string' && recordId.startsWith('local-')) return true;

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', recordId);

      if (error) {
        console.error(`Failed to delete record ${recordId} from ${table}:`, error);
        if (errorMessage) toast.error(errorMessage);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete record ${recordId} from ${table}:`, error);
      if (errorMessage) toast.error(errorMessage);
      return false;
    }
  };

  const undoAction = async (actionId) => {
    const action = actionHistory.find(a => a.id === actionId);
    if (!action) return false;

    try {
      switch (action.type) {
        case 'MEAL_ADDED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('meal_attendance', recordId, 'Unable to undo meal entry.');
          if (!deleted) return false;
          setMealRecords(prev => prev.filter(r => r.id !== recordId));
          break;
        }

        case 'RV_MEALS_ADDED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('meal_attendance', recordId, 'Unable to undo RV meal entry.');
          if (!deleted) return false;
          setRvMealRecords(prev => prev.filter(r => r.id !== recordId));
          break;
        }

        case 'UNITED_EFFORT_MEALS_ADDED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('meal_attendance', recordId, 'Unable to undo United Effort meal entry.');
          if (!deleted) return false;
          setUnitedEffortMealRecords(prev => prev.filter(r => r.id !== recordId));
          break;
        }

        case 'EXTRA_MEALS_ADDED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('meal_attendance', recordId, 'Unable to undo extra meal entry.');
          if (!deleted) return false;
          setExtraMealRecords(prev => prev.filter(r => r.id !== recordId));
          break;
        }
        case 'DAY_WORKER_MEALS_ADDED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('meal_attendance', recordId, 'Unable to undo day worker meal entry.');
          if (!deleted) return false;
          setDayWorkerMealRecords(prev => prev.filter(r => r.id !== recordId));
          break;
        }

        case 'BICYCLE_LOGGED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('bicycle_repairs', recordId, 'Unable to undo bicycle repair.');
          if (!deleted) return false;
          setBicycleRecords(prev => prev.filter(r => r.id !== recordId));
          toast.success('Reverted bicycle repair');
          break;
        }

        case 'HOLIDAY_LOGGED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('holiday_visits', recordId, 'Unable to undo holiday entry.');
          if (!deleted) return false;
          setHolidayRecords(prev => prev.filter(r => r.id !== recordId));
          toast.success('Reverted holiday service');
          break;
        }

        case 'HAIRCUT_LOGGED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('haircut_visits', recordId, 'Unable to undo haircut entry.');
          if (!deleted) return false;
          setHaircutRecords(prev => prev.filter(r => r.id !== recordId));
          toast.success('Reverted haircut service');
          break;
        }

        case 'SHOWER_BOOKED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('shower_reservations', recordId, 'Unable to undo shower booking.');
          if (!deleted) return false;
          setShowerRecords(prev => prev.filter(r => r.id !== recordId));
          setShowerSlots(prev => prev.filter(s =>
            !(s.guestId === action.data.guestId && s.time === action.data.time)
          ));
          toast.success('Removed shower booking');
          break;
        }

        case 'LAUNDRY_BOOKED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('laundry_bookings', recordId, 'Unable to undo laundry booking.');
          if (!deleted) return false;
          setLaundryRecords(prev => prev.filter(r => r.id !== recordId));
          setLaundrySlots(prev => prev.filter(s =>
            !(s.guestId === action.data.guestId && s.time === action.data.time)
          ));
          toast.success('Removed laundry booking');
          break;
        }

        case 'SHOWER_WAITLISTED': {
          const recordId = action.data?.recordId;
          const deleted = await deleteSupabaseRecord('shower_reservations', recordId, 'Unable to undo shower waitlist entry.');
          if (!deleted) return false;
          setShowerRecords(prev => prev.filter(r => r.id !== recordId));
          toast.success('Removed shower waitlist entry');
          break;
        }
        case 'SHOWER_CANCELLED': {
          const snap = action.data?.snapshot;
          if (!snap) return false;
          let restored = snap;
          if (supabaseEnabled && supabase && snap.id && !(typeof snap.id === 'string' && snap.id.startsWith('local-'))) {
            const payload = {
              id: snap.id,
              guest_id: snap.guestId,
              scheduled_time: snap.time ?? null,
              scheduled_for: snap.date ? snap.date.split('T')[0] : todayPacificDateString(),
              status: snap.status || 'booked',
              created_at: snap.createdAt || snap.date,
              updated_at: snap.lastUpdated || new Date().toISOString(),
            };
            try {
              const { data, error } = await supabase
                .from('shower_reservations')
                .upsert(payload, { onConflict: 'id' })
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                restored = mapShowerRow(data);
              }
            } catch (error) {
              console.error('Failed to restore shower booking in Supabase:', error);
              toast.error('Unable to restore shower booking.');
              return false;
            }
          }
          setShowerRecords(prev => [...prev, restored]);
          if (restored.time) {
            setShowerSlots(prev => [...prev, { guestId: restored.guestId, time: restored.time }]);
          }
          toast.success('Restored cancelled shower');
          break;
        }

        case 'SHOWER_RESCHEDULED': {
          const { recordId, guestId, from, to } = action.data || {};
          if (!recordId) return false;
          const targetTime = from ?? null;
          const timestamp = new Date().toISOString();
          let restoredRecord = null;
          if (supabaseEnabled && supabase && !(typeof recordId === 'string' && recordId.startsWith('local-'))) {
            try {
              const { data, error } = await supabase
                .from('shower_reservations')
                .update({ scheduled_time: targetTime, updated_at: timestamp })
                .eq('id', recordId)
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                restoredRecord = mapShowerRow(data);
              }
            } catch (error) {
              console.error('Failed to revert shower schedule in Supabase:', error);
              toast.error('Unable to undo shower reschedule.');
              return false;
            }
          }
          setShowerRecords(prev => prev.map(r => {
            if (r.id !== recordId) return r;
            if (restoredRecord) return restoredRecord;
            return { ...r, time: targetTime, lastUpdated: timestamp };
          }));
          setShowerSlots(prev => {
            const withoutNew = prev.filter(s => !(s.guestId === guestId && s.time === to));
            if (targetTime) {
              return [...withoutNew, { guestId, time: targetTime }];
            }
            return withoutNew;
          });
          toast.success('Reverted shower schedule');
          break;
        }

        case 'ITEM_GIVEN':
          {
            const recordId = action.data?.recordId;
            const deleted = await deleteSupabaseRecord('items_distributed', recordId, 'Unable to undo item distribution.');
            if (!deleted) return false;
            setItemGivenRecords(prev => prev.filter(r => r.id !== recordId));
            toast.success('Reverted item distribution');
          }
          break;
        case 'DONATION_ADDED':
          {
            const recordId = action.data?.recordId;
            const deleted = await deleteSupabaseRecord('donations', recordId, 'Unable to undo donation entry.');
            if (!deleted) return false;
            setDonationRecords(prev => prev.filter(r => r.id !== recordId));
            toast.success('Reverted donation');
          }
          break;
        case 'LAUNDRY_CANCELLED': {
          const snap = action.data?.snapshot;
          if (!snap) return false;
          let restored = snap;
          if (supabaseEnabled && supabase && snap.id && !(typeof snap.id === 'string' && snap.id.startsWith('local-'))) {
            const payload = {
              id: snap.id,
              guest_id: snap.guestId,
              slot_label: snap.laundryType === 'onsite' ? snap.time : null,
              laundry_type: snap.laundryType,
              bag_number: snap.bagNumber || null,
              scheduled_for: snap.date ? snap.date.split('T')[0] : todayPacificDateString(),
              status: snap.status,
              created_at: snap.createdAt || snap.date,
              updated_at: snap.lastUpdated || new Date().toISOString(),
            };
            try {
              const { data, error } = await supabase
                .from('laundry_bookings')
                .upsert(payload, { onConflict: 'id' })
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                restored = mapLaundryRow(data);
              }
            } catch (error) {
              console.error('Failed to restore laundry booking in Supabase:', error);
              toast.error('Unable to restore laundry booking.');
              return false;
            }
          }
          setLaundryRecords(prev => [...prev, restored]);
          if (restored.laundryType === 'onsite' && restored.time) {
            setLaundrySlots(prev => [...prev, { guestId: restored.guestId, time: restored.time, laundryType: 'onsite', bagNumber: restored.bagNumber, status: restored.status }]);
          }
          toast.success('Restored cancelled laundry');
          break;
        }

        case 'LAUNDRY_RESCHEDULED': {
          const { recordId, guestId, from, to } = action.data || {};
          if (!recordId) return false;
          const previousType = from?.type || null;
          const previousTime = from?.time || null;
          const timestamp = new Date().toISOString();
          const existingRecord = laundryRecords.find(r => r.id === recordId);
          let restoredRecord = null;
          if (supabaseEnabled && supabase && !(typeof recordId === 'string' && recordId.startsWith('local-'))) {
            try {
              const { data, error } = await supabase
                .from('laundry_bookings')
                .update({
                  laundry_type: previousType,
                  slot_label: previousType === 'onsite' ? previousTime : null,
                  status: previousType === 'onsite' ? LAUNDRY_STATUS.WAITING : LAUNDRY_STATUS.PENDING,
                  updated_at: timestamp,
                })
                .eq('id', recordId)
                .select()
                .maybeSingle();
              if (error) throw error;
              if (data) {
                restoredRecord = mapLaundryRow(data);
              }
            } catch (error) {
              console.error('Failed to revert laundry booking in Supabase:', error);
              toast.error('Unable to undo laundry reschedule.');
              return false;
            }
          }
          setLaundryRecords(prev => prev.map(r => {
            if (r.id !== recordId) return r;
            if (restoredRecord) return restoredRecord;
            return {
              ...r,
              laundryType: previousType,
              time: previousTime,
              status: previousType === 'onsite' ? LAUNDRY_STATUS.WAITING : LAUNDRY_STATUS.PENDING,
              lastUpdated: timestamp,
            };
          }));
          setLaundrySlots(prev => {
            const withoutNew = prev.filter(s => !(s.guestId === guestId && s.time === to?.time));
            if (previousType === 'onsite' && previousTime) {
              const slotBagNumber = restoredRecord?.bagNumber ?? existingRecord?.bagNumber ?? '';
              return [...withoutNew, { guestId, time: previousTime, laundryType: 'onsite', bagNumber: slotBagNumber, status: LAUNDRY_STATUS.WAITING }];
            }
            return withoutNew;
          });
          toast.success('Reverted laundry booking changes');
          break;
        }

        case 'LUNCH_BAGS_ADDED':
          {
            const recordId = action.data?.recordId;
            const deleted = await deleteSupabaseRecord('meal_attendance', recordId, 'Unable to undo lunch bag entry.');
            if (!deleted) return false;
            setLunchBagRecords(prev => prev.filter(r => r.id !== recordId));
            toast.success('Reverted lunch bag entry');
          }
          break;

        default:
          return false;
      }

      setActionHistory(prev => prev.filter(a => a.id !== actionId));
      return true;

    } catch (error) {
      console.error('Error undoing action:', error);
      return false;
    }
  };

  const clearActionHistory = () => {
    setActionHistory([]);
  };

  // TODO: Reintroduce multi-admin real-time sync using Supabase channels if needed

  const resetAllData = async (options = { local: true, supabase: false, keepGuests: false }) => {
    try {
      const { local = true, supabase: supabaseReset = false, keepGuests = false } = options || {};

      if (local) {
        // Clear in-memory state
        if (!keepGuests) setGuests([]);
        setMealRecords([]);
        setRvMealRecords([]);
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
        if (!keepGuests) localStorage.removeItem('hopes-corner-guests');
        localStorage.removeItem('hopes-corner-meal-records');
        localStorage.removeItem('hopes-corner-rv-meal-records');
        localStorage.removeItem('hopes-corner-united-effort-meal-records');
        localStorage.removeItem('hopes-corner-extra-meal-records');
        localStorage.removeItem('hopes-corner-day-worker-meal-records');
        localStorage.removeItem('hopes-corner-shower-records');
        localStorage.removeItem('hopes-corner-laundry-records');
        localStorage.removeItem('hopes-corner-bicycle-records');
        localStorage.removeItem('hopes-corner-holiday-records');
        localStorage.removeItem('hopes-corner-haircut-records');
        localStorage.removeItem('hopes-corner-item-records');
        localStorage.removeItem('hopes-corner-donation-records');
        localStorage.removeItem('hopes-corner-lunch-bag-records');
        // keep settings by default
      }

      if (supabaseReset && supabaseEnabled && supabase) {
        try {
          const tables = [
            { name: 'guests', keep: keepGuests },
            { name: 'meal_attendance' },
            { name: 'shower_reservations' },
            { name: 'laundry_bookings' },
            { name: 'bicycle_repairs' },
            { name: 'holiday_visits' },
            { name: 'haircut_visits' },
            { name: 'items_distributed' },
            { name: 'donations' },
          ];

          for (const table of tables) {
            if (table.keep) continue;
            const { data, error } = await supabase.from(table.name).select('id');
            if (error) {
              console.warn(`Failed to fetch ${table.name} for reset:`, error);
              continue;
            }
            const ids = (data || []).map(row => row.id).filter(Boolean);
            if (!ids.length) continue;
            const { error: deleteError } = await supabase.from(table.name).delete().in('id', ids);
            if (deleteError) {
              console.warn(`Failed to delete rows from ${table.name}:`, deleteError);
            }
          }

          const defaults = createDefaultSettings();
          const { error: settingsError } = await supabase
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
          if (settingsError) {
            console.warn('Failed to reset settings in Supabase:', settingsError);
          }
        } catch (err) {
          console.warn('Supabase reset failed:', err);
        }
      }

      toast.success('Data reset complete');
      return true;
    } catch (e) {
      console.error('Error resetting data:', e);
      toast.error('Failed to reset data');
      return false;
    }
  };

  const value = {
    // State
    guests,
    mealRecords,
    rvMealRecords,
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
    addMealRecord,
    addRvMealRecord,
    addUnitedEffortMealRecord,
    addExtraMealRecord,
    addDayWorkerMealRecord,
    addLunchBagRecord,
    addShowerRecord,
    addShowerWaitlist,
    addLaundryRecord,
    updateLaundryStatus,
    addBicycleRecord,
    updateBicycleRecord,
    deleteBicycleRecord,
    setBicycleStatus,
    moveBicycleRecord,
    addHolidayRecord,
    addHaircutRecord,
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
    getTodayLaundryWithGuests,
    exportDataAsCSV,
    getTodayDonationsByItem,
    actionHistory,
    undoAction,
    clearActionHistory
    ,resetAllData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
