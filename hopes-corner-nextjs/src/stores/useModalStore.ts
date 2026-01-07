import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface ModalState {
    showerPickerGuest: any | null;
    laundryPickerGuest: any | null;
    bicyclePickerGuest: any | null;

    setShowerPickerGuest: (guest: any | null) => void;
    setLaundryPickerGuest: (guest: any | null) => void;
    setBicyclePickerGuest: (guest: any | null) => void;

    closeAllModals: () => void;
}

export const useModalStore = create<ModalState>()(
    devtools(
        immer((set) => ({
            showerPickerGuest: null,
            laundryPickerGuest: null,
            bicyclePickerGuest: null,

            setShowerPickerGuest: (guest) => {
                set((state) => {
                    state.showerPickerGuest = guest;
                });
            },
            setLaundryPickerGuest: (guest) => {
                set((state) => {
                    state.laundryPickerGuest = guest;
                });
            },
            setBicyclePickerGuest: (guest) => {
                set((state) => {
                    state.bicyclePickerGuest = guest;
                });
            },
            closeAllModals: () => {
                set((state) => {
                    state.showerPickerGuest = null;
                    state.laundryPickerGuest = null;
                    state.bicyclePickerGuest = null;
                });
            }
        })),
        { name: 'ModalStore' }
    )
);
