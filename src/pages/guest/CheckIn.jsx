import React from "react";
import { Users, Search } from "lucide-react";
import GuestList from "../../components/GuestList";

const CheckIn = () => {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Search className="text-blue-600" /> Guest Search & Check-In
        </h1>
        <p className="text-gray-500">
          Search for existing guests or create new ones as needed
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Users size={20} className="text-green-600" /> Find or Add Guests
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Start typing a guest's name to search. If no results are found,
            you'll see an option to create a new guest.
          </p>
        </div>
        <GuestList />
      </div>
    </div>
  );
};

export default CheckIn;
