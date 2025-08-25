import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { todayPacificDateString, pacificDateStringFrom } from '../utils/date';
import { PackagePlus, History, Save, List, Download } from 'lucide-react';
import { useAppContext } from '../context/useAppContext';

const Donations = () => {
  const {
    DONATION_TYPES,
    addDonation,
    getRecentDonations,
    exportDataAsCSV,
    donationRecords,
    actionHistory,
    undoAction,
    setDonationRecords,
  } = useAppContext();

  const [form, setForm] = useState({ type: 'Protein', itemName: '', trays: '', weightLbs: '', donor: '' });
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => todayPacificDateString());
  const [range, setRange] = useState({
    start: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    })(),
    end: todayPacificDateString()
  });

  const suggestions = useMemo(() => getRecentDonations(8), [getRecentDonations]);
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({ type: 'Protein', itemName: '', trays: 0, weightLbs: 0, donor: '' });

  const dayRecords = useMemo(() => {
    return (donationRecords || []).filter(r => pacificDateStringFrom(r.date || '') === selectedDate);
  }, [donationRecords, selectedDate]);

  const consolidated = useMemo(() => {
    const map = new Map();
    for (const r of dayRecords) {
      const key = `${r.itemName}|${r.donor}`;
      if (!map.has(key)) map.set(key, { itemName: r.itemName, donor: r.donor, type: r.type, trays: 0, weightLbs: 0 });
      const entry = map.get(key);
      entry.trays += Number(r.trays) || 0;
      entry.weightLbs += Number(r.weightLbs) || 0;
    }
    return Array.from(map.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [dayRecords]);

  const typeTotals = useMemo(() => {
    const totals = {};
    for (const t of DONATION_TYPES) totals[t] = 0;
    for (const r of dayRecords) {
      const t = r.type;
      if (totals[t] === undefined) totals[t] = 0;
      totals[t] += Number(r.weightLbs) || 0;
    }
    return totals;
  }, [dayRecords, DONATION_TYPES]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDonation({
        type: form.type,
        itemName: form.itemName,
        trays: Number(form.trays || 0),
        weightLbs: Number(form.weightLbs || 0),
        donor: form.donor,
      });

      setForm(prev => ({ ...prev, trays: '', weightLbs: '' }));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to add donation');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (sug) => {
    setForm(prev => ({ ...prev, itemName: sug.itemName, donor: sug.donor, type: sug.type }));
  };

  const recentWithUndo = useMemo(() => {
    const recs = [...dayRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    const findActionId = (recordId) => (actionHistory || []).find(a => a.type === 'DONATION_ADDED' && a.data?.recordId === recordId)?.id;
    return recs.map(r => ({ ...r, actionId: findActionId(r.id) }));
  }, [dayRecords, actionHistory]);

  const exportDonationsRange = () => {
    const startISO = new Date(`${range.start}T00:00:00-08:00`).toISOString();
    const endISO = new Date(`${range.end}T23:59:59.999-08:00`).toISOString();
    const rows = (donationRecords || []).filter(r => r.date >= startISO && r.date <= endISO).map(r => ({
      Date: new Date(r.date).toLocaleDateString(),
      Type: r.type,
      Item: r.itemName,
      Trays: r.trays,
      'Weight (lbs)': r.weightLbs,
      Donor: r.donor,
    }));
    exportDataAsCSV(rows, `donations-${range.start}-to-${range.end}.csv`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
        <PackagePlus size={18} /> Record Donations
      </h2>

      {/* Quick metrics by type (lbs) for selected date) */}
      <div className="mb-4">
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">View date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {DONATION_TYPES.filter(t => (typeTotals[t] || 0) > 0).map(t => (
            <div key={t} className="bg-gray-50 border rounded p-3">
              <div className="text-gray-600 text-sm">{t} (lbs)</div>
              <div className="text-2xl font-bold">{typeTotals[t].toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Type</label>
          <select
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {DONATION_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">What was the donation?</label>
          <input
            type="text"
            value={form.itemName}
            onChange={e => setForm({ ...form, itemName: e.target.value })}
            placeholder="e.g., Chicken Tikka Masala, Bok Choy, Pasta"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Trays</label>
          <input
            type="number"
            min="0"
            value={form.trays}
            onChange={e => setForm({ ...form, trays: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Weight (lbs)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.weightLbs}
            onChange={e => setForm({ ...form, weightLbs: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Source (Donor)</label>
          <input
            type="text"
            value={form.donor}
            onChange={e => setForm({ ...form, donor: e.target.value })}
            placeholder="e.g., Waymo, LinkedIn"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-1 flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-70"
          >
            <Save size={16} /> Add
          </button>
        </div>
      </form>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><History size={16} /> Recent items</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, idx) => (
              <button key={idx} onClick={() => applySuggestion(s)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border">
                {s.itemName} · {s.donor}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Consolidated by item+donor for selected date */}
      <div className="mt-6">
        <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><List size={16} /> Donations on {new Date(selectedDate).toLocaleDateString()} (consolidated)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Donor</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Trays</th>
                <th className="px-3 py-2 text-right">Weight (lbs)</th>
              </tr>
            </thead>
            <tbody>
              {consolidated.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No donations recorded today</td></tr>
              )}
              {consolidated.map((row, i) => (
                <tr key={`${row.itemName}|${row.donor}|${i}`} className="border-b">
                  <td className="px-3 py-2">{row.itemName}</td>
                  <td className="px-3 py-2">{row.donor}</td>
                  <td className="px-3 py-2">{row.type}</td>
                  <td className="px-3 py-2 text-right">{row.trays}</td>
                  <td className="px-3 py-2 text-right">{row.weightLbs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent entries with Undo */}
      <div className="mt-6">
        <div className="text-sm font-semibold text-gray-700 mb-2">Recent entries</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Donor</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Trays</th>
                <th className="px-3 py-2 text-right">Lbs</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentWithUndo.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No recent entries</td></tr>
              )}
              {recentWithUndo.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="px-3 py-2 align-top">{new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  {editingId === r.id ? (
                    <>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={editRow.itemName}
                          onChange={e => setEditRow(prev => ({ ...prev, itemName: e.target.value }))}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={editRow.donor}
                          onChange={e => setEditRow(prev => ({ ...prev, donor: e.target.value }))}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editRow.type}
                          onChange={e => setEditRow(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          {DONATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={editRow.trays}
                          onChange={e => setEditRow(prev => ({ ...prev, trays: e.target.value }))}
                          className="w-24 border rounded px-2 py-1 text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editRow.weightLbs}
                          onChange={e => setEditRow(prev => ({ ...prev, weightLbs: e.target.value }))}
                          className="w-24 border rounded px-2 py-1 text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="px-3 py-1 text-xs rounded border bg-blue-600 text-white"
                            onClick={() => {
                              const clean = {
                                itemName: (editRow.itemName || '').trim(),
                                donor: (editRow.donor || '').trim(),
                                type: editRow.type,
                                trays: Number(editRow.trays || 0),
                                weightLbs: Number(editRow.weightLbs || 0),
                              };
                              if (!clean.itemName) { toast.error('Item is required'); return; }
                              if (!clean.donor) { toast.error('Donor is required'); return; }
                              if (!DONATION_TYPES.includes(clean.type)) { toast.error('Invalid type'); return; }
                              if (clean.trays < 0 || clean.weightLbs < 0 || Number.isNaN(clean.trays) || Number.isNaN(clean.weightLbs)) { toast.error('Invalid numbers'); return; }
                              setDonationRecords(prev => prev.map(d => d.id === r.id ? { ...d, ...clean, lastUpdated: new Date().toISOString() } : d));
                              toast.success('Donation updated');
                              setEditingId(null);
                            }}
                          >Save</button>
                          <button className="px-3 py-1 text-xs rounded border" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">{r.itemName}</td>
                      <td className="px-3 py-2">{r.donor}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2 text-right">{r.trays}</td>
                      <td className="px-3 py-2 text-right">{Number(r.weightLbs || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="px-3 py-1 text-xs rounded border"
                            onClick={() => {
                              setEditingId(r.id);
                              setEditRow({ type: r.type, itemName: r.itemName, trays: r.trays, weightLbs: r.weightLbs, donor: r.donor });
                            }}
                          >Edit</button>
                          <button
                            className="px-3 py-1 text-xs rounded border border-red-300 text-red-700"
                            onClick={() => {
                              if (!confirm('Delete this donation entry?')) return;
                              if (r.actionId) {
                                const ok = undoAction(r.actionId);
                                if (ok) { toast.success('Donation deleted'); return; }
                              }
                              setDonationRecords(prev => prev.filter(d => d.id !== r.id));
                              toast.success('Donation deleted');
                            }}
                          >Delete</button>
                          <button
                            disabled={!r.actionId}
                            onClick={() => r.actionId && undoAction(r.actionId)}
                            className="px-3 py-1 text-xs rounded border disabled:opacity-60"
                          >Undo</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date range export for donations */}
      <div className="mt-6 border-t pt-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">Export donations by date range</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Start</label>
            <input type="date" value={range.start} onChange={e => setRange(r => ({ ...r, start: e.target.value }))} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">End</label>
            <input type="date" value={range.end} onChange={e => setRange(r => ({ ...r, end: e.target.value }))} className="border rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={exportDonationsRange} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded text-sm">
            <Download size={16} /> Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default Donations;
