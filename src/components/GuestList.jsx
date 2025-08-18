import React, { useState, useMemo, useRef } from 'react';
import { todayPacificDateString } from '../utils/date';
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
  Eraser,
} from 'lucide-react';
import { useAppContext } from '../context/useAppContext';
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from '../context/constants';

const GuestList = () => {
  const { guests, mealRecords, setShowerPickerGuest, setLaundryPickerGuest, addMealRecord, addGuest } = useAppContext();
  const { addHaircutRecord, addHolidayRecord, addBicycleRecord } = useAppContext();

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

  const handleMealSelection = (guestId, count) => {
    const today = todayPacificDateString();
    const alreadyHasMeal = mealRecords.some(
      record => record.guestId === guestId && record.date.startsWith(today)
    );
    
    if (alreadyHasMeal) {
      toast.error('Guest already received meals today. Only one meal per day is allowed.');
      return;
    }
    
    try {
      addMealRecord(guestId, count);
      toast.success(`${count} meal${count > 1 ? 's' : ''} logged for guest!`);
    } catch (error) {
      toast.error(`Error logging meals: ${error.message}`);
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
              <input
                type="text"
                name="location"
                value={createFormData.location}
                onChange={handleCreateFormChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City / location"
                disabled={isCreating}
              />
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
              {filteredGuests.map((guest, i) => (
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
                      {guest.notes && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-1">Notes:</h4>
                          <p className="text-sm bg-white p-2 rounded border">{guest.notes}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <div className="space-x-1 relative">
                          {(() => {
                            const today = todayPacificDateString();
                            const alreadyHasMeal = mealRecords.some(
                              record => record.guestId === guest.id && record.date.startsWith(today)
                            );
                            
                            return [1, 2, 3].map((count) => (
                              <button
                                key={count}
                                onClick={() => handleMealSelection(guest.id, count)}
                                disabled={alreadyHasMeal}
                                className={`px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-colors ${
                                  alreadyHasMeal 
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
                            ));
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
                          onClick={() => {
                            const rec = addBicycleRecord(guest.id);
                            if (rec) toast.success('Bicycle logged');
                          }}
                          className="bg-sky-100 hover:bg-sky-200 text-sky-800 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-1 transition-colors"
                          title="Log bicycle service for today"
                        >
                          Bicycle
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GuestList;
