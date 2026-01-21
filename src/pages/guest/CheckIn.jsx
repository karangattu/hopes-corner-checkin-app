import React, { useEffect } from "react";
import { Users, Search, Globe } from "lucide-react";
import GuestList from "../../components/GuestList";
import ServiceStatusOverview from "../../components/ServiceStatusOverview";
import MealServiceTimer from "../../components/MealServiceTimer";
import TodayStats from "../../components/TodayStats";
import { useAppContext } from "../../context/useAppContext";

const CheckIn = () => {
  const { setActiveTab, setActiveServiceSection } = useAppContext();

  // Auto-refresh service slots every 2 minutes when page is in focus
  useEffect(() => {
    let refreshInterval;

    const startAutoRefresh = () => {
      // Set up interval for every 2 minutes
      refreshInterval = setInterval(() => {
        if (navigator.onLine) {
          // Trigger sync by dispatching a storage event that SyncContext listens for
          const now = Date.now().toString();
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: "hopes-corner-sync-trigger",
              newValue: now,
            })
          );
        }
      }, 2 * 60 * 1000); // 2 minutes
    };

    const stopAutoRefresh = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoRefresh();
      } else {
        startAutoRefresh();
      }
    };

    // Start auto-refresh if page is visible
    if (!document.hidden) {
      startAutoRefresh();
    }

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAutoRefresh();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleShowerClick = () => {
    setActiveServiceSection("showers");
    setActiveTab("services");
    // Scroll to the services tab
    setTimeout(() => {
      const servicesTab = document.querySelector('[aria-current="page"]');
      if (servicesTab) {
        servicesTab.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleLaundryClick = () => {
    setActiveServiceSection("laundry");
    setActiveTab("services");
    // Scroll to the services tab
    setTimeout(() => {
      const servicesTab = document.querySelector('[aria-current="page"]');
      if (servicesTab) {
        servicesTab.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header - Matching Services Management style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2 text-emerald-800">
            <Search /> Guest Search & Check-In
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <p className="text-gray-500">
              Find existing guests or register new arrivals
            </p>
            <a
              href="https://karangattu.github.io/volunteer-translator/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              title="Language cheatsheet for communicating with guests"
            >
              <Globe size={12} />
              <span>Translator</span>
            </a>
            <TodayStats />
          </div>
        </div>
        {/* Meal Service Timer - subtle indicator for volunteers */}
        <MealServiceTimer />
      </div>

      {/* Service Status Overview - At-a-glance availability */}
      <ServiceStatusOverview onShowerClick={handleShowerClick} onLaundryClick={handleLaundryClick} />

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100">
              <Users size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Find or Add Guests</h2>
              <p className="text-sm text-gray-500">
                Type a name to search • Type first AND last name, then press Enter to create
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <GuestList />
        </div>
      </div>
    </div>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(CheckIn);