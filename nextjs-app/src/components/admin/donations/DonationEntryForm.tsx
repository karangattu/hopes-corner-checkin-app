'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Input, Select, Button } from '@/components/ui';
import { useDonationsStore } from '@/lib/stores/useDonationsStore';
import { DonationType } from '@/lib/types';
import { Package, X } from 'lucide-react';

const DONATION_TYPES: { value: DonationType; label: string }[] = [
    { value: 'Protein', label: 'Protein' },
    { value: 'Carbs', label: 'Carbs' },
    { value: 'Vegetables', label: 'Vegetables' },
    { value: 'Fruit', label: 'Fruit' },
    { value: 'Veggie Protein', label: 'Veggie Protein' },
    { value: 'Deli Foods', label: 'Deli Foods' },
    { value: 'Pastries', label: 'Pastries' },
    { value: 'School lunch', label: 'School Lunch' },
];

interface DonationFormValues {
    type: DonationType | '';
    itemName: string;
    donor: string;
    weightLbs: number;
    trays: number;
    servings: number;
    temperature: string;
}

interface DonationEntryFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function DonationEntryForm({ onSuccess, onCancel }: DonationEntryFormProps) {
    const { addDonation, isLoading } = useDonationsStore();
    const [formData, setFormData] = useState<DonationFormValues>({
        type: '',
        itemName: '',
        donor: '',
        weightLbs: 0,
        trays: 0,
        servings: 0,
        temperature: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof DonationFormValues, string>>>({});

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof DonationFormValues, string>> = {};
        if (!formData.type) newErrors.type = 'Type is required';
        if (!formData.itemName.trim()) newErrors.itemName = 'Item name is required';
        if (!formData.donor.trim()) newErrors.donor = 'Donor is required';
        if (formData.weightLbs < 0) newErrors.weightLbs = 'Weight cannot be negative';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!formData.type) return;

        try {
            await addDonation({
                type: formData.type,
                itemName: formData.itemName,
                donor: formData.donor,
                weightLbs: Number(formData.weightLbs) || 0,
                trays: Number(formData.trays) || 0,
                servings: Number(formData.servings) || 0,
                temperature: formData.temperature,
            });

            toast.success('Donation logged successfully');
            setFormData({
                type: '',
                itemName: '',
                donor: '',
                weightLbs: 0,
                trays: 0,
                servings: 0,
                temperature: '',
            });
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error('Failed to log donation');
            console.error(error);
        }
    };

    const handleChange = (field: keyof DonationFormValues, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-blue-600" />
                    Log Food Donation
                </h2>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                    label="Food Type"
                    options={DONATION_TYPES}
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value as DonationType)}
                    error={errors.type}
                    placeholder="Select type..."
                />

                <Input
                    label="Item Name"
                    placeholder="e.g. Turkey Sandwiches"
                    value={formData.itemName}
                    onChange={(e) => handleChange('itemName', e.target.value)}
                    error={errors.itemName}
                />

                <Input
                    label="Donor"
                    placeholder="e.g. Whole Foods"
                    value={formData.donor}
                    onChange={(e) => handleChange('donor', e.target.value)}
                    error={errors.donor}
                />

                <Input
                    label="Weight (lbs)"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.weightLbs}
                    onChange={(e) => handleChange('weightLbs', e.target.value)}
                    error={errors.weightLbs}
                />

                <Input
                    label="Trays"
                    type="number"
                    min="0"
                    value={formData.trays}
                    onChange={(e) => handleChange('trays', e.target.value)}
                />

                <Input
                    label="Estimated Servings"
                    type="number"
                    min="0"
                    value={formData.servings}
                    onChange={(e) => handleChange('servings', e.target.value)}
                />

                <Input
                    label="Temperature (°F)"
                    placeholder="e.g. 165 or Cold"
                    value={formData.temperature}
                    onChange={(e) => handleChange('temperature', e.target.value)}
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} type="button">
                        Cancel
                    </Button>
                )}
                <Button type="submit" isLoading={isLoading}>
                    Log Donation
                </Button>
            </div>
        </form>
    );
}
