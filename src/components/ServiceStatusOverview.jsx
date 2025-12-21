import React, { useMemo } from "react";
import { ShowerHead, WashingMachine, Users, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { useAuth } from "../context/useAuth";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";

/**
 * ServiceStatusOverview - A compact at-a-glance view of today's shower and laundry capacity
 * Designed for check-in users to quickly see availability without searching for a guest
 * Staff and admin users can click on cards to navigate to the Services tab
 */
const ServiceStatusOverview = ({ onShowerClick, onLaundryClick }) => {
  const {
    showerRecords,
    laundryRecords,
    allShowerSlots,
    settings,
  } = useAppContext();
  const { user } = useAuth();

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
    
    // Count all on-site laundry records for today as slots taken
    // We only process a fixed number (maxSlots) per day regardless of status
    const onsiteSlotsTaken = todaysRecords.filter(
      (record) => (record.laundryType === "onsite" || !record.laundryType)
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

  // Check if user can click cards (staff or admin)
  const canClickCards = user?.role && ["staff", "admin"].includes(user.role);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Shower Status */}
        <div 
          onClick={canClickCards ? onShowerClick : undefined}
          className={`rounded-xl border p-4 ${
            canClickCards ? "cursor-pointer transition-all duration-200 hover:shadow-md active:scale-95" : ""
          } ${showerStats.isFull ? "bg-red-50/30 border-red-100" : "bg-blue-50/30 border-blue-100"}`}
          role={canClickCards ? "button" : undefined}
          tabIndex={canClickCards ? 0 : undefined}
          onKeyDown={canClickCards ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onShowerClick?.();
            }
          } : undefined}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${showerStats.isFull ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                <ShowerHead size={18} />
              </div>
              <span className="font-bold text-gray-900 text-sm">Showers</span>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              showerStats.isFull ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"
            }`}>
              {showerStats.isFull ? "FULL" : "OPEN"}
            </div>
          </div>
          
          <div className="bg-white/60 rounded-lg p-2.5 border border-gray-100 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
              {showerStats.available > 0 ? "Available" : "Waitlist"}
            </span>
            <span className={`text-lg font-black ${
              showerStats.available > 0 ? "text-blue-600" : "text-amber-600"
            }`}>
              {showerStats.available > 0 ? showerStats.available : showerStats.waitlisted}
            </span>
          </div>
        </div>

        {/* Laundry Status */}
        <div 
          onClick={canClickCards ? onLaundryClick : undefined}
          className={`rounded-xl border p-4 ${
            canClickCards ? "cursor-pointer transition-all duration-200 hover:shadow-md active:scale-95" : ""
          } ${laundryStats.isFull ? "bg-red-50/30 border-red-100" : "bg-purple-50/30 border-purple-100"}`}
          role={canClickCards ? "button" : undefined}
          tabIndex={canClickCards ? 0 : undefined}
          onKeyDown={canClickCards ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onLaundryClick?.();
            }
          } : undefined}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${laundryStats.isFull ? "bg-red-100 text-red-600" : "bg-purple-100 text-purple-600"}`}>
                <WashingMachine size={18} />
              </div>
              <span className="font-bold text-gray-900 text-sm">Laundry</span>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              laundryStats.isFull ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"
            }`}>
              {laundryStats.isFull ? "FULL" : "OPEN"}
            </div>
          </div>
          
          <div className="bg-white/60 rounded-lg p-2.5 border border-gray-100 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Available</span>
            <span className={`text-lg font-black ${laundryStats.onsiteAvailable > 0 ? "text-purple-600" : "text-gray-400"}`}>
              {laundryStats.onsiteAvailable}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceStatusOverview;
