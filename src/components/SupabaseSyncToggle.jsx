import React, { useState, useEffect } from "react";
import { Cloud, HardDrive, RefreshCcw } from "lucide-react";
import {
  setSupabaseSyncEnabled,
  getSupabaseSyncEnabled,
} from "../supabaseClient";
import toast from "react-hot-toast";

const SupabaseSyncToggle = ({ supabaseConfigured }) => {
  const [syncEnabled, setSyncEnabled] = useState(getSupabaseSyncEnabled());
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    setSyncEnabled(getSupabaseSyncEnabled());
  }, []);

  const handleToggle = () => {
    if (!supabaseConfigured) {
      toast.error(
        "Supabase is not configured. Please add credentials to .env.local",
      );
      return;
    }

    setIsChanging(true);
    const newValue = !syncEnabled;

    const success = setSupabaseSyncEnabled(newValue);

    if (success) {
      setSyncEnabled(newValue);
      if (newValue) {
        toast.success(
          "Cloud sync enabled! The app will restart to apply changes.",
          { duration: 3000 },
        );
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.success(
          "Cloud sync disabled. Using local storage only. The app will restart to apply changes.",
          { duration: 3000 },
        );
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } else {
      setIsChanging(false);
    }
  };

  if (!supabaseConfigured) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <HardDrive className="text-gray-400 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">
              Local Storage Only
            </h4>
            <p className="text-sm text-gray-600">
              Supabase is not configured. All data is stored locally in your
              browser. To enable cloud sync, add Supabase credentials to your
              .env.local file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleForceSyncClick = () => {
    // Reset all sync timestamps to force a full re-sync
    const SYNC_TABLES = [
      "guests",
      "meal_attendance",
      "shower_reservations",
      "laundry_bookings",
      "bicycle_repairs",
      "donations",
    ];

    SYNC_TABLES.forEach((table) => {
      localStorage.removeItem(`hopes-corner-${table}-lastSync`);
    });

    toast.success("Sync timestamps cleared! App will refresh to force full sync.", {
      duration: 2000,
    });

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {syncEnabled ? (
              <Cloud className="text-blue-600 mt-1 flex-shrink-0" size={20} />
            ) : (
              <HardDrive className="text-gray-400 mt-1 flex-shrink-0" size={20} />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">
                {syncEnabled ? "Cloud Sync" : "Local Storage Only"}
              </h4>
              <p className="text-sm text-gray-600 mt-0.5">
                {syncEnabled
                  ? "Synced with Supabase cloud database"
                  : "Local browser storage only"}
              </p>
              {import.meta.env.DEV && (
                <p className="text-xs text-blue-600 mt-1.5">
                  💡 Dev mode: Local storage recommended for testing
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleToggle}
            disabled={isChanging}
            className={`relative inline-flex h-8 w-16 flex-shrink-0 items-center cursor-pointer rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm ${
              syncEnabled
                ? "bg-gradient-to-r from-blue-500 to-blue-600 focus:ring-blue-500 hover:shadow-md hover:from-blue-600 hover:to-blue-700"
                : "bg-gradient-to-r from-gray-300 to-gray-400 focus:ring-gray-400 hover:shadow-md hover:from-gray-400 hover:to-gray-500"
            } ${isChanging ? "opacity-70 cursor-not-allowed" : ""}`}
            role="switch"
            aria-checked={syncEnabled}
            aria-label="Toggle cloud sync"
          >
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out transform ${
                syncEnabled ? "translate-x-[2.125rem]" : "translate-x-0.5"
              }`}
            >
              {isChanging ? (
                <RefreshCcw
                  className="animate-spin text-blue-500"
                  size={14}
                />
              ) : syncEnabled ? (
                <Cloud className="text-blue-500" size={14} />
              ) : (
                <HardDrive className="text-gray-400" size={14} />
              )}
            </span>
          </button>
        </div>
      </div>

      {syncEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <RefreshCcw className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-semibold text-blue-900">
                Force Full Sync
              </h5>
              <p className="text-xs text-blue-700 mt-1">
                If data seems out of sync, reset sync timestamps and refresh to force a complete re-synchronization with the cloud.
              </p>
              <button
                onClick={handleForceSyncClick}
                disabled={isChanging}
                className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Force Sync Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {syncEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            ⚠️ Disabling cloud sync will stop syncing to Supabase but won't delete cloud data.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupabaseSyncToggle;
