'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, UserPlus, X, ChevronDown, Users } from 'lucide-react';
import { GuestCard } from './GuestCard';
import { GuestCreateForm, GuestFormData, FieldErrors } from './GuestCreateForm';
import { ListSkeleton } from '@/components/ui/Skeleton';
import type { Guest, HousingStatus } from '@/lib/types';

interface ServiceRecord {
  guestId: string;
  date: string;
}

interface GuestListProps {
  guests: Guest[];
  isLoading?: boolean;
  // Service records for today
  todayMealRecords?: ServiceRecord[];
  todayShowerRecords?: ServiceRecord[];
  todayLaundryRecords?: ServiceRecord[];
  todayHaircutRecords?: ServiceRecord[];
  todayHolidayRecords?: ServiceRecord[];
  todayBicycleRecords?: ServiceRecord[];
  // Handlers
  onAddMeal?: (guestId: string) => void;
  onAddShower?: (guestId: string) => void;
  onAddLaundry?: (guestId: string) => void;
  onAddHaircut?: (guestId: string) => void;
  onAddHoliday?: (guestId: string) => void;
  onAddBicycle?: (guestId: string) => void;
  onEditGuest?: (guest: Guest) => void;
  onDeleteGuest?: (guestId: string) => void;
  onBanGuest?: (guestId: string) => void;
  onClearBan?: (guestId: string) => void;
  onCreateGuest?: (formData: GuestFormData) => Promise<void>;
  // Config
  showCreateForm?: boolean;
  enableSearch?: boolean;
  enableSort?: boolean;
  showActions?: boolean;
}

type SortKey = 'name' | 'lastVisit' | 'visitCount' | 'housingStatus';
type SortDirection = 'asc' | 'desc';

const INITIAL_FORM_DATA: GuestFormData = {
  firstName: '',
  lastName: '',
  preferredName: '',
  housingStatus: 'Unhoused' as HousingStatus,
  age: '',
  gender: '',
  location: '',
  notes: '',
  bicycleDescription: '',
};

export function GuestList({
  guests,
  isLoading = false,
  todayMealRecords = [],
  todayShowerRecords = [],
  todayLaundryRecords = [],
  todayHaircutRecords = [],
  todayHolidayRecords = [],
  todayBicycleRecords = [],
  onAddMeal,
  onAddShower,
  onAddLaundry,
  onAddHaircut,
  onAddHoliday,
  onAddBicycle,
  onEditGuest,
  onDeleteGuest,
  onBanGuest,
  onClearBan,
  onCreateGuest,
  showCreateForm: showCreateFormProp = true,
  enableSearch = true,
  enableSort = true,
  showActions = true,
}: GuestListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: SortDirection }>({
    key: null,
    direction: 'asc',
  });
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<GuestFormData>(INITIAL_FORM_DATA);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const firstNameRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter and sort guests
  const filteredGuests = useMemo(() => {
    let result = [...guests];

    // Filter by search term
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter((guest) => {
        const fullName = `${guest.firstName} ${guest.lastName}`.toLowerCase();
        const preferred = guest.preferredName?.toLowerCase() || '';
        return (
          fullName.includes(term) ||
          preferred.includes(term) ||
          guest.location?.toLowerCase().includes(term)
        );
      });
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sortConfig.key) {
          case 'name':
            aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
            bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
            break;
          case 'lastVisit':
            aVal = a.lastVisit || '';
            bVal = b.lastVisit || '';
            break;
          case 'visitCount':
            aVal = a.visitCount || 0;
            bVal = b.visitCount || 0;
            break;
          case 'housingStatus':
            aVal = a.housingStatus;
            bVal = b.housingStatus;
            break;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [guests, debouncedSearchTerm, sortConfig]);

  const handleSort = useCallback((key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleToggleExpand = useCallback((guestId: string) => {
    setExpandedGuestId((prev) => (prev === guestId ? null : guestId));
  }, []);

  const handleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear error for this field
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    []
  );

  const handleLocationChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, location: value }));
    setFieldErrors((prev) => ({ ...prev, location: undefined }));
  }, []);

  const handleNameBlur = useCallback(() => {
    // Check for duplicates
    if (formData.firstName && formData.lastName) {
      const fullName = `${formData.firstName} ${formData.lastName}`.toLowerCase();
      const duplicate = guests.find(
        (g) => `${g.firstName} ${g.lastName}`.toLowerCase() === fullName
      );
      if (duplicate) {
        setDuplicateWarning(
          `A guest named "${duplicate.firstName} ${duplicate.lastName}" already exists.`
        );
      } else {
        setDuplicateWarning(null);
      }
    }
  }, [formData.firstName, formData.lastName, guests]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate required fields
      const errors: FieldErrors = {};
      if (!formData.firstName.trim()) errors.firstName = 'First name is required';
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
      if (!formData.age) errors.age = 'Age group is required';
      if (!formData.gender) errors.gender = 'Gender is required';

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      if (!onCreateGuest) return;

      setIsCreating(true);
      setCreateError(null);

      try {
        await onCreateGuest(formData);
        // Reset form
        setFormData(INITIAL_FORM_DATA);
        setShowCreateForm(false);
        setDuplicateWarning(null);
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : 'Failed to create guest');
      } finally {
        setIsCreating(false);
      }
    },
    [formData, onCreateGuest]
  );

  const handleCancelCreate = useCallback(() => {
    setShowCreateForm(false);
    setFormData(INITIAL_FORM_DATA);
    setFieldErrors({});
    setCreateError(null);
    setDuplicateWarning(null);
  }, []);

  if (isLoading) {
    return <ListSkeleton count={5} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        {enableSearch && (
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guests..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          {enableSort && (
            <div className="relative">
              <select
                value={sortConfig.key || ''}
                onChange={(e) => handleSort(e.target.value as SortKey)}
                className="appearance-none px-4 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Sort by...</option>
                <option value="name">Name</option>
                <option value="lastVisit">Last Visit</option>
                <option value="visitCount">Visit Count</option>
                <option value="housingStatus">Housing Status</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          )}

          {/* Create button */}
          {showCreateFormProp && onCreateGuest && !showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Add Guest</span>
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <GuestCreateForm
          formData={formData}
          fieldErrors={fieldErrors}
          isCreating={isCreating}
          createError={createError}
          duplicateWarning={duplicateWarning}
          onChange={handleFormChange}
          onNameBlur={handleNameBlur}
          onSubmit={handleSubmit}
          onCancel={handleCancelCreate}
          onLocationChange={handleLocationChange}
          firstNameRef={firstNameRef}
        />
      )}

      {/* Results count */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Users size={16} />
        <span>
          {filteredGuests.length} {filteredGuests.length === 1 ? 'guest' : 'guests'}
          {debouncedSearchTerm && ` matching "${debouncedSearchTerm}"`}
        </span>
      </div>

      {/* Guest list */}
      {filteredGuests.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {debouncedSearchTerm ? (
            <p>No guests found matching &quot;{debouncedSearchTerm}&quot;</p>
          ) : (
            <p>No guests yet. Add your first guest to get started.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGuests.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              isExpanded={expandedGuestId === guest.id}
              onToggleExpand={() => handleToggleExpand(guest.id)}
              onEdit={onEditGuest}
              onDelete={onDeleteGuest}
              onBan={onBanGuest}
              onClearBan={onClearBan}
              onAddMeal={onAddMeal}
              onAddShower={onAddShower}
              onAddLaundry={onAddLaundry}
              onAddHaircut={onAddHaircut}
              onAddHoliday={onAddHoliday}
              onAddBicycle={onAddBicycle}
              todayMealRecords={todayMealRecords}
              todayShowerRecords={todayShowerRecords}
              todayLaundryRecords={todayLaundryRecords}
              todayHaircutRecords={todayHaircutRecords}
              todayHolidayRecords={todayHolidayRecords}
              todayBicycleRecords={todayBicycleRecords}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default GuestList;
