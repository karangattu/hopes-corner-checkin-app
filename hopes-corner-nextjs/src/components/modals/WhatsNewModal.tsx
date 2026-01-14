'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Gift, Bug, Zap, ArrowRight } from 'lucide-react';
import { APP_VERSION, CHANGELOG, markVersionAsSeen, type ChangelogItem } from '@/lib/utils/appVersion';
import { cn } from '@/lib/utils/cn';

const typeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    feature: Sparkles,
    fix: Bug,
    performance: Zap,
    improvement: Gift,
};

const typeColors: Record<string, string> = {
    feature: 'bg-purple-100 text-purple-700',
    fix: 'bg-red-100 text-red-700',
    performance: 'bg-blue-100 text-blue-700',
    improvement: 'bg-emerald-100 text-emerald-700',
};

const typeLabels: Record<string, string> = {
    feature: 'New Feature',
    fix: 'Bug Fix',
    performance: 'Performance',
    improvement: 'Improvement',
};

interface WhatsNewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
    useEffect(() => {
        if (isOpen) {
            markVersionAsSeen();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl">
                            <Sparkles className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">What&apos;s New</h2>
                            <p className="text-sm text-gray-500">Version {APP_VERSION}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {CHANGELOG.map((release, releaseIndex) => (
                        <div key={release.version}>
                            {releaseIndex > 0 && <hr className="border-gray-100 mb-6" />}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    v{release.version}
                                </span>
                                <span className="text-xs text-gray-400">{release.date}</span>
                                {release.version === APP_VERSION && (
                                    <span className="text-xs font-medium text-white bg-emerald-500 px-2 py-0.5 rounded-full">
                                        Current
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                {release.highlights.map((item, itemIndex) => {
                                    const Icon = typeIcons[item.type] || Sparkles;
                                    const colorClass = typeColors[item.type] || typeColors.feature;
                                    const label = typeLabels[item.type] || 'Update';

                                    return (
                                        <div
                                            key={itemIndex}
                                            className="flex gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                            <div className={cn('p-2 rounded-lg flex-shrink-0', colorClass)}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-gray-900 text-sm">{item.title}</span>
                                                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', colorClass)}>
                                                        {label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                        Got it
                        <ArrowRight size={16} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
