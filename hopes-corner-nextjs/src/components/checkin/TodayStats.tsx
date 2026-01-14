'use client';

import { useMemo } from 'react';
import { Utensils, Users } from 'lucide-react';
import { useMealsStore } from '@/stores/useMealsStore';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';

export function TodayStats() {
    const { mealRecords, extraMealRecords } = useMealsStore();
    const today = todayPacificDateString();

    const stats = useMemo(() => {
        const todayMeals = (mealRecords || []).filter(
            (r) => pacificDateStringFrom(r.date) === today
        );
        const todayExtraMeals = (extraMealRecords || []).filter(
            (r) => pacificDateStringFrom(r.date) === today
        );

        const regularCount = todayMeals.reduce((sum, r) => sum + (r.count || 1), 0);
        const extraCount = todayExtraMeals.reduce((sum, r) => sum + (r.count || 1), 0);

        const uniqueGuestIds = new Set([
            ...todayMeals.map((r) => r.guestId),
            ...todayExtraMeals.map((r) => r.guestId)
        ]);

        return {
            totalMeals: regularCount + extraCount,
            uniqueGuests: uniqueGuestIds.size
        };
    }, [mealRecords, extraMealRecords, today]);

    // Always show stats, even if 0


    return (
        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 bg-white/50 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
            <div className="flex items-center gap-1.5" title="Total meals served today">
                <Utensils size={13} className="text-gray-400" />
                <span className="text-gray-700">{stats.totalMeals}</span>
                <span className="hidden sm:inline">meals</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5" title="Unique guests served today">
                <Users size={13} className="text-gray-400" />
                <span className="text-gray-700">{stats.uniqueGuests}</span>
                <span className="hidden sm:inline">guests</span>
            </div>
        </div>
    );
}
