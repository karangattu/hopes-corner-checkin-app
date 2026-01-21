'use client';

import React, { useState, useMemo } from 'react';
import {
    Save,
    Trash2,
    Pencil,
    ChevronLeft,
    ChevronRight,
    Store,
    Utensils,
    Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDonationsStore } from '@/stores/useDonationsStore';
import { DonationTypeEnum, LaPlazaCategoryEnum } from '@/types/database';
import {
    calculateServings,
    deriveDonationDateKey,
    formatProteinAndCarbsClipboardText,
    DENSITY_SERVINGS
} from '@/lib/utils/donationUtils';
import { todayPacificDateString, pacificDateStringFrom } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';

// Helper to safely format a date string (YYYY-MM-DD) for display
const formatDisplayDate = (dateString: string) => {
    // Parse as local date by appending time to avoid UTC issues
    const date = new Date(dateString + 'T12:00:00');
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

// Helper to safely format record time
const formatRecordTime = (record: any) => {
    const timestamp = record.created_at || record.donated_at || record.received_at;
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const DONATION_TYPES: DonationTypeEnum[] = [
    'Protein', 'Carbs', 'Vegetables', 'Fruit',
    'Veggie Protein', 'Deli Foods', 'Pastries', 'School Lunch'
];

const LA_PLAZA_CATEGORIES: LaPlazaCategoryEnum[] = [
    'Bakery', 'Beverages', 'Dairy', 'Meat',
    'Mix', 'Nonfood', 'Prepared/Perishable', 'Produce'
];

type ViewMode = 'general' | 'laplaza';

export const DonationsSection = () => {
    const {
        donationRecords,
        laPlazaRecords,
        addDonation,
        updateDonation,
        deleteDonation,
        addLaPlazaDonation,
        updateLaPlazaDonation,
        deleteLaPlazaDonation
    } = useDonationsStore();

    const [viewMode, setViewMode] = useState<ViewMode>('general');
    const [selectedDate, setSelectedDate] = useState(todayPacificDateString());
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form States
    const [generalForm, setGeneralForm] = useState({
        type: 'Protein' as DonationTypeEnum,
        itemName: '',
        trays: '',
        weightLbs: '',
        density: 'medium' as 'medium' | 'high' | 'light',
        donor: '',
        temperature: ''
    });

    const [laPlazaForm, setLaPlazaForm] = useState({
        category: 'Produce' as LaPlazaCategoryEnum,
        weightLbs: '',
        notes: ''
    });

    // Filtering
    const displayedRecords = useMemo(() => {
        if (viewMode === 'general') {
            return donationRecords.filter(r => deriveDonationDateKey(r) === selectedDate);
        } else {
            return laPlazaRecords.filter(r => deriveDonationDateKey(r) === selectedDate);
        }
    }, [donationRecords, laPlazaRecords, viewMode, selectedDate]);

    // Helpers
    const shiftDate = (offset: number) => {
        // Parse as local date by appending noon time to avoid UTC timezone issues
        const date = new Date(selectedDate + 'T12:00:00');
        date.setDate(date.getDate() + offset);
        setSelectedDate(pacificDateStringFrom(date));
    };

    // Handlers
    const handleGeneralSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const trays = Number(generalForm.trays) || 0;
            const weight = Number(generalForm.weightLbs) || 0;
            const servings = calculateServings(generalForm.type, weight, trays, generalForm.density);

            if (editingId) {
                await updateDonation(editingId, {
                    donation_type: generalForm.type,
                    item_name: generalForm.itemName,
                    trays,
                    weight_lbs: weight,
                    density: generalForm.density,
                    donor: generalForm.donor,
                    temperature: generalForm.temperature,
                    servings,
                    date_key: selectedDate, // Keep original date or move? Usually keep.
                    donated_at: new Date().toISOString()
                });
                toast.success('Updated donation');
                setEditingId(null);
            } else {
                await addDonation({
                    donation_type: generalForm.type,
                    item_name: generalForm.itemName,
                    trays,
                    weight_lbs: weight,
                    density: generalForm.density,
                    donor: generalForm.donor,
                    temperature: generalForm.temperature,
                    servings,
                    date_key: selectedDate,
                    donated_at: new Date().toISOString() // Or match selected date time?
                });
                toast.success('Logged donation');
            }

            // Reset crucial fields only
            setGeneralForm(prev => ({ ...prev, itemName: '', trays: '', weightLbs: '', temperature: '' }));
        } catch (err) {
            console.error(err);
            toast.error('Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const handleLaPlazaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const weight = Number(laPlazaForm.weightLbs) || 0;

            if (editingId) {
                await updateLaPlazaDonation(editingId, {
                    category: laPlazaForm.category,
                    weight_lbs: weight,
                    notes: laPlazaForm.notes,
                    date_key: selectedDate
                });
                toast.success('Updated La Plaza record');
                setEditingId(null);
            } else {
                await addLaPlazaDonation({
                    category: laPlazaForm.category,
                    weight_lbs: weight,
                    notes: laPlazaForm.notes,
                    date_key: selectedDate
                });
                toast.success('Logged La Plaza donation');
            }
            setLaPlazaForm(prev => ({ ...prev, weightLbs: '', notes: '' }));
        } catch (err) {
            console.error(err);
            toast.error('Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this record?')) return;
        try {
            if (viewMode === 'general') await deleteDonation(id);
            else await deleteLaPlazaDonation(id);
            toast.success('Deleted');
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const handleEdit = (record: any) => {
        setEditingId(record.id);
        if (viewMode === 'general') {
            setGeneralForm({
                type: record.type || record.donation_type,
                itemName: record.itemName || record.item_name,
                trays: record.trays?.toString() || '',
                weightLbs: record.weightLbs?.toString() || record.weight_lbs?.toString() || '',
                density: record.density || 'medium',
                donor: record.donor || '',
                temperature: record.temperature || ''
            });
        } else {
            setLaPlazaForm({
                category: record.category,
                weightLbs: record.weightLbs?.toString() || record.weight_lbs?.toString() || '',
                notes: record.notes || ''
            });
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        // Reset/Clear if needed
    };

    // Copy to clipboard logic
    const handleCopySummary = async () => {
        const text = formatProteinAndCarbsClipboardText(displayedRecords);
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied summary to clipboard');
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Date Nav */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl", viewMode === 'general' ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600")}>
                        {viewMode === 'general' ? <Utensils size={24} /> : <Store size={24} />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {viewMode === 'general' ? 'General Donations' : 'La Plaza Donations'}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            {viewMode === 'general' ? 'Track trays and prepared food' : 'Track raw ingredients and grocery items'}
                        </p>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('general')}
                        className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", viewMode === 'general' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setViewMode('laplaza')}
                        className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", viewMode === 'laplaza' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}
                    >
                        La Plaza
                    </button>
                </div>
            </div>

            {/* Date Selector */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-white rounded-lg transition-colors" title="Previous day"><ChevronLeft size={20} /></button>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{formatDisplayDate(selectedDate)}</span>
                    {selectedDate !== todayPacificDateString() && (
                        <button
                            onClick={() => setSelectedDate(todayPacificDateString())}
                            className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                        >
                            Today
                        </button>
                    )}
                </div>
                <button onClick={() => shiftDate(1)} className="p-2 hover:bg-white rounded-lg transition-colors" title="Next day"><ChevronRight size={20} /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Side */}
                <div className="lg:col-span-1 space-y-6">
                    <form onSubmit={viewMode === 'general' ? handleGeneralSubmit : handleLaPlazaSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">
                                {editingId ? 'Edit Record' : 'Log New Item'}
                            </h3>
                            {editingId && (
                                <button type="button" onClick={cancelEdit} className="text-xs text-red-600 hover:underline">Cancel</button>
                            )}
                        </div>

                        {viewMode === 'general' ? (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 font-medium"
                                        value={generalForm.type}
                                        onChange={e => setGeneralForm({ ...generalForm, type: e.target.value as DonationTypeEnum })}
                                    >
                                        {DONATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={generalForm.itemName}
                                        onChange={e => setGeneralForm({ ...generalForm, itemName: e.target.value })}
                                        placeholder="e.g. Chicken breast"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trays</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={generalForm.trays}
                                            onChange={e => setGeneralForm({ ...generalForm, trays: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (lbs)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={generalForm.weightLbs}
                                            onChange={e => setGeneralForm({ ...generalForm, weightLbs: e.target.value })}
                                            placeholder="0.0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Density</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 font-medium"
                                        value={generalForm.density}
                                        onChange={e => setGeneralForm({ ...generalForm, density: e.target.value as 'light' | 'medium' | 'high' })}
                                    >
                                        <option value="light">Light ({DENSITY_SERVINGS.light} servings)</option>
                                        <option value="medium">Medium ({DENSITY_SERVINGS.medium} servings)</option>
                                        <option value="high">High ({DENSITY_SERVINGS.high} servings)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Donor / Source</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={generalForm.donor}
                                        onChange={e => setGeneralForm({ ...generalForm, donor: e.target.value })}
                                        placeholder="e.g., Waymo, LinkedIn, Anonymous"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temperature (Optional)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={generalForm.temperature}
                                            onChange={e => setGeneralForm({ ...generalForm, temperature: e.target.value })}
                                            placeholder="e.g., 165°F, Hot, Cold, Room temp"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setGeneralForm({ ...generalForm, temperature: generalForm.temperature + '°F' })}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600 transition-colors"
                                            title="Add °F symbol"
                                        >
                                            °F
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Tip: Click °F button to add the symbol</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 font-medium"
                                        value={laPlazaForm.category}
                                        onChange={e => setLaPlazaForm({ ...laPlazaForm, category: e.target.value as LaPlazaCategoryEnum })}
                                    >
                                        {LA_PLAZA_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight (lbs)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={laPlazaForm.weightLbs}
                                        onChange={e => setLaPlazaForm({ ...laPlazaForm, weightLbs: e.target.value })}
                                        placeholder="0.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                                    <textarea
                                        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none h-24 resize-none"
                                        value={laPlazaForm.notes}
                                        onChange={e => setLaPlazaForm({ ...laPlazaForm, notes: e.target.value })}
                                        placeholder="Optional details..."
                                    />
                                </div>
                            </>
                        )}

                        <button
                            disabled={loading}
                            type="submit"
                            className={cn(
                                "w-full py-3 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2",
                                viewMode === 'general'
                                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                    : "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                            )}
                        >
                            {editingId ? <Pencil size={18} /> : <Save size={18} />}
                            {editingId ? 'Update Record' : 'Save Record'}
                        </button>
                    </form>
                </div>

                {/* List Side */}
                <div className="lg:col-span-2 space-y-4">
                    {viewMode === 'general' && displayedRecords.length > 0 && (
                        <div className="flex justify-end">
                            <button onClick={handleCopySummary} className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors">
                                <Copy size={14} /> Copy Summary
                            </button>
                        </div>
                    )}

                    <div className="space-y-3">
                        {displayedRecords.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 border-dashed">
                                <p className="text-gray-400 font-medium">No records for this date</p>
                            </div>
                        ) : (
                            displayedRecords.map((record: any) => (
                                <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-start group">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                                viewMode === 'general' ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                                            )}>
                                                {viewMode === 'general' ? record.type : record.category}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {formatRecordTime(record)}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 mt-1">
                                            {viewMode === 'general' ? record.itemName : (record.notes || 'No description')}
                                        </h4>
                                        <div className="text-sm text-gray-600 mt-1 flex gap-4">
                                            <span>{record.weightLbs || record.weight_lbs} lbs</span>
                                            {viewMode === 'general' && Number(record.trays) > 0 && (
                                                <span>{record.trays} trays</span>
                                            )}
                                        </div>
                                        {viewMode === 'general' && record.donor && (
                                            <p className="text-xs text-gray-400 mt-1">Donor: {record.donor}</p>
                                        )}
                                        {viewMode === 'general' && record.temperature && (
                                            <p className="text-xs text-gray-400 mt-0.5">Temp: {record.temperature}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(record)}
                                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(record.id)}
                                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
