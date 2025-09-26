import React, { useState, useMemo, useCallback } from 'react';
import { 
  Users, 
  Utensils, 
  ShowerHead, 
  WashingMachine, 
  Calendar,
  Target,
  TrendingUp,
  Save,
  X
} from 'lucide-react';
import { Scissors, Gift, Bike } from 'lucide-react';
import { useAppContext } from '../../context/useAppContext';
import DonutCard from '../charts/DonutCard';
import { animated as Animated } from '@react-spring/web';
import { SpringIcon } from '../../utils/animations';

const OverviewDashboard = ({ overviewGridAnim, monthGridAnim, yearGridAnim }) => {
  const {
    getTodayMetrics,
    guests,
    settings,
    updateSettings,
    mealRecords,
    rvMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    haircutRecords,
    holidayRecords
  } = useAppContext();

  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [tempTargets, setTempTargets] = useState({});

  // Update tempTargets when settings change or modal opens
  React.useEffect(() => {
    if (settings.targets) {
      setTempTargets(settings.targets);
    }
  }, [settings.targets]);

  // Initialize tempTargets when modal opens
  const openModal = () => {
    setTempTargets(settings.targets || {
      monthlyMeals: 1500,
      yearlyMeals: 18000,
      monthlyShowers: 300,
      yearlyShowers: 3600,
      monthlyLaundry: 200,
      yearlyLaundry: 2400,
      monthlyBicycles: 50,
      yearlyBicycles: 600,
      monthlyHaircuts: 100,
      yearlyHaircuts: 1200,
      monthlyHolidays: 80,
      yearlyHolidays: 960
    });
    setIsEditingTargets(true);
  };

  // Handle keyboard events for modal
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isEditingTargets) {
        cancelEdit();
      }
    };

    if (isEditingTargets) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isEditingTargets, cancelEdit]);

  const todayMetrics = getTodayMetrics();

  // Calculate housing status breakdown
  const housingStatusCounts = useMemo(() => {
    return guests.reduce((acc, guest) => {
      const status = guest.housingStatus || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [guests]);

  // Calculate month and year metrics with progress tracking
  const { monthMetrics, yearMetrics } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const isCurrentMonth = (date) => {
      const d = new Date(date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };
    
    const isCurrentYear = (date) => {
      const d = new Date(date);
      return d.getFullYear() === currentYear;
    };

    const monthMeals = [...mealRecords, ...rvMealRecords, ...unitedEffortMealRecords, ...extraMealRecords, ...dayWorkerMealRecords]
      .filter(r => isCurrentMonth(r.date))
      .reduce((sum, r) => sum + (r.count || 0), 0);

    const yearMeals = [...mealRecords, ...rvMealRecords, ...unitedEffortMealRecords, ...extraMealRecords, ...dayWorkerMealRecords]
      .filter(r => isCurrentYear(r.date))
      .reduce((sum, r) => sum + (r.count || 0), 0);

    const monthShowers = showerRecords.filter(r => isCurrentMonth(r.date)).length;
    const yearShowers = showerRecords.filter(r => isCurrentYear(r.date)).length;

    const monthLaundry = laundryRecords.filter(r => isCurrentMonth(r.date)).length;
    const yearLaundry = laundryRecords.filter(r => isCurrentYear(r.date)).length;

    const monthBicycles = bicycleRecords.filter(r => isCurrentMonth(r.date)).length;
    const yearBicycles = bicycleRecords.filter(r => isCurrentYear(r.date)).length;

    const monthHaircuts = haircutRecords.filter(r => isCurrentMonth(r.date)).length;
    const yearHaircuts = haircutRecords.filter(r => isCurrentYear(r.date)).length;

    const monthHolidays = holidayRecords.filter(r => isCurrentMonth(r.date)).length;
    const yearHolidays = holidayRecords.filter(r => isCurrentYear(r.date)).length;

    return {
      monthMetrics: {
        mealsServed: monthMeals,
        showersBooked: monthShowers,
        laundryLoads: monthLaundry,
        bicycles: monthBicycles,
        haircuts: monthHaircuts,
        holidays: monthHolidays
      },
      yearMetrics: {
        mealsServed: yearMeals,
        showersBooked: yearShowers,
        laundryLoads: yearLaundry,
        bicycles: yearBicycles,
        haircuts: yearHaircuts,
        holidays: yearHolidays
      }
    };
  }, [mealRecords, rvMealRecords, unitedEffortMealRecords, extraMealRecords, dayWorkerMealRecords, showerRecords, laundryRecords, bicycleRecords, haircutRecords, holidayRecords]);

  const calculateProgress = (current, target) => {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (progress) => {
    if (progress >= 90) return 'text-green-600';
    if (progress >= 70) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const handleTargetChange = (field, value) => {
    setTempTargets(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  const saveTargets = useCallback(() => {
    updateSettings({ targets: tempTargets });
    setIsEditingTargets(false);
  }, [tempTargets, updateSettings]);

  const cancelEdit = useCallback(() => {
    setTempTargets(settings.targets || {});
    setIsEditingTargets(false);
  }, [settings.targets]);

  // Handle backdrop click to close modal
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      cancelEdit();
    }
  }, [cancelEdit]);

  const MetricCard = ({ title, icon, value, target, colorClass = 'blue' }) => {
    const progress = calculateProgress(value, target);
    const progressColor = getProgressColor(progress);
    
    const colorClasses = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800', value: 'text-blue-900', icon: 'text-blue-500', progress: 'bg-blue-200', bar: 'bg-blue-500' },
      green: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-800', value: 'text-green-900', icon: 'text-green-500', progress: 'bg-green-200', bar: 'bg-green-500' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-800', value: 'text-purple-900', icon: 'text-purple-500', progress: 'bg-purple-200', bar: 'bg-purple-500' },
      sky: { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-800', value: 'text-sky-900', icon: 'text-sky-500', progress: 'bg-sky-200', bar: 'bg-sky-500' },
      yellow: { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-800', value: 'text-yellow-900', icon: 'text-yellow-500', progress: 'bg-yellow-200', bar: 'bg-yellow-500' },
      pink: { bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-800', value: 'text-pink-900', icon: 'text-pink-500', progress: 'bg-pink-200', bar: 'bg-pink-500' }
    };
    
    const colors = colorClasses[colorClass] || colorClasses.blue;
    const IconComponent = icon;

    return (
      <div className={`${colors.bg} rounded-lg p-4 ${colors.border} border relative overflow-hidden`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className={`${colors.text} font-medium text-sm mb-1`}>{title}</h3>
            <p className={`text-2xl font-bold ${colors.value}`}>{value.toLocaleString()}</p>
          </div>
          <SpringIcon>
            <IconComponent className={colors.icon} size={20} />
          </SpringIcon>
        </div>
        
        {target && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className={colors.text}>Target: {target.toLocaleString()}</span>
              <span className={progressColor}>{progress.toFixed(0)}%</span>
            </div>
            <div className={`w-full ${colors.progress} rounded-full h-2`}>
              <div 
                className={`${colors.bar} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const TargetEditModal = () => {
    if (!isEditingTargets) return null;

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target size={20} />
              Edit Monthly & Yearly Targets
            </h2>
            <button 
              onClick={cancelEdit} 
              className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Monthly Targets</h3>
              <div className="space-y-4">
                {[
                  { key: 'monthlyMeals', label: 'Meals' },
                  { key: 'monthlyShowers', label: 'Showers' },
                  { key: 'monthlyLaundry', label: 'Laundry' },
                  { key: 'monthlyBicycles', label: 'Bicycle Repairs' },
                  { key: 'monthlyHaircuts', label: 'Haircuts' },
                  { key: 'monthlyHolidays', label: 'Holiday Services' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label htmlFor={key} className="flex-1 text-sm font-medium">{label}</label>
                    <input
                      id={key}
                      type="number"
                      value={tempTargets[key] || ''}
                      onChange={(e) => handleTargetChange(key, e.target.value)}
                      className="w-24 px-2 py-1 border rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Yearly Targets</h3>
              <div className="space-y-4">
                {[
                  { key: 'yearlyMeals', label: 'Meals' },
                  { key: 'yearlyShowers', label: 'Showers' },
                  { key: 'yearlyLaundry', label: 'Laundry' },
                  { key: 'yearlyBicycles', label: 'Bicycle Repairs' },
                  { key: 'yearlyHaircuts', label: 'Haircuts' },
                  { key: 'yearlyHolidays', label: 'Holiday Services' }
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label htmlFor={key} className="flex-1 text-sm font-medium">{label}</label>
                    <input
                      id={key}
                      type="number"
                      value={tempTargets[key] || ''}
                      onChange={(e) => handleTargetChange(key, e.target.value)}
                      className="w-32 px-2 py-1 border rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveTargets}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500"
            >
              <Save size={16} />
              Save Targets
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header with Target Management */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Monitor daily operations and track progress toward your goals</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-fit"
        >
          <Target size={16} />
          Manage Targets
        </button>
      </div>

      {/* Today's Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={18} />
          Today's Activity
        </h2>
        <Animated.div style={overviewGridAnim} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-blue-800 font-medium text-sm">Guests Registered</h3>
                <p className="text-2xl font-bold text-blue-900 mt-1">{guests.length}</p>
              </div>
              <SpringIcon>
                <Users className="text-blue-500" size={20} />
              </SpringIcon>
            </div>
            <div className="text-sm text-blue-700 max-h-24 overflow-y-auto pr-1">
              {Object.entries(housingStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span>{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="hidden sm:block">
            <DonutCard title="Guests" subtitle="Housing Status" dataMap={housingStatusCounts} />
          </div>
          
          <MetricCard
            title="Today's Meals"
            icon={Utensils}
            value={todayMetrics.mealsServed}
            colorClass="green"
          />
          
          <MetricCard
            title="Today's Showers"
            icon={ShowerHead}
            value={todayMetrics.showersBooked}
            colorClass="blue"
          />
        </Animated.div>
      </div>

      {/* Monthly Progress */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={18} />
          Monthly Progress
        </h2>
        <Animated.div style={monthGridAnim} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Meals"
            icon={Utensils}
            value={monthMetrics.mealsServed}
            target={settings.targets?.monthlyMeals}
            period="month"
            colorClass="green"
          />
          <MetricCard
            title="Showers"
            icon={ShowerHead}
            value={monthMetrics.showersBooked}
            target={settings.targets?.monthlyShowers}
            period="month"
            colorClass="blue"
          />
          <MetricCard
            title="Laundry"
            icon={WashingMachine}
            value={monthMetrics.laundryLoads}
            target={settings.targets?.monthlyLaundry}
            period="month"
            colorClass="purple"
          />
          <MetricCard
            title="Bicycles"
            icon={Bike}
            value={monthMetrics.bicycles}
            target={settings.targets?.monthlyBicycles}
            period="month"
            colorClass="sky"
          />
          <MetricCard
            title="Haircuts"
            icon={Scissors}
            value={monthMetrics.haircuts}
            target={settings.targets?.monthlyHaircuts}
            period="month"
            colorClass="yellow"
          />
          <MetricCard
            title="Holiday"
            icon={Gift}
            value={monthMetrics.holidays}
            target={settings.targets?.monthlyHolidays}
            period="month"
            colorClass="pink"
          />
        </Animated.div>
      </div>

      {/* Yearly Progress */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar size={18} />
          Yearly Progress
        </h2>
        <Animated.div style={yearGridAnim} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Meals"
            icon={Utensils}
            value={yearMetrics.mealsServed}
            target={settings.targets?.yearlyMeals}
            period="year"
            colorClass="green"
          />
          <MetricCard
            title="Showers"
            icon={ShowerHead}
            value={yearMetrics.showersBooked}
            target={settings.targets?.yearlyShowers}
            period="year"
            colorClass="blue"
          />
          <MetricCard
            title="Laundry"
            icon={WashingMachine}
            value={yearMetrics.laundryLoads}
            target={settings.targets?.yearlyLaundry}
            period="year"
            colorClass="purple"
          />
          <MetricCard
            title="Bicycles"
            icon={Bike}
            value={yearMetrics.bicycles}
            target={settings.targets?.yearlyBicycles}
            period="year"
            colorClass="sky"
          />
          <MetricCard
            title="Haircuts"
            icon={Scissors}
            value={yearMetrics.haircuts}
            target={settings.targets?.yearlyHaircuts}
            period="year"
            colorClass="yellow"
          />
          <MetricCard
            title="Holiday"
            icon={Gift}
            value={yearMetrics.holidays}
            target={settings.targets?.yearlyHolidays}
            period="year"
            colorClass="pink"
          />
        </Animated.div>
      </div>

      <TargetEditModal />
    </div>
  );
};

export default OverviewDashboard;