import React, { useState, useEffect } from "react";
import { Cloud, HardDrive, RefreshCcw } from "lucide-react";
import { setSupabaseSyncEnabled, getSupabaseSyncEnabled } from "../supabaseClient";
import toast from "react-hot-toast";

const SupabaseSyncToggle = ({ supabaseConfigured }) => {
  const [syncEnabled, setSyncEnabled] = useState(getSupabaseSyncEnabled());
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    setSyncEnabled(getSupabaseSyncEnabled());
  }, []);

  const handleToggle = () => {
    if (!supabaseConfigured) {
      toast.error("Supabase is not configured. Please add credentials to .env.local");
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
          { duration: 3000 }
        );
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.success(
          "Cloud sync disabled. Using local storage only. The app will restart to apply changes.",
          { duration: 3000 }
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
            <h4 className="font-semibold text-gray-900 mb-1">Local Storage Only</h4>
            <p className="text-sm text-gray-600">
              Supabase is not configured. All data is stored locally in your browser.
              To enable cloud sync, add Supabase credentials to your .env.local file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3 flex-1">
          {syncEnabled ? (
            <Cloud className="text-blue-600 mt-0.5" size={20} />
          ) : (
            <HardDrive className="text-gray-600 mt-0.5" size={20} />
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">
              {syncEnabled ? "Cloud Sync Enabled" : "Local Storage Mode"}
            </h4>
            <p className="text-sm text-gray-600">
              {syncEnabled
                ? "Data is synced with Supabase cloud database. Changes are saved to both local storage and the cloud."
                : "Data is stored only in your browser's local storage. Enable cloud sync to backup data to Supabase."}
            </p>
            {import.meta.env.DEV && (
              <p className="text-xs text-blue-600 mt-2">
                💡 Development mode: Local storage is recommended for testing and batch uploads.
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={handleToggle}
          disabled={isChanging}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            syncEnabled ? "bg-blue-600" : "bg-gray-200"
          } ${isChanging ? "opacity-50 cursor-not-allowed" : ""}`}
          role="switch"
          aria-checked={syncEnabled}
          aria-label="Toggle cloud sync"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              syncEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          >
            {isChanging && (
              <RefreshCcw className="absolute inset-0 m-auto animate-spin text-gray-400" size={12} />
            )}
          </span>
        </button>
      </div>
      
      {syncEnabled && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            ⚠️ Switching to local storage only will stop syncing to the cloud but won't delete existing cloud data.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupabaseSyncToggle;
