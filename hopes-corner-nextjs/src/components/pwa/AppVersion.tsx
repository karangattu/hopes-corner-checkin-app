'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { APP_VERSION, hasUnseenUpdates } from '@/lib/utils/appVersion';
import { WhatsNewModal } from '@/components/modals/WhatsNewModal';

export function AppVersion() {
    const [showModal, setShowModal] = useState(false);
    const [hasUpdates, setHasUpdates] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasUpdates(hasUnseenUpdates());
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const handleOpenModal = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setHasUpdates(false);
    };

    return (
        <>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span>v{APP_VERSION}</span>
                <span className="text-gray-300">•</span>
                <button
                    onClick={handleOpenModal}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${hasUpdates
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-100'
                        }`}
                >
                    <Sparkles size={12} className={hasUpdates ? 'text-emerald-500' : ''} />
                    <span>What&apos;s New</span>
                    {hasUpdates && (
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    )}
                </button>
            </div>

            <WhatsNewModal isOpen={showModal} onClose={handleCloseModal} />
        </>
    );
}
