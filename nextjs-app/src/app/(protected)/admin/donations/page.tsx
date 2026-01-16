'use client';

import React, { useState } from 'react';
import { Package, ShoppingBag, ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';
import DonationEntryForm from '@/components/admin/donations/DonationEntryForm';
import LaPlazaEntryForm from '@/components/admin/donations/LaPlazaEntryForm';
import { useDonationsStore } from '@/lib/stores/useDonationsStore';
import { useMemo } from 'react';

type DonationTab = 'food' | 'laplaza';

export default function DonationsPage() {
    const [activeTab, setActiveTab] = useState<DonationTab>('food');
    const { donationRecords, laPlazaRecords } = useDonationsStore();

    const recentFoodDonations = useMemo(() => {
        return [...donationRecords]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [donationRecords]);

    const recentLaPlazaDonations = useMemo(() => {
        return [...laPlazaRecords]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [laPlazaRecords]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Link
                        href="/admin"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Back to Dashboard
                    </Link>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Donation Logging</h1>
                <p className="text-gray-500 mt-1">
                    Log incoming food and La Plaza donations.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('food')}
                    className={`pb-3 px-4 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'food'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Package size={18} />
                    Food Donations
                </button>
                <button
                    onClick={() => setActiveTab('laplaza')}
                    className={`pb-3 px-4 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'laplaza'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <ShoppingBag size={18} />
                    La Plaza Donations
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Area */}
                <div className="lg:col-span-2">
                    {activeTab === 'food' ? (
                        <DonationEntryForm />
                    ) : (
                        <LaPlazaEntryForm />
                    )}
                </div>

                {/* Recent Activity Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <History size={20} className="text-gray-400" />
                            Recent Logs
                        </h3>

                        {activeTab === 'food' ? (
                            <div className="space-y-4">
                                {recentFoodDonations.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No food donations logged yet.</p>
                                ) : (
                                    recentFoodDonations.map((d) => (
                                        <div key={d.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-gray-900">{d.type}</p>
                                                    <p className="text-sm text-gray-600">{d.itemName}</p>
                                                    <p className="text-xs text-gray-400">{d.donor}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                                                        {d.weightLbs} lbs
                                                    </span>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentLaPlazaDonations.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No La Plaza donations logged yet.</p>
                                ) : (
                                    recentLaPlazaDonations.map((d) => (
                                        <div key={d.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-gray-900">{d.category}</p>
                                                    {d.notes && <p className="text-xs text-gray-500 italic truncate max-w-[150px]">{d.notes}</p>}
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">
                                                        {d.weightLbs} lbs
                                                    </span>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
