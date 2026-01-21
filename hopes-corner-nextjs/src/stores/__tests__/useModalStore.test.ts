import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useModalStore } from '../useModalStore';

describe('useModalStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useModalStore.setState({
            showerPickerGuest: null,
            laundryPickerGuest: null,
            bicyclePickerGuest: null,
        });
    });

    describe('initial state', () => {
        it('starts with null guest values', () => {
            const state = useModalStore.getState();
            expect(state.showerPickerGuest).toBeNull();
            expect(state.laundryPickerGuest).toBeNull();
            expect(state.bicyclePickerGuest).toBeNull();
        });
    });

    describe('setShowerPickerGuest', () => {
        it('sets guest for shower picker', () => {
            const mockGuest = { id: 'g1', name: 'John Doe' };
            useModalStore.getState().setShowerPickerGuest(mockGuest);
            expect(useModalStore.getState().showerPickerGuest).toEqual(mockGuest);
        });

        it('clears guest when set to null', () => {
            useModalStore.setState({ showerPickerGuest: { id: 'g1' } });
            useModalStore.getState().setShowerPickerGuest(null);
            expect(useModalStore.getState().showerPickerGuest).toBeNull();
        });
    });

    describe('setLaundryPickerGuest', () => {
        it('sets guest for laundry picker', () => {
            const mockGuest = { id: 'g2', name: 'Jane Smith' };
            useModalStore.getState().setLaundryPickerGuest(mockGuest);
            expect(useModalStore.getState().laundryPickerGuest).toEqual(mockGuest);
        });

        it('clears guest when set to null', () => {
            useModalStore.setState({ laundryPickerGuest: { id: 'g2' } });
            useModalStore.getState().setLaundryPickerGuest(null);
            expect(useModalStore.getState().laundryPickerGuest).toBeNull();
        });
    });

    describe('setBicyclePickerGuest', () => {
        it('sets guest for bicycle picker', () => {
            const mockGuest = { id: 'g3', name: 'Bob Wilson' };
            useModalStore.getState().setBicyclePickerGuest(mockGuest);
            expect(useModalStore.getState().bicyclePickerGuest).toEqual(mockGuest);
        });

        it('clears guest when set to null', () => {
            useModalStore.setState({ bicyclePickerGuest: { id: 'g3' } });
            useModalStore.getState().setBicyclePickerGuest(null);
            expect(useModalStore.getState().bicyclePickerGuest).toBeNull();
        });
    });

    describe('closeAllModals', () => {
        it('clears all guest picker states', () => {
            // Set up state with guests in all pickers
            useModalStore.setState({
                showerPickerGuest: { id: 'g1', name: 'John' },
                laundryPickerGuest: { id: 'g2', name: 'Jane' },
                bicyclePickerGuest: { id: 'g3', name: 'Bob' },
            });

            // Close all modals
            useModalStore.getState().closeAllModals();

            // Verify all are null
            const state = useModalStore.getState();
            expect(state.showerPickerGuest).toBeNull();
            expect(state.laundryPickerGuest).toBeNull();
            expect(state.bicyclePickerGuest).toBeNull();
        });

        it('works when modals are already closed', () => {
            useModalStore.getState().closeAllModals();
            const state = useModalStore.getState();
            expect(state.showerPickerGuest).toBeNull();
            expect(state.laundryPickerGuest).toBeNull();
            expect(state.bicyclePickerGuest).toBeNull();
        });
    });

    describe('multiple operations', () => {
        it('allows opening multiple modals at once', () => {
            const guest1 = { id: 'g1', name: 'Guest 1' };
            const guest2 = { id: 'g2', name: 'Guest 2' };

            useModalStore.getState().setShowerPickerGuest(guest1);
            useModalStore.getState().setLaundryPickerGuest(guest2);

            const state = useModalStore.getState();
            expect(state.showerPickerGuest).toEqual(guest1);
            expect(state.laundryPickerGuest).toEqual(guest2);
            expect(state.bicyclePickerGuest).toBeNull();
        });

        it('can replace guest in a modal', () => {
            const guest1 = { id: 'g1', name: 'Guest 1' };
            const guest2 = { id: 'g2', name: 'Guest 2' };

            useModalStore.getState().setShowerPickerGuest(guest1);
            expect(useModalStore.getState().showerPickerGuest).toEqual(guest1);

            useModalStore.getState().setShowerPickerGuest(guest2);
            expect(useModalStore.getState().showerPickerGuest).toEqual(guest2);
        });
    });
});
