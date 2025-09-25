import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart3,
  Utensils,
  ShowerHead,
  WashingMachine,
  Calendar,
  Download,
  Users,
  Home,
  FileText,
  Upload
} from 'lucide-react';
import { Scissors, Gift, Bike, AlertTriangle, ShieldAlert, Cloud, HardDrive } from 'lucide-react';
import Donations from '../../components/Donations';
import { useAppContext } from '../../context/useAppContext';
import GuestBatchUpload from '../../components/GuestBatchUpload';
import DonutCard from '../../components/charts/DonutCard';
import TrendLine from '../../components/charts/TrendLine';
import Selectize from '../../components/Selectize';
import { animated as Animated } from '@react-spring/web';
import { useFadeInUp, SpringIcon } from '../../utils/animations';
import { todayPacificDateString, pacificDateStringFrom } from '../../utils/date';

const Dashboard = () => {
  const {
    getTodayMetrics,
    getDateRangeMetrics,
    exportDataAsCSV,
    guests,
    mealRecords,
    rvMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    showerRecords,
    laundryRecords,
    itemGivenRecords,
    haircutRecords,
    holidayRecords,
    bicycleRecords,
    donationRecords,
    resetAllData
  } = useAppContext();

  const [activeSection, setActiveSection] = useState('overview');

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const sevenAgo = new Date(today);
    sevenAgo.setDate(today.getDate() - 7);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(sevenAgo);
  });

  const [endDate, setEndDate] = useState(() => todayPacificDateString());

  const [metrics, setMetrics] = useState(() => ({ today: getTodayMetrics(), period: null }));

  const handleDateRangeSearch = () => {
    const periodMetrics = getDateRangeMetrics(startDate, endDate);
    setMetrics({
      ...metrics,
      period: periodMetrics
    });
  };

  const exportGuests = () => {
    const guestsForExport = guests.map(guest => ({
      'Guest_ID': guest.guestId,
      'First Name': guest.firstName || '',
      'Last Name': guest.lastName || '',
      Name: guest.name,
      'Housing Status': guest.housingStatus,
      Location: guest.location || '',
      Age: guest.age || '',
      Gender: guest.gender || '',
      Phone: guest.phone || '',
      'Birth Date': guest.birthdate || '',
      'Registration Date': new Date(guest.createdAt).toLocaleDateString()
    }));

    exportDataAsCSV(guestsForExport, `hopes-corner-guests-${todayPacificDateString()}.csv`);
  };

  const exportServiceData = () => {
    const allServices = [
      ...mealRecords.map(record => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: 'Meal',
        'Guest ID': record.guestId,
        'Guest Name': guests.find(g => g.id === record.guestId)?.name || 'Unknown',
        Quantity: record.count,
        'Laundry Type': '-',
        'Time Slot': '-'
      })),
      ...dayWorkerMealRecords.map(record => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: 'Day Worker Meal',
        'Guest ID': '-',
        'Guest Name': '-',
        Quantity: record.count,
        'Laundry Type': '-',
        'Time Slot': '-'
      })),
      ...showerRecords.map(record => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: 'Shower',
        'Guest ID': record.guestId,
        'Guest Name': guests.find(g => g.id === record.guestId)?.name || 'Unknown',
        Quantity: 1,
        'Laundry Type': '-',
        'Time Slot': record.time
      })),
      ...laundryRecords.map(record => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: 'Laundry',
        'Guest ID': record.guestId,
        'Guest Name': guests.find(g => g.id === record.guestId)?.name || 'Unknown',
        Quantity: 1,
        'Laundry Type': record.laundryType,
        'Time Slot': record.time
      })),
      ...(haircutRecords || []).map(record => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: 'Haircut',
        'Guest ID': record.guestId,
        'Guest Name': guests.find(g => g.id === record.guestId)?.name || 'Unknown',
        Quantity: 1,
        'Laundry Type': '-',
        'Time Slot': '-'
      })),
      ...(holidayRecords || []).map(record => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: 'Holiday',
        'Guest ID': record.guestId,
        'Guest Name': guests.find(g => g.id === record.guestId)?.name || 'Unknown',
        Quantity: 1,
        'Laundry Type': '-',
        'Time Slot': '-'
      })),
      ...(bicycleRecords || []).map(record => ({
        Date: new Date(record.date).toLocaleDateString(),
        Service: 'Bicycle Repair',
        'Guest ID': record.guestId,
        'Guest Name': guests.find(g => g.id === record.guestId)?.name || 'Unknown',
        Quantity: 1,
        'Laundry Type': '-',
        'Time Slot': '-',
        'Repair Type': record.repairType || '-',
        'Repair Status': record.status || '-',
        Notes: record.notes ? record.notes.replace(/\n/g, ' ') : '-'
      }))
    ];

    exportDataAsCSV(allServices, `hopes-corner-services-${todayPacificDateString()}.csv`);
  };

  const exportSuppliesData = () => {
    const rows = (itemGivenRecords || []).map(r => ({
      Date: new Date(r.date).toLocaleDateString(),
      Item: r.item.replace('_', ' '),
      'Guest ID': r.guestId,
      'Guest Name': guests.find(g => g.id === r.guestId)?.name || 'Unknown'
    }));
    exportDataAsCSV(rows, `hopes-corner-supplies-${todayPacificDateString()}.csv`);
  };

  const exportGuestMetrics = (guestId) => {
    const target = guests.find(g => g.id === guestId);
    if (!target) return;
    const meals = mealRecords.filter(r => r.guestId === guestId);
    const showers = showerRecords.filter(r => r.guestId === guestId);
    const laundry = laundryRecords.filter(r => r.guestId === guestId);
    const rows = [
      ...meals.map(r => ({ Date: new Date(r.date).toLocaleDateString(), Service: 'Meal', Quantity: r.count })),
      ...showers.map(r => ({ Date: new Date(r.date).toLocaleDateString(), Service: 'Shower', Time: r.time })),
      ...laundry.map(r => ({ Date: new Date(r.date).toLocaleDateString(), Service: 'Laundry', Type: r.laundryType, Time: r.time || '-' }))
    ];
    exportDataAsCSV(rows, `guest-${target.guestId}-services.csv`);
  };

  const exportMetricsData = () => {
    if (!metrics.period) {
      handleDateRangeSearch();
    }

    const metricsData = metrics.period.dailyBreakdown.map(day => ({
      Date: day.date,
      'Meals Served': day.meals,
      'Showers Taken': day.showers,
      'Laundry Loads': day.laundry
    }));

    exportDataAsCSV(
      metricsData,
      `hopes-corner-metrics-${startDate}-to-${endDate}.csv`
    );
  };

  const exportDonations = () => {
    const rows = (donationRecords || []).map(r => ({
      Date: new Date(r.date).toLocaleDateString(),
      Type: r.type,
      Item: r.itemName,
      Trays: r.trays,
      'Weight (lbs)': r.weightLbs,
      Donor: r.donor,
    }));
    exportDataAsCSV(rows, `hopes-corner-donations-${todayPacificDateString()}.csv`);
  };

  const headerAnim = useFadeInUp();
  const overviewGridAnim = useFadeInUp();
  const monthGridAnim = useFadeInUp();
  const yearGridAnim = useFadeInUp();
  const reportsChartAnim = useFadeInUp();

  const housingStatusCounts = guests.reduce((counts, guest) => {
    const status = guest.housingStatus || 'Unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  const todayMetrics = getTodayMetrics();

  const monthMetrics = useMemo(() => {
    const now = new Date();
    const monthStartPT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now.getFullYear(), now.getMonth(), 1));
    const inMonth = (iso) => pacificDateStringFrom(iso) >= monthStartPT;
    const monthMeals = mealRecords.filter(r => inMonth(r.date));
    const monthRvMeals = (rvMealRecords || []).filter(r => inMonth(r.date));
    const monthUeMeals = (unitedEffortMealRecords || []).filter(r => inMonth(r.date));
    const monthExtraMeals = (extraMealRecords || []).filter(r => inMonth(r.date));
    const monthDayWorkerMeals = (dayWorkerMealRecords || []).filter(r => inMonth(r.date));
    const monthShowers = showerRecords.filter(r => inMonth(r.date));
    const monthLaundry = laundryRecords.filter(r => inMonth(r.date));
    const monthHaircuts = (haircutRecords || []).filter(r => inMonth(r.date));
    const monthHolidays = (holidayRecords || []).filter(r => inMonth(r.date));
    const monthBicycles = (bicycleRecords || []).filter(r => inMonth(r.date) && (r.status ? r.status === 'done' : true));
    const countsAsLaundryLoad = (rec) => rec.laundryType === 'onsite' ? (rec.status === 'done' || rec.status === 'picked_up') : true;
    return {
      mealsServed: monthMeals.reduce((s, r) => s + r.count, 0)
        + monthRvMeals.reduce((s, r) => s + (r.count || 0), 0)
        + monthUeMeals.reduce((s, r) => s + (r.count || 0), 0)
        + monthExtraMeals.reduce((s, r) => s + (r.count || 0), 0)
        + monthDayWorkerMeals.reduce((s, r) => s + (r.count || 0), 0),
      showersBooked: monthShowers.filter(r => r.status === 'done').length,
      laundryLoads: monthLaundry.reduce((s, r) => s + (countsAsLaundryLoad(r) ? 1 : 0), 0),
      haircuts: monthHaircuts.length,
      holidays: monthHolidays.length,
      bicycles: monthBicycles.length,
    };
  }, [mealRecords, rvMealRecords, unitedEffortMealRecords, extraMealRecords, dayWorkerMealRecords, showerRecords, laundryRecords, haircutRecords, holidayRecords, bicycleRecords]);

  const yearMetrics = useMemo(() => {
    const now = new Date();
    const yearStartPT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now.getFullYear(), 0, 1));
    const inYear = (iso) => pacificDateStringFrom(iso) >= yearStartPT;
    const yearMeals = mealRecords.filter(r => inYear(r.date));
    const yearRvMeals = (rvMealRecords || []).filter(r => inYear(r.date));
    const yearUeMeals = (unitedEffortMealRecords || []).filter(r => inYear(r.date));
    const yearExtraMeals = (extraMealRecords || []).filter(r => inYear(r.date));
    const yearDayWorkerMeals = (dayWorkerMealRecords || []).filter(r => inYear(r.date));
    const yearShowers = showerRecords.filter(r => inYear(r.date));
    const yearLaundry = laundryRecords.filter(r => inYear(r.date));
    const yearHaircuts = (haircutRecords || []).filter(r => inYear(r.date));
    const yearHolidays = (holidayRecords || []).filter(r => inYear(r.date));
    const yearBicycles = (bicycleRecords || []).filter(r => inYear(r.date) && (r.status ? r.status === 'done' : true));
    const countsAsLaundryLoad = (rec) => rec.laundryType === 'onsite' ? (rec.status === 'done' || rec.status === 'picked_up') : true;
    return {
      mealsServed: yearMeals.reduce((s, r) => s + r.count, 0)
        + yearRvMeals.reduce((s, r) => s + (r.count || 0), 0)
        + yearUeMeals.reduce((s, r) => s + (r.count || 0), 0)
        + yearExtraMeals.reduce((s, r) => s + (r.count || 0), 0)
        + yearDayWorkerMeals.reduce((s, r) => s + (r.count || 0), 0),
      showersBooked: yearShowers.filter(r => r.status === 'done').length,
      laundryLoads: yearLaundry.reduce((s, r) => s + (countsAsLaundryLoad(r) ? 1 : 0), 0),
      haircuts: yearHaircuts.length,
      holidays: yearHolidays.length,
      bicycles: yearBicycles.length,
    };
  }, [mealRecords, rvMealRecords, unitedEffortMealRecords, extraMealRecords, dayWorkerMealRecords, showerRecords, laundryRecords, haircutRecords, holidayRecords, bicycleRecords]);

  const sections = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'batch-upload', label: 'Batch Upload', icon: Upload },
    { id: 'donations', label: 'Donations', icon: FileText },
    { id: 'export', label: 'Data Export', icon: Download },
    { id: 'system', label: 'System', icon: ShieldAlert }
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverviewSection();
      case 'reports':
        return renderReportsSection();
      case 'batch-upload':
        return renderBatchUploadSection();
      case 'export':
        return renderExportSection();
      case 'donations':
        return renderDonationsSection();
      case 'system':
        return renderSystemSection();
      default:
        return renderOverviewSection();
    }
  };

  const renderOverviewSection = () => (
    <div className="space-y-6">
      <div className="space-y-6">
        <Animated.div style={overviewGridAnim} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex justify-between">
              <h3 className="text-blue-800 font-medium">Guests Registered</h3>
              <SpringIcon>
                <Users className="text-blue-500" size={20} />
              </SpringIcon>
            </div>
            <p className="text-3xl font-bold text-blue-900 mt-2">{guests.length}</p>
            <div className="mt-2 text-sm text-blue-700 max-h-32 overflow-y-auto pr-1">
              {Object.entries(housingStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span>{status}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden sm:block lg:col-span-1">
            <DonutCard title="Guests" subtitle="Housing" dataMap={housingStatusCounts} />
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex justify-between">
              <h3 className="text-green-800 font-medium">Today's Meals</h3>
              <SpringIcon>
                <Utensils className="text-green-500" size={20} />
              </SpringIcon>
            </div>
            <p className="text-3xl font-bold text-green-900 mt-2">{todayMetrics.mealsServed}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex justify-between">
              <h3 className="text-blue-800 font-medium">Today's Showers</h3>
              <SpringIcon>
                <ShowerHead className="text-blue-500" size={20} />
              </SpringIcon>
            </div>
            <p className="text-3xl font-bold text-blue-900 mt-2">{todayMetrics.showersBooked}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex justify-between">
              <h3 className="text-purple-800 font-medium">Today's Laundry</h3>
              <SpringIcon>
                <WashingMachine className="text-purple-500" size={20} />
              </SpringIcon>
            </div>
            <p className="text-3xl font-bold text-purple-900 mt-2">{todayMetrics.laundryLoads}</p>
          </div>
          <div className="bg-sky-50 rounded-lg p-4 border border-sky-100">
            <div className="flex justify-between">
              <h3 className="text-sky-800 font-medium">Today's Bicycle Repairs</h3>
              <SpringIcon>
                <Bike className="text-sky-500" size={20} />
              </SpringIcon>
            </div>
            <p className="text-3xl font-bold text-sky-900 mt-2">{todayMetrics.bicycles}</p>
          </div>
        </Animated.div>
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2"><Calendar size={14} /> Month To Date</h3>
          <Animated.div style={monthGridAnim} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><Utensils size={16} /></SpringIcon> Meals</div>
              <div className="text-2xl font-bold">{monthMetrics.mealsServed}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><ShowerHead size={16} /></SpringIcon> Showers</div>
              <div className="text-2xl font-bold">{monthMetrics.showersBooked}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><WashingMachine size={16} /></SpringIcon> Laundry</div>
              <div className="text-2xl font-bold">{monthMetrics.laundryLoads}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><Scissors size={16} /></SpringIcon> Haircuts</div>
              <div className="text-2xl font-bold">{monthMetrics.haircuts || 0}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><Gift size={16} /></SpringIcon> Holiday</div>
              <div className="text-2xl font-bold">{monthMetrics.holidays || 0}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><Bike size={16} /></SpringIcon> Bicycle Repairs</div>
              <div className="text-2xl font-bold">{monthMetrics.bicycles || 0}</div>
            </div>
          </Animated.div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2"><Calendar size={14} /> Year To Date</h3>
          <Animated.div style={yearGridAnim} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><Utensils size={16} /></SpringIcon> Meals</div>
              <div className="text-2xl font-bold">{yearMetrics.mealsServed}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><ShowerHead size={16} /></SpringIcon> Showers</div>
              <div className="text-2xl font-bold">{yearMetrics.showersBooked}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><WashingMachine size={16} /></SpringIcon> Laundry</div>
              <div className="text-2xl font-bold">{yearMetrics.laundryLoads}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><Scissors size={16} /></SpringIcon> Haircuts</div>
              <div className="text-2xl font-bold">{yearMetrics.haircuts || 0}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><Gift size={16} /></SpringIcon> Holiday</div>
              <div className="text-2xl font-bold">{yearMetrics.holidays || 0}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-1"><SpringIcon><Bike size={16} /></SpringIcon> Bicycle Repairs</div>
              <div className="text-2xl font-bold">{yearMetrics.bicycles || 0}</div>
            </div>
          </Animated.div>
        </div>
      </div>
    </div>
  );

  const renderReportsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
          <Calendar size={18} /> Date Range Reports
        </h2>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={handleDateRangeSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Generate Report
          </button>
        </div>

        {metrics.period && (
          <div className="mt-4 border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Utensils size={16} /> Meals Served
                </div>
                <div className="text-2xl font-bold">{metrics.period.mealsServed}</div>
              </div>

              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <ShowerHead size={16} /> Showers Booked
                </div>
                <div className="text-2xl font-bold">{metrics.period.showersBooked}</div>
              </div>

              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <WashingMachine size={16} /> Laundry Loads
                </div>
                <div className="text-2xl font-bold">{metrics.period.laundryLoads}</div>
              </div>
            </div>
            <Animated.div style={reportsChartAnim} className="mt-4 will-change-transform">
              <TrendLine days={metrics.period.dailyBreakdown} metrics={["meals", "showers", "laundry"]} />
            </Animated.div>

            <div className="mt-4 mb-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-right">Meals</th>
                    <th className="px-4 py-2 text-right">Showers</th>
                    <th className="px-4 py-2 text-right">Laundry</th>
                    <th className="px-4 py-2 text-right">Haircuts</th>
                    <th className="px-4 py-2 text-right">Holiday</th>
                    <th className="px-4 py-2 text-right">Bicycle</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.period.dailyBreakdown.sort((a, b) => b.date.localeCompare(a.date)).map((day) => (
                    <tr key={day.date} className="border-b">
                      <td className="px-4 py-2">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right">{day.meals}</td>
                      <td className="px-4 py-2 text-right">{day.showers}</td>
                      <td className="px-4 py-2 text-right">{day.laundry}</td>
                      <td className="px-4 py-2 text-right">{day.haircuts || 0}</td>
                      <td className="px-4 py-2 text-right">{day.holidays || 0}</td>
                      <td className="px-4 py-2 text-right">{day.bicycles || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={exportMetricsData}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded text-sm"
            >
              <Download size={16} /> Export Date Range Report
            </button>
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Supplies given in range</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['tshirt', 'sleeping_bag', 'backpack'].map(item => {
                  const count = (itemGivenRecords || []).filter(r => {
                    const d = new Date(r.date).toISOString();
                    return r.item === item && d >= new Date(startDate).toISOString() && d <= new Date(endDate).toISOString();
                  }).length;
                  const label = item === 'tshirt' ? 'T-Shirts' : item === 'sleeping_bag' ? 'Sleeping Bags' : 'Backpacks';
                  return (
                    <div key={item} className="bg-gray-50 rounded p-3">
                      <div className="text-gray-600 text-sm">{label}</div>
                      <div className="text-2xl font-bold">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderBatchUploadSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Upload size={20} className="text-purple-600" /> Batch Guest Upload
        </h2>
        <p className="text-gray-600 mb-4">
          Upload multiple guests at once using a CSV file. This feature is restricted to admin users.
        </p>
        <GuestBatchUpload />
      </div>
    </div>
  );

  const renderExportSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
          <FileText size={18} /> Data Export Options
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={exportGuests}
            className="flex items-center justify-center gap-2 bg-blue-100 text-blue-800 px-4 py-3 rounded hover:bg-blue-200 transition-colors"
          >
            <Users size={18} />
            <span>Export Guest List</span>
          </button>

          <button
            onClick={exportServiceData}
            className="flex items-center justify-center gap-2 bg-green-100 text-green-800 px-4 py-3 rounded hover:bg-green-200 transition-colors"
          >
            <FileText size={18} />
            <span>Export Service Records</span>
          </button>

          <button
            onClick={exportDonations}
            className="flex items-center justify-center gap-2 bg-pink-100 text-pink-800 px-4 py-3 rounded hover:bg-pink-200 transition-colors"
          >
            <FileText size={18} />
            <span>Export Donations</span>
          </button>
          <button
            onClick={exportSuppliesData}
            className="flex items-center justify-center gap-2 bg-amber-100 text-amber-800 px-4 py-3 rounded hover:bg-amber-200 transition-colors"
          >
            <FileText size={18} />
            <span>Export Supplies Given</span>
          </button>

          <button
            onClick={exportMetricsData}
            className="flex items-center justify-center gap-2 bg-purple-100 text-purple-800 px-4 py-3 rounded hover:bg-purple-200 transition-colors"
          >
            <BarChart3 size={18} />
            <span>Export Current Metrics</span>
          </button>
        </div>

        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">Export a single guest's service history</h3>
          <div className="flex gap-2 items-center">
            <Selectize
              options={guests.map(g => ({ value: String(g.id), label: `${g.name} (${g.guestId || '-'})` }))}
              value={""}
              onChange={(val) => val && exportGuestMetrics(Number(val))}
              placeholder="Search guest by name or ID…"
              size="sm"
              searchable
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDonationsSection = () => (
    <div className="space-y-6">
      <Donations />
    </div>
  );

  const [resetOptions, setResetOptions] = useState({ local: true, firestore: false, keepGuests: false });
  const [isResetting, setIsResetting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const useFirebase = import.meta.env.VITE_USE_FIREBASE === 'true';

  const localCounts = useMemo(() => ({
    guests: guests?.length || 0,
    meals: mealRecords?.length || 0,
    rvMeals: rvMealRecords?.length || 0,
    ueMeals: unitedEffortMealRecords?.length || 0,
    extraMeals: extraMealRecords?.length || 0,
    dayWorkerMeals: dayWorkerMealRecords?.length || 0,
    lunchBags: lunchBagRecords?.length || 0,
    showers: showerRecords?.length || 0,
    laundry: laundryRecords?.length || 0,
    items: itemGivenRecords?.length || 0,
    haircuts: haircutRecords?.length || 0,
    holidays: holidayRecords?.length || 0,
    bicycles: bicycleRecords?.length || 0,
    donations: donationRecords?.length || 0,
  }), [guests, mealRecords, rvMealRecords, unitedEffortMealRecords, extraMealRecords, dayWorkerMealRecords, lunchBagRecords, showerRecords, laundryRecords, itemGivenRecords, haircutRecords, holidayRecords, bicycleRecords, donationRecords]);
  const renderSystemSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-lg font-medium mb-2 flex items-center gap-2 text-red-700">
          <ShieldAlert size={18} /> System Utilities
        </h2>
        <p className="text-sm text-gray-600 mb-4">Tools for testing and maintenance. Use with caution.</p>

        <div className="border rounded p-3 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
            <AlertTriangle size={16} /> Reset Database
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <p className="text-sm text-red-900">Clears records from this device's storage. If connected to Firestore and enabled, can also clear cloud collections.</p>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${useFirebase ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
              <Cloud size={14} /> Cloud Sync: {useFirebase ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <label className="flex items-center gap-2 text-sm bg-white border rounded px-3 py-2 select-none">
              <input className="h-4 w-4" type="checkbox" checked={resetOptions.local} onChange={e => setResetOptions(o => ({ ...o, local: e.target.checked }))} />
              <span className="leading-none">Clear local data (this device)</span>
            </label>
            <label className={`flex items-center gap-2 text-sm bg-white border rounded px-3 py-2 select-none ${!useFirebase ? 'opacity-60 cursor-not-allowed' : ''}`}
                   title={!useFirebase ? 'Enable Firebase to clear cloud data' : ''}>
              <input className="h-4 w-4" type="checkbox" disabled={!useFirebase} checked={resetOptions.firestore && useFirebase} onChange={e => setResetOptions(o => ({ ...o, firestore: e.target.checked && useFirebase }))} />
              <span className="leading-none">Also clear Firestore data</span>
            </label>
            <label className="flex items-center gap-2 text-sm bg-white border rounded px-3 py-2 select-none">
              <input className="h-4 w-4" type="checkbox" checked={resetOptions.keepGuests} onChange={e => setResetOptions(o => ({ ...o, keepGuests: e.target.checked }))} />
              <span className="leading-none">Keep guest list</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-gray-600">Presets:</span>
            <button onClick={() => setResetOptions({ local: true, firestore: false, keepGuests: false })}
                    className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">Local only</button>
            <button onClick={() => setResetOptions({ local: false, firestore: true, keepGuests: false })}
                    disabled={!useFirebase}
                    className={`text-xs px-2 py-1 rounded ${useFirebase ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-100 text-gray-400'}`}>Cloud only</button>
            <button onClick={() => setResetOptions({ local: true, firestore: true, keepGuests: true })}
                    disabled={!useFirebase}
                    className={`text-xs px-2 py-1 rounded ${useFirebase ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-100 text-gray-400'}`}>Everything (keep guests)</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-700"><HardDrive size={14} /> Local Guests</div>
              <div className="font-semibold">{localCounts.guests}{resetOptions.keepGuests ? ' (kept)' : ''}</div>
            </div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Meals</div><div className="font-semibold">{localCounts.meals}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">RV Meals</div><div className="font-semibold">{localCounts.rvMeals}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">United Effort Meals</div><div className="font-semibold">{localCounts.ueMeals}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Extra Meals</div><div className="font-semibold">{localCounts.extraMeals}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Day Worker Meals</div><div className="font-semibold">{localCounts.dayWorkerMeals}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Lunch Bags</div><div className="font-semibold">{localCounts.lunchBags}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Showers</div><div className="font-semibold">{localCounts.showers}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Laundry</div><div className="font-semibold">{localCounts.laundry}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Items Given</div><div className="font-semibold">{localCounts.items}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Haircuts</div><div className="font-semibold">{localCounts.haircuts}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Holidays</div><div className="font-semibold">{localCounts.holidays}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Bicycles</div><div className="font-semibold">{localCounts.bicycles}</div></div>
            <div className="bg-white border rounded p-2 text-sm flex items-center justify-between"><div className="text-gray-700">Donations</div><div className="font-semibold">{localCounts.donations}</div></div>
          </div>

          <button
            disabled={isResetting || (!resetOptions.local && !resetOptions.firestore)}
            onClick={() => setIsConfirmOpen(true)}
            className={`px-4 py-2 rounded text-sm font-medium ${isResetting ? 'bg-red-300 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          >
            {isResetting ? 'Resetting…' : 'Reset Selected Data'}
          </button>
        </div>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isResetting && setIsConfirmOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl border w-[95%] max-w-md p-4">
            <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
              <AlertTriangle size={18} /> Confirm Reset
            </div>
            <p className="text-sm text-gray-700 mb-3">
              This will permanently delete
              {resetOptions.local && ' local data'}
              {resetOptions.local && resetOptions.firestore ? ' and' : ''}
              {resetOptions.firestore && ' Firestore data'}
              {resetOptions.keepGuests ? ' (guests will be kept)' : ''}.
            </p>
            <div className="bg-gray-50 border rounded p-2 text-xs mb-3">
              <div className="font-medium mb-1">Summary</div>
              <ul className="list-disc ml-4 space-y-1">
                {resetOptions.local && <li>Clear local storage for services, donations, supplies, slots{resetOptions.keepGuests ? ', keeping guests' : ', and guests'}</li>}
                {resetOptions.firestore && <li>Delete documents from Firestore collections (guests {resetOptions.keepGuests ? 'kept' : 'deleted'}, meals, rvMeals, unitedEffortMeals, extraMeals, dayWorkerMeals, lunchBags, showers, laundry, bicycles, holidays, haircuts, itemsGiven, donations)</li>}
              </ul>
            </div>
            <label className="text-sm text-gray-700">Type <span className="font-mono font-semibold">RESET</span> to confirm</label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="RESET" className="w-full border rounded px-3 py-2 text-sm mt-1 mb-3" />
            <div className="flex justify-end gap-2">
              <button disabled={isResetting} onClick={() => setIsConfirmOpen(false)} className="px-3 py-2 text-sm rounded border">Cancel</button>
              <button
                disabled={isResetting || confirmText !== 'RESET'}
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    await resetAllData(resetOptions);
                    toast.success('Database reset complete');
                    setIsConfirmOpen(false);
                    setConfirmText('');
                  } catch (e) {
                    toast.error('Reset failed: ' + (e?.message || 'Unknown error'));
                  } finally {
                    setIsResetting(false);
                  }
                }}
                className={`px-4 py-2 rounded text-sm font-medium ${isResetting || confirmText !== 'RESET' ? 'bg-red-300 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              >
                {isResetting ? 'Resetting…' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Animated.div style={headerAnim} className="mb-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <BarChart3 /> Admin Dashboard
        </h1>
        <p className="text-gray-500">
          Overview of guest check-in metrics and system administration
        </p>
      </Animated.div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 mb-6">
        <nav className="flex flex-wrap gap-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === section.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <SpringIcon>
                  <Icon size={16} />
                </SpringIcon>
                <span className="hidden sm:inline">{section.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {renderSectionContent()}
    </div>
  );
};

export default Dashboard;
