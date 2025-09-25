import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { todayPacificDateString, pacificDateStringFrom } from '../utils/date';
import { PackagePlus, History, Save, List, Download, BarChart3, Users, CalendarDays } from 'lucide-react';
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

  const selectedStats = useMemo(() => {
    let trays = 0;
    let weight = 0;
    const donors = new Set();
    for (const record of dayRecords) {
      trays += Number(record.trays) || 0;
      weight += Number(record.weightLbs) || 0;
      if (record.donor) {
        const donorName = record.donor.trim();
        if (donorName) donors.add(donorName);
      }
    }
    return {
      entries: dayRecords.length,
      trays,
      weight,
      donors: donors.size,
    };
  }, [dayRecords]);

  const summaryCards = useMemo(() => {
    const formatNumber = (value, options) => Number(value || 0).toLocaleString(undefined, options);
    return [
      {
        id: 'entries',
        label: 'Entries logged',
        value: formatNumber(selectedStats.entries),
        helper: 'Records captured on this date',
        Icon: List,
      },
      {
        id: 'weight',
        label: 'Total weight',
        value: `${formatNumber(selectedStats.weight, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} lbs`,
        helper: 'Combined across all donations',
        Icon: BarChart3,
      },
      {
        id: 'trays',
        label: 'Trays received',
        value: formatNumber(selectedStats.trays, { maximumFractionDigits: 2 }),
        helper: 'Including partial tray counts',
        Icon: PackagePlus,
      },
      {
        id: 'donors',
        label: 'Unique donors',
        value: formatNumber(selectedStats.donors),
        helper: 'Contributors for this day',
        Icon: Users,
      },
    ];
  }, [selectedStats.entries, selectedStats.weight, selectedStats.trays, selectedStats.donors]);

  const topDonors = useMemo(() => {
    const donorsMap = new Map();
    for (const record of dayRecords) {
      const donorKey = (record.donor || 'Unknown donor').trim() || 'Unknown donor';
      if (!donorsMap.has(donorKey)) {
        donorsMap.set(donorKey, { donor: donorKey, entries: 0, trays: 0, weight: 0 });
      }
      const entry = donorsMap.get(donorKey);
      entry.entries += 1;
      entry.trays += Number(record.trays) || 0;
      entry.weight += Number(record.weightLbs) || 0;
    }
    return Array.from(donorsMap.values())
      .sort((a, b) => (b.weight - a.weight) || (b.trays - a.trays) || (b.entries - a.entries))
      .slice(0, 4);
  }, [dayRecords]);

  const typeBreakdown = useMemo(() => {
    const entries = DONATION_TYPES.map(type => ({
      type,
      weight: Number(typeTotals[type] || 0),
    }));
    const maxWeight = entries.reduce((max, entry) => Math.max(max, entry.weight), 0);
    return { entries, maxWeight };
  }, [DONATION_TYPES, typeTotals]);

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
      toast.error(err.message || 'Failed to add donation');
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
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-emerald-100">
              <PackagePlus size={18} className="text-white" />
              Donations log
            </div>
            <h2 className="text-2xl font-semibold mt-2">Track pantry and meal contributions</h2>
            <p className="text-sm text-emerald-50 mt-3 max-w-2xl">
              Capture deliveries, keep an audit trail, and export totals in seconds. Select a date to review and add entries without changing your workflow.
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 min-w-[240px]">
            <div className="flex items-center gap-2 text-sm font-medium text-white/90">
              <CalendarDays size={18} /> Log for
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-white text-gray-900 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(todayPacificDateString())}
                className="text-xs font-semibold uppercase tracking-wide bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-1 transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {summaryCards.map(({ id, label, value, helper, Icon }) => {
            const CardIcon = Icon;
            return (
              <div key={id} className="bg-white/15 border border-white/25 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/80">
                  <span>{label}</span>
                  <CardIcon size={16} className="text-white/70" />
                </div>
                <div className="text-xl font-semibold leading-none">{value}</div>
                <p className="text-xs text-white/70">{helper}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <PackagePlus size={18} className="text-emerald-500" /> Log a new donation
                </h3>
                <p className="text-sm text-gray-500 mt-1">Enter what arrived, how much was delivered, and who dropped it off. Entries save instantly.</p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs rounded-full px-3 py-1 bg-emerald-50 text-emerald-700">
                {selectedStats.entries.toLocaleString()} entries today
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                >
                  {DONATION_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Donation details</label>
                <input
                  type="text"
                  value={form.itemName}
                  onChange={e => setForm({ ...form, itemName: e.target.value })}
                  placeholder="e.g., Chicken tikka masala, Bok choy, Pasta"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Trays</label>
                <input
                  type="number"
                  min="0"
                  value={form.trays}
                  onChange={e => setForm({ ...form, trays: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Weight (lbs)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.weightLbs}
                  onChange={e => setForm({ ...form, weightLbs: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Source (Donor)</label>
                <input
                  type="text"
                  value={form.donor}
                  onChange={e => setForm({ ...form, donor: e.target.value })}
                  placeholder="e.g., Waymo, LinkedIn"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                />
              </div>

              <div className="md:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-70"
                >
                  <Save size={16} /> {loading ? 'Saving…' : 'Add donation'}
                </button>
              </div>
            </form>

            {suggestions.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <History size={16} className="text-gray-500" /> Quick fill from recent deliveries
                </div>
                <p className="text-xs text-gray-500 mb-3">Tap to load item, donor, and type. Tray and weight fields remain editable.</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:border-emerald-300 hover:text-emerald-700 transition"
                    >
                      {s.itemName} · {s.donor}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <List size={18} className="text-emerald-500" /> Consolidated summary
                </h3>
                <p className="text-sm text-gray-500">Grouped by item and donor for {new Date(selectedDate).toLocaleDateString()}.</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-400">Same-day totals</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2 rounded-l-lg bg-gray-50">Item</th>
                    <th className="px-3 py-2 bg-gray-50">Donor</th>
                    <th className="px-3 py-2 bg-gray-50">Type</th>
                    <th className="px-3 py-2 text-right bg-gray-50">Trays</th>
                    <th className="px-3 py-2 text-right rounded-r-lg bg-gray-50">Weight (lbs)</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidated.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500 bg-white rounded-lg border border-dashed border-gray-200">
                        No donations recorded for this date yet.
                      </td>
                    </tr>
                  )}
                  {consolidated.map((row, i) => (
                    <tr key={`${row.itemName}|${row.donor}|${i}`} className="bg-white border border-gray-100 rounded-lg shadow-sm">
                      <td className="px-3 py-2 rounded-l-lg">{row.itemName}</td>
                      <td className="px-3 py-2">{row.donor}</td>
                      <td className="px-3 py-2">{row.type}</td>
                      <td className="px-3 py-2 text-right">{row.trays}</td>
                      <td className="px-3 py-2 text-right rounded-r-lg">{row.weightLbs.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <History size={18} className="text-emerald-500" /> Recent activity & quick edits
                </h3>
                <p className="text-sm text-gray-500">Update mistakes or undo a record without leaving the page.</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-400">Last 10 entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2 rounded-l-lg bg-gray-50">Time</th>
                    <th className="px-3 py-2 bg-gray-50">Item</th>
                    <th className="px-3 py-2 bg-gray-50">Donor</th>
                    <th className="px-3 py-2 bg-gray-50">Type</th>
                    <th className="px-3 py-2 text-right bg-gray-50">Trays</th>
                    <th className="px-3 py-2 text-right bg-gray-50">Lbs</th>
                    <th className="px-3 py-2 text-right rounded-r-lg bg-gray-50">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentWithUndo.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500 bg-white rounded-lg border border-dashed border-gray-200">
                        No recent entries for {new Date(selectedDate).toLocaleDateString()} yet.
                      </td>
                    </tr>
                  )}
                  {recentWithUndo.map(r => (
                    <tr key={r.id} className="bg-white border border-gray-100 rounded-lg shadow-sm align-top">
                      <td className="px-3 py-2 rounded-l-lg align-top">{new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      {editingId === r.id ? (
                        <>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={editRow.itemName}
                              onChange={e => setEditRow(prev => ({ ...prev, itemName: e.target.value }))}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={editRow.donor}
                              onChange={e => setEditRow(prev => ({ ...prev, donor: e.target.value }))}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={editRow.type}
                              onChange={e => setEditRow(prev => ({ ...prev, type: e.target.value }))}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                              className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editRow.weightLbs}
                              onChange={e => setEditRow(prev => ({ ...prev, weightLbs: e.target.value }))}
                              className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </td>
                          <td className="px-3 py-2 text-right rounded-r-lg">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="px-3 py-1 text-xs rounded border bg-emerald-600 text-white hover:bg-emerald-700"
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
                              <button type="button" className="px-3 py-1 text-xs rounded border" onClick={() => setEditingId(null)}>Cancel</button>
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
                          <td className="px-3 py-2 text-right rounded-r-lg">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="px-3 py-1 text-xs rounded border"
                                onClick={() => {
                                  setEditingId(r.id);
                                  setEditRow({ type: r.type, itemName: r.itemName, trays: r.trays, weightLbs: r.weightLbs, donor: r.donor });
                                }}
                              >Edit</button>
                              <button
                                type="button"
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
                                type="button"
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
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Daily insights</h3>
              <p className="text-sm text-gray-500">Quick breakdown for {new Date(selectedDate).toLocaleDateString()}.</p>
            </div>
            <div className="space-y-3">
              {typeBreakdown.entries.some(entry => entry.weight > 0) ? (
                typeBreakdown.entries.map(entry => (
                  <div key={entry.type} className="p-3 border border-gray-100 rounded-xl bg-gray-50/60">
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <span className="font-medium text-gray-800">{entry.type}</span>
                      <span className="text-gray-600">{entry.weight.toFixed(2)} lbs</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${typeBreakdown.maxWeight ? Math.max((entry.weight / typeBreakdown.maxWeight) * 100, 4) : 0}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                  No weight totals yet for this date. Add donations to see the breakdown by type.
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-3">Top donors today</h4>
              {topDonors.length === 0 ? (
                <p className="text-sm text-gray-500">Donor details will appear as soon as entries are logged for this day.</p>
              ) : (
                <ul className="space-y-3">
                  {topDonors.map(donor => (
                    <li key={donor.donor} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{donor.donor}</p>
                        <p className="text-xs text-gray-500">
                          {donor.entries.toLocaleString()} entr{donor.entries === 1 ? 'y' : 'ies'} · {Number(donor.trays || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} trays
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {Number(donor.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} lbs
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Download size={18} className="text-emerald-500" /> Exports & archives
                </h3>
                <p className="text-sm text-gray-500">Download donation history in CSV format for finance or compliance.</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-400">CSV</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Start</label>
                  <input
                    type="date"
                    value={range.start}
                    onChange={e => setRange(r => ({ ...r, start: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">End</label>
                  <input
                    type="date"
                    value={range.end}
                    onChange={e => setRange(r => ({ ...r, end: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={exportDonationsRange}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
              >
                <Download size={16} /> Export donations ({range.start} → {range.end})
              </button>
              <p className="text-xs text-gray-500">Dates use Pacific time. Exports include item, donor, tray, and weight details.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Donations;
