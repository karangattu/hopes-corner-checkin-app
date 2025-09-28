import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Users, Calendar, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/useAppContext';
import toast from 'react-hot-toast';

const SyncDebugger = () => {
  const {
    showerRecords,
    laundryRecords,
    guests,
    mealRecords,
    bicycleRecords,
    firestoreEnabled,
    firestoreConnection
  } = useAppContext();

  const [lastUpdate, setLastUpdate] = useState(null);
  const [recordCounts, setRecordCounts] = useState({});
  const [connectionHistory, setConnectionHistory] = useState([]);

  useEffect(() => {
    const counts = {
      showers: showerRecords.length,
      laundry: laundryRecords.length,
      guests: guests.length,
      meals: mealRecords.length,
      bicycles: bicycleRecords.length,
      timestamp: new Date().toISOString()
    };
    
    setRecordCounts(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(counts)) {
        setLastUpdate(new Date());
        return counts;
      }
      return prev;
    });
  }, [showerRecords, laundryRecords, guests, mealRecords, bicycleRecords]);

  // Track connection state changes
  useEffect(() => {
    const newEntry = {
      timestamp: new Date().toLocaleTimeString(),
      connected: firestoreConnection,
      enabled: firestoreEnabled
    };
    
    setConnectionHistory(prev => {
      const lastEntry = prev[prev.length - 1];
      if (!lastEntry || lastEntry.connected !== firestoreConnection) {
        return [...prev.slice(-4), newEntry]; // Keep last 5 entries
      }
      return prev;
    });
  }, [firestoreConnection, firestoreEnabled]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleTestConnection = async () => {
    try {
      // Simple test - check if we can access the environment variables
      const envVars = {
        firebase: import.meta.env.VITE_USE_FIREBASE,
        emulators: import.meta.env.VITE_USE_FIREBASE_EMULATORS,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
      };
      
      console.log('Environment check:', envVars);
      
      if (envVars.firebase === 'true' && envVars.emulators === 'false') {
        toast.success('Configuration looks correct!');
      } else if (envVars.emulators === 'true') {
        toast.error('Using emulators - switch to production for real-time sync');
      } else {
        toast.error('Firebase not enabled in environment');
      }
    } catch (error) {
      toast.error('Connection test failed: ' + error.message);
    }
  };

  const getConnectionStatusColor = () => {
    if (!firestoreEnabled) return 'bg-gray-500';
    return firestoreConnection ? 'bg-green-500' : 'bg-red-500';
  };

  const getEnvironmentInfo = () => {
    const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
    const isEnabled = import.meta.env.VITE_USE_FIREBASE === 'true';
    
    if (!isEnabled) return { text: 'Disabled', color: 'text-gray-500' };
    if (isEmulator) return { text: 'Emulator', color: 'text-amber-600' };
    return { text: 'Production', color: 'text-green-600' };
  };

  const envInfo = getEnvironmentInfo();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[320px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Sync Debug Panel</h3>
          <div className="flex gap-1">
            <button
              onClick={handleTestConnection}
              className="p-1 rounded hover:bg-gray-100"
              title="Test connection"
            >
              <Database size={14} className="text-blue-500" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-gray-100"
              title="Refresh page"
            >
              <RefreshCw size={14} className="text-gray-500" />
            </button>
          </div>
        </div>
        
        <div className="space-y-3 text-xs">
          {/* Connection Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
              <span className="font-medium">
                {firestoreEnabled 
                  ? (firestoreConnection ? 'Connected' : 'Disconnected')
                  : 'Firebase Disabled'
                }
              </span>
            </div>
            <div className="flex items-center gap-2 ml-5">
              <span>Environment:</span>
              <span className={`font-medium ${envInfo.color}`}>{envInfo.text}</span>
            </div>
          </div>

          {/* Warning for Emulator Mode */}
          {import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Emulator Mode Active</div>
                <div className="text-[10px]">Real-time sync won't work between different devices/browsers</div>
              </div>
            </div>
          )}
          
          {/* Record Counts */}
          <div className="border-t pt-2 space-y-1">
            <div className="font-medium text-gray-600 mb-1">Current Data:</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between">
                <span>Guests:</span>
                <span className="font-mono">{recordCounts.guests || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Meals:</span>
                <span className="font-mono">{recordCounts.meals || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Showers:</span>
                <span className="font-mono">{recordCounts.showers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Laundry:</span>
                <span className="font-mono">{recordCounts.laundry || 0}</span>
              </div>
            </div>
          </div>

          {/* Connection History */}
          {connectionHistory.length > 0 && (
            <div className="border-t pt-2">
              <div className="font-medium text-gray-600 mb-1">Connection Log:</div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {connectionHistory.map((entry, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span>{entry.timestamp}</span>
                    <span className={entry.connected ? 'text-green-600' : 'text-red-600'}>
                      {entry.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {lastUpdate && (
            <div className="border-t pt-2 text-[10px] text-gray-500">
              Last data update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          
          {/* Instructions */}
          <div className="border-t pt-2 text-[10px] text-gray-400">
            <div className="font-medium mb-1">Quick Test:</div>
            <div>1. Open app on 2nd device</div>
            <div>2. Add data on one device</div>
            <div>3. Watch counts update here</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncDebugger;