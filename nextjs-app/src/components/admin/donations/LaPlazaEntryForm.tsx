'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Input, Select, Button, Textarea } from '@/components/ui';
import { useDonationsStore } from '@/lib/stores/useDonationsStore';
import { LaPlazaCategory } from '@/lib/types';
import { ShoppingBag, X } from 'lucide-react';

const LA_PLAZA_CATEGORIES: { value: LaPlazaCategory; label: string }[] = [
    { value: 'Bakery', label: 'Bakery' },
    { value: 'Beverages', label: 'Beverages' },
    { value: 'Dairy', label: 'Dairy' },
    { value: 'Meat', label: 'Meat' },
    { value: 'Mix', label: 'Mix' },
    { value: 'Nonfood', label: 'Non-Food' },
    { value: 'Prepared/Perishable', label: 'Prepared/Perishable' },
    { value: 'Produce', label: 'Produce' },
];

interface LaPlazaFormValues {
    category: LaPlazaCategory | '';
    weightLbs: number;
    notes: string;
}

interface LaPlazaEntryFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function LaPlazaEntryForm({ onSuccess, onCancel }: LaPlazaEntryFormProps) {
    const { addLaPlazaDonation, isLoading } = useDonationsStore();
    const [formData, setFormData] = useState<LaPlazaFormValues>({
        category: '',
        weightLbs: 0,
        notes: '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof LaPlazaFormValues, string>>>({});

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof LaPlazaFormValues, string>> = {};
        if (!formData.category) newErrors.category = 'Category is required';
        if (formData.weightLbs < 0) newErrors.weightLbs = 'Weight cannot be negative';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        if (!formData.category) return;

        try {
            await addLaPlazaDonation({
                category: formData.category,
                weightLbs: Number(formData.weightLbs) || 0,
                notes: formData.notes,
            });

            toast.success('La Plaza donation logged successfully');
            setFormData({
                category: '',
                weightLbs: 0,
                notes: '',
            });
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error('Failed to log donation');
            console.error(error);
        }
    };

    const handleChange = (field: keyof LaPlazaFormValues, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingBag className="text-indigo-600" />
                    Log La Plaza Donation
                </h2>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Select
                    label="Category"
                    options={LA_PLAZA_CATEGORIES}
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value as LaPlazaCategory)}
                    error={errors.category}
                    placeholder="Select category..."
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

                <div className="space-y-1">
                    <Textarea
                        label="Notes"
                        placeholder="Optional details..."
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} type="button">
                        Cancel
                    </Button>
                )}
                <Button type="submit" isLoading={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                    Log Donation
                </Button>
            </div>
        </form>
    );
}
