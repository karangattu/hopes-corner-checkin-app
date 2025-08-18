import React, { useState } from 'react';
import { 
  WashingMachine, 
  Clock, 
  X, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../context/useAppContext';

const LaundryBooking = () => {
  const { 
    laundryPickerGuest, 
    setLaundryPickerGuest, 
    allLaundrySlots, 
    addLaundryRecord, 
    laundrySlots
  } = useAppContext();

  const [selectedLaundryType, setSelectedLaundryType] = useState('onsite');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const laundryTypes = [
    { id: 'onsite', label: 'On-site Laundry', description: 'Laundry done on premises' },
    { id: 'offsite', label: 'Off-site Laundry', description: 'Laundry sent to external service' }
  ];

  const isSlotBooked = (slotTime) => {
    return laundrySlots.some(slot => slot.time === slotTime);
  };

  const handleBookLaundry = (slotTime = null) => {
    if (!laundryPickerGuest) return;
    
    try {
      addLaundryRecord(laundryPickerGuest.id, slotTime, selectedLaundryType);
      setSuccess(true);
      setError('');
      
      setTimeout(() => {
        setSuccess(false);
        setLaundryPickerGuest(null);
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Failed to book laundry');
      setSuccess(false);
    }
  };
  
  if (!laundryPickerGuest) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <WashingMachine /> Book Laundry for {laundryPickerGuest.name}
            </h2>
            <button 
              onClick={() => setLaundryPickerGuest(null)}
              className="p-1 rounded-full hover:bg-gray-100"
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
              Laundry slot booked successfully!
            </div>
          )}
          
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Select Laundry Type:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {laundryTypes.map((type) => (
                <div key={type.id} className="relative">
                  <input
                    type="radio"
                    name="laundryType"
                    id={`laundry-type-${type.id}`}
                    className="peer absolute opacity-0"
                    checked={selectedLaundryType === type.id}
                    onChange={() => setSelectedLaundryType(type.id)}
                  />
                  <label
                    htmlFor={`laundry-type-${type.id}`}
                    className={`block p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedLaundryType === type.id 
                      ? 'bg-purple-100 border-purple-500 text-purple-900' 
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {selectedLaundryType === 'onsite' ? (
            <>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Select Available Time Slot:</h3>
              <p className="text-xs text-gray-500 mb-4">Maximum of 5 on-site laundry slots per day</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {allLaundrySlots.map((slotTime) => {
                  const booked = isSlotBooked(slotTime);
                  const onsiteSlots = laundrySlots.filter(slot => slot.laundryType === 'onsite');
                  return (
                    <button
                      key={slotTime}
                      onClick={() => !booked && handleBookLaundry(slotTime)}
                      disabled={booked || onsiteSlots.length >= 5}
                      className={`flex items-center justify-between px-4 py-3 border rounded-lg transition-colors ${
                        booked
                          ? 'bg-gray-100 cursor-not-allowed text-gray-500'
                          : onsiteSlots.length >= 5
                          ? 'bg-gray-100 cursor-not-allowed text-gray-500'
                          : 'bg-white hover:bg-purple-50 text-gray-800 hover:border-purple-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        <span>{slotTime}</span>
                      </div>
                      
                      {booked && (
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                          Booked
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{laundrySlots.filter(slot => slot.laundryType === 'onsite').length}/5</span> on-site slots booked
                </div>
                <button
                  onClick={() => setLaundryPickerGuest(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded flex items-center gap-2"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Off-site laundry doesn't require time slots. Items will be processed over multiple days.
                </p>
              </div>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={() => handleBookLaundry()}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                >
                  Book Off-site Laundry
                </button>
                <button
                  onClick={() => setLaundryPickerGuest(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded flex items-center gap-2"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaundryBooking;
