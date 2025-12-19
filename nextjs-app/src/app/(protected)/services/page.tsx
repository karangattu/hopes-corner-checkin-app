'use client';

import { Droplets, Shirt, Wrench } from 'lucide-react';

export default function ServicesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <p className="text-gray-500 mt-1">
          Manage shower bookings, laundry, and bicycle repairs.
        </p>
      </div>

      {/* Service Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Showers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Droplets className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Showers</h2>
              <p className="text-sm text-gray-500">Book shower times</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Today&apos;s bookings</span>
              <span className="font-medium text-gray-900">0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Available slots</span>
              <span className="font-medium text-green-600">5</span>
            </div>
          </div>
          <button className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Manage Showers
          </button>
        </div>

        {/* Laundry */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shirt className="text-purple-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Laundry</h2>
              <p className="text-sm text-gray-500">Track laundry loads</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">In progress</span>
              <span className="font-medium text-gray-900">0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ready for pickup</span>
              <span className="font-medium text-green-600">0</span>
            </div>
          </div>
          <button className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            Manage Laundry
          </button>
        </div>

        {/* Bicycle Repairs */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wrench className="text-orange-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bicycles</h2>
              <p className="text-sm text-gray-500">Repair tracking</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pending repairs</span>
              <span className="font-medium text-gray-900">0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">In progress</span>
              <span className="font-medium text-yellow-600">0</span>
            </div>
          </div>
          <button className="mt-4 w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
            Manage Repairs
          </button>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Today&apos;s Activity
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <p>No service activity recorded today.</p>
          <p className="text-sm mt-1">
            Service records will appear here as they are created.
          </p>
        </div>
      </div>
    </div>
  );
}
