'use client';

import { useState, useEffect } from 'react';
import { useGuestsStore } from '@/lib/stores/useGuestsStore';
import { Search, UserPlus, RefreshCw } from 'lucide-react';

export default function CheckInPage() {
  const { guests, fetchGuests, isLoading } = useGuestsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const filteredGuests = guests.filter((guest) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      guest.name?.toLowerCase().includes(searchLower) ||
      guest.firstName?.toLowerCase().includes(searchLower) ||
      guest.lastName?.toLowerCase().includes(searchLower) ||
      guest.guestId?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Guest Check-in</h1>
        <p className="text-gray-500 mt-1">
          Search for guests or add new ones to check them in.
        </p>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchGuests()}
            disabled={isLoading}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg flex items-center gap-2 text-gray-700 transition-colors"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <UserPlus size={18} />
            Add Guest
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Guests</p>
          <p className="text-2xl font-bold text-gray-900">{guests.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Search Results</p>
          <p className="text-2xl font-bold text-gray-900">
            {searchTerm ? filteredGuests.length : '-'}
          </p>
        </div>
      </div>

      {/* Guest List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
            <p className="text-gray-500">Loading guests...</p>
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {searchTerm
                ? 'No guests found matching your search.'
                : 'No guests yet. Add your first guest to get started.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredGuests.slice(0, 50).map((guest) => (
              <div
                key={guest.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {guest.name || `${guest.firstName} ${guest.lastName}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      ID: {guest.guestId} • {guest.location}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {guest.age}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {guest.gender}
                    </span>
                    {guest.isBanned && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded">
                        Banned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredGuests.length > 50 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Showing 50 of {filteredGuests.length} guests. Refine your search
                to see more.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Guest Modal Placeholder */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Guest</h2>
            <p className="text-gray-500 mb-4">
              Guest form coming soon. This is a placeholder.
            </p>
            <button
              onClick={() => setShowAddForm(false)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
