/**
 * Automatic Meal Entries Configuration
 *
 * Defines preset meal entries that should be added after meal service ends
 * based on the day of week.
 *
 * Schedule:
 * - Monday: 120 lunch bags, 100 RV meals
 * - Wednesday: 120 lunch bags, 35 RV meals
 * - Thursday: 100 RV meals
 * - Saturday: 110 lunch bags, 220 lunch bags, 100 RV meals, 50 Day Worker Center meals
 */

/**
 * Meal entry types that match the functions in AppContext
 */
export const MEAL_TYPES = {
    LUNCH_BAGS: 'lunchBags',
    RV_MEALS: 'rvMeals',
    DAY_WORKER: 'dayWorker',
};

/**
 * Configuration for automatic meal entries by day of week
 * Key: Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * Value: Array of {type, count, label} objects
 */
export const AUTOMATIC_MEAL_CONFIG = {
    // Sunday - no automatic entries
    0: [],

    // Monday
    1: [
        { type: MEAL_TYPES.LUNCH_BAGS, count: 120, label: '120 Lunch Bags' },
        { type: MEAL_TYPES.RV_MEALS, count: 100, label: '100 RV Meals' },
    ],

    // Tuesday - no automatic entries
    2: [],

    // Wednesday
    3: [
        { type: MEAL_TYPES.LUNCH_BAGS, count: 120, label: '120 Lunch Bags' },
        { type: MEAL_TYPES.RV_MEALS, count: 35, label: '35 RV Meals' },
    ],

    // Thursday
    4: [
        { type: MEAL_TYPES.RV_MEALS, count: 100, label: '100 RV Meals' },
    ],

    // Friday - no automatic entries
    5: [],

    // Saturday
    6: [
        { type: MEAL_TYPES.LUNCH_BAGS, count: 110, label: '110 Lunch Bags' },
        { type: MEAL_TYPES.LUNCH_BAGS, count: 220, label: '220 Lunch Bags' },
        { type: MEAL_TYPES.RV_MEALS, count: 100, label: '100 RV Meals' },
        { type: MEAL_TYPES.DAY_WORKER, count: 50, label: '50 Day Worker Center Meals' },
    ],
};

/**
 * Get automatic meal entries for a specific day of week
 * @param {number} dayOfWeek - Day of week (0-6, where 0 = Sunday)
 * @returns {Array<{type: string, count: number, label: string}>} Array of meal entries
 */
export function getAutomaticMealsForDay(dayOfWeek) {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
        return [];
    }
    return AUTOMATIC_MEAL_CONFIG[dayOfWeek] || [];
}

/**
 * Check if a specific day has automatic meal entries configured
 * @param {number} dayOfWeek - Day of week (0-6, where 0 = Sunday)
 * @returns {boolean} True if the day has preset entries
 */
export function hasAutomaticMealsForDay(dayOfWeek) {
    const meals = getAutomaticMealsForDay(dayOfWeek);
    return meals.length > 0;
}

/**
 * Get a summary of automatic meal entries for a day
 * @param {number} dayOfWeek - Day of week (0-6, where 0 = Sunday)
 * @returns {string} Human-readable summary of entries
 */
export function getAutomaticMealsSummary(dayOfWeek) {
    const meals = getAutomaticMealsForDay(dayOfWeek);
    if (meals.length === 0) {
        return 'No automatic entries for this day';
    }
    return meals.map(m => m.label).join(', ');
}

/**
 * Get the total count of meals across all types for a day
 * @param {number} dayOfWeek - Day of week (0-6, where 0 = Sunday)
 * @returns {{total: number, byType: Object}} Total count and breakdown by type
 */
export function getAutomaticMealsTotals(dayOfWeek) {
    const meals = getAutomaticMealsForDay(dayOfWeek);
    const byType = {};
    let total = 0;

    for (const meal of meals) {
        byType[meal.type] = (byType[meal.type] || 0) + meal.count;
        total += meal.count;
    }

    return { total, byType };
}
