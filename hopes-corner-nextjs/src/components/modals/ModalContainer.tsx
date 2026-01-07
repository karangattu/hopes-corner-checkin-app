'use client';

import { AnimatePresence } from 'framer-motion';
import { useModalStore } from '@/stores/useModalStore';
import { ShowerBookingModal } from '@/components/modals/ShowerBookingModal';
import { LaundryBookingModal } from '@/components/modals/LaundryBookingModal';
import { BicycleRepairBookingModal } from '@/components/modals/BicycleRepairBookingModal';

export function ModalContainer() {
    const { showerPickerGuest, laundryPickerGuest, bicyclePickerGuest } = useModalStore();

    return (
        <AnimatePresence>
            {showerPickerGuest && <ShowerBookingModal />}
            {laundryPickerGuest && <LaundryBookingModal />}
            {bicyclePickerGuest && <BicycleRepairBookingModal />}
        </AnimatePresence>
    );
}
