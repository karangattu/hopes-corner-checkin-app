import { describe, it, expect } from 'vitest';
import {
    MEAL_TYPES,
    AUTOMATIC_MEAL_CONFIG,
    getAutomaticMealsForDay,
    hasAutomaticMealsForDay,
    getAutomaticMealsSummary,
    getAutomaticMealsTotals,
} from '../automaticMealEntries';

describe('automaticMealEntries', () => {
    describe('MEAL_TYPES', () => {
        it('defines correct meal type constants', () => {
            expect(MEAL_TYPES.LUNCH_BAGS).toBe('lunchBags');
            expect(MEAL_TYPES.RV_MEALS).toBe('rvMeals');
            expect(MEAL_TYPES.DAY_WORKER).toBe('dayWorker');
        });
    });

    describe('AUTOMATIC_MEAL_CONFIG', () => {
        it('has entries for all 7 days of the week', () => {
            expect(Object.keys(AUTOMATIC_MEAL_CONFIG)).toHaveLength(7);
            for (let i = 0; i < 7; i++) {
                expect(AUTOMATIC_MEAL_CONFIG[i]).toBeDefined();
                expect(Array.isArray(AUTOMATIC_MEAL_CONFIG[i])).toBe(true);
            }
        });
    });

    describe('getAutomaticMealsForDay', () => {
        it('returns Monday presets (day 1): 100 RV meals only', () => {
            const meals = getAutomaticMealsForDay(1);
            // Lunch bags are now added per-guest at meal recording time, not as presets
            expect(meals).toHaveLength(1);

            const rvMeals = meals.find(m => m.type === MEAL_TYPES.RV_MEALS);
            expect(rvMeals.count).toBe(100);
        });

        it('returns Wednesday presets (day 3): 35 RV meals only', () => {
            const meals = getAutomaticMealsForDay(3);
            // Lunch bags are now added per-guest at meal recording time, not as presets
            expect(meals).toHaveLength(1);

            const rvMeals = meals.find(m => m.type === MEAL_TYPES.RV_MEALS);
            expect(rvMeals.count).toBe(35);
        });

        it('returns Thursday presets (day 4): 100 RV meals only', () => {
            const meals = getAutomaticMealsForDay(4);
            expect(meals).toHaveLength(1);

            const rvMeals = meals.find(m => m.type === MEAL_TYPES.RV_MEALS);
            expect(rvMeals.count).toBe(100);
        });

        it('returns Saturday presets (day 6): 2 entries including RV and Day Worker', () => {
            const meals = getAutomaticMealsForDay(6);
            // Lunch bags are now added per-guest at meal recording time, not as presets
            expect(meals).toHaveLength(2);

            // 100 RV meals
            const rvMeals = meals.find(m => m.type === MEAL_TYPES.RV_MEALS);
            expect(rvMeals.count).toBe(100);

            // 50 Day Worker meals
            const dayWorker = meals.find(m => m.type === MEAL_TYPES.DAY_WORKER);
            expect(dayWorker.count).toBe(50);
        });

        it('returns empty array for Sunday (day 0)', () => {
            const meals = getAutomaticMealsForDay(0);
            expect(meals).toEqual([]);
        });

        it('returns empty array for Tuesday (day 2)', () => {
            const meals = getAutomaticMealsForDay(2);
            expect(meals).toEqual([]);
        });

        it('returns empty array for Friday (day 5)', () => {
            const meals = getAutomaticMealsForDay(5);
            expect(meals).toEqual([]);
        });

        it('returns empty array for invalid day numbers', () => {
            expect(getAutomaticMealsForDay(-1)).toEqual([]);
            expect(getAutomaticMealsForDay(7)).toEqual([]);
            expect(getAutomaticMealsForDay(100)).toEqual([]);
        });
    });

    describe('hasAutomaticMealsForDay', () => {
        it('returns true for days with presets', () => {
            expect(hasAutomaticMealsForDay(1)).toBe(true); // Monday
            expect(hasAutomaticMealsForDay(3)).toBe(true); // Wednesday
            expect(hasAutomaticMealsForDay(4)).toBe(true); // Thursday
            expect(hasAutomaticMealsForDay(6)).toBe(true); // Saturday
        });

        it('returns false for days without presets', () => {
            expect(hasAutomaticMealsForDay(0)).toBe(false); // Sunday
            expect(hasAutomaticMealsForDay(2)).toBe(false); // Tuesday
            expect(hasAutomaticMealsForDay(5)).toBe(false); // Friday
        });

        it('returns false for invalid day numbers', () => {
            expect(hasAutomaticMealsForDay(-1)).toBe(false);
            expect(hasAutomaticMealsForDay(7)).toBe(false);
        });
    });

    describe('getAutomaticMealsSummary', () => {
        it('returns readable summary for Monday', () => {
            const summary = getAutomaticMealsSummary(1);
            // Lunch bags no longer in presets - only RV meals
            expect(summary).toContain('100 RV Meals');
        });

        it('returns no entries message for days without presets', () => {
            const summary = getAutomaticMealsSummary(0);
            expect(summary).toBe('No automatic entries for this day');
        });
    });

    describe('getAutomaticMealsTotals', () => {
        it('calculates Saturday totals correctly', () => {
            const { total, byType } = getAutomaticMealsTotals(6);

            // 100 RV + 50 Day Worker = 150 (lunch bags no longer in presets)
            expect(total).toBe(150);

            // RV meals: 100
            expect(byType[MEAL_TYPES.RV_MEALS]).toBe(100);

            // Day Worker: 50
            expect(byType[MEAL_TYPES.DAY_WORKER]).toBe(50);
        });

        it('returns zero totals for days without presets', () => {
            const { total, byType } = getAutomaticMealsTotals(0);
            expect(total).toBe(0);
            expect(Object.keys(byType)).toHaveLength(0);
        });
    });
});
