import React, { useMemo } from "react";
import { ShowerHead, WashingMachine, Users, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";

/**
 * ServiceStatusOverview - A compact at-a-glance view of today's shower and laundry capacity
 * Designed for check-in users to quickly see availability without searching for a guest
 */
const ServiceStatusOverview = () => {
  const {
    showerRecords,
    laundryRecords,
    allShowerSlots,
    settings,
  } = useAppContext();

  const todayString = todayPacificDateString();

  // Calculate shower statistics
  const showerStats = useMemo(() => {
    const todaysRecords = (showerRecords || []).filter(
      (record) =>
        pacificDateStringFrom(record.date) === todayString &&
        record.status !== "waitlisted"
    );
    
    const totalCapacity = (allShowerSlots?.length || 0) * 2;
    const booked = todaysRecords.length;
    const available = Math.max(totalCapacity - booked, 0);
    const waitlisted = (showerRecords || []).filter(
      (record) =>
        record.status === "waitlisted" &&
        pacificDateStringFrom(record.date) === todayString
    ).length;
    const completed = todaysRecords.filter(r => r.status === "done").length;
    
    // Group by time slot to find which slots are full
    const slotCounts = {};
    todaysRecords.forEach(record => {
      if (record.time) {
        slotCounts[record.time] = (slotCounts[record.time] || 0) + 1;
      }
    });
    
    const fullSlots = Object.values(slotCounts).filter(count => count >= 2).length;
    const totalSlots = allShowerSlots?.length || 0;
    const availableSlots = totalSlots - fullSlots;
    
    return {
      totalCapacity,
      booked,
      available,
      waitlisted,
      completed,
      fullSlots,
      availableSlots,
      isFull: available === 0,
      isNearlyFull: available <= 2 && available > 0,
    };
  }, [showerRecords, allShowerSlots, todayString]);

  // Calculate laundry statistics
  const laundryStats = useMemo(() => {
    const maxSlots = settings?.maxOnsiteLaundrySlots ?? 5;
    
    const todaysRecords = (laundryRecords || []).filter(
      (record) => pacificDateStringFrom(record.date) === todayString
    );
    
    // Count active on-site laundry (not picked up yet) as slots taken
    const activeOnsiteStatuses = ["waiting", "washer", "dryer", "done"];
    const onsiteSlotsTaken = todaysRecords.filter(
      (record) => 
        (record.laundryType === "onsite" || !record.laundryType) &&
        activeOnsiteStatuses.includes(record.status)
    ).length;
    
    const onsiteAvailable = Math.max(maxSlots - onsiteSlotsTaken, 0);
    const offsiteCount = todaysRecords.filter(r => r.laundryType === "offsite").length;
    
    // Count by status
    const statusCounts = todaysRecords.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {});
    
    const inProgress = (statusCounts["waiting"] || 0) + 
                       (statusCounts["washer"] || 0) + 
                       (statusCounts["dryer"] || 0);
    const completed = (statusCounts["done"] || 0) + 
                      (statusCounts["picked_up"] || 0) +
                      (statusCounts["returned"] || 0) +
                      (statusCounts["offsite_picked_up"] || 0);
    
    return {
      totalCapacity: maxSlots,
      onsiteBooked: onsiteSlotsTaken,
      onsiteAvailable,
      offsiteCount,
      inProgress,
      completed,
      totalToday: todaysRecords.length,
      isFull: onsiteAvailable === 0,
      isNearlyFull: onsiteAvailable === 1,
    };
  }, [laundryRecords, settings, todayString]);

  const getStatusColor = (isFull, isNearlyFull) => {
    if (isFull) return "text-red-600 bg-red-50 border-red-200";
    if (isNearlyFull) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  const getStatusIcon = (isFull, isNearlyFull) => {
    if (isFull) return <AlertCircle size={14} className="text-red-500" />;
    if (isNearlyFull) return <Clock size={14} className="text-amber-500" />;
    return <CheckCircle size={14} className="text-emerald-500" />;
  };

  const getStatusText = (available, isFull, isNearlyFull) => {
    if (isFull) return "Full";
    if (isNearlyFull) return `${available} left`;
    return `${available} open`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Users size={16} className="text-gray-500" />
          Today's Service Availability
        </h3>
      </div>
      
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Shower Status */}
        <div className={`rounded-lg border p-3 ${getStatusColor(showerStats.isFull, showerStats.isNearlyFull)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShowerHead size={18} className="text-blue-600" />
              <span className="font-semibold text-gray-900 text-sm">Showers</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium">
              {getStatusIcon(showerStats.isFull, showerStats.isNearlyFull)}
              <span>{getStatusText(showerStats.available, showerStats.isFull, showerStats.isNearlyFull)}</span>
            </div>
          </div>
          
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Capacity</span>
              <span className="font-medium text-gray-900">
                {showerStats.booked}/{showerStats.totalCapacity}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  showerStats.isFull ? "bg-red-500" : 
                  showerStats.isNearlyFull ? "bg-amber-500" : "bg-blue-500"
                }`}
                style={{ width: `${Math.min((showerStats.booked / showerStats.totalCapacity) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Slots open: {showerStats.availableSlots}</span>
              {showerStats.waitlisted > 0 && (
                <span className="text-amber-600">Waitlist: {showerStats.waitlisted}</span>
              )}
            </div>
            {showerStats.completed > 0 && (
              <div className="text-emerald-600">
                ✓ {showerStats.completed} done
              </div>
            )}
          </div>
        </div>

        {/* Laundry Status */}
        <div className={`rounded-lg border p-3 ${getStatusColor(laundryStats.isFull, laundryStats.isNearlyFull)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <WashingMachine size={18} className="text-purple-600" />
              <span className="font-semibold text-gray-900 text-sm">Laundry</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium">
              {getStatusIcon(laundryStats.isFull, laundryStats.isNearlyFull)}
              <span>{getStatusText(laundryStats.onsiteAvailable, laundryStats.isFull, laundryStats.isNearlyFull)}</span>
            </div>
          </div>
          
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">On-site slots</span>
              <span className="font-medium text-gray-900">
                {laundryStats.onsiteBooked}/{laundryStats.totalCapacity}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  laundryStats.isFull ? "bg-red-500" : 
                  laundryStats.isNearlyFull ? "bg-amber-500" : "bg-purple-500"
                }`}
                style={{ width: `${Math.min((laundryStats.onsiteBooked / laundryStats.totalCapacity) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-gray-500">
              <span>In progress: {laundryStats.inProgress}</span>
              {laundryStats.offsiteCount > 0 && (
                <span className="text-blue-600">Off-site: {laundryStats.offsiteCount}</span>
              )}
            </div>
            {laundryStats.completed > 0 && (
              <div className="text-emerald-600">
                ✓ {laundryStats.completed} done
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceStatusOverview;
