import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useActionHistoryStore } from '../useActionHistoryStore';
import { useMealsStore } from '../useMealsStore';
import { useServicesStore } from '../useServicesStore';

const mockMealsStore = {
    deleteMealRecord: vi.fn(),
    deleteExtraMealRecord: vi.fn(),
};

const mockServicesStore = {
    deleteShowerRecord: vi.fn(),
    deleteLaundryRecord: vi.fn(),
    deleteBicycleRecord: vi.fn(),
    deleteHaircutRecord: vi.fn(),
    deleteHolidayRecord: vi.fn(),
};

// Mock stores that undoAction depends on
vi.mock('../useMealsStore', () => ({
    useMealsStore: {
        getState: vi.fn(() => mockMealsStore),
    },
}));

vi.mock('../useServicesStore', () => ({
    useServicesStore: {
        getState: vi.fn(() => mockServicesStore),
    },
}));

describe('useActionHistoryStore', () => {
    beforeEach(() => {
        useActionHistoryStore.getState().clearHistory();
        vi.clearAllMocks();
    });

    it('initializes with empty history', () => {
        const state = useActionHistoryStore.getState();
        expect(state.actionHistory).toEqual([]);
    });

    it('adds an action correctly', () => {
        const { addAction } = useActionHistoryStore.getState();
        addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });

        const state = useActionHistoryStore.getState();
        expect(state.actionHistory.length).toBe(1);
        expect(state.actionHistory[0].type).toBe('MEAL_ADDED');
        expect(state.actionHistory[0].data.guestId).toBe('g1');
        expect(state.actionHistory[0].id).toBeDefined();
    });

    it('filters actions for guest today', () => {
        const { addAction, getActionsForGuestToday } = useActionHistoryStore.getState();
        addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });
        addAction('SHOWER_BOOKED', { recordId: 'r2', guestId: 'g2' });

        const g1Actions = getActionsForGuestToday('g1');
        expect(g1Actions.length).toBe(1);
        expect(g1Actions[0].data.guestId).toBe('g1');
    });

    it('undoes a meal action correctly', async () => {
        const { addAction, undoAction } = useActionHistoryStore.getState();
        addAction('MEAL_ADDED', { recordId: 'r1', guestId: 'g1' });
        const actionId = useActionHistoryStore.getState().actionHistory[0].id;

        const mealsStore = useMealsStore.getState();
        const success = await undoAction(actionId);

        expect(success).toBe(true);
        expect(mealsStore.deleteMealRecord).toHaveBeenCalledWith('r1');
        expect(useActionHistoryStore.getState().actionHistory.length).toBe(0);
    });

    it('returns false when undoing non-existent action', async () => {
        const { undoAction } = useActionHistoryStore.getState();
        const success = await undoAction('invalid-id');
        expect(success).toBe(false);
    });
});
