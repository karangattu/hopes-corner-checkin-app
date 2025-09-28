import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/useAppContext';
import { Play, Pause, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const RealTimeSyncTest = () => {
  const { 
    guests, 
    showerRecords, 
    laundryRecords, 
    mealRecords,
    addMealRecord,
    firestoreEnabled,
    firestoreConnection
  } = useAppContext();

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCounts, setLastCounts] = useState(null);
  const [changeLog, setChangeLog] = useState([]);

  // Monitor data changes
  useEffect(() => {
    if (!isMonitoring) return;

    const currentCounts = {
      guests: guests.length,
      showers: showerRecords.length,
      laundry: laundryRecords.length,
      meals: mealRecords.length,
      timestamp: Date.now()
    };

    if (lastCounts) {
      const changes = [];
      Object.keys(currentCounts).forEach(key => {
        if (key !== 'timestamp' && currentCounts[key] !== lastCounts[key]) {
          const change = currentCounts[key] - lastCounts[key];
          changes.push(`${key}: ${change > 0 ? '+' : ''}${change}`);
        }
      });

      if (changes.length > 0) {
        const logEntry = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          changes: changes.join(', '),
          counts: { ...currentCounts }
        };
        setChangeLog(prev => [logEntry, ...prev.slice(0, 9)]);
        toast.success(`Real-time update: ${changes.join(', ')}`);
      }
    }

    setLastCounts(currentCounts);
  }, [guests, showerRecords, laundryRecords, mealRecords, isMonitoring, lastCounts]);

  const handleTestWrite = async () => {
    if (!guests.length) {
      toast.error('No guests available for test');
      return;
    }

    try {
      const testGuest = guests[Math.floor(Math.random() * guests.length)];
      await addMealRecord(testGuest.id, 1);
      toast.success('Test meal record added');
    } catch (error) {
      toast.error('Failed to add test record: ' + error.message);
    }
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      setChangeLog([]);
      setLastCounts(null);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-50 bg-white rounded-lg shadow-lg border p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Real-Time Sync Test</h3>
        <button
          onClick={() => window.location.reload()}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Connection Status */}
      <div className="mb-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Firestore:</span>
          <span className={firestoreEnabled ? 'text-green-600' : 'text-red-600'}>
            {firestoreEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Connection:</span>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${firestoreConnection ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={firestoreConnection ? 'text-green-600' : 'text-red-600'}>
              {firestoreConnection ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Current Counts */}
      <div className="mb-3 text-xs bg-gray-50 rounded p-2">
        <div className="grid grid-cols-2 gap-2">
          <div>Guests: {guests.length}</div>
          <div>Showers: {showerRecords.length}</div>
          <div>Laundry: {laundryRecords.length}</div>
          <div>Meals: {mealRecords.length}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={toggleMonitoring}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
            isMonitoring 
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {isMonitoring ? <Pause size={12} /> : <Play size={12} />}
          {isMonitoring ? 'Stop' : 'Monitor'}
        </button>
        
        <button
          onClick={handleTestWrite}
          disabled={!firestoreConnection}
          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded disabled:opacity-50"
        >
          Test Write
        </button>
      </div>

      {/* Change Log */}
      {changeLog.length > 0 && (
        <div className="text-xs">
          <div className="font-medium mb-1">Change Log:</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {changeLog.map(entry => (
              <div key={entry.id} className="bg-blue-50 rounded p-1">
                <div className="font-mono text-[10px]">{entry.timestamp}</div>
                <div className="text-blue-800">{entry.changes}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-3 text-[10px] text-gray-500">
        <strong>Test Instructions:</strong><br />
        1. Click "Monitor" to start tracking changes<br />
        2. Open app on another device/browser<br />
        3. Add data there and watch for updates here<br />
        4. Use "Test Write" to add data from this device
      </div>
    </div>
  );
};

export default RealTimeSyncTest;