import React, { useState, useMemo, useRef } from 'react';
import { todayPacificDateString, pacificDateStringFrom } from '../utils/date';
import { animated as Animated } from '@react-spring/web';
import { useStagger, SpringIcon } from '../utils/animations';
import toast from 'react-hot-toast';
import {
  User,
  Home,
  MapPin,
  Phone,
  CalendarClock,
  Utensils,
  ShowerHead,
  WashingMachine,
  Search,
  ChevronDown,
  ChevronUp,
  UserPlus,
  X,
  AlertCircle,
  Plus,
  PlusCircle,
  Eraser,
  Scissors,
  Gift,
  Bike,
} from 'lucide-react';
import { useAppContext } from '../context/useAppContext';
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from '../context/constants';
import Selectize from './Selectize';

const GuestList = () => {
  const {
    guests,
    mealRecords,
    extraMealRecords,
    showerRecords,
    laundryRecords,
    holidayRecords,
    haircutRecords,
    bicycleRecords,
    setShowerPickerGuest,
    setLaundryPickerGuest,
    addMealRecord,
    addExtraMealRecord,
    addGuest,
    setBicyclePickerGuest,
  } = useAppContext();
  const { addHaircutRecord, addHolidayRecord } = useAppContext();
  const { updateGuest, removeGuest } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGuest, setExpandedGuest] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createFormData, setCreateFormData] = useState({
    firstName: '',
    lastName: '',
    housingStatus: 'Unhoused',
    location: '',
    age: '',
    gender: '',
    notes: '',
  });

  const [editingGuestId, setEditingGuestId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    housingStatus: 'Unhoused',
    location: '',
    age: '',
    gender: '',
    notes: '',
  });

  const BAY_AREA_CITIES = [
    'Antioch',
    'Berkeley',
    'Concord',
    'Daly City',
    'Fremont',
    'Hayward',
    'Livermore',
    'Mountain View',
    'Palo Alto',
    'Oakland',
    'Redwood City',
    'Richmond',
    'San Francisco',
    'San Jose',
    'San Leandro',
    'San Mateo',
    'Santa Clara',
    'Santa Rosa',
    'Sunnyvale',
    'Vallejo',
    'Walnut Creek',
  ];

  const guestsList = useMemo(() => guests || [], [guests]);

  const searchInputRef = useRef(null);

  const filteredGuests = useMemo(() => {
    const queryRaw = searchTerm.trim();
    if (!queryRaw) {
      return [];
    }

    const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ');
    const query = normalize(queryRaw);
    const qTokens = query.split(' ').filter(Boolean);

    const scored = guestsList.map((g) => {
      if (!g.firstName || !g.lastName) {
        return { guest: g, rank: 99, name: g.name || 'Unknown' };
      }

      const firstName = normalize(g.firstName);
      const lastName = normalize(g.lastName);
      const fullName = normalize(`${g.firstName} ${g.lastName}`);

      if (qTokens.length >= 2) {
        const [firstQuery, lastQuery] = qTokens;
        if (!firstQuery || !lastQuery || !firstName || !lastName) {
          return { guest: g, rank: 99, name: fullName };
        }
        if (firstName === firstQuery && lastName === lastQuery) {
          return { guest: g, rank: 0, name: fullName };
        }
        if (firstName.startsWith(firstQuery) && lastName.startsWith(lastQuery)) {
          return { guest: g, rank: 1, name: fullName };
        }
        if (firstQuery.length >= 3 && lastQuery.length >= 3 &&
          firstName.includes(firstQuery) && lastName.includes(lastQuery)) {
          return { guest: g, rank: 2, name: fullName };
        }
        return { guest: g, rank: 99, name: fullName };
      }

      const singleQuery = qTokens[0];
      if (!singleQuery || !firstName || !lastName) {
        return { guest: g, rank: 99, name: fullName };
      }

      if (firstName === singleQuery || lastName === singleQuery) {
        return { guest: g, rank: 0, name: fullName };
      }

      if (firstName.startsWith(singleQuery) || lastName.startsWith(singleQuery)) {
        return { guest: g, rank: 1, name: fullName };
      }

      if (singleQuery.length >= 3 && (firstName.includes(singleQuery) || lastName.includes(singleQuery))) {
        return { guest: g, rank: 2, name: fullName };
      }

      return { guest: g, rank: 99, name: fullName };
    })
      .filter(item => item.rank < 99)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.name.localeCompare(b.name);
      });

    return scored.map(s => s.guest);
  }, [guestsList, searchTerm]);

  const trail = useStagger((filteredGuests || []).length, true);

  const shouldShowCreateOption =
    searchTerm.trim().length > 2 && filteredGuests.length === 0 && searchTerm.includes(' ');

  const toggleExpanded = (guestId) => {
    setExpandedGuest(expandedGuest === guestId ? null : guestId);
  };

  const [pendingMealGuests, setPendingMealGuests] = useState(new Set());

  const handleMealSelection = (guestId, count) => {
    if (pendingMealGuests.has(guestId)) return;
    const today = todayPacificDateString();
    const alreadyHasMeal = mealRecords.some(record => record.guestId === guestId && pacificDateStringFrom(record.date) === today);

    if (alreadyHasMeal) {
      toast.error('Guest already received meals today. Only one meal per day is allowed.');
      return;
    }

    try {
      setPendingMealGuests(prev => {
        const next = new Set(prev);
        next.add(guestId);
        return next;
      });
      const rec = addMealRecord(guestId, count);
      if (rec) toast.success(`${count} meal${count > 1 ? 's' : ''} logged for guest!`);
    } catch (error) {
      toast.error(`Error logging meals: ${error.message}`);
    }
  };

  const handleAddExtraMeals = (guestId, count) => {
    try {
      addExtraMealRecord(guestId, count);
      toast.success(`${count} extra meal${count > 1 ? 's' : ''} added!`);
    } catch (error) {
      toast.error(`Error adding extra meals: ${error.message}`);
    }
  };

  const toTitleCase = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  };

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    []
  );

  const formatStatusLabel = (value) => {
    if (!value) return '';
    return value
      .toString()
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatRelativeTime = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60 * 1000) return 'just now';
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} wk${weeks === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mo${months === 1 ? '' : 's'} ago`;
    const years = Math.floor(days / 365);
    return `${years} yr${years === 1 ? '' : 's'} ago`;
  };

  const latestServiceByGuest = useMemo(() => {
    const map = new Map();
    const addCandidate = (guestId, dateValue, summary, icon, iconClass = '') => {
      if (!guestId || !dateValue) return;
      const resolvedDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (Number.isNaN(resolvedDate.getTime())) return;
      const key = String(guestId);
      const existing = map.get(key);
      if (!existing || resolvedDate > existing.date) {
        map.set(key, { summary, icon, iconClass, date: resolvedDate });
      }
    };

    mealRecords.forEach((record) => {
      if (!record?.guestId) return;
      const summary = `Meal${record.count > 1 ? `s (${record.count})` : ''}`;
      addCandidate(record.guestId, record.date, summary, Utensils, 'text-green-600');
    });

    extraMealRecords.forEach((record) => {
      if (!record?.guestId) return;
      const summary = `Extra meals${record.count ? ` (${record.count})` : ''}`;
      addCandidate(record.guestId, record.date, summary, Utensils, 'text-green-500');
    });

    showerRecords.forEach((record) => {
      if (!record?.guestId) return;
      const statusLabel = formatStatusLabel(record.status);
      const summary = statusLabel ? `Shower (${statusLabel})` : 'Shower';
      addCandidate(record.guestId, record.date, summary, ShowerHead, 'text-emerald-600');
    });

    laundryRecords.forEach((record) => {
      if (!record?.guestId) return;
      const typeLabel = record.laundryType === 'offsite' ? 'Off-site' : 'On-site';
      const statusLabel = formatStatusLabel(record.status);
      const detailText = [typeLabel, statusLabel].filter(Boolean).join(' · ');
      const summary = detailText ? `Laundry (${detailText})` : 'Laundry';
      addCandidate(record.guestId, record.date, summary, WashingMachine, 'text-emerald-700');
    });

    holidayRecords.forEach((record) => {
      if (!record?.guestId) return;
      addCandidate(record.guestId, record.date, 'Holiday service', Gift, 'text-amber-500');
    });

    haircutRecords.forEach((record) => {
      if (!record?.guestId) return;
      addCandidate(record.guestId, record.date, 'Haircut', Scissors, 'text-pink-500');
    });

    bicycleRecords.forEach((record) => {
      if (!record?.guestId) return;
      const summary = record.repairType ? `Bicycle repair (${record.repairType})` : 'Bicycle repair';
      addCandidate(record.guestId, record.date, summary, Bike, 'text-sky-500');
    });

    return map;
  }, [mealRecords, extraMealRecords, showerRecords, laundryRecords, holidayRecords, haircutRecords, bicycleRecords]);

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNameBlur = (e) => {
    const { name, value } = e.target;
    if ((name === 'firstName' || name === 'lastName') && value.trim()) {
      setCreateFormData((prev) => ({
        ...prev,
        [name]: toTitleCase(value.trim())
      }));
    }
  };

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createFormData.firstName.trim() || !createFormData.lastName.trim()) {
      setCreateError('Please enter both first and last name');
      return;
    }
    if (!createFormData.location.trim()) {
      setCreateError('Location is required');
      return;
    }
    if (!createFormData.age) {
      setCreateError('Age group is required');
      return;
    }
    if (!createFormData.gender) {
      setCreateError('Gender is required');
      return;
    }
    setIsCreating(true);
    try {
      const guestData = {
        ...createFormData,
        name: `${createFormData.firstName.trim()} ${createFormData.lastName.trim()}`
      };
      const newGuest = addGuest(guestData);
      setCreateFormData({ firstName: '', lastName: '', housingStatus: 'Unhoused', location: '', age: '', gender: '', notes: '' });
      setShowCreateForm(false);
      setSearchTerm(newGuest.name || `${guestData.firstName} ${guestData.lastName}`.trim());
      setExpandedGuest(newGuest.id);
    } catch (err) {
      setCreateError(`Error creating guest: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowCreateForm = () => {
    const searchParts = searchTerm.trim().split(/\s+/);
    const firstName = searchParts[0] || '';
    const lastName = searchParts.slice(1).join(' ') || '';

    setCreateFormData((prev) => ({
      ...prev,
      firstName: firstName,
      lastName: lastName
    }));
    setShowCreateForm(true);
    setCreateError('');
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCreateFormData({ firstName: '', lastName: '', housingStatus: 'Unhoused', location: '', age: '', gender: '', notes: '' });
    setCreateError('');
  };

  const startEditingGuest = (guest) => {
    setEditingGuestId(guest.id);
    setEditFormData({
      firstName: guest.firstName || '',
      lastName: guest.lastName || '',
      housingStatus: guest.housingStatus || 'Unhoused',
      location: guest.location || '',
      age: guest.age || '',
      gender: guest.gender || '',
      notes: guest.notes || '',
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditNameBlur = (e) => {
    const { name, value } = e.target;
    if ((name === 'firstName' || name === 'lastName') && value.trim()) {
      setEditFormData((prev) => ({ ...prev, [name]: toTitleCase(value.trim()) }));
    }
  };

  const saveEditedGuest = () => {
    if (!editFormData.firstName.trim() || !editFormData.lastName.trim()) {
      toast.error('Please enter both first and last name');
      return;
    }
    if (!editFormData.age || !editFormData.gender) {
      toast.error('Please select age and gender');
      return;
    }
    const updates = {
      ...editFormData,
      firstName: toTitleCase(editFormData.firstName.trim()),
      lastName: toTitleCase(editFormData.lastName.trim()),
      name: `${toTitleCase(editFormData.firstName.trim())} ${toTitleCase(editFormData.lastName.trim())}`.trim(),
    };
    updateGuest(editingGuestId, updates);
    toast.success('Guest updated');
    setEditingGuestId(null);
  };

  const cancelEditing = () => setEditingGuestId(null);

  const deleteGuest = (guest) => {
    const confirmed = window.confirm(`Delete ${guest.name}? This cannot be undone.`);
    if (!confirmed) return;
    removeGuest(guest.id);
    toast.success('Guest deleted');
    if (expandedGuest === guest.id) setExpandedGuest(null);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, initials (e.g., 'John', 'Smith', 'JS')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ref={searchInputRef}
            className="w-full pl-12 pr-14 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); searchInputRef.current && searchInputRef.current.focus(); }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
              title="Clear"
            >
              <SpringIcon>
                <Eraser size={18} />
              </SpringIcon>
            </button>
          )}
        </div>
      </div>



      {shouldShowCreateOption && !showCreateForm && (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <UserPlus size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">No guest found for "{searchTerm}"</h3>
              <p className="text-blue-700 mb-4">Would you like to create a new guest with this name?</p>
              <button
                onClick={handleShowCreateForm}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={18} /> Create New Guest
              </button>
            </div>
          </div>
        </div>
      )}


      {showCreateForm && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus size={20} className="text-blue-600" /> Create New Guest
            </h3>
            <button onClick={handleCancelCreate} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          {createError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              <span className="text-red-800">{createError}</span>
            </div>
          )}
          <form onSubmit={handleCreateGuest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">First Name*</label>
                <input
                  type="text"
                  name="firstName"
                  value={createFormData.firstName}
                  onChange={handleCreateFormChange}
                  onBlur={handleNameBlur}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter first name"
                  required
                  disabled={isCreating}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name*</label>
                <input
                  type="text"
                  name="lastName"
                  value={createFormData.lastName}
                  onChange={handleCreateFormChange}
                  onBlur={handleNameBlur}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter last name"
                  required
                  disabled={isCreating}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Housing Status</label>
                <select
                  name="housingStatus"
                  value={createFormData.housingStatus}
                  onChange={handleCreateFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isCreating}
                >
                  {HOUSING_STATUSES.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Age Group*</label>
                <select
                  name="age"
                  value={createFormData.age}
                  onChange={handleCreateFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isCreating}
                  required
                >
                  <option value="">Select age group</option>
                  {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender*</label>
                <select
                  name="gender"
                  value={createFormData.gender}
                  onChange={handleCreateFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isCreating}
                  required
                >
                  <option value="">Select gender</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location*</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin size={18} className="text-gray-400" />
                </div>
                <Selectize
                  options={[
                    ...BAY_AREA_CITIES.map(c => ({ value: c, label: c })),
                    { value: 'Outside SF Bay Area', label: 'Outside SF Bay Area' },
                  ]}
                  value={createFormData.location}
                  onChange={(val) => setCreateFormData(prev => ({ ...prev, location: val }))}
                  placeholder="Select location"
                  size="sm"
                  className="w-full"
                  buttonClassName="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-left"
                  searchable
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                name="notes"
                value={createFormData.notes}
                onChange={handleCreateFormChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="3"
                placeholder="Any additional information (optional)"
                disabled={isCreating}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={18} /> {isCreating ? 'Creating...' : 'Create Guest'}
              </button>
              <button
                type="button"
                onClick={handleCancelCreate}
                disabled={isCreating}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}


      {!showCreateForm && (
        <>
          {searchTerm.trim().length === 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                For privacy, start typing to search for a guest. No names are shown until you search.
              </div>
            </div>
          ) : filteredGuests.length === 0 && !shouldShowCreateOption ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Search size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No guests found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search terms or create a new guest
              </p>
            </div>
          ) : (
            <div className="space-y-4" key={`search-results-${searchTerm}-${filteredGuests.length}`}>
              {searchTerm && filteredGuests.length > 0 && (
                <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                  Found {filteredGuests.length} guest{filteredGuests.length !== 1 ? 's' : ''} matching "{searchTerm}"
                </div>
              )}
              {filteredGuests.map((guest, i) => {
                const lastService = latestServiceByGuest.get(String(guest.id));
                const ServiceIcon = lastService?.icon;
                const formattedDate = lastService ? dateTimeFormatter.format(lastService.date) : '';
                const fullDateTooltip = lastService ? lastService.date.toLocaleString() : '';
                const relativeLabel = lastService ? formatRelativeTime(lastService.date) : '';

                return (
                  <Animated.div
                    style={trail[i]}
                    key={`guest-${guest.id}-${searchTerm}`}
                    className="border rounded-lg hover:shadow-md transition-shadow bg-white overflow-hidden"
                  >
                    <div
                      className="p-4 cursor-pointer flex justify-between items-center"
                      onClick={() => toggleExpanded(guest.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <User size={24} className="text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{guest.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Home size={14} />
                            <span>{guest.housingStatus}</span>
                            {guest.location && (
                              <>
                                <span className="text-gray-300">•</span>
                                <MapPin size={14} />
                                <span>{guest.location}</span>
                              </>
                            )}
                          </div>
                          {lastService && ServiceIcon && (
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                                <ServiceIcon size={14} className={`${lastService.iconClass || 'text-blue-500'}`} />
                                <span>{lastService.summary}</span>
                              </span>
                              {formattedDate && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span title={fullDateTooltip}>{formattedDate}</span>
                                </>
                              )}
                              {relativeLabel && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-gray-400">{relativeLabel}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    <div className="flex items-center gap-1">
                      {expandedGuest === guest.id ? (
                        <SpringIcon>
                          <ChevronUp size={18} className="text-gray-400" />
                        </SpringIcon>
                      ) : (
                        <SpringIcon>
                          <ChevronDown size={18} className="text-gray-400" />
                        </SpringIcon>
                      )}
                    </div>
                  </div>
                  {expandedGuest === guest.id && (
                    <div className="border-t p-4 bg-gray-50">
                      <div className="flex justify-end gap-2 mb-3">
                        {editingGuestId === guest.id ? (
                          <>
                            <button onClick={saveEditedGuest} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Save</button>
                            <button onClick={cancelEditing} className="px-3 py-2 border rounded-md text-sm">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditingGuest(guest)} className="px-3 py-2 border rounded-md text-sm">Edit</button>
                            <button onClick={() => deleteGuest(guest)} className="px-3 py-2 border rounded-md text-sm text-red-600 border-red-300">Delete</button>
                          </>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {guest.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone size={16} className="text-gray-500" />
                            <span>{guest.phone}</span>
                          </div>
                        )}
                        {guest.birthdate && (
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarClock size={16} className="text-gray-500" />
                            <span>{guest.birthdate}</span>
                          </div>
                        )}
                      </div>
                      {editingGuestId === guest.id && (
                        <div className="mb-4 bg-white p-3 rounded border">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <input type="text" name="firstName" value={editFormData.firstName} onChange={handleEditChange} onBlur={handleEditNameBlur} className="px-3 py-2 border rounded" placeholder="First name" />
                            <input type="text" name="lastName" value={editFormData.lastName} onChange={handleEditChange} onBlur={handleEditNameBlur} className="px-3 py-2 border rounded" placeholder="Last name" />
                            <select name="housingStatus" value={editFormData.housingStatus} onChange={handleEditChange} className="px-3 py-2 border rounded">
                              {HOUSING_STATUSES.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <select name="age" value={editFormData.age} onChange={handleEditChange} className="px-3 py-2 border rounded">
                              <option value="">Select age group</option>
                              {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <select name="gender" value={editFormData.gender} onChange={handleEditChange} className="px-3 py-2 border rounded">
                              <option value="">Select gender</option>
                              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <Selectize
                              options={[
                                ...BAY_AREA_CITIES.map(c => ({ value: c, label: c })),
                                { value: 'Outside SF Bay Area', label: 'Outside SF Bay Area' },
                              ]}
                              value={editFormData.location}
                              onChange={(val) => setEditFormData(prev => ({ ...prev, location: val }))}
                              placeholder="Select location"
                              size="sm"
                              className="w-full"
                              buttonClassName="w-full px-3 py-2 border rounded text-left"
                              searchable
                              displayValue={editFormData.location}
                            />
                          </div>
                          <textarea name="notes" value={editFormData.notes} onChange={handleEditChange} className="w-full px-3 py-2 border rounded resize-none" rows="3" placeholder="Notes (optional)" />
                        </div>
                      )}
                      {guest.notes && editingGuestId !== guest.id && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-1">Notes:</h4>
                          <p className="text-sm bg-white p-2 rounded border">{guest.notes}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <div>
                          {(() => {
                            const today = todayPacificDateString();
                            const alreadyHasMeal = pendingMealGuests.has(guest.id) || mealRecords.some(record => record.guestId === guest.id && pacificDateStringFrom(record.date) === today);

                            return (
                              <div className="flex flex-wrap gap-2">
                                <div className="space-x-1 relative">
                                  {[1, 2, 3].map((count) => (
                                    <button
                                      key={count}
                                      onClick={() => handleMealSelection(guest.id, count)}
                                      disabled={alreadyHasMeal}
                                      className={`px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-colors ${alreadyHasMeal
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
                                        : 'bg-green-100 hover:bg-green-200 text-green-800'
                                        }`}
                                      title={alreadyHasMeal ? 'Guest already received meals today' : `Give ${count} meal${count > 1 ? 's' : ''}`}
                                    >
                                      <SpringIcon>
                                        <Utensils size={16} />
                                      </SpringIcon>
                                      {count} Meal{count > 1 ? 's' : ''}
                                    </button>
                                  ))}
                                </div>

                                {alreadyHasMeal && (
                                  <div className="space-x-1 relative">
                                    {[1, 2, 3].map((count) => (
                                      <button
                                        key={`extra-${count}`}
                                        onClick={() => handleAddExtraMeals(guest.id, count)}
                                        className="px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-colors bg-green-100 hover:bg-green-200 text-green-800"
                                        title={`Add ${count} extra meal${count > 1 ? 's' : ''}`}
                                      >
                                        <SpringIcon>
                                          <PlusCircle size={16} />
                                        </SpringIcon>
                                        {count} Extra
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <button
                          onClick={() => {
                            const rec = addHaircutRecord(guest.id);
                            if (rec) toast.success('Haircut logged');
                          }}
                          className="bg-pink-100 hover:bg-pink-200 text-pink-800 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-colors"
                          title="Log haircut for today"
                        >
                          Haircut
                        </button>
                        <button
                          onClick={() => {
                            const rec = addHolidayRecord(guest.id);
                            if (rec) toast.success('Holiday logged');
                          }}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-colors"
                          title="Log holiday service for today"
                        >
                          Holiday
                        </button>
                        <button
                          onClick={() => setBicyclePickerGuest(guest)}
                          className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-colors"
                          title="Log bicycle repair for today"
                        >
                          Bicycle Repair
                        </button>
                        <button
                          onClick={() => setShowerPickerGuest(guest)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <SpringIcon>
                            <ShowerHead size={16} />
                          </SpringIcon>
                          Book Shower
                        </button>
                        <button
                          onClick={() => setLaundryPickerGuest(guest)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <SpringIcon>
                            <WashingMachine size={16} />
                          </SpringIcon>
                          Book Laundry
                        </button>
                      </div>
                    </div>
                  )}
                  </Animated.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GuestList;
