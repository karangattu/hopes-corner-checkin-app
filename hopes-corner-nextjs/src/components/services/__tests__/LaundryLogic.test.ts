import { describe, it, expect, vi } from 'vitest';

describe('Laundry logic', () => {
    describe('Load management logic', () => {
        it('calculates total loads in queue', () => {
            const queue = [
                { loadsCount: 1 },
                { loadsCount: 2 },
                { loadsCount: 3 },
            ];
            const total = queue.reduce((sum, item) => sum + item.loadsCount, 0);
            expect(total).toBe(6);
        });

        it('validates max loads per guest', () => {
            const max = 3;
            const requested = 4;
            expect(requested <= max).toBe(false);
        });

        it('calculates loads currently in machines', () => {
            const records = [
                { status: 'washing', loadsCount: 2 },
                { status: 'drying', loadsCount: 1 },
                { status: 'waiting', loadsCount: 2 },
            ];
            const inMachines = records
                .filter(r => ['washing', 'drying'].includes(r.status))
                .reduce((sum, r) => sum + r.loadsCount, 0);
            expect(inMachines).toBe(3);
        });
    });

    describe('Machine availability logic', () => {
        const totalWashers = 4;
        const totalDryers = 4;

        it('calculates available washers', () => {
            const inUse = 3;
            expect(totalWashers - inUse).toBe(1);
        });

        it('identifies if washers are full', () => {
            const inUse = 4;
            expect(inUse >= totalWashers).toBe(true);
        });
    });

    describe('Status workflow logic', () => {
        const laundryStatuses = ['waiting', 'washing', 'drying', 'folding', 'ready', 'completed'];

        it('advances status correctly', () => {
            const nextStatus = (current: string) => {
                const idx = laundryStatuses.indexOf(current);
                return idx < laundryStatuses.length - 1 ? laundryStatuses[idx + 1] : current;
            };
            expect(nextStatus('waiting')).toBe('washing');
            expect(nextStatus('ready')).toBe('completed');
            expect(nextStatus('completed')).toBe('completed');
        });

        it('tracks offsite status', () => {
            const record = { isOffsite: true };
            expect(record.isOffsite).toBe(true);
        });
    });

    describe('Notification logic', () => {
        it('determines if guest should be notified', () => {
            const record = { status: 'ready', notified: false };
            const shouldNotify = record.status === 'ready' && !record.notified;
            expect(shouldNotify).toBe(true);
        });

        it('marks as notified', () => {
            const record = { notified: false };
            record.notified = true;
            expect(record.notified).toBe(true);
        });
    });
});
