'use client';

import { useState } from 'react';
import { BarChart3, FileText, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import MonthlySummaryReport from '@/components/admin/MonthlySummaryReport';
import AttendanceBatchUpload from '@/components/admin/AttendanceBatchUpload';

type ReportView = 'menu' | 'monthly' | 'import';

export default function ReportsPage() {
  const [currentView, setCurrentView] = useState<ReportView>('menu');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (currentView === 'monthly') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Navigation */}
        <div className="mb-6">
          <button
            onClick={() => setCurrentView('menu')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Reports
          </button>
        </div>
        
        <MonthlySummaryReport />
      </div>
    );
  }

  if (currentView === 'import') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Navigation */}
        <div className="mb-6">
          <button
            onClick={() => setCurrentView('menu')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Reports
          </button>
        </div>
        
        <AttendanceBatchUpload />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            Admin
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700">Reports</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Data Management</h1>
        <p className="text-gray-500 mt-1">{today}</p>
      </div>

      {/* Report Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Monthly Summary Report */}
        <button
          onClick={() => setCurrentView('monthly')}
          className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <BarChart3 className="text-blue-600" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Monthly Summary Report</h3>
              <p className="text-gray-600 text-sm">
                Comprehensive monthly statistics including meal counts by day and type, 
                bicycle services summary, and shower/laundry tracking with CSV export.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Meals</span>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">Bicycles</span>
                <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-1 rounded">Showers</span>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">Laundry</span>
              </div>
            </div>
          </div>
        </button>

        {/* Attendance Batch Import */}
        <button
          onClick={() => setCurrentView('import')}
          className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-green-400 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <FileText className="text-green-600" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Batch Import Attendance</h3>
              <p className="text-gray-600 text-sm">
                Import historical attendance records from CSV files. Supports meals, 
                showers, laundry, bicycles, haircuts, and holiday visits.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">CSV Import</span>
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">Bulk Upload</span>
                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded">Validation</span>
              </div>
            </div>
          </div>
        </button>

        {/* Coming Soon - Date Range Report */}
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 text-left opacity-70">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center">
              <Calendar className="text-gray-500" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-500 mb-2">Custom Date Range Report</h3>
              <p className="text-gray-500 text-sm">
                Generate reports for any custom date range with detailed breakdowns
                and comparisons.
              </p>
              <div className="mt-3">
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/check-in"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            Check-In
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            Services
          </Link>
        </div>
      </div>
    </div>
  );
}
