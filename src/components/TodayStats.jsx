import React, { useMemo } from "react";
import { Utensils, Users } from "lucide-react";
import { useMealsStore } from "../stores/useMealsStore";

/**
 * Displays a subtle count of meals and guests served today
 * Non-intrusive indicator for staff awareness
 */
const TodayStats = () => {
  const getTodayMeals = useMealsStore((state) => state.getTodayMeals);
  const todayMeals = getTodayMeals();

  const stats = useMemo(() => {
    const totalMeals = todayMeals.reduce((sum, record) => sum + (record.quantity || 1), 0);
    const uniqueGuests = new Set(todayMeals.map(record => record.guestId)).size;
    return { totalMeals, uniqueGuests };
  }, [todayMeals]);

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <div className="flex items-center gap-1.5" title="Total meals served today">
        <Utensils size={14} className="text-gray-400" />
        <span className="font-medium">{stats.totalMeals}</span>
        <span className="hidden sm:inline">meals</span>
      </div>
      <div className="w-px h-3 bg-gray-300" />
      <div className="flex items-center gap-1.5" title="Unique guests served today">
        <Users size={14} className="text-gray-400" />
        <span className="font-medium">{stats.uniqueGuests}</span>
        <span className="hidden sm:inline">guests</span>
      </div>
    </div>
  );
};

export default React.memo(TodayStats);