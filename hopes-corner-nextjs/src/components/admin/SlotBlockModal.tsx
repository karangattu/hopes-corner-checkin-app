'use client';

import React from 'react';
import { X } from 'lucide-react';
import { SlotBlockManager } from './SlotBlockManager';

interface SlotBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceType: 'shower' | 'laundry';
}

export const SlotBlockModal: React.FC<SlotBlockModalProps> = ({
    isOpen,
    onClose,
    serviceType,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold">
                        Manage {serviceType === 'shower' ? 'Shower' : 'Laundry'} Slots
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <SlotBlockManager serviceType={serviceType} />
                </div>
            </div>
        </div>
    );
};
