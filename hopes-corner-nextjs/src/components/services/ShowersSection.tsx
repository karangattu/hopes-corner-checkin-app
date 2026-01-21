'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShowerHead, Clock, CheckCircle, XCircle, ChevronRight, User, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { useServicesStore } from '@/stores/useServicesStore';
import { useGuestsStore } from '@/stores/useGuestsStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { formatSlotLabel } from '@/lib/utils/serviceSlots';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { CompactWaiverIndicator } from '@/components/ui/CompactWaiverIndicator';
import CompactShowerList from './CompactShowerList';
import { ShowerDetailModal } from './ShowerDetailModal';
import { SlotBlockModal } from '../admin/SlotBlockModal';
import { EndServiceDayPanel } from './EndServiceDayPanel';
import { LayoutGrid, List, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function ShowersSection() {
    const { showerRecords, cancelMultipleShowers } = useServicesStore();
    const { guests } = useGuestsStore();
    const { data: session } = useSession();

    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'waitlist'>('active');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedShower, setSelectedShower] = useState<any>(null);
    const [showSlotManager, setShowSlotManager] = useState(false);

    const today = todayPacificDateString();
    const todaysRecords = showerRecords.filter(
        (r) => pacificDateStringFrom(r.date) === today
    );

    const activeShowers = todaysRecords.filter(r => r.status === 'booked' || r.status === 'awaiting');
    const completedShowers = todaysRecords.filter(r => r.status === 'done');
    const waitlistedShowers = todaysRecords.filter(r => r.status === 'waitlisted');
    const pendingShowers = todaysRecords.filter(r => r.status !== 'done' && r.status !== 'cancelled');

    const currentList = activeTab === 'active' ? activeShowers : activeTab === 'completed' ? completedShowers : waitlistedShowers;

    // Check if user is admin/staff
    const userRole = (session?.user as any)?.role || '';
    const isAdmin = ['admin', 'board', 'staff'].includes(userRole);

    const handleEndShowerDay = async () => {
        if (pendingShowers.length === 0) {
            toast.error('No pending showers to cancel.');
            return;
        }
        const success = await cancelMultipleShowers(pendingShowers.map((r) => r.id));
        if (success) {
            toast.success(`Cancelled ${pendingShowers.length} showers.`);
        } else {
            toast.error('Failed to cancel showers.');
        }
    };

    const handleGuestClick = (guestId: string, recordId: string) => {
        const record = showerRecords.find(r => r.id === recordId);
        const guest = guests.find(g => g.id === guestId);
        if (record && guest) {
            setSelectedShower({ record, guest });
        }
    };

    return (
        <div className="space-y-6">
            {/* End Service Day Panel */}
            <EndServiceDayPanel
                showShower={true}
                showLaundry={false}
                pendingShowerCount={pendingShowers.length}
                onEndShowerDay={handleEndShowerDay}
                onEndLaundryDay={async () => { }}
                isAdmin={isAdmin}
            />

            <div className="flex items-center justify-between">
                {/* Tab Navigation */}
                <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
                    {(['active', 'completed', 'waitlist'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'px-6 py-2.5 rounded-xl text-sm font-black transition-all capitalize',
                                activeTab === tab
                                    ? 'bg-white text-sky-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            )}
                        >
                            {tab}
                            <span className="ml-2 text-[10px] opacity-60">
                                ({tab === 'active' ? activeShowers.length : tab === 'completed' ? completedShowers.length : waitlistedShowers.length})
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-4">
                    {/* Manage Slots Button */}
                    <button
                        onClick={() => setShowSlotManager(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Manage Slots
                    </button>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'grid' ? "bg-white shadow text-sky-600" : "text-gray-500 hover:text-gray-700"
                            )}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'list' ? "bg-white shadow text-sky-600" : "text-gray-500 hover:text-gray-700"
                            )}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'list' ? (
                <CompactShowerList
                    records={currentList}
                    onGuestClick={handleGuestClick}
                />
            ) : (
                /* Grid of Shower Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {currentList.length > 0 ? (
                            currentList.map((record) => (
                                <ShowerListItem
                                    key={record.id}
                                    record={record}
                                    guest={guests.find(g => g.id === record.guestId)}
                                    onClick={() => handleGuestClick(record.guestId, record.id)}
                                />
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="col-span-full py-20 text-center"
                            >
                                <ShowerHead size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400 font-bold">No {activeTab} showers found</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Detail Modal */}
            {selectedShower && (
                <ShowerDetailModal
                    isOpen={!!selectedShower}
                    onClose={() => setSelectedShower(null)}
                    record={selectedShower.record}
                    guest={selectedShower.guest}
                />
            )}

            {/* Slot Manager Modal */}
            <SlotBlockModal
                isOpen={showSlotManager}
                onClose={() => setShowSlotManager(false)}
                serviceType="shower"
            />
        </div>
    );
}

function ShowerListItem({ record, guest, onClick }: { record: any, guest: any, onClick?: () => void }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const { deleteShowerRecord, updateShowerStatus } = useServicesStore();

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this shower?')) return;
        setIsUpdating(true);
        try {
            await deleteShowerRecord(record.id);
            toast.success('Shower cancelled');
        } catch (error) {
            toast.error('Failed to cancel shower');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        setIsUpdating(true);
        try {
            await updateShowerStatus(record.id, newStatus);
            toast.success(newStatus === 'done' ? 'Shower completed' : 'Status updated');
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };



    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group relative",
                onClick ? "cursor-pointer hover:border-sky-100" : ""
            )}
            onClick={(e) => {
                // Prevent click when hitting buttons
                if ((e.target as HTMLElement).closest('button')) return;
                onClick?.();
            }}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-100",
                        record.status === 'done' ? 'bg-emerald-500' : 'bg-sky-500'
                    )}>
                        <User size={20} />
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 tracking-tight">
                            {guest ? (guest.preferredName || guest.name) : 'Unknown Guest'}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            <Clock size={12} />
                            {record.time ? formatSlotLabel(record.time) : (record.status === 'waitlisted' ? 'Waitlisted' : 'No time')}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Waiver indicator for non-completed showers */}
                    {record.status !== 'done' && (
                        <CompactWaiverIndicator guestId={record.guestId} serviceType="shower" />
                    )}
                    <div className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        record.status === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'
                    )}>
                        {record.status.replace('_', ' ')}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-auto">
                {record.status !== 'done' && (
                    <>
                        <button
                            disabled={isUpdating}
                            onClick={() => handleStatusUpdate('done')}
                            className="flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-200"
                        >
                            {isUpdating ? <Loader2 className="animate-spin" size={14} /> : (
                                <>
                                    <CheckCircle size={14} /> COMPLETE
                                </>
                            )}
                        </button>
                        <button
                            disabled={isUpdating}
                            onClick={handleCancel}
                            className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            <XCircle size={18} />
                        </button>
                    </>
                )}
                {record.status === 'done' && (
                    <button
                        disabled={isUpdating}
                        onClick={() => handleStatusUpdate('booked')}
                        className="w-full py-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-amber-50 hover:text-amber-600 text-xs font-black flex items-center justify-center gap-2 transition-all"
                    >
                        {isUpdating ? <Loader2 className="animate-spin" size={14} /> : (
                            <>
                                <RotateCcw size={14} /> REOPEN
                            </>
                        )}
                    </button>
                )}
            </div>
        </motion.div>
    );
}
