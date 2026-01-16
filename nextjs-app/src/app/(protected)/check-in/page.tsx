'use client';

import { useEffect, useState } from 'react';
import { useGuestsStore } from '@/lib/stores/useGuestsStore';
import { useMealsStore } from '@/lib/stores/useMealsStore';
import { useServicesStore } from '@/lib/stores/useServicesStore';
import GuestList from '@/components/guest/GuestList';
import { Guest, GuestInput, AgeGroup, Gender, GuestUpdate } from '@/lib/types';
import { GuestFormData } from '@/components/guest/GuestCreateForm';
import { BanGuestModal } from '@/components/guest/BanGuestModal';
import toast from 'react-hot-toast';

export default function CheckInPage() {
  const [selectedGuestForBan, setSelectedGuestForBan] = useState<Guest | null>(null);

  const {
    guests,
    fetchGuests,
    addGuest,
    updateGuest,
    isLoading: guestsLoading
  } = useGuestsStore();

  const {
    addMealRecord,
    addHaircutRecord,
    addHolidayRecord,
    getTodayMeals,
    getTodayHaircuts,
    getTodayHolidays,
    loadFromSupabase: loadMeals
  } = useMealsStore();

  const {
    addShowerRecord,
    addLaundryRecord,
    addBicycleRecord,
    getTodayShowers,
    getTodayLaundry,
    getTodayBicycles,
    loadFromSupabase: loadServices
  } = useServicesStore();

  useEffect(() => {
    fetchGuests();
    loadMeals();
    loadServices();
  }, [fetchGuests, loadMeals, loadServices]);

  // Wrappers for actions
  const handleAddMeal = async (guestId: string) => {
    try {
      await addMealRecord(guestId);
      toast.success('Meal recorded');
    } catch (error) {
      toast.error('Failed to record meal');
      console.error(error);
    }
  };

  const handleAddHaircut = async (guestId: string) => {
    try {
      await addHaircutRecord(guestId);
      toast.success('Haircut recorded');
    } catch (error) {
      toast.error('Failed to record haircut');
      console.error(error);
    }
  };

  const handleAddHoliday = async (guestId: string) => {
    try {
      await addHolidayRecord(guestId);
      toast.success('Holiday visit recorded');
    } catch (error) {
      toast.error('Failed to record holiday visit');
      console.error(error);
    }
  };

  const handleAddShower = async (guestId: string) => {
    try {
      await addShowerRecord(guestId);
      toast.success('Shower scheduled');
    } catch (error) {
      toast.error('Failed to schedule shower');
      console.error(error);
    }
  };

  const handleAddLaundry = async (guestId: string) => {
    try {
      await addLaundryRecord(guestId, 'Regular'); // Default to Regular
      toast.success('Laundry scheduled');
    } catch (error) {
      toast.error('Failed to schedule laundry');
      console.error(error);
    }
  };

  const handleAddBicycle = async (guestId: string) => {
    try {
      await addBicycleRecord(guestId);
      toast.success('Bicycle repair requested');
    } catch (error) {
      toast.error('Failed to request bicycle repair');
      console.error(error);
    }
  };

  const handleCreateGuest = async (formData: GuestFormData) => {
    // Map formData to GuestInput
    try {
      if (!formData.age || !formData.gender) {
        toast.error('Age and Gender are required');
        return;
      }
      const guestInput: GuestInput = {
        ...formData,
        age: formData.age as AgeGroup,
        gender: formData.gender as Gender,
      };
      await addGuest(guestInput);
      toast.success('Guest added successfully');
    } catch (error) {
      toast.error('Failed to add guest');
      console.error(error);
    }
  };

  const handleEditGuest = async (guest: Guest) => {
    console.log('Edit requested', guest);
  };

  const handleBanGuest = async (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
      setSelectedGuestForBan(guest);
    }
  };

  const handleUpdateBan = async (guestId: string, updates: GuestUpdate) => {
    try {
      await updateGuest(guestId, updates);
      toast.success('Ban settings updated');
      setSelectedGuestForBan(null);
    } catch (error) {
      toast.error('Failed to update ban');
      console.error(error);
    }
  };

  const handleClearBan = async (guestId: string) => {
    if (confirm('Clear ALL bans for this guest?')) {
      try {
        await updateGuest(guestId, {
          bannedAt: null,
          bannedUntil: null,
          banReason: '',
          bannedFromBicycle: false,
          bannedFromMeals: false,
          bannedFromShower: false,
          bannedFromLaundry: false
        });
        toast.success('Bans cleared');
      } catch (error) {
        toast.error('Failed to clear ban');
        console.error(error);
      }
    }
  }

  // Transform records to generic ServiceRecord { guestId, date }
  const todayMeals = getTodayMeals().map(m => ({ guestId: m?.guestId || '', date: m?.createdAt }));
  const todayHaircuts = getTodayHaircuts().map(h => ({ guestId: h.guestId, date: h.date }));
  const todayHolidays = getTodayHolidays().map(h => ({ guestId: h.guestId, date: h.date }));
  const todayShowers = getTodayShowers().map(s => ({ guestId: s.guestId, date: s.scheduledFor || s.lastUpdated || '' }));
  const todayLaundry = getTodayLaundry().map(l => ({ guestId: l.guestId, date: l.createdAt }));
  const todayBicycles = getTodayBicycles().map(b => ({ guestId: b.guestId || '', date: b.date }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Guest Check-in</h1>
        <p className="text-gray-500 mt-1">
          Search for guests or add new ones to check them in.
        </p>
      </div>

      <GuestList
        guests={guests}
        isLoading={guestsLoading}
        onAddMeal={handleAddMeal}
        onAddHaircut={handleAddHaircut}
        onAddHoliday={handleAddHoliday}
        onAddShower={handleAddShower}
        onAddLaundry={handleAddLaundry}
        onAddBicycle={handleAddBicycle}
        onCreateGuest={handleCreateGuest}
        onEditGuest={handleEditGuest}
        onBanGuest={handleBanGuest}
        onClearBan={handleClearBan}
        todayMealRecords={todayMeals}
        todayHaircutRecords={todayHaircuts}
        todayHolidayRecords={todayHolidays}
        todayShowerRecords={todayShowers}
        todayLaundryRecords={todayLaundry}
        todayBicycleRecords={todayBicycles}
        enableSearch={true}
        enableSort={true}
        showActions={true}
        showCreateForm={true}
      />

      {selectedGuestForBan && (
        <BanGuestModal
          guest={selectedGuestForBan}
          isOpen={true}
          onClose={() => setSelectedGuestForBan(null)}
          onBan={handleUpdateBan}
        />
      )}
    </div>
  );
}
