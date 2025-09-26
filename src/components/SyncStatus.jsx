import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '../context/FirestoreSync';

const SyncStatus = ({ isFirestoreEnabled = false, hasFirestoreConnection = false }) => {
  const isOnline = useOnlineStatus();
  
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
        title: 'Real-time Sync',
        description: 'Multi-user sync active'
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

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${status.bgColor} ${status.borderColor}`}>
      <Icon size={16} className={status.color} />
      <div className="text-xs">
        <div className={`font-medium ${status.color}`}>{status.title}</div>
        <div className="text-gray-600">{status.description}</div>
      </div>
    </div>
  );
};

export default SyncStatus;