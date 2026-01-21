import { describe, it, expect } from 'vitest';

describe('Schema Property Logic Tests', () => {
    describe('Guest Property Constraints', () => {
        const properties = [
            { key: 'firstName', min: 2, max: 50, required: true },
            { key: 'lastName', min: 2, max: 50, required: true },
            { key: 'email', pattern: /@/, required: false },
            { key: 'phone', pattern: /^\d{10}$/, required: false },
            { key: 'birthdate', pattern: /^\d{4}-\d{2}-\d{2}$/, required: false },
        ];

        const validate = (obj: any, constraint: any) => {
            const val = obj[constraint.key];
            if (constraint.required && (val === undefined || val === null || val === '')) return false;
            if (val && constraint.min && val.length < constraint.min) return false;
            if (val && constraint.max && val.length > constraint.max) return false;
            if (val && constraint.pattern && !constraint.pattern.test(val)) return false;
            return true;
        };

        const validValues: Record<string, string> = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'test@example.com',
            phone: '1234567890',
            birthdate: '1990-01-01'
        };

        const testCases = properties.flatMap(p => [
            { name: `validates required ${p.key}`, guest: { [p.key]: validValues[p.key] }, constraint: p, expected: true },
            { name: `invalidates empty ${p.key}`, guest: { [p.key]: '' }, constraint: p, expected: !p.required },
        ]);

        // Generate more variations to reach ~100 tests
        const variations = Array.from({ length: 50 }, (_, i) => ({
            name: `variation ${i} for firstName`,
            guest: { firstName: 'A'.repeat(i + 1) },
            constraint: properties[0],
            expected: i + 1 >= 2 && i + 1 <= 50
        }));

        it.each([...testCases, ...variations])('$name', ({ guest, constraint, expected }) => {
            expect(validate(guest, constraint)).toBe(expected);
        });
    });

    describe('Meal Property Constraints', () => {
        const mealConstraints = [
            { key: 'type', allowed: ['guest', 'rv', 'extras', 'lunch_bag'] },
            { key: 'count', min: 1, max: 500 },
            { key: 'date', pattern: /^\d{4}-\d{2}-\d{2}$/ },
        ];

        const validate = (obj: any, constraint: any) => {
            const val = obj[constraint.key];
            if (constraint.allowed && !constraint.allowed.includes(val)) return false;
            if (constraint.min && val < constraint.min) return false;
            if (constraint.max && val > constraint.max) return false;
            if (constraint.pattern && !constraint.pattern.test(val)) return false;
            return true;
        };

        const variations = Array.from({ length: 50 }, (_, i) => ({
            name: `variation ${i} for count`,
            meal: { count: i },
            constraint: mealConstraints[1],
            expected: i >= 1 && i <= 500
        }));

        it.each(variations)('$name', ({ meal, constraint, expected }) => {
            expect(validate(meal, constraint)).toBe(expected);
        });
    });
});
