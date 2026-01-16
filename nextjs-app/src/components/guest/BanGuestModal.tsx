'use client';

import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@/components/ui';
import { Guest, GuestUpdate } from '@/lib/types';

interface BanGuestModalProps {
    guest: Guest;
    isOpen: boolean;
    onClose: () => void;
    onBan: (guestId: string, updates: GuestUpdate) => Promise<void>;
}

export function BanGuestModal({ guest, isOpen, onClose, onBan }: BanGuestModalProps) {
    const [reason, setReason] = useState(guest.banReason || '');
    const [isGlobalBan, setIsGlobalBan] = useState(guest.isBanned || false);
    const [bannedFromMeals, setBannedFromMeals] = useState(guest.bannedFromMeals || false);
    const [bannedFromShower, setBannedFromShower] = useState(guest.bannedFromShower || false);
    const [bannedFromLaundry, setBannedFromLaundry] = useState(guest.bannedFromLaundry || false);
    const [bannedFromBicycle, setBannedFromBicycle] = useState(guest.bannedFromBicycle || false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const updates = {
                banReason: reason,
                bannedAt: isGlobalBan ? new Date().toISOString() : null,
                // If unbanning globally but setting partial bans, ensure isBanned is false (handled by backend or logic?)
                // Actually types.ts says isBanned: boolean.
                // If I set partial bans, isBanned (global) should be false? Yes.
                bannedFromMeals,
                bannedFromShower,
                bannedFromLaundry,
                bannedFromBicycle,
            };
            // If Global Ban is checked, should we check all others or just rely on 'isBanned'?
            // GuestCard logic: !isBanned && !guest.bannedFromMeals
            // So Global Ban overrides everything.

            await onBan(guest.id, updates);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader>Manage Bans - {guest.firstName} {guest.lastName}</ModalHeader>
            <ModalBody>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ban Reason</label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for ban..."
                        />
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Ban Scope</h4>

                        <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isGlobalBan}
                                onChange={(e) => setIsGlobalBan(e.target.checked)}
                                className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                            />
                            <span className="text-red-700 font-medium">Global Ban (All Services)</span>
                        </label>

                        <div className="pl-4 space-y-2 border-l-2 border-gray-100 ml-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={bannedFromMeals}
                                    onChange={(e) => setBannedFromMeals(e.target.checked)}
                                    disabled={isGlobalBan} // Global implies all
                                    className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                />
                                <span>Banned from Meals</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={bannedFromShower}
                                    onChange={(e) => setBannedFromShower(e.target.checked)}
                                    disabled={isGlobalBan}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span>Banned from Showers</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={bannedFromLaundry}
                                    onChange={(e) => setBannedFromLaundry(e.target.checked)}
                                    disabled={isGlobalBan}
                                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                />
                                <span>Banned from Laundry</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={bannedFromBicycle}
                                    onChange={(e) => setBannedFromBicycle(e.target.checked)}
                                    disabled={isGlobalBan}
                                    className="w-4 h-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
                                />
                                <span>Banned from Bicycles</span>
                            </label>
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="danger" onClick={handleSave} isLoading={isSubmitting}>
                    Save Bans
                </Button>
            </ModalFooter>
        </Modal>
    );
}
