import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { useSyncTrigger, globalSyncManager } from "../context/SupabaseSync";
import { useOnlineStatus } from "../context/FirestoreSync";
import toast from "react-hot-toast";

// Tables to clear for force refresh
const SYNC_TABLES = [
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
 * Refresh button that triggers a full data refresh from Supabase
 */
const RefreshButton = ({ onRefreshComplete }) => {
  const { supabaseEnabled } = useAppContext();
  const isOnline = useOnlineStatus();
  const { triggerGlobalSync, isSyncing } = useSyncTrigger();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isSyncing) return;

    if (!isOnline) {
      toast.error("Cannot refresh while offline");
      return;
    }

    if (!supabaseEnabled) {
      toast.error("Cloud sync is disabled");
      return;
    }

    setIsRefreshing(true);

    try {
      // Clear all sync timestamps to force a full re-sync
      SYNC_TABLES.forEach((table) => {
        localStorage.removeItem(`hopes-corner-${table}-lastSync`);
      });

      // Reset the sync manager's lastSync times to trigger immediate sync
      globalSyncManager.syncQueue.forEach((_, collectionName) => {
        globalSyncManager.lastSync.set(collectionName, 0);
      });

      // Trigger the global sync
      await triggerGlobalSync();

      // Update the sync timestamps to now
      const now = Date.now().toString();
      SYNC_TABLES.forEach((table) => {
        localStorage.setItem(`hopes-corner-${table}-lastSync`, now);
      });

      // Dispatch storage event to update LastRefreshedIndicator
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "hopes-corner-guests-lastSync",
          newValue: now,
        })
      );

      toast.success("Data refreshed successfully");

      // Call the callback to update parent components
      if (onRefreshComplete) {
        onRefreshComplete();
      }
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("Failed to refresh data");
    } finally {
      // Add a small delay to show the animation completing
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [isRefreshing, isSyncing, isOnline, supabaseEnabled, triggerGlobalSync, onRefreshComplete]);

  const isDisabled = !isOnline || !supabaseEnabled || isRefreshing || isSyncing;
  const isAnimating = isRefreshing || isSyncing;

  return (
    <button
      onClick={handleRefresh}
      disabled={isDisabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
        isDisabled
          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
          : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 active:bg-emerald-100"
      }`}
      aria-label="Refresh data from cloud"
      title={
        !isOnline
          ? "Cannot refresh while offline"
          : !supabaseEnabled
            ? "Cloud sync is disabled"
            : isAnimating
              ? "Refreshing..."
              : "Refresh data from cloud"
      }
    >
      <RefreshCw
        size={16}
        className={`${isAnimating ? "animate-spin" : ""} ${
          isDisabled ? "text-gray-400" : "text-emerald-600"
        }`}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">
        {isAnimating ? "Refreshing..." : "Refresh"}
      </span>
    </button>
  );
};

export default RefreshButton;
