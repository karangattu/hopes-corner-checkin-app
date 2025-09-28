import React, { useContext } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../context/FirestoreSync';
import AppContext from '../context/internalContext';

const SyncStatus = ({ isFirestoreEnabled = false, hasFirestoreConnection = false }) => {
  const isOnline = useOnlineStatus();
  const { isSyncing, triggerGlobalSync } = useContext(AppContext);
  
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: 'Offline',
        description: 'Using cached data'
      };
    }
    
    if (!isFirestoreEnabled) {
      return {
        icon: AlertCircle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        title: 'Local Mode',
        description: 'Data not synced across locations'
      };
    }
    
    if (isFirestoreEnabled && hasFirestoreConnection) {
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        title: 'Conservative Sync',
        description: 'Periodic sync active (30s intervals)'
      };
    }
    
    return {
      icon: CloudOff,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      title: 'Sync Error',
      description: 'Firestore connection failed'
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  const handleManualSync = () => {
    if (isFirestoreEnabled && hasFirestoreConnection && !isSyncing && triggerGlobalSync) {
      triggerGlobalSync();
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${status.bgColor} ${status.borderColor}`}>
      <Icon size={16} className={status.color} />
      <div className="text-xs">
        <div className={`font-medium ${status.color}`}>{status.title}</div>
        <div className="text-gray-600">{status.description}</div>
      </div>
      
      {/* Sync indicator and manual sync button */}
      {isFirestoreEnabled && hasFirestoreConnection && (
        <div className="flex items-center gap-1 ml-2">
          {isSyncing ? (
            <RefreshCw size={12} className="text-blue-500 animate-spin" />
          ) : (
            <button
              onClick={handleManualSync}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Trigger manual sync"
            >
              <RefreshCw size={12} className="text-gray-400 hover:text-blue-500" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncStatus;