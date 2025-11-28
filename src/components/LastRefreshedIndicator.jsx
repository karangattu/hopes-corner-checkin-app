import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { useOnlineStatus } from "../context/FirestoreSync";

// Tables that are synced with Supabase (must match actual localStorage key names)
const SYNCED_TABLES = [
  "guests",
  "meal_attendance",
  "shower_reservations",
  "laundry_bookings",
  "bicycle_repairs",
  "holiday_visits",
  "haircut_visits",
  "items_distributed",
  "donations",
  "la_plaza_donations",
];

/**
 * Get the most recent sync timestamp across all synced tables
 */
const getMostRecentSyncTime = () => {
  let mostRecent = null;

  for (const tableName of SYNCED_TABLES) {
    const lastSyncKey = `hopes-corner-${tableName}-lastSync`;
    const lastSyncStr = localStorage.getItem(lastSyncKey);

    if (lastSyncStr) {
      const lastSync = parseInt(lastSyncStr, 10);
      if (!isNaN(lastSync) && (!mostRecent || lastSync > mostRecent)) {
        mostRecent = lastSync;
      }
    }
  }

  return mostRecent;
};

/**
 * Format the time difference for display
 */
const formatTimeDifference = (timestamp) => {
  if (!timestamp) return "Never";

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // Format as date for older timestamps
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
};

/**
 * Determine freshness status based on how old the data is
 */
const getFreshnessStatus = (timestamp) => {
  if (!timestamp) return "stale";

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  if (diffMinutes < 5) return "fresh"; // Less than 5 minutes
  if (diffMinutes < 30) return "recent"; // Less than 30 minutes
  if (diffMinutes < 120) return "aging"; // Less than 2 hours
  return "stale"; // Older than 2 hours
};

const LastRefreshedIndicator = () => {
  const { supabaseEnabled } = useAppContext();
  const isOnline = useOnlineStatus();
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [, setTick] = useState(0);

  // Update the sync time from localStorage
  const updateLastSyncTime = useCallback(() => {
    const mostRecent = getMostRecentSyncTime();
    setLastSyncTime(mostRecent);
  }, []);

  // Initial load and periodic updates
  useEffect(() => {
    updateLastSyncTime();

    // Update every 30 seconds to keep the display fresh
    const interval = setInterval(() => {
      updateLastSyncTime();
      setTick((t) => t + 1); // Force re-render to update relative time
    }, 30000);

    // Also listen for storage events (in case sync happens in another tab)
    const handleStorageChange = (e) => {
      if (e.key?.includes("-lastSync")) {
        updateLastSyncTime();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [updateLastSyncTime]);

  // Compute display values
  const timeDisplay = formatTimeDifference(lastSyncTime);
  const freshness = getFreshnessStatus(lastSyncTime);

  // Determine the icon and styling based on freshness
  const getStatusStyles = () => {
    if (!isOnline) {
      return {
        icon: AlertCircle,
        textColor: "text-amber-600",
        iconColor: "text-amber-500",
        bgColor: "bg-amber-50",
        label: "Offline",
      };
    }

    if (!supabaseEnabled) {
      return {
        icon: Clock,
        textColor: "text-gray-500",
        iconColor: "text-gray-400",
        bgColor: "bg-gray-50",
        label: "Local only",
      };
    }

    switch (freshness) {
      case "fresh":
        return {
          icon: CheckCircle2,
          textColor: "text-emerald-600",
          iconColor: "text-emerald-500",
          bgColor: "bg-emerald-50",
          label: "Up to date",
        };
      case "recent":
        return {
          icon: RefreshCw,
          textColor: "text-emerald-600",
          iconColor: "text-emerald-500",
          bgColor: "bg-emerald-50",
          label: "Recent",
        };
      case "aging":
        return {
          icon: Clock,
          textColor: "text-amber-600",
          iconColor: "text-amber-500",
          bgColor: "bg-amber-50",
          label: "May be outdated",
        };
      case "stale":
      default:
        return {
          icon: AlertCircle,
          textColor: "text-orange-600",
          iconColor: "text-orange-500",
          bgColor: "bg-orange-50",
          label: "Outdated",
        };
    }
  };

  const styles = getStatusStyles();
  const Icon = styles.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${styles.bgColor}`}>
      <Icon size={14} className={styles.iconColor} aria-hidden="true" />
      <span className={`text-xs font-medium ${styles.textColor}`}>
        {!isOnline ? (
          "Working offline"
        ) : !supabaseEnabled ? (
          "Sync disabled"
        ) : (
          <>
            <span className="hidden sm:inline">Last refreshed: </span>
            <span className="sm:hidden">Refreshed </span>
            {timeDisplay}
          </>
        )}
      </span>
    </div>
  );
};

export default LastRefreshedIndicator;
