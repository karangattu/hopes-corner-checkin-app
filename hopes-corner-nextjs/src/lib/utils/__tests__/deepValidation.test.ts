import { describe, it, expect, vi } from 'vitest';

describe('Validation Logic Tests', () => {
    describe('Guest Data Validation', () => {
        const validateGuest = (guest: any) => {
            const errors: string[] = [];
            if (!guest.firstName) errors.push('First name required');
            if (!guest.lastName) errors.push('Last name required');
            if (guest.birthdate && isNaN(new Date(guest.birthdate).getTime())) errors.push('Invalid birthdate');
            return { isValid: errors.length === 0, errors };
        };

        it('validates a correct guest', () => {
            const guest = { firstName: 'John', lastName: 'Doe', birthdate: '1990-01-01' };
            const result = validateGuest(guest);
            expect(result.isValid).toBe(true);
        });

        it('invalidates guest without first name', () => {
            const guest = { firstName: '', lastName: 'Doe' };
            const result = validateGuest(guest);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('First name required');
        });

        it('invalidates guest with invalid birthdate', () => {
            const guest = { firstName: 'John', lastName: 'Doe', birthdate: 'not-a-date' };
            const result = validateGuest(guest);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid birthdate');
        });
    });

    describe('Meal Record Validation', () => {
        const validateMeal = (meal: any) => {
            const types = ['guest', 'rv', 'extras', 'lunch_bag', 'staff', 'volunteer'];
            if (!types.includes(meal.type)) return false;
            if (meal.count < 1 || meal.count > 500) return false;
            return true;
        };

        it('validates common meal types', () => {
            expect(validateMeal({ type: 'guest', count: 1 })).toBe(true);
            expect(validateMeal({ type: 'rv', count: 50 })).toBe(true);
        });

        it('invalidates unknown meal types', () => {
            expect(validateMeal({ type: 'invalid', count: 1 })).toBe(false);
        });

        it('invalidates suspicious counts', () => {
            expect(validateMeal({ type: 'guest', count: 0 })).toBe(false);
            expect(validateMeal({ type: 'guest', count: 1000 })).toBe(false);
        });
    });

    describe('Phone Number Normalization & Validation', () => {
        const normalizePhone = (phone: string) => {
            const digits = phone.replace(/\D/g, '');
            if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
            return digits;
        };

        it('normalizes 10 digit numbers', () => {
            expect(normalizePhone('1234567890')).toBe('(123) 456-7890');
            expect(normalizePhone('123-456-7890')).toBe('(123) 456-7890');
        });

        it('handles non-10 digit numbers by returning digits', () => {
            expect(normalizePhone('12345')).toBe('12345');
        });
    });

    describe('Email Validation Logic', () => {
        const isValidEmail = (email: string) => {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        };

        it('validates correct emails', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name+tag@sub.domain.org')).toBe(true);
        });

        it('invalidates malformed emails', () => {
            expect(isValidEmail('test@')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
            expect(isValidEmail('test.com')).toBe(false);
            expect(isValidEmail('test @example.com')).toBe(false);
        });
    });
});
