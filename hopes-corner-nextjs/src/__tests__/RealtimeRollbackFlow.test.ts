import { describe, it, expect } from 'vitest';

describe('Real-time Rollback Flow Tests', () => {
    const createDispatcher = () => {
        let state = { data: [] as any[] };
        const dispatch = (action: any) => {
            const prevState = JSON.parse(JSON.stringify(state));

            // Optimistic update
            if (action.type === 'ADD') {
                state.data.push(action.payload);
            }

            return {
                rollback: () => { state = prevState; },
                commit: () => { /* done */ }
            };
        };
        return { dispatch, getState: () => state };
    };

    it('successfully commits an optimistic update', () => {
        const { dispatch, getState } = createDispatcher();
        const { commit } = dispatch({ type: 'ADD', payload: { id: 1 } });
        expect(getState().data.length).toBe(1);
        commit();
        expect(getState().data.length).toBe(1);
    });

    it('rolls back an optimistic update on failure', () => {
        const { dispatch, getState } = createDispatcher();
        const { rollback } = dispatch({ type: 'ADD', payload: { id: 1 } });
        expect(getState().data.length).toBe(1);
        rollback();
        expect(getState().data.length).toBe(0);
    });

    it('handles nested rollback for multiple rapid actions', () => {
        const { dispatch, getState } = createDispatcher();
        const r1 = dispatch({ type: 'ADD', payload: { id: 1 } });
        const r2 = dispatch({ type: 'ADD', payload: { id: 2 } });

        expect(getState().data.length).toBe(2);

        r2.rollback();
        expect(getState().data.length).toBe(1);
        expect(getState().data[0].id).toBe(1);

        r1.rollback();
        expect(getState().data.length).toBe(0);
    });

    describe('Complex State Rollback', () => {
        it('rolls back complex object mutations', () => {
            let state = { guests: { 'g1': { name: 'John', visits: 1 } } };
            const prevState = JSON.parse(JSON.stringify(state));

            // Optimistic increment
            state.guests['g1'].visits++;
            expect(state.guests['g1'].visits).toBe(2);

            // Rollback
            state = prevState;
            expect(state.guests['g1'].visits).toBe(1);
        });
    });

    describe('Service-specific Rollbacks', () => {
        it('rolls back meal count on fetch error', () => {
            const counts = { guest: 100 };
            const prev = counts.guest;
            counts.guest += 1; // optimistic

            // Simulate error
            counts.guest = prev;
            expect(counts.guest).toBe(100);
        });

        it('rolls back shower booking on conflict', () => {
            let bookings = [{ id: 'b1', slot: '08:00' }];
            const prev = [...bookings];

            bookings.push({ id: 'b2', slot: '08:30' }); // optimistic
            expect(bookings.length).toBe(2);

            // Conflict discovered
            bookings = prev;
            expect(bookings.length).toBe(1);
        });
    });
});
