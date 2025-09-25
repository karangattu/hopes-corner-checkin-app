import { Bike, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/useAppContext';

const repairTypes = [
    'Flat Tire', 'Brake Adjustment', 'Gear Adjustment', 'Chain Replacement', 'Wheel Truing', 'Basic Tune Up', 'Drivetrain Cleaning', 'Cable Replacement', 'Headset Adjustment', 'New Bicycle', 'Other'
];

const BicycleRepairBooking = () => {
    const { bicyclePickerGuest, setBicyclePickerGuest, addBicycleRecord } = useAppContext();
    const [repairType, setRepairType] = useState(repairTypes[0]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!bicyclePickerGuest) return null;

    const handleCreate = () => {
        if (!bicyclePickerGuest) return;
        try {
            setSubmitting(true);
            addBicycleRecord(bicyclePickerGuest.id, { repairType, notes });
            setBicyclePickerGuest(null);
        } catch (e) {
            toast.error(e.message || 'Failed to add repair');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setBicyclePickerGuest(null)} />
            <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-5 border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-start justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Bike /> Log Bicycle Repair for {bicyclePickerGuest.name}</h2>
                    <button onClick={() => setBicyclePickerGuest(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Repair Type</label>
                        <select value={repairType} onChange={e => setRepairType(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                            {repairTypes.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 flex justify-between"><span>Notes {repairType === 'Other' && '(required)'}</span><span className="text-xs text-gray-400">Optional</span></label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm resize-y" placeholder="Additional info or description" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setBicyclePickerGuest(null)} className="px-3 py-2 text-sm rounded border">Cancel</button>
                        <button disabled={submitting || (repairType === 'Other' && !notes.trim())} onClick={handleCreate} className="px-4 py-2 text-sm rounded bg-sky-600 text-white disabled:opacity-50 hover:bg-sky-700">{submitting ? 'Saving...' : 'Log Repair'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BicycleRepairBooking;
