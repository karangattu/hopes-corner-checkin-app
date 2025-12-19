'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BicycleKanban } from '@/components/lanes';

export default function BicycleKanbanPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/services"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors mb-2"
        >
          <ArrowLeft size={20} />
          Back to Services
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Bicycle Repair Management</h1>
        <p className="text-gray-500 mt-1">
          Track and manage bicycle repairs with drag-and-drop kanban board
        </p>
      </div>

      {/* Kanban Board */}
      <BicycleKanban />
    </div>
  );
}
