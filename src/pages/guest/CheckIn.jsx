import React from "react";
import { Users, Search } from "lucide-react";
import GuestList from "../../components/GuestList";
import ServiceStatusOverview from "../../components/ServiceStatusOverview";
import { useAppContext } from "../../context/useAppContext";

const CheckIn = () => {
  const { setActiveTab, setActiveServiceSection } = useAppContext();

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
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2 text-emerald-800">
            <Search /> Guest Search & Check-In
          </h1>
          <p className="text-gray-500">
            Find existing guests or register new arrivals
          </p>
        </div>
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
                Type a name to search • Press Enter to create if not found
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
