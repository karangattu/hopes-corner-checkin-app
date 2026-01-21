'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';
import { useGuestsStore } from '@/stores/useGuestsStore';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';

interface WarningManagementModalProps {
    guest: any;
    onClose: () => void;
}

const SEVERITY_LABELS: Record<number, { label: string; color: string; bgColor: string }> = {
    1: { label: 'Low', color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
    2: { label: 'Medium', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
    3: { label: 'High', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200' },
};

export function WarningManagementModal({ guest, onClose }: WarningManagementModalProps) {
    const { getWarningsForGuest, addGuestWarning, removeGuestWarning } = useGuestsStore();
    const [isPending, setIsPending] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [newSeverity, setNewSeverity] = useState(1);

    const warnings = getWarningsForGuest(guest.id);

    const handleAddWarning = async () => {
        if (!newMessage.trim()) {
            toast.error('Please enter a warning message');
            return;
        }

        setIsPending(true);
        try {
            await addGuestWarning(guest.id, { message: newMessage.trim(), severity: newSeverity });
            toast.success('Warning added');
            setNewMessage('');
            setNewSeverity(1);
        } catch (error: any) {
            toast.error(error.message || 'Failed to add warning');
        } finally {
            setIsPending(false);
        }
    };

    const handleRemoveWarning = async (warningId: string) => {
        setDeletingId(warningId);
        try {
            await removeGuestWarning(warningId);
            toast.success('Warning removed');
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove warning');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-amber-100 bg-amber-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                            <AlertTriangle size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Manage Warnings</h2>
                            <p className="text-sm text-gray-500 font-medium">
                                {guest.preferredName || guest.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Add New Warning */}
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">Add New Warning</h3>
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={2}
                            placeholder="Describe the warning..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium outline-none resize-none"
                        />
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">Severity:</span>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setNewSeverity(level)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                newSeverity === level
                                                    ? SEVERITY_LABELS[level].bgColor + ' border'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            )}
                                        >
                                            {SEVERITY_LABELS[level].label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleAddWarning}
                                disabled={isPending || !newMessage.trim()}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all disabled:opacity-50"
                            >
                                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Existing Warnings */}
                    <div>
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                            Active Warnings ({warnings.length})
                        </h3>
                        {warnings.length === 0 ? (
                            <div className="p-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                                <AlertTriangle size={24} className="text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No active warnings for this guest</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                <AnimatePresence>
                                    {warnings.map((warning: any) => (
                                        <motion.li
                                            key={warning.id}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className={cn(
                                                "p-4 rounded-xl border flex items-start justify-between gap-3",
                                                SEVERITY_LABELS[warning.severity || 1].bgColor
                                            )}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn(
                                                        "text-xs font-bold uppercase",
                                                        SEVERITY_LABELS[warning.severity || 1].color
                                                    )}>
                                                        {SEVERITY_LABELS[warning.severity || 1].label}
                                                    </span>
                                                    {warning.createdAt && (
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(warning.createdAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-700">{warning.message}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveWarning(warning.id)}
                                                disabled={deletingId === warning.id}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                            >
                                                {deletingId === warning.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        </motion.li>
                                    ))}
                                </AnimatePresence>
                            </ul>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all"
                    >
                        Done
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
