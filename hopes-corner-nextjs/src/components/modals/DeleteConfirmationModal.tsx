'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning';
}

export function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    variant = 'danger'
}: DeleteConfirmationModalProps) {
    const [isPending, setIsPending] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsPending(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setIsPending(false);
        }
    };

    const colors = variant === 'danger'
        ? {
            bg: 'bg-red-50',
            border: 'border-red-100',
            icon: 'text-red-500',
            button: 'bg-red-600 hover:bg-red-700 text-white',
        }
        : {
            bg: 'bg-amber-50',
            border: 'border-amber-100',
            icon: 'text-amber-500',
            button: 'bg-amber-600 hover:bg-amber-700 text-white',
        };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-6 ${colors.bg} border-b ${colors.border} flex items-start gap-4`}>
                    <div className={`w-12 h-12 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center shrink-0`}>
                        <AlertTriangle size={24} className={colors.icon} />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-black text-gray-900">{title}</h2>
                        <p className="text-sm text-gray-600 mt-1">{description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Actions */}
                <div className="p-6 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isPending}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-all disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isPending}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold ${colors.button} transition-all disabled:opacity-50 flex items-center gap-2`}
                    >
                        {isPending && <Loader2 size={16} className="animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
