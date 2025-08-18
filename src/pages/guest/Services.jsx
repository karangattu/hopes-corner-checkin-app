import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  ShowerHead,
  WashingMachine,
  Utensils,
  ShoppingBag,
  DropletIcon,
  FanIcon,
  CheckCircle2Icon,
  LogOutIcon,
  Clock,
  Truck,
  Edit3,
  RotateCcw,
  X,
  History,
  BarChart3,
  Circle,
  Apple,
  Caravan,
  HeartHandshake,
  SquarePlus
} from 'lucide-react';
import { useAppContext } from '../../context/useAppContext';
import ShowerBooking from '../../components/ShowerBooking';
import LaundryBooking from '../../components/LaundryBooking';
import Selectize from '../../components/Selectize';
import { useFadeInUp, useScaleIn, useStagger, animated as Animated, SpringIcon } from '../../utils/animations';
import { todayPacificDateString, pacificDateStringFrom } from '../../utils/date';

const Services = () => {
  const {
    getTodayMetrics,
    getTodayLaundryWithGuests,
    mealRecords,
    rvMealRecords,
    addRvMealRecord,
  addUnitedEffortMealRecord,
  unitedEffortMealRecords,
  extraMealRecords,
  addExtraMealRecord,
  lunchBagRecords,
  addLunchBagRecord,
    showerRecords,
    guests,
    showerPickerGuest,
    laundryPickerGuest,
    LAUNDRY_STATUS,
    updateLaundryStatus,
    setLaundryRecords,
    actionHistory,
    undoAction,
    clearActionHistory,
    allShowerSlots,
    cancelShowerRecord,
    rescheduleShower,
  updateShowerStatus,
    cancelLaundryRecord,
    rescheduleLaundry,
    canGiveItem,
    getLastGivenItem,
  giveItem,
  getNextAvailabilityDate,
  } = useAppContext();
  
  const [activeSection, setActiveSection] = useState('overview');
  
  const [editingBagNumber, setEditingBagNumber] = useState(null);
  const [newBagNumber, setNewBagNumber] = useState('');
  const [showUndoPanel, setShowUndoPanel] = useState(false);
  const [bagPromptOpen, setBagPromptOpen] = useState(false);
  const [bagPromptRecord, setBagPromptRecord] = useState(null);
  const [bagPromptNextStatus, setBagPromptNextStatus] = useState(null);
  const [bagPromptValue, setBagPromptValue] = useState('');
  const [rvMealCount, setRvMealCount] = useState('');
  const [isAddingRvMeals, setIsAddingRvMeals] = useState(false);
  const [ueMealCount, setUeMealCount] = useState('');
  const [isAddingUeMeals, setIsAddingUeMeals] = useState(false);
  const [extraMealCount, setExtraMealCount] = useState('');
  const [isAddingExtraMeals, setIsAddingExtraMeals] = useState(false);
  const [lunchBagCount, setLunchBagCount] = useState('');
  const [isAddingLunchBags, setIsAddingLunchBags] = useState(false);
  const today = todayPacificDateString();
  const [mealsDate, setMealsDate] = useState(today);

  const [showerStatusFilter, setShowerStatusFilter] = useState('all');
  const [showerLaundryFilter, setShowerLaundryFilter] = useState('any');
  const [showerSort, setShowerSort] = useState('time-asc');

  const [laundryTypeFilter, setLaundryTypeFilter] = useState('any');
  const [laundryStatusFilter, setLaundryStatusFilter] = useState('any');
  const [laundrySort, setLaundrySort] = useState('time-asc');
  
  const todayMetrics = getTodayMetrics();
  
  const todayShorthand = today;
  
  const selectedDate = mealsDate || todayShorthand;
  const selectedGuestMealRecords = mealRecords.filter(
    record => pacificDateStringFrom(record.date || '') === selectedDate
  );
  
  const todayShowerRecords = showerRecords.filter(
    record => pacificDateStringFrom(record.date) === todayShorthand
  );
  const todayWaitlisted = todayShowerRecords.filter(r => r.status === 'waitlisted');
  const todayBookedShowers = todayShowerRecords.filter(r => r.status !== 'waitlisted');
  
  const todayLaundryWithGuests = getTodayLaundryWithGuests();

  const parseTimeToMinutes = (t) => {
    if (!t) return Number.POSITIVE_INFINITY;
    const [h, m] = String(t).split(':');
    const hh = parseInt(h, 10);
    const mm = parseInt(m, 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return Number.POSITIVE_INFINITY;
    return hh * 60 + mm;
  };
  const parseLaundryStartToMinutes = (range) => {
    if (!range) return Number.POSITIVE_INFINITY;
    const [start] = String(range).split(' - ');
    return parseTimeToMinutes(start);
  };

  const laundryGuestIdsSet = new Set((todayLaundryWithGuests || []).map(l => l.guestId));
  const filteredShowers = [...(todayBookedShowers || [])]
    .filter(r => {
      if (showerStatusFilter === 'awaiting' && r.status === 'done') return false;
      if (showerStatusFilter === 'done' && r.status !== 'done') return false;
      if (showerLaundryFilter === 'with' && !laundryGuestIdsSet.has(r.guestId)) return false;
      if (showerLaundryFilter === 'without' && laundryGuestIdsSet.has(r.guestId)) return false;
      return true;
    })
    .sort((a, b) => {
      if (showerSort === 'name') {
        const an = (getGuestName(a.guestId) || '').toLowerCase();
        const bn = (getGuestName(b.guestId) || '').toLowerCase();
        return an.localeCompare(bn);
      }
      if (showerSort === 'status') {
        const rank = (r) => (r.status === 'done' ? 1 : 0);
        const diff = rank(a) - rank(b);
        return diff !== 0 ? diff : parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      }
      if (showerSort === 'time-desc') return parseTimeToMinutes(b.time) - parseTimeToMinutes(a.time);
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });

  const statusOrder = {
    [LAUNDRY_STATUS?.WAITING]: 0,
    [LAUNDRY_STATUS?.WASHER]: 1,
    [LAUNDRY_STATUS?.DRYER]: 2,
    [LAUNDRY_STATUS?.DONE]: 3,
    [LAUNDRY_STATUS?.PICKED_UP]: 4,
    [LAUNDRY_STATUS?.PENDING]: 0,
    [LAUNDRY_STATUS?.TRANSPORTED]: 1,
    [LAUNDRY_STATUS?.RETURNED]: 2,
    [LAUNDRY_STATUS?.OFFSITE_PICKED_UP]: 3,
  };
  const filteredLaundry = [...(todayLaundryWithGuests || [])]
    .filter(r => {
      if (laundryTypeFilter !== 'any' && r.laundryType !== laundryTypeFilter) return false;
      if (laundryStatusFilter !== 'any' && r.status !== laundryStatusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (laundrySort === 'name') return (a.guestName || '').localeCompare(b.guestName || '');
      if (laundrySort === 'status') {
        const ar = statusOrder[a.status] ?? 99;
        const br = statusOrder[b.status] ?? 99;
        const diff = ar - br;
        if (diff !== 0) return diff;
        return parseLaundryStartToMinutes(a.time) - parseLaundryStartToMinutes(b.time);
      }
      if (laundrySort === 'time-desc') return parseLaundryStartToMinutes(b.time) - parseLaundryStartToMinutes(a.time);
      return parseLaundryStartToMinutes(a.time) - parseLaundryStartToMinutes(b.time);
    });

  const showersTrail = useStagger((filteredShowers || []).length, true);
  const waitlistTrail = useStagger((todayWaitlisted || []).length, true);
  const laundryTrail = useStagger((filteredLaundry || []).length, true);
  
  const selectedRvMealRecords = rvMealRecords.filter(
    record => pacificDateStringFrom(record.date || '') === selectedDate
  );

  const headerSpring = useFadeInUp();
  const modalSpring = useScaleIn([bagPromptOpen]);
  
  const handleAddRvMeals = () => {
    if (!rvMealCount || isNaN(rvMealCount) || parseInt(rvMealCount) <= 0) {
      toast.error('Please enter a valid number of RV meals');
      return;
    }
    
    setIsAddingRvMeals(true);
    try {
  addRvMealRecord(rvMealCount, selectedDate);
  toast.success(`Added ${rvMealCount} RV meals for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}!`);
      setRvMealCount('');
    } catch (error) {
      toast.error(`Error adding RV meals: ${error.message}`);
    } finally {
      setIsAddingRvMeals(false);
    }
  };

  const handleAddUeMeals = () => {
    if (!ueMealCount || isNaN(ueMealCount) || parseInt(ueMealCount) <= 0) {
      toast.error('Please enter a valid number of United Effort meals');
      return;
    }

    setIsAddingUeMeals(true);
    try {
  addUnitedEffortMealRecord(ueMealCount, selectedDate);
  toast.success(`Added ${ueMealCount} United Effort meals for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}!`);
      setUeMealCount('');
    } catch (error) {
      toast.error(`Error adding United Effort meals: ${error.message}`);
    } finally {
      setIsAddingUeMeals(false);
    }
  };

  const handleAddExtraMeals = () => {
    if (!extraMealCount || isNaN(extraMealCount) || parseInt(extraMealCount) <= 0) {
      toast.error('Please enter a valid number of extra meals');
      return;
    }

    setIsAddingExtraMeals(true);
    try {
  addExtraMealRecord(extraMealCount, selectedDate);
  toast.success(`Added ${extraMealCount} extra meals for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}!`);
      setExtraMealCount('');
    } catch (error) {
      toast.error(`Error adding extra meals: ${error.message}`);
    } finally {
      setIsAddingExtraMeals(false);
    }
  };
  
  const getGuestName = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return 'Unknown Guest';
    return guest.name || `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Unknown Guest';
  };

  const getLaundryStatusInfo = (status) => {
    switch(status) {
      case LAUNDRY_STATUS.WAITING:
        return { 
          icon: ShoppingBag, 
          color: 'text-gray-500', 
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          label: 'Waiting' 
        };
      case LAUNDRY_STATUS.WASHER:
        return { 
          icon: DropletIcon, 
          color: 'text-blue-500', 
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          label: 'In Washer' 
        };
      case LAUNDRY_STATUS.DRYER:
        return { 
          icon: FanIcon, 
          color: 'text-orange-500', 
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          label: 'In Dryer' 
        };
      case LAUNDRY_STATUS.DONE:
        return { 
          icon: CheckCircle2Icon, 
          color: 'text-green-500', 
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          label: 'Done' 
        };
      case LAUNDRY_STATUS.PICKED_UP:
        return { 
          icon: LogOutIcon, 
          color: 'text-purple-500', 
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          label: 'Picked Up' 
        };
      case LAUNDRY_STATUS.PENDING:
        return { 
          icon: Clock, 
          color: 'text-yellow-500', 
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          label: 'Waiting' 
        };
      case LAUNDRY_STATUS.TRANSPORTED:
        return { 
          icon: Truck, 
          color: 'text-blue-500', 
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          label: 'Transported' 
        };
      case LAUNDRY_STATUS.RETURNED:
        return { 
          icon: CheckCircle2Icon, 
          color: 'text-green-500', 
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          label: 'Returned' 
        };
      case LAUNDRY_STATUS.OFFSITE_PICKED_UP:
        return { 
          icon: LogOutIcon, 
          color: 'text-purple-500', 
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          label: 'Picked Up' 
        };
      default:
        return { 
          icon: ShoppingBag, 
          color: 'text-gray-500', 
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          label: 'Unknown' 
        };
    }
  };

  const handleStatusChange = (recordId, newStatus) => {
    updateLaundryStatus(recordId, newStatus);
  const info = getLaundryStatusInfo(newStatus);
  toast.success(`Laundry status updated to ${info.label}`);
  };
  
  const handleBagNumberUpdate = (recordId, bagNumber) => {
    setLaundryRecords(prevRecords => 
      prevRecords.map(record => 
        record.id === recordId 
          ? { ...record, bagNumber, lastUpdated: new Date().toISOString() }
          : record
      )
    );
    setEditingBagNumber(null);
    setNewBagNumber('');
  };

  const attemptLaundryStatusChange = (record, newStatus) => {
    const hasBag = !!(record.bagNumber && String(record.bagNumber).trim());
    if (!hasBag) {
      setBagPromptRecord(record);
      setBagPromptNextStatus(newStatus);
      setBagPromptValue('');
      setBagPromptOpen(true);
      return;
    }
    handleStatusChange(record.id, newStatus);
  };

  const confirmBagPrompt = () => {
    const val = (bagPromptValue || '').trim();
    if (!val) {
      toast.error('Please enter a bag number');
      return;
    }
    if (!bagPromptRecord) { setBagPromptOpen(false); return; }
    setLaundryRecords(prev => prev.map(r => r.id === bagPromptRecord.id ? { ...r, bagNumber: val, lastUpdated: new Date().toISOString() } : r));
    if (bagPromptNextStatus) {
      handleStatusChange(bagPromptRecord.id, bagPromptNextStatus);
    }
    setBagPromptOpen(false);
    setBagPromptRecord(null);
    setBagPromptNextStatus(null);
    setBagPromptValue('');
  };
  
  const startEditingBagNumber = (recordId, currentBagNumber) => {
    setEditingBagNumber(recordId);
    setNewBagNumber(currentBagNumber || '');
  };
  
  const handleUndoAction = (actionId) => {
    const success = undoAction(actionId);
    if (success) {
  toast.success('Action undone');
    }
  };
  
  const todayActionHistory = actionHistory.filter(action => {
    const actionDate = new Date(action.timestamp);
    const today = todayPacificDateString();
    const actionPT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(actionDate);
    return actionPT === today;
  });
  
  const sections = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'meals', label: 'Meals', icon: Utensils },
    { id: 'showers', label: 'Showers', icon: ShowerHead },
    { id: 'laundry', label: 'Laundry', icon: WashingMachine }
  ];

  
  const renderOverviewSection = () => {
    const tm = todayMetrics || { mealsServed: 0, showersBooked: 0, laundryLoads: 0 };
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-emerald-100 p-4">
          <div className="text-sm text-emerald-700">Meals served today</div>
          <div className="text-2xl font-semibold">{tm.mealsServed}</div>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 p-4">
          <div className="text-sm text-emerald-700">Showers taken today</div>
          <div className="text-2xl font-semibold">{todayShowerRecords.filter(record => record.status === 'done').length}</div>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 p-4">
          <div className="text-sm text-emerald-700">Loads of Laundry today</div>
          <div className="text-2xl font-semibold">{tm.laundryLoads}</div>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 p-4">
          <div className="text-sm text-emerald-700">Haircuts today</div>
          <div className="text-2xl font-semibold">{tm.haircuts || 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 p-4">
          <div className="text-sm text-emerald-700">Holiday services today</div>
          <div className="text-2xl font-semibold">{tm.holidays || 0}</div>
        </div>
        <div className="bg-white rounded-lg border border-emerald-100 p-4">
          <div className="text-sm text-emerald-700">Bicycle services today</div>
          <div className="text-2xl font-semibold">{tm.bicycles || 0}</div>
        </div>
      </div>
    );
  };

  const renderMealsSection = () => {
  const totalGuestMeals = selectedGuestMealRecords.reduce((sum, record) => sum + record.count, 0);
  const totalRvMeals = selectedRvMealRecords.reduce((sum, record) => sum + record.count, 0);
  const selectedUeMealRecords = (unitedEffortMealRecords || []).filter(record => (record.date || '').startsWith(selectedDate));
  const totalUeMeals = selectedUeMealRecords.reduce((s,r)=>s+r.count,0);
  const selectedExtraMealRecords = (extraMealRecords || []).filter(record => (record.date || '').startsWith(selectedDate));
  const totalExtraMeals = selectedExtraMealRecords.reduce((s,r)=>s+r.count,0);
  const selectedLunchBagRecords = (lunchBagRecords || []).filter(r => (r.date || '').startsWith(selectedDate));
  const totalLunchBags = selectedLunchBagRecords.reduce((s,r)=> s + (r.count || 0), 0);
    const totalMeals = totalGuestMeals + totalRvMeals + totalUeMeals + totalExtraMeals;
    
    return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="text-sm text-gray-700 flex items-center gap-2">
          <History size={16} className="text-gray-500" />
          <span className="font-medium">Meals date</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={mealsDate}
            onChange={(e) => setMealsDate(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm w-full sm:w-auto"
            max={todayShorthand}
          />
          <span className="text-xs text-gray-500">New entries will be added to this date</span>
        </div>
      </div>
      <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-orange-800">
            <Caravan className="text-orange-600" size={20} />
            <span>RV Meals</span>
          </h3>
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-3 py-1 rounded-full">
            {totalRvMeals} RV meals on {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            value={rvMealCount}
            onChange={(e) => setRvMealCount(e.target.value)}
            placeholder="Number of RV meals"
            className="px-3 py-2 border border-orange-300 rounded-md text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
            min="1"
            disabled={isAddingRvMeals}
          />
          <button
            onClick={handleAddRvMeals}
            disabled={isAddingRvMeals || !rvMealCount}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {isAddingRvMeals ? 'Adding...' : 'Add RV Meals'}
          </button>
        </div>
        {selectedRvMealRecords.length > 0 && (
          <div className="text-xs text-orange-700">
            <div className="font-medium mb-1">{new Date(selectedDate + 'T00:00:00').toLocaleDateString()} RV meal records:</div>
            <ul className="space-y-1">
              {selectedRvMealRecords.map((record) => (
                <li key={record.id} className="flex justify-between">
                  <span>{new Date(record.date).toLocaleTimeString()}</span>
                  <span className="font-medium">{record.count} meals</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-sky-50 rounded-lg border border-sky-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-sky-800">
            <HeartHandshake className="text-sky-600" size={20} />
            <span>United Effort Meals</span>
          </h3>
          <span className="bg-sky-100 text-sky-800 text-xs font-medium px-3 py-1 rounded-full">
            {totalUeMeals} UE meals on {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            value={ueMealCount}
            onChange={(e) => setUeMealCount(e.target.value)}
            placeholder="Number of United Effort meals"
            className="px-3 py-2 border border-sky-300 rounded-md text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
            min="1"
            disabled={isAddingUeMeals}
          />
          <button
            onClick={handleAddUeMeals}
            disabled={isAddingUeMeals || !ueMealCount}
            className="bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {isAddingUeMeals ? 'Adding...' : 'Add UE Meals'}
          </button>
        </div>
        {selectedUeMealRecords.length > 0 && (
          <div className="text-xs text-sky-700">
            <div className="font-medium mb-1">{new Date(selectedDate + 'T00:00:00').toLocaleDateString()} United Effort meal records:</div>
            <ul className="space-y-1">
              {selectedUeMealRecords.map((record) => (
                <li key={record.id} className="flex justify-between">
                  <span>{new Date(record.date).toLocaleTimeString()}</span>
                  <span className="font-medium">{record.count} meals</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-800">
            <SquarePlus className="text-amber-600" size={20} />
            <span>Extra Meals</span>
          </h3>
          <span className="bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1 rounded-full">
            {totalExtraMeals} extra meals on {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            value={extraMealCount}
            onChange={(e) => setExtraMealCount(e.target.value)}
            placeholder="Number of extra meals"
            className="px-3 py-2 border border-amber-300 rounded-md text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
            min="1"
            disabled={isAddingExtraMeals}
          />
          <button
            onClick={handleAddExtraMeals}
            disabled={isAddingExtraMeals || !extraMealCount}
            className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {isAddingExtraMeals ? 'Adding...' : 'Add Extra Meals'}
          </button>
        </div>
        {selectedExtraMealRecords.length > 0 && (
          <div className="text-xs text-amber-700">
            <div className="font-medium mb-1">{new Date(selectedDate + 'T00:00:00').toLocaleDateString()} Extra meal records:</div>
            <ul className="space-y-1">
              {selectedExtraMealRecords.map((record) => (
                <li key={record.id} className="flex justify-between">
                  <span>{new Date(record.date).toLocaleTimeString()}</span>
                  <span className="font-medium">{record.count} meals</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-lime-50 rounded-lg border border-lime-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-lime-800">
            <Apple className="text-lime-600" size={20} />
            <span>Lunch Bags</span>
          </h3>
          <span className="bg-lime-100 text-lime-800 text-xs font-medium px-3 py-1 rounded-full">
            {totalLunchBags} lunch bags on {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
          <input
            type="number"
            value={lunchBagCount}
            onChange={(e) => setLunchBagCount(e.target.value)}
            placeholder="Number of lunch bags"
            className="px-3 py-2 border border-lime-300 rounded-md text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-lime-500"
            min="1"
            disabled={isAddingLunchBags}
          />
          <button
            onClick={() => {
              if (!lunchBagCount || isNaN(lunchBagCount) || parseInt(lunchBagCount) <= 0) {
                toast.error('Please enter a valid number of lunch bags');
                return;
              }
              setIsAddingLunchBags(true);
              try {
                addLunchBagRecord(lunchBagCount, selectedDate);
                toast.success(`Added ${lunchBagCount} lunch bag${parseInt(lunchBagCount) > 1 ? 's' : ''} for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString()}`);
                setLunchBagCount('');
              } catch (error) {
                toast.error(error.message || 'Error adding lunch bags');
              } finally {
                setIsAddingLunchBags(false);
              }
            }}
            disabled={isAddingLunchBags || !lunchBagCount}
            className="bg-lime-600 hover:bg-lime-700 disabled:bg-lime-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {isAddingLunchBags ? 'Adding...' : 'Add Lunch Bags'}
          </button>
        </div>
        {selectedLunchBagRecords.length > 0 && (
          <div className="text-xs text-lime-700">
            <div className="font-medium mb-1">{new Date(selectedDate + 'T00:00:00').toLocaleDateString()} lunch bag records:</div>
            <ul className="space-y-1">
              {selectedLunchBagRecords.map((record) => (
                <li key={record.id} className="flex justify-between">
                  <span>{new Date(record.date).toLocaleTimeString()}</span>
                  <span className="font-medium">{record.count} bag{record.count > 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Utensils className="text-emerald-600" size={20} />
            <span>Guest Meals</span>
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-3 py-1 rounded-full">
              {totalGuestMeals} guest meals on {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
            </span>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
              {totalMeals} total meals on {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
            </span>
          </div>
        </div>
        {selectedGuestMealRecords.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No meals logged for this date</p>
        ) : (
          <ul className="divide-y">
            {selectedGuestMealRecords.map((rec) => (
              <li key={rec.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{getGuestName(rec.guestId)}</div>
                  <div className="text-xs text-gray-500">{new Date(rec.date).toLocaleTimeString()}</div>
                </div>
                <div className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-1 rounded-full">
                  {rec.count} meal{rec.count > 1 ? 's' : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    );
  };
  
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverviewSection();
      case 'meals':
        return renderMealsSection();
      case 'showers':
        return renderShowersSection();
      case 'laundry':
        return renderLaundrySection();
      default:
        return renderOverviewSection();
    }
  };

  const renderShowersSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShowerHead className="text-blue-600" size={20} /> 
            <span>Today's Showers</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
              {todayShowerRecords.length} booked
            </span>
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">Showing {filteredShowers.length}</span>
            <div className="flex flex-wrap items-center gap-2">
              <select value={showerStatusFilter} onChange={(e)=>setShowerStatusFilter(e.target.value)} className="text-xs border rounded px-2 py-1">
                <option value="all">Status: All</option>
                <option value="awaiting">Status: Awaiting</option>
                <option value="done">Status: Done</option>
              </select>
              <select value={showerLaundryFilter} onChange={(e)=>setShowerLaundryFilter(e.target.value)} className="text-xs border rounded px-2 py-1">
                <option value="any">Laundry: Any</option>
                <option value="with">Laundry: With</option>
                <option value="without">Laundry: Without</option>
              </select>
              <select value={showerSort} onChange={(e)=>setShowerSort(e.target.value)} className="text-xs border rounded px-2 py-1">
                <option value="time-asc">Sort: Time ↑</option>
                <option value="time-desc">Sort: Time ↓</option>
                <option value="status">Sort: Status</option>
                <option value="name">Sort: Name</option>
              </select>
            </div>
          </div>
        </div>
        
  <div className="overflow-y-auto max-h-[55vh] md:max-h-96">
          {todayShowerRecords.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No shower bookings today</p>
          ) : (
            <ul className="divide-y">
              {showersTrail.map((style, idx) => {
                const record = filteredShowers[idx];
                if (!record) return null;
                const guest = guests.find(g => g.id === record.guestId);
                const guestName = guest?.name || getGuestName(record.guestId);
                const canT = guest ? canGiveItem(guest.id, 'tshirt') : false;
                const canSB = guest ? canGiveItem(guest.id, 'sleeping_bag') : false;
                const canBP = guest ? canGiveItem(guest.id, 'backpack') : false;
                const lastTGuest = guest ? getLastGivenItem(guest.id, 'tshirt') : null;
                const lastSBGuest = guest ? getLastGivenItem(guest.id, 'sleeping_bag') : null;
                const lastBPGuest = guest ? getLastGivenItem(guest.id, 'backpack') : null;
                const hasLaundryToday = guest ? laundryGuestIdsSet.has(guest.id) : false;
                const isDone = record.status === 'done';
                return (
                  <Animated.li key={record.id} style={style} className="py-2 will-change-transform">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row justify-between gap-2 sm:items-center">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {guestName}
                            <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${isDone ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                              {isDone ? <CheckCircle2Icon size={12} /> : <Circle size={10} className="fill-gray-400 text-gray-400" />}
                              {isDone ? 'Done' : 'Awaiting'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>Booked at {new Date(record.date).toLocaleTimeString()}</span>
                            {hasLaundryToday && (
                              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Laundry today</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              try { updateShowerStatus(record.id, isDone ? 'booked' : 'done'); toast.success(isDone ? 'Marked as awaiting' : 'Marked as done'); } catch(err) { toast.error(err.message); }
                            }}
                            className={`text-xs px-2 py-1 rounded-full border ${isDone ? 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100' : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'}`}
                            title={isDone ? 'Mark as awaiting' : 'Mark as done'}
                          >
                            {isDone ? 'Set Awaiting' : 'Mark Done'}
                          </button>
                          <Selectize
                            options={allShowerSlots}
                            value={record.time}
                            onChange={(t) => { try { rescheduleShower(record.id, t); toast.success('Shower rescheduled'); } catch(err) { toast.error(err.message); } }}
                            size="sm"
                            className="w-32 sm:w-36"
                          />
                          <button
                            onClick={() => { try { cancelShowerRecord(record.id); toast.success('Shower cancelled'); } catch(err) { toast.error(err.message); } }}
                            className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                            title="Cancel booking"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={!canT}
                          onClick={() => {
                            if (!guest) return;
                            try { giveItem(guest.id, 'tshirt'); toast.success('T-Shirt given'); } catch(e) { toast.error(e.message); }
                          }}
                          title={lastTGuest ? `T-Shirt last: ${new Date(lastTGuest.date).toLocaleDateString()}` : 'Give T-Shirt'}
                          className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 disabled:opacity-50"
                        >Give T-Shirt</button>
                        <button
                          disabled={!canSB}
                          onClick={() => {
                            if (!guest) return;
                            try { giveItem(guest.id, 'sleeping_bag'); toast.success('Sleeping bag given'); } catch(e) { toast.error(e.message); }
                          }}
                          title={lastSBGuest ? `Sleeping Bag last: ${new Date(lastSBGuest.date).toLocaleDateString()}` : 'Give Sleeping Bag'}
                          className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 disabled:opacity-50"
                        >Give Sleeping Bag</button>
                        <button
                          disabled={!canBP}
                          onClick={() => {
                            if (!guest) return;
                            try { giveItem(guest.id, 'backpack'); toast.success('Backpack given'); } catch(e) { toast.error(e.message); }
                          }}
                          title={lastBPGuest ? `Backpack last: ${new Date(lastBPGuest.date).toLocaleDateString()}` : 'Give Backpack'}
                          className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 disabled:opacity-50"
                        >Give Backpack</button>
                      </div>
                      <div className="text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-blue-50 border border-blue-200 rounded p-2 sm:p-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-800 mb-1">T-Shirt (Weekly)</span>
                          <div className="text-gray-700">
                            {lastTGuest ? (
                              <div>
                                <div>Last: {new Date(lastTGuest.date).toLocaleDateString()}</div>
                                {!canT && <div className="text-orange-600 font-medium">Next: {getNextAvailabilityDate('tshirt', lastTGuest.date)?.toLocaleDateString()}</div>}
                                {canT && <div className="text-green-600 font-medium">✓ Available now</div>}
                              </div>
                            ) : (
                              <div className="text-green-600 font-medium">✓ Never given - Available</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-800 mb-1">Sleeping Bag (Monthly)</span>
                          <div className="text-gray-700">
                            {lastSBGuest ? (
                              <div>
                                <div>Last: {new Date(lastSBGuest.date).toLocaleDateString()}</div>
                                {!canSB && <div className="text-orange-600 font-medium">Next: {getNextAvailabilityDate('sleeping_bag', lastSBGuest.date)?.toLocaleDateString()}</div>}
                                {canSB && <div className="text-green-600 font-medium">✓ Available now</div>}
                              </div>
                            ) : (
                              <div className="text-green-600 font-medium">✓ Never given - Available</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-800 mb-1">Backpack (Monthly)</span>
                          <div className="text-gray-700">
                            {lastBPGuest ? (
                              <div>
                                <div>Last: {new Date(lastBPGuest.date).toLocaleDateString()}</div>
                                {!canBP && <div className="text-orange-600 font-medium">Next: {getNextAvailabilityDate('backpack', lastBPGuest.date)?.toLocaleDateString()}</div>}
                                {canBP && <div className="text-green-600 font-medium">✓ Available now</div>}
                              </div>
                            ) : (
                              <div className="text-green-600 font-medium">✓ Never given - Available</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Animated.li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {todayWaitlisted.length > 0 && (
  <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-semibold">Waitlisted Guests</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1 rounded-full">{todayWaitlisted.length} waitlisted</span>
          </div>
          <ul className="divide-y">
            {waitlistTrail.map((style, idx) => {
              const record = todayWaitlisted[idx];
              if (!record) return null;
              const guest = guests.find(g => g.id === record.guestId);
              const guestName = guest?.name || getGuestName(record.guestId);
              const canT = guest ? canGiveItem(guest.id, 'tshirt') : false;
              const canSB = guest ? canGiveItem(guest.id, 'sleeping_bag') : false;
              const canBP = guest ? canGiveItem(guest.id, 'backpack') : false;
              return (
                <Animated.li key={record.id} style={style} className="py-2 will-change-transform">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {guestName}
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Waitlisted</span>
                        </div>
                        <div className="text-xs text-gray-500">Added at {new Date(record.date).toLocaleTimeString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { try { cancelShowerRecord(record.id); toast.success('Waitlist entry cancelled'); } catch(err) { toast.error(err.message); } }}
                          className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                        >Cancel</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={!canT} onClick={() => { if (!guest) return; try { giveItem(guest.id, 'tshirt'); toast.success('T-Shirt given'); } catch(e){ toast.error(e.message); } }} className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 disabled:opacity-50">Give T-Shirt</button>
                      <button disabled={!canSB} onClick={() => { if (!guest) return; try { giveItem(guest.id, 'sleeping_bag'); toast.success('Sleeping bag given'); } catch(e){ toast.error(e.message); } }} className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 disabled:opacity-50">Give Sleeping Bag</button>
                      <button disabled={!canBP} onClick={() => { if (!guest) return; try { giveItem(guest.id, 'backpack'); toast.success('Backpack given'); } catch(e){ toast.error(e.message); } }} className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 disabled:opacity-50">Give Backpack</button>
                    </div>
                  </div>
                </Animated.li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );

  const renderLaundrySection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <WashingMachine className="text-purple-600" size={20} /> 
            <span>Today's Laundry</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full">
              {todayLaundryWithGuests.length} records
            </span>
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">Showing {filteredLaundry.length}</span>
            <div className="flex flex-wrap items-center gap-2">
              <select value={laundryTypeFilter} onChange={(e)=>setLaundryTypeFilter(e.target.value)} className="text-xs border rounded px-2 py-1">
                <option value="any">Type: Any</option>
                <option value="onsite">Type: On-site</option>
                <option value="offsite">Type: Off-site</option>
              </select>
              <select value={laundryStatusFilter} onChange={(e)=>setLaundryStatusFilter(e.target.value)} className="text-xs border rounded px-2 py-1">
                <option value="any">Status: Any</option>
                <option value={LAUNDRY_STATUS.WAITING}>Waiting</option>
                <option value={LAUNDRY_STATUS.WASHER}>In Washer</option>
                <option value={LAUNDRY_STATUS.DRYER}>In Dryer</option>
                <option value={LAUNDRY_STATUS.DONE}>Done</option>
                <option value={LAUNDRY_STATUS.PICKED_UP}>Picked Up</option>
                <option value={LAUNDRY_STATUS.PENDING}>Offsite: Waiting</option>
                <option value={LAUNDRY_STATUS.TRANSPORTED}>Offsite: Transported</option>
                <option value={LAUNDRY_STATUS.RETURNED}>Offsite: Returned</option>
                <option value={LAUNDRY_STATUS.OFFSITE_PICKED_UP}>Offsite: Picked Up</option>
              </select>
              <select value={laundrySort} onChange={(e)=>setLaundrySort(e.target.value)} className="text-xs border rounded px-2 py-1">
                <option value="time-asc">Sort: Time ↑</option>
                <option value="time-desc">Sort: Time ↓</option>
                <option value="status">Sort: Status</option>
                <option value="name">Sort: Name</option>
              </select>
            </div>
          </div>
        </div>
        {todayLaundryWithGuests.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No laundry bookings today</p>
        ) : (
          <ul className="divide-y">
            {laundryTrail.map((style, idx) => {
              const record = filteredLaundry[idx];
              if (!record) return null;
              const statusInfo = getLaundryStatusInfo(record.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Animated.li key={record.id} style={style} className="py-3 will-change-transform">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="font-medium">{record.guestName}</div>
                      <div className="flex flex-wrap text-xs text-gray-500 gap-2 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {record.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingBag size={12} /> 
                          {editingBagNumber === record.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={newBagNumber}
                                onChange={(e) => setNewBagNumber(e.target.value)}
                                className="w-16 px-1 py-0 text-xs border rounded"
                                placeholder="Bag #"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleBagNumberUpdate(record.id, newBagNumber);
                                  }
                                }}
                                onBlur={() => handleBagNumberUpdate(record.id, newBagNumber)}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span 
                              className="cursor-pointer hover:bg-gray-200 px-1 rounded flex items-center gap-1"
                              onClick={() => startEditingBagNumber(record.id, record.bagNumber)}
                              title="Click to edit bag number"
                            >
                              Bag #{record.bagNumber || 'N/A'}
                              <Edit3 size={10} className="text-gray-400" />
                            </span>
                          )}
                        </span>
                        <span>
                          {record.laundryType || 'Normal'} load
                        </span>
                      </div>
                    </div>
                    
                    <div className={`${statusInfo.bgColor} ${statusInfo.textColor} px-2 py-1 text-sm rounded flex items-center gap-1 mt-1 sm:mt-0`}>
                      <StatusIcon size={14} />
                      <span>{statusInfo.label}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2">
                        <Selectize
                          options={[{ value: 'onsite', label: 'On-site' }, { value: 'offsite', label: 'Off-site' }]}
                          value={record.laundryType}
                          onChange={(opt) => { try { rescheduleLaundry(record.id, { newLaundryType: opt, newTime: record.time }); toast.success('Laundry updated'); } catch(err) { toast.error(err.message); } }}
                          size="xs"
                          className="w-28"
                          displayValue={record.laundryType === 'offsite' ? 'Off-site' : 'On-site'}
                        />
                      {record.laundryType === 'onsite' && (
                        <Selectize
                          options={['8:00 - 9:00','8:30 - 9:30','9:30 - 10:30','10:00 - 11:00','10:30 - 11:30']}
                          value={record.time}
                          onChange={(t) => { try { rescheduleLaundry(record.id, { newTime: t }); toast.success('Laundry rescheduled'); } catch(err) { toast.error(err.message); } }}
                          size="xs"
                          className="w-36"
                        />
                      )}
                      <button
                        onClick={() => { try { cancelLaundryRecord(record.id); toast.success('Laundry cancelled'); } catch (e) { toast.error(e.message); } }}
                        className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                        title="Cancel laundry"
                      >
                        Cancel
                      </button>
                    </div>

                    {record.laundryType === 'onsite' ? (
                      <>
                        <button
                          onClick={() => attemptLaundryStatusChange(record, LAUNDRY_STATUS.WAITING)}
                          disabled={record.status === LAUNDRY_STATUS.WAITING}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            record.status === LAUNDRY_STATUS.WAITING
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <ShoppingBag size={12} className="inline mr-1" /> Waiting
                        </button>
                        
                        <button
                          onClick={() => attemptLaundryStatusChange(record, LAUNDRY_STATUS.WASHER)}
                          disabled={record.status === LAUNDRY_STATUS.WASHER}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            record.status === LAUNDRY_STATUS.WASHER
                              ? 'bg-blue-100 text-blue-400 border-blue-200 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                          }`}
                        >
                          <DropletIcon size={12} className="inline mr-1" /> In Washer
                        </button>
                        
                        <button
                          onClick={() => attemptLaundryStatusChange(record, LAUNDRY_STATUS.DRYER)}
                          disabled={record.status === LAUNDRY_STATUS.DRYER}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            record.status === LAUNDRY_STATUS.DRYER
                              ? 'bg-orange-100 text-orange-400 border-orange-200 cursor-not-allowed'
                              : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100'
                          }`}
                        >
                          <FanIcon size={12} className="inline mr-1" /> In Dryer
                        </button>
                        
                        <button
                          onClick={() => attemptLaundryStatusChange(record, LAUNDRY_STATUS.DONE)}
                          disabled={record.status === LAUNDRY_STATUS.DONE}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            record.status === LAUNDRY_STATUS.DONE
                              ? 'bg-green-100 text-green-400 border-green-200 cursor-not-allowed'
                              : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                          }`}
                        >
                          <CheckCircle2Icon size={12} className="inline mr-1" /> Done
                        </button>
                        
                        <button
                          onClick={() => attemptLaundryStatusChange(record, LAUNDRY_STATUS.PICKED_UP)}
                          disabled={record.status === LAUNDRY_STATUS.PICKED_UP}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            record.status === LAUNDRY_STATUS.PICKED_UP
                              ? 'bg-purple-100 text-purple-400 border-purple-200 cursor-not-allowed'
                              : 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                          }`}
                        >
                          <LogOutIcon size={12} className="inline mr-1" /> Picked Up
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => attemptLaundryStatusChange(record, LAUNDRY_STATUS.PENDING)}
                          disabled={record.status === LAUNDRY_STATUS.PENDING}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            record.status === LAUNDRY_STATUS.PENDING
                              ? 'bg-yellow-100 text-yellow-400 border-yellow-200 cursor-not-allowed'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100'
                          }`}
                        >
                          <Clock size={12} className="inline mr-1" /> Waiting
                        </button>
                        
                        <button
                          onClick={() => attemptLaundryStatusChange(record, LAUNDRY_STATUS.TRANSPORTED)}
                          disabled={record.status === LAUNDRY_STATUS.TRANSPORTED}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            record.status === LAUNDRY_STATUS.TRANSPORTED
                              ? 'bg-blue-100 text-blue-400 border-blue-200 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                          }`}
                        >
                          <Truck size={12} className="inline mr-1" /> Transported
                        </button>
                        
                        <button
                          onClick={() => attemptLaundryStatusChange(record, LAUNDRY_STATUS.RETURNED)}
                          disabled={record.status === LAUNDRY_STATUS.RETURNED}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            record.status === LAUNDRY_STATUS.RETURNED
                              ? 'bg-green-100 text-green-400 border-green-200 cursor-not-allowed'
                              : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                          }`}
                        >
                          <CheckCircle2Icon size={12} className="inline mr-1" /> Returned
                        </button>
                        
                        <button
                          onClick={() => attemptLaundryStatusChange(record, LAUNDRY_STATUS.OFFSITE_PICKED_UP)}
                          disabled={record.status === LAUNDRY_STATUS.OFFSITE_PICKED_UP}
                          className={`text-xs px-2 py-1 rounded-full border ${
                            record.status === LAUNDRY_STATUS.OFFSITE_PICKED_UP
                              ? 'bg-purple-100 text-purple-400 border-purple-200 cursor-not-allowed'
                              : 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                          }`}
                        >
                          <LogOutIcon size={12} className="inline mr-1" /> Picked Up
                        </button>
                      </>
                    )}
                  </div>
                </Animated.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="space-y-4">
  <Animated.div style={headerSpring} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2 text-emerald-800">
            <ClipboardList /> Services Management
          </h1>
          <p className="text-gray-500">
            View and manage all services: meals, showers, laundry, haircuts, holiday, bicycle
          </p>
        </div>
        {todayActionHistory.length > 0 && (
          <button
            onClick={() => setShowUndoPanel(!showUndoPanel)}
            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors self-start sm:self-auto"
          >
            <History size={16} />
            Undo Actions ({todayActionHistory.length})
          </button>
        )}
  </Animated.div>

      {showUndoPanel && todayActionHistory.length > 0 && (
        <div className="mt-2 bg-white border border-orange-200 rounded-lg p-3 sm:p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-orange-800 flex items-center gap-2">
              <History size={16} /> Recent actions
            </h3>
            <div className="flex gap-2">
              <button onClick={clearActionHistory} className="text-xs text-gray-500 hover:text-gray-700">Clear All</button>
              <button onClick={() => setShowUndoPanel(false)} className="text-gray-400 hover:text-gray-600" title="Close">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {todayActionHistory.map(action => (
              <div key={action.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                <div className="text-sm font-medium">{action.description}</div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500">{new Date(action.timestamp).toLocaleTimeString()}</div>
                  <button
                    onClick={() => handleUndoAction(action.id)}
                    className="bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={12} /> Undo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 mb-4 md:mb-6 sticky top-0 z-10">
        <nav className="flex flex-wrap gap-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <SpringIcon>
                  <Icon size={16} />
                </SpringIcon>
                <span className="hidden sm:inline">{section.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {renderSectionContent()}

      {showerPickerGuest && <ShowerBooking />}
      {laundryPickerGuest && <LaundryBooking />}

      {bagPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setBagPromptOpen(false)} />
          <Animated.div style={modalSpring} className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100">
            <h3 className="text-lg font-semibold mb-1">Bag number required</h3>
            <p className="text-sm text-gray-600 mb-3">Please enter a bag number before changing laundry status. This helps track a guest's laundry.</p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={bagPromptValue}
                onChange={(e) => setBagPromptValue(e.target.value)}
                className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="e.g., 33 or 54 or Green 45"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBagPromptOpen(false)} className="px-3 py-2 text-sm rounded-md border">Cancel</button>
              <button onClick={confirmBagPrompt} className="px-3 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Save & Continue</button>
            </div>
          </Animated.div>
        </div>
      )}
    </div>
  );
};

export default Services;
