import React from "react";
import { Users, Search } from "lucide-react";
import GuestList from "../../components/GuestList";

const CheckIn = () => {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)]" />
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
              <Search size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Guest Search & Check-In
              </h1>
              <p className="text-blue-100 text-sm md:text-base mt-0.5">
                Find existing guests or register new arrivals
              </p>
            </div>
          </div>
        </div>
      </div>

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
