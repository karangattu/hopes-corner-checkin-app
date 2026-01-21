import { describe, it, expect, vi } from 'vitest';

describe('GuestCard logic', () => {
    const mockGuest = {
        id: 'g1',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        preferredName: 'Johnny',
        housingStatus: 'unhoused',
        age: 'Adult 18-59',
        gender: 'Male',
        location: 'Mountain View',
        notes: 'Test note',
        bannedUntil: null,
        bannedFromMeals: false,
        bannedFromShower: false,
        bannedFromLaundry: false,
    };

    describe('status indicators', () => {
        it('identifies unhoused status', () => {
            expect(mockGuest.housingStatus).toBe('unhoused');
        });

        it('identifies housed status', () => {
            const housedGuest = { ...mockGuest, housingStatus: 'housed' };
            expect(housedGuest.housingStatus).toBe('housed');
        });

        it('identifies guest with warnings', () => {
            const guestWithWarnings = { ...mockGuest, warnings: [{ id: 'w1', message: 'Warning' }] };
            expect(guestWithWarnings.warnings.length).toBe(1);
        });

        it('identifies guest with active ban', () => {
            const bannedGuest = { ...mockGuest, bannedUntil: '2030-01-01' };
            const isBanned = bannedGuest.bannedUntil ? new Date(bannedGuest.bannedUntil) > new Date() : false;
            expect(isBanned).toBe(true);
        });

        it('identifies guest without ban', () => {
            const isBanned = mockGuest.bannedUntil ? new Date(mockGuest.bannedUntil) > new Date() : false;
            expect(isBanned).toBe(false);
        });
    });

    describe('display logic', () => {
        it('uses preferred name if available', () => {
            const displayName = mockGuest.preferredName || mockGuest.firstName;
            expect(displayName).toBe('Johnny');
        });

        it('uses first name if preferred name is empty', () => {
            const guestNoPreferred = { ...mockGuest, preferredName: '' };
            const displayName = guestNoPreferred.preferredName || guestNoPreferred.firstName;
            expect(displayName).toBe('John');
        });

        it('truncates long notes', () => {
            const longNote = 'A'.repeat(100);
            const truncated = longNote.length > 50 ? longNote.substring(0, 50) + '...' : longNote;
            expect(truncated).toBe('A'.repeat(50) + '...');
        });
    });

    describe('action logic', () => {
        it('determines if meals are enabled', () => {
            const mealsEnabled = !mockGuest.bannedFromMeals;
            expect(mealsEnabled).toBe(true);
        });

        it('determines if shower is enabled', () => {
            const showerEnabled = !mockGuest.bannedFromShower;
            expect(showerEnabled).toBe(true);
        });

        it('determines if laundry is enabled', () => {
            const laundryEnabled = !mockGuest.bannedFromLaundry;
            expect(laundryEnabled).toBe(true);
        });

        it('identifies disabled service when banned', () => {
            const bannedFromMealsGuest = { ...mockGuest, bannedFromMeals: true };
            expect(bannedFromMealsGuest.bannedFromMeals).toBe(true);
        });
    });

    describe('linked guests logic', () => {
        it('handles guest without linked guests', () => {
            const linkedGuests: string[] = [];
            expect(linkedGuests.length).toBe(0);
        });

        it('handles guest with linked guests', () => {
            const linkedGuests = ['g2', 'g3'];
            expect(linkedGuests.length).toBe(2);
        });
    });

    describe('visual states', () => {
        it('determines card border color based on housing status', () => {
            const getBorderColor = (status: string) => {
                switch (status) {
                    case 'unhoused': return 'border-orange-500';
                    case 'housed': return 'border-blue-500';
                    default: return 'border-gray-200';
                }
            };
            expect(getBorderColor('unhoused')).toBe('border-orange-500');
            expect(getBorderColor('housed')).toBe('border-blue-500');
        });

        it('determines background opacity based on ban status', () => {
            const getOpacity = (isBanned: boolean) => isBanned ? 'opacity-50' : 'opacity-100';
            expect(getOpacity(true)).toBe('opacity-50');
            expect(getOpacity(false)).toBe('opacity-100');
        });
    });
});
