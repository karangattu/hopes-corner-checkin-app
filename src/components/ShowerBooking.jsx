import React, { useState } from 'react';
import { 
  ShowerHead, 
  Clock, 
  X, 
  Users, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../context/useAppContext';
import toast from 'react-hot-toast';

const ShowerBooking = () => {
  const { 
    showerPickerGuest, 
    setShowerPickerGuest, 
  allShowerSlots, 
  addShowerRecord, 
  addShowerWaitlist,
    showerSlots
  } = useAppContext();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const getSlotAvailability = (slotTime) => {
    const bookedCount = showerSlots.filter(s => s.time === slotTime).length;
    return {
      count: bookedCount,
      isFull: bookedCount >= 2
    };
  };

  const handleBookShower = (slotTime) => {
    if (!showerPickerGuest) return;
    
    try {
      addShowerRecord(showerPickerGuest.id, slotTime);
      setSuccess(true);
      setError('');
      
      setTimeout(() => {
        setSuccess(false);
        setShowerPickerGuest(null);
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Failed to book shower slot');
      setSuccess(false);
    }
  };

  const handleWaitlist = () => {
    if (!showerPickerGuest) return;
    try {
      addShowerWaitlist(showerPickerGuest.id);
      setSuccess(true);
      toast.success('Guest added to shower waitlist');
      setTimeout(() => {
        setSuccess(false);
        setShowerPickerGuest(null);
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to add to waitlist');
    }
  };
  
  if (!showerPickerGuest) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4 z-50">
      <div className="bg-white rounded-t-2xl md:rounded-lg w-full md:max-w-lg md:max-h-[90vh] h-[85vh] md:h-auto overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <ShowerHead /> Book Shower for {showerPickerGuest.name}
            </h2>
            <button 
              onClick={() => setShowerPickerGuest(null)}
              className="p-2 md:p-1 rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded flex items-center gap-2">
              <CheckCircle size={18} />
              Shower slot booked successfully!
            </div>
          )}
          
          <h3 className="text-sm font-medium text-gray-700 mb-2">Select Available Time Slot:</h3>
          <p className="text-xs text-gray-500 mb-4">Maximum of 2 guests per time slot</p>
          
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {allShowerSlots.map((slotTime) => {
              const { count, isFull } = getSlotAvailability(slotTime);
              return (
                <button
                  key={slotTime}
                  onClick={() => !isFull && handleBookShower(slotTime)}
                  disabled={isFull}
      className={`flex flex-col items-center justify-center px-3 py-4 md:py-3 border rounded-lg transition-colors text-sm ${
                    isFull
                      ? 'bg-gray-100 cursor-not-allowed text-gray-500'
                      : count === 1 
                      ? 'bg-yellow-50 hover:bg-yellow-100 border-yellow-300 text-gray-800'
                      : 'bg-white hover:bg-blue-50 text-gray-800 hover:border-blue-500'
                  }`}
                >
      <div className="text-base md:text-sm font-medium">{slotTime}</div>
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    <Users size={14} />
                    <span>{count}/2</span>
                  </div>
                </button>
              );
            })}
          </div>
          {allShowerSlots.every((slotTime) => getSlotAvailability(slotTime).isFull) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-900">
              All slots are full today. You can add this guest to the shower waitlist.
              <div className="mt-2">
                <button onClick={handleWaitlist} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded">Add to Waitlist</button>
              </div>
            </div>
          )}
          
          <div className="sticky bottom-0 bg-white pt-2 pb-2">
            <button
              onClick={() => setShowerPickerGuest(null)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowerBooking;
