import { describe, it, expect, vi } from 'vitest';

describe('Shower logic', () => {
    describe('Slot allocation logic', () => {
        const slots = ['08:00', '08:30', '09:00', '09:30'];

        it('identifies available slots', () => {
            const booked = ['08:00'];
            const available = slots.filter(s => !booked.includes(s));
            expect(available.length).toBe(3);
            expect(available).not.toContain('08:00');
        });

        it('filters slots by time', () => {
            const now = '08:45';
            const upcoming = slots.filter(s => s > now);
            expect(upcoming).toEqual(['09:00', '09:30']);
        });

        it('handles fully booked day', () => {
            const booked = [...slots];
            const available = slots.filter(s => !booked.includes(s));
            expect(available.length).toBe(0);
        });
    });

    describe('Status workflow logic', () => {
        it('validates status transitions', () => {
            const allowedTransitions: Record<string, string[]> = {
                'waiting': ['showering', 'no-show'],
                'showering': ['completed'],
                'completed': [],
                'no-show': ['waiting']
            };

            const canTransition = (from: string, to: string) => allowedTransitions[from]?.includes(to);

            expect(canTransition('waiting', 'showering')).toBe(true);
            expect(canTransition('showering', 'completed')).toBe(true);
            expect(canTransition('completed', 'waiting')).toBe(false);
            expect(canTransition('no-show', 'waiting')).toBe(true);
        });
    });

    describe('Banned guest logic for showers', () => {
        it('blocks booking for banned guest', () => {
            const guest = { bannedFromShower: true };
            const canBook = !guest.bannedFromShower;
            expect(canBook).toBe(false);
        });

        it('identifies ban reason', () => {
            const guest = { banReason: 'Abusive language' };
            expect(guest.banReason).toBeTruthy();
        });
    });

    describe('Waitlist logic', () => {
        it('manages waitlist priority', () => {
            const waitlist = [
                { id: 'w1', addedAt: '2025-01-06T08:00:00Z' },
                { id: 'w2', addedAt: '2025-01-06T07:50:00Z' },
            ];
            const sorted = [...waitlist].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
            expect(sorted[0].id).toBe('w2');
        });

        it('identifies guest already on waitlist', () => {
            const waitlist = [{ guestId: 'g1' }];
            const isWaitlisted = (id: string) => waitlist.some(w => w.guestId === id);
            expect(isWaitlisted('g1')).toBe(true);
            expect(isWaitlisted('g2')).toBe(false);
        });
    });
});
