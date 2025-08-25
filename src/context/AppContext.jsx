import React, { useState, useEffect } from 'react';
const firestoreEnabled = import.meta.env.VITE_USE_FIREBASE === 'true';
let __dbCache = null;
const ensureDb = async () => {
  if (!firestoreEnabled) return null;
  if (__dbCache) return __dbCache;
  try {
    const mod = await import('../firebase.js');
    __dbCache = mod.db;
    return __dbCache;
  } catch {
    return null;
  }
};
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

export const AppProvider = ({ children }) => {
  const [guests, setGuests] = useState([]);
  const [settings, setSettings] = useState({
    siteName: "Hope's Corner",
    maxOnsiteLaundrySlots: 5,
    enableOffsiteLaundry: true,
    uiDensity: 'comfortable',
    showCharts: true,
    defaultReportDays: 7,
    donationAutofill: true,
    defaultDonationType: 'Protein',
  });

  const [mealRecords, setMealRecords] = useState([]);
  const [rvMealRecords, setRvMealRecords] = useState([]);
  const [unitedEffortMealRecords, setUnitedEffortMealRecords] = useState([]);
  const [extraMealRecords, setExtraMealRecords] = useState([]);
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
          name: toTitleCase(guest.name || `${guest.firstName} ${guest.lastName}`)
        };
      }

      const nameParts = (guest.name || '').trim().split(/\s+/);
      const firstName = toTitleCase(nameParts[0] || '');
      const lastName = toTitleCase(nameParts.slice(1).join(' ') || '');

      return {
        ...guest,
        firstName,
        lastName,
        name: toTitleCase(guest.name || '')
      };
    });
  };


  useEffect(() => {
    try {
      const savedGuests = localStorage.getItem('hopes-corner-guests');
      if (firestoreEnabled && (!savedGuests || JSON.parse(savedGuests || '[]').length === 0)) {
        (async () => {
          try {
            const db = await ensureDb();
            if (db) {
              const { collection, getDocs } = await import('firebase/firestore');
              const snap = await getDocs(collection(db, 'guests'));
              const cloudGuests = snap.docs.map((d, idx) => {
                const data = d.data();
                let numericId = typeof data.id === 'number' ? data.id : (Date.now() + idx);
                return { ...data, id: numericId, docId: d.id };
              });
              if (cloudGuests && cloudGuests.length) {
                const migratedGuests = migrateGuestData(cloudGuests);
                const normalizedGuests = (migratedGuests || []).map(g => ({
                  ...g,
                  housingStatus: normalizeHousingStatus(g.housingStatus),
                }));
                setGuests(normalizedGuests);
              }
            }
          } catch {
            // ignore
          }
        })();
      }
      const savedMealRecords = localStorage.getItem('hopes-corner-meal-records');
      const savedRvMealRecords = localStorage.getItem('hopes-corner-rv-meal-records');
      const savedUnitedEffortMealRecords = localStorage.getItem('hopes-corner-united-effort-meal-records');
      const savedExtraMealRecords = localStorage.getItem('hopes-corner-extra-meal-records');
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
      if (savedShowerRecords) setShowerRecords(JSON.parse(savedShowerRecords));
      if (savedLaundryRecords) setLaundryRecords(JSON.parse(savedLaundryRecords));
      if (savedBicycleRecords) setBicycleRecords(JSON.parse(savedBicycleRecords));
      if (savedHolidayRecords) setHolidayRecords(JSON.parse(savedHolidayRecords));
      if (savedHaircutRecords) setHaircutRecords(JSON.parse(savedHaircutRecords));
      if (savedItemRecords) setItemGivenRecords(JSON.parse(savedItemRecords));
      if (savedSettings) setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      if (savedDonations) setDonationRecords(JSON.parse(savedDonations));
      if (savedLunchBags) setLunchBagRecords(JSON.parse(savedLunchBags));
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);

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

  useEffect(() => {
    try {
      localStorage.setItem('hopes-corner-guests', JSON.stringify(guests));
      localStorage.setItem('hopes-corner-meal-records', JSON.stringify(mealRecords));
      localStorage.setItem('hopes-corner-rv-meal-records', JSON.stringify(rvMealRecords));
      localStorage.setItem('hopes-corner-united-effort-meal-records', JSON.stringify(unitedEffortMealRecords));
      localStorage.setItem('hopes-corner-extra-meal-records', JSON.stringify(extraMealRecords));
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
  }, [guests, mealRecords, rvMealRecords, showerRecords, laundryRecords, bicycleRecords, holidayRecords, haircutRecords, itemGivenRecords, donationRecords, unitedEffortMealRecords, extraMealRecords, lunchBagRecords, settings]);


  const generateShowerSlots = () => {
    const start = 9 * 60;
    const end = 12 * 60;
    const slots = [];
    for (let t = start; t < end; t += 15) {
      const hours = Math.floor(t / 60);
      const minutes = t % 60;
      slots.push(`${hours}:${minutes.toString().padStart(2, "0")}`);
    }
    return slots;
  };

  const generateLaundrySlots = () => {
    return [
      '8:00 - 9:00',
      '8:30 - 9:30',
      '9:30 - 10:30',
      '10:00 - 11:00',
      '10:30 - 11:30'
    ];
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

  const addGuest = (guest) => {
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

    const takenIds = new Set(guests.map(g => g.guestId));
    const finalGuestId = generateUniqueGuestId(guest.guestId, takenIds);

    const newGuest = {
      id: Date.now(),
      guestId: finalGuestId,
      ...guest,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      createdAt: new Date().toISOString(),
    };
    setGuests([...guests, newGuest]);
    if (firestoreEnabled) {
      ensureDb().then(async (db) => {
        try {
          if (!db) return;
          const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
          await addDoc(collection(db, 'guests'), {
            ...newGuest,
            createdAt: serverTimestamp(),
          });
        } catch {
          // ignore
        }
      });
    }
    return newGuest;
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
        notes: (row.notes || '').trim(),
        createdAt: new Date().toISOString(),
      };
    });

    setGuests([...guests, ...newGuests]);
    return newGuests;
  };

  const isSameDay = (iso1, iso2) => iso1.split('T')[0] === iso2.split('T')[0];
  const addBicycleRecord = (guestId, { repairType = 'Flat Tire', notes = '' } = {}) => {
    const now = new Date().toISOString();
    // Allow multiple repairs per day; no uniqueness constraint.
    const record = {
      id: Date.now(),
      guestId,
      date: now,
      type: 'bicycle',
      repairType,
      notes,
      status: BICYCLE_REPAIR_STATUS.PENDING,
      priority: (bicycleRecords[0]?.priority || 0) + 1 // higher number = higher priority
    };
    setBicycleRecords(prev => [record, ...prev]);
    setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'BICYCLE_LOGGED', timestamp: now, data: { recordId: record.id, guestId }, description: `Logged bicycle repair (${repairType})` }, ...prev.slice(0, 49)]);
    toast.success('Bicycle repair added');
    return record;
  };

  const updateBicycleRecord = (recordId, updates) => {
    setBicycleRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
  };

  const deleteBicycleRecord = (recordId) => {
    setBicycleRecords(prev => prev.filter(r => r.id !== recordId));
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
  const addHolidayRecord = (guestId) => {
    const now = new Date().toISOString();
    const already = holidayRecords.some(r => r.guestId === guestId && isSameDay(r.date, now));
    if (already) {
      toast.error('Holiday already logged today');
      return null;
    }
    const record = { id: Date.now(), guestId, date: now, type: 'holiday' };
    setHolidayRecords(prev => [record, ...prev]);
    setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'HOLIDAY_LOGGED', timestamp: now, data: { recordId: record.id, guestId }, description: 'Logged holiday service' }, ...prev.slice(0, 49)]);
    toast.success('Holiday logged');
    return record;
  };
  const addHaircutRecord = (guestId) => {
    const now = new Date().toISOString();
    const already = haircutRecords.some(r => r.guestId === guestId && isSameDay(r.date, now));
    if (already) {
      toast.error('Haircut already logged today');
      return null;
    }
    const record = { id: Date.now(), guestId, date: now, type: 'haircut' };
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
    if (item === 'sleeping_bag' || item === 'backpack') {
      const next = new Date(last);
      next.setMonth(last.getMonth() + 1);
      next.setDate(1);
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
  const giveItem = (guestId, item) => {
    if (!canGiveItem(guestId, item)) {
      throw new Error('Limit reached for this item based on last given date.');
    }
    const record = { id: Date.now(), guestId, item, date: new Date().toISOString() };
    setItemGivenRecords(prev => [record, ...prev]);
    setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'ITEM_GIVEN', timestamp: new Date().toISOString(), data: { recordId: record.id, guestId, item }, description: `Gave ${item.replace('_', ' ')}` }, ...prev.slice(0, 49)]);
    return record;
  };

  const updateGuest = (id, updates) => {
    setGuests(
      guests.map((guest) => (guest.id === id ? { ...guest, ...updates } : guest))
    );
  };

  const removeGuest = (id) => {
    setGuests(guests.filter((guest) => guest.id !== id));
  };

  const addMealRecord = (guestId, count) => {
    const record = {
      id: Date.now(),
      guestId,
      count,
      date: new Date().toISOString(),
    };
    setMealRecords([...mealRecords, record]);

    const action = {
      id: Date.now() + Math.random(),
      type: 'MEAL_ADDED',
      timestamp: new Date().toISOString(),
      data: { recordId: record.id, guestId, count },
      description: `Added ${count} meal${count > 1 ? 's' : ''} for guest`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const addRvMealRecord = (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();
    const iso = dateOverride ? makeISOForDate(dateOverride) : new Date().toISOString();
    const record = {
      id: Date.now(),
      count: parseInt(count),
      date: iso,
      type: 'rv_meals'
    };
    setRvMealRecords([...rvMealRecords, record]);

    const action = {
      id: Date.now() + Math.random(),
      type: 'RV_MEALS_ADDED',
      timestamp: new Date().toISOString(),
      data: { recordId: record.id, count: parseInt(count) },
      description: `Added ${count} RV meals`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const addUnitedEffortMealRecord = (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();
    const iso = dateOverride ? makeISOForDate(dateOverride) : new Date().toISOString();
    const record = {
      id: Date.now(),
      count: parseInt(count),
      date: iso,
      type: 'united_effort_meals'
    };
    setUnitedEffortMealRecords([...unitedEffortMealRecords, record]);

    const action = {
      id: Date.now() + Math.random(),
      type: 'UNITED_EFFORT_MEALS_ADDED',
      timestamp: new Date().toISOString(),
      data: { recordId: record.id, count: parseInt(count) },
      description: `Added ${count} United Effort meals`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const addExtraMealRecord = (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => new Date(`${dateStr}T12:00:00`).toISOString();
    const iso = dateOverride ? makeISOForDate(dateOverride) : new Date().toISOString();
    const record = {
      id: Date.now(),
      count: parseInt(count),
      date: iso,
      type: 'extra_meals'
    };
    setExtraMealRecords([...extraMealRecords, record]);

    const action = {
      id: Date.now() + Math.random(),
      type: 'EXTRA_MEALS_ADDED',
      timestamp: new Date().toISOString(),
      data: { recordId: record.id, count: parseInt(count) },
      description: `Added ${count} extra meals`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const addLunchBagRecord = (count, dateOverride = null) => {
    const makeISOForDate = (dateStr) => {
      const d = new Date(`${dateStr}T12:00:00`);
      return d.toISOString();
    };
    const iso = dateOverride ? makeISOForDate(dateOverride) : new Date().toISOString();
    const record = {
      id: Date.now(),
      count: parseInt(count),
      date: iso,
      type: 'lunch_bags'
    };
    if (!record.count || record.count <= 0) throw new Error('Invalid lunch bag count');
    setLunchBagRecords(prev => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: 'LUNCH_BAGS_ADDED',
      timestamp: new Date().toISOString(),
      data: { recordId: record.id, count: record.count, date: dateOverride },
      description: `Added ${record.count} lunch bag${record.count > 1 ? 's' : ''}${dateOverride ? ` on ${dateOverride}` : ''}`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const addShowerRecord = (guestId, time) => {
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

    const record = {
      id: Date.now(),
      guestId,
      time,
      date: new Date().toISOString(),
      status: 'booked',
    };

    setShowerRecords([...showerRecords, record]);
    setShowerSlots([...showerSlots, { guestId, time }]);

    const action = {
      id: Date.now() + Math.random(),
      type: 'SHOWER_BOOKED',
      timestamp: new Date().toISOString(),
      data: { recordId: record.id, guestId, time },
      description: `Booked shower at ${time} for guest`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const addShowerWaitlist = (guestId) => {
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
    setShowerRecords(prev => [...prev, record]);
    const action = {
      id: Date.now() + Math.random(),
      type: 'SHOWER_WAITLISTED',
      timestamp: new Date().toISOString(),
      data: { recordId: record.id, guestId },
      description: 'Added to shower waitlist'
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return record;
  };

  const cancelShowerRecord = (recordId) => {
    const record = showerRecords.find(r => r.id === recordId);
    if (!record) return false;
    setShowerRecords(prev => prev.filter(r => r.id !== recordId));
    setShowerSlots(prev => prev.filter(s => !(s.guestId === record.guestId && s.time === record.time)));
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

  const rescheduleShower = (recordId, newTime) => {
    const record = showerRecords.find(r => r.id === recordId);
    if (!record) throw new Error('Shower booking not found');
    if (record.time === newTime) return record;
    const countAtNew = showerSlots.filter(s => s.time === newTime && s.guestId !== record.guestId).length;
    if (countAtNew >= 2) throw new Error('That time slot is full.');
    setShowerRecords(prev => prev.map(r => r.id === recordId ? { ...r, time: newTime } : r));
    setShowerSlots(prev => {
      const filtered = prev.filter(s => !(s.guestId === record.guestId && s.time === record.time));
      return [...filtered, { guestId: record.guestId, time: newTime }];
    });
    const action = {
      id: Date.now() + Math.random(),
      type: 'SHOWER_RESCHEDULED',
      timestamp: new Date().toISOString(),
      data: { recordId, guestId: record.guestId, from: record.time, to: newTime },
      description: `Rescheduled shower ${record.time} → ${newTime}`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return { ...record, time: newTime };
  };

  const updateShowerStatus = (recordId, newStatus) => {
    setShowerRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: newStatus, lastUpdated: new Date().toISOString() } : r));
  };

  const addLaundryRecord = (guestId, time, laundryType, bagNumber = '') => {
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

    const record = {
      id: Date.now(),
      guestId,
      time: laundryType === 'onsite' ? time : null,
      laundryType,
      bagNumber,
      date: new Date().toISOString(),
      status: laundryType === 'onsite' ? LAUNDRY_STATUS.WAITING : LAUNDRY_STATUS.PENDING,
    };

    setLaundryRecords([...laundryRecords, record]);
    if (laundryType === 'onsite') {
      setLaundrySlots([...laundrySlots, { guestId, time, laundryType, bagNumber, status: record.status }]);
    }

    const action = {
      id: Date.now() + Math.random(),
      type: 'LAUNDRY_BOOKED',
      timestamp: new Date().toISOString(),
      data: { recordId: record.id, guestId, time, laundryType, bagNumber },
      description: `Booked ${laundryType} laundry${time ? ` at ${time}` : ''} for guest`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);

    return record;
  };

  const cancelLaundryRecord = (recordId) => {
    const record = laundryRecords.find(r => r.id === recordId);
    if (!record) return false;
    setLaundryRecords(prev => prev.filter(r => r.id !== recordId));
    if (record.laundryType === 'onsite') {
      setLaundrySlots(prev => prev.filter(s => !(s.guestId === record.guestId && s.time === record.time)));
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

  const rescheduleLaundry = (recordId, { newTime = null, newLaundryType = null } = {}) => {
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

    setLaundryRecords(prev => prev.map(r => {
      if (r.id !== recordId) return r;
      const updated = { ...r, laundryType: targetType, time: targetTime };
      updated.status = targetType === 'onsite' ? LAUNDRY_STATUS.WAITING : LAUNDRY_STATUS.PENDING;
      updated.lastUpdated = new Date().toISOString();
      return updated;
    }));

    setLaundrySlots(prev => {
      let next = prev.filter(s => !(s.guestId === record.guestId && s.time === record.time));
      if (targetType === 'onsite') {
        next = [...next, { guestId: record.guestId, time: targetTime, laundryType: 'onsite', bagNumber: record.bagNumber, status: LAUNDRY_STATUS.WAITING }];
      }
      return next;
    });

    const action = {
      id: Date.now() + Math.random(),
      type: 'LAUNDRY_RESCHEDULED',
      timestamp: new Date().toISOString(),
      data: { recordId, guestId: record.guestId, from: { type: record.laundryType, time: record.time }, to: { type: targetType, time: targetTime } },
      description: `Updated laundry to ${targetType}${targetTime ? ` at ${targetTime}` : ''}`
    };
    setActionHistory(prev => [action, ...prev.slice(0, 49)]);
    return { ...record, laundryType: targetType, time: targetTime };
  };

  const updateLaundryStatus = (recordId, newStatus) => {
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
  };

  const getTodayMetrics = () => {
    const today = todayPacificDateString();

    const todayMeals = mealRecords.filter(
      (r) => pacificDateStringFrom(r.date) === today
    );
    const todayRvMeals = rvMealRecords.filter((r) => pacificDateStringFrom(r.date) === today);
    const todayUeMeals = unitedEffortMealRecords.filter((r) => pacificDateStringFrom(r.date) === today);
    const todayExtraMeals = extraMealRecords.filter((r) => pacificDateStringFrom(r.date) === today);

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
        + todayExtraMeals.reduce((s, r) => s + (r.count || 0), 0),
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

    [...periodMeals, ...periodRvMeals, ...periodUeMeals, ...periodExtraMeals, ...periodShowers, ...periodLaundry].forEach((record) => {
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
        + periodExtraMeals.reduce((s, r) => s + (r.count || 0), 0),
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
      const guest = guests.find(g => g.id === record.guestId) || { name: 'Unknown Guest' };
      return {
        ...record,
        guestName: guest.name
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

  const addDonation = ({ type, itemName, trays = 0, weightLbs = 0, donor }) => {
    const now = new Date().toISOString();
    const clean = {
      id: Date.now(),
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
    setDonationRecords(prev => [clean, ...prev]);
    setActionHistory(prev => [{ id: Date.now() + Math.random(), type: 'DONATION_ADDED', timestamp: now, data: { recordId: clean.id }, description: `Donation: ${clean.itemName} (${clean.type})` }, ...prev.slice(0, 49)]);
    toast.success('Donation recorded');
    return clean;
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

  const undoAction = (actionId) => {
    const action = actionHistory.find(a => a.id === actionId);
    if (!action) return false;

    try {
      switch (action.type) {
        case 'MEAL_ADDED':
          setMealRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          break;

        case 'RV_MEALS_ADDED':
          setRvMealRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          break;

        case 'UNITED_EFFORT_MEALS_ADDED':
          setUnitedEffortMealRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          break;

        case 'EXTRA_MEALS_ADDED':
          setExtraMealRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          break;

        case 'SHOWER_BOOKED':
          setShowerRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          setShowerSlots(prev => prev.filter(s =>
            !(s.guestId === action.data.guestId && s.time === action.data.time)
          ));
          break;

        case 'LAUNDRY_BOOKED':
          setLaundryRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          setLaundrySlots(prev => prev.filter(s =>
            !(s.guestId === action.data.guestId && s.time === action.data.time)
          ));
          break;

        case 'SHOWER_WAITLISTED':
          setShowerRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          break;
        case 'SHOWER_CANCELLED': {
          const snap = action.data?.snapshot;
          if (!snap) return false;
          setShowerRecords(prev => [...prev, snap]);
          if (snap.time) {
            setShowerSlots(prev => [...prev, { guestId: snap.guestId, time: snap.time }]);
          }
          toast.success('Restored cancelled shower');
          break;
        }

        case 'ITEM_GIVEN':
          setItemGivenRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          toast.success('Reverted item distribution');
          break;
        case 'DONATION_ADDED':
          setDonationRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          toast.success('Reverted donation');
          break;
        case 'LAUNDRY_CANCELLED': {
          const snap = action.data?.snapshot;
          if (!snap) return false;
          setLaundryRecords(prev => [...prev, snap]);
          if (snap.laundryType === 'onsite' && snap.time) {
            setLaundrySlots(prev => [...prev, { guestId: snap.guestId, time: snap.time, laundryType: 'onsite', bagNumber: snap.bagNumber, status: snap.status }]);
          }
          toast.success('Restored cancelled laundry');
          break;
        }
        case 'LUNCH_BAGS_ADDED':
          setLunchBagRecords(prev => prev.filter(r => r.id !== action.data.recordId));
          toast.success('Reverted lunch bag entry');
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
    updateSettings: (partial) => setSettings(prev => ({ ...prev, ...partial })),

    addGuest,
    importGuestsFromCSV,
    updateGuest,
    removeGuest,
    addMealRecord,
    addRvMealRecord,
    addUnitedEffortMealRecord,
    addExtraMealRecord,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
