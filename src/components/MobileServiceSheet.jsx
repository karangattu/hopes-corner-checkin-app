import React, { useEffect, useRef, useCallback } from 'react';
import {
    X,
    Utensils,
    ShowerHead,
    WashingMachine,
    Check,
    Loader2,
    ChevronDown,
} from 'lucide-react';

/**
 * MobileServiceSheet - A bottom sheet component for mobile/tablet service actions
 * 
 * Provides large, thumb-friendly touch targets for assigning meals, showers, and laundry.
 * Features swipe-to-dismiss and backdrop tap-to-close for intuitive mobile UX.
 */
const MobileServiceSheet = ({
    isOpen,
    onClose,
    guest,
    // Meal props
    onMealSelect,
    hasMealToday = false,
    mealCount = 0,
    isPendingMeal = false,
    isBannedFromMeals = false,
    // Shower props
    onShowerSelect,
    hasShowerToday = false,
    isBannedFromShower = false,
    // Laundry props
    onLaundrySelect,
    hasLaundryToday = false,
    isBannedFromLaundry = false,
}) => {
    const sheetRef = useRef(null);
    const startY = useRef(0);
    const currentY = useRef(0);
    const isDragging = useRef(false);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Touch handlers for swipe-to-dismiss
    const handleTouchStart = useCallback((e) => {
        startY.current = e.touches[0].clientY;
        isDragging.current = true;
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging.current) return;
        currentY.current = e.touches[0].clientY;
        const diff = currentY.current - startY.current;

        // Only allow dragging down
        if (diff > 0 && sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${diff}px)`;
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;

        const diff = currentY.current - startY.current;

        // If dragged more than 100px down, close
        if (diff > 100) {
            onClose();
        }

        // Reset transform
        if (sheetRef.current) {
            sheetRef.current.style.transform = '';
        }
    }, [onClose]);

    if (!guest) return null;

    const guestName = guest.preferredName || guest.name || 'Guest';

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-service-sheet-title"
                className={`mobile-service-sheet ${isOpen ? 'open' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2
                            id="mobile-service-sheet-title"
                            className="text-xl font-bold text-gray-900"
                        >
                            Quick Add for {guestName}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation"
                            aria-label="Close"
                        >
                            <X size={20} className="text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-5 py-5 space-y-4 pb-safe">
                    {/* Meal Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            Meals
                        </h3>
                        {hasMealToday ? (
                            <div className="mobile-action-btn bg-emerald-50 border-2 border-emerald-200 text-emerald-700">
                                <Check size={24} className="text-emerald-600" />
                                <span>
                                    {mealCount} Meal{mealCount > 1 ? 's' : ''} Today
                                </span>
                            </div>
                        ) : isBannedFromMeals ? (
                            <div className="mobile-action-btn bg-red-50 border-2 border-red-200 text-red-600">
                                <span>Banned from Meals</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2].map((count) => (
                                    <button
                                        key={count}
                                        onClick={() => {
                                            onMealSelect(guest.id, count);
                                            onClose();
                                        }}
                                        disabled={isPendingMeal}
                                        className="mobile-action-btn bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isPendingMeal ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : (
                                            <Utensils size={24} />
                                        )}
                                        <span>
                                            {count} Meal{count > 1 ? 's' : ''}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Shower Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            Shower
                        </h3>
                        {hasShowerToday ? (
                            <div className="mobile-action-btn bg-sky-50 border-2 border-sky-200 text-sky-700">
                                <Check size={24} className="text-sky-600" />
                                <span>Shower Booked Today</span>
                            </div>
                        ) : isBannedFromShower ? (
                            <div className="mobile-action-btn bg-red-50 border-2 border-red-200 text-red-600">
                                <span>Banned from Showers</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    onShowerSelect(guest);
                                    onClose();
                                }}
                                className="mobile-action-btn w-full bg-white border-2 border-sky-200 text-sky-700 hover:bg-sky-50 active:bg-sky-100 active:scale-98"
                            >
                                <ShowerHead size={24} />
                                <span>Book Shower</span>
                            </button>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Laundry Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            Laundry
                        </h3>
                        {hasLaundryToday ? (
                            <div className="mobile-action-btn bg-indigo-50 border-2 border-indigo-200 text-indigo-700">
                                <Check size={24} className="text-indigo-600" />
                                <span>Laundry Booked Today</span>
                            </div>
                        ) : isBannedFromLaundry ? (
                            <div className="mobile-action-btn bg-red-50 border-2 border-red-200 text-red-600">
                                <span>Banned from Laundry</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    onLaundrySelect(guest);
                                    onClose();
                                }}
                                className="mobile-action-btn w-full bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 active:scale-98"
                            >
                                <WashingMachine size={24} />
                                <span>Book Laundry</span>
                            </button>
                        )}
                    </div>

                    {/* Close hint */}
                    <div className="pt-4 flex justify-center">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <ChevronDown size={16} />
                            <span>Swipe down or tap to close</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileServiceSheet;
