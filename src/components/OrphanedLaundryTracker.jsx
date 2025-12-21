import React, { useMemo, useState, useCallback } from "react";
import {
  WashingMachine,
  Clock,
  CheckCircle,
  Package,
  Wind,
  Truck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
  User,
  Hash,
  Search,
  Filter,
  ArrowUpDown,
  X,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";
import toast from "react-hot-toast";

/**
 * OrphanedLaundryTracker - Shows all laundry from previous dates that hasn't been picked up yet
 * Helps ensure no laundry loads are orphaned by providing visibility into pending pickups
 * Allows staff to mark items as picked up directly from this view
 */
const OrphanedLaundryTracker = () => {
  const {
    laundryRecords,
    guests,
    LAUNDRY_STATUS,
    updateLaundryStatus,
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("days-desc"); // days-desc, days-asc, name, bag
  const [typeFilter, setTypeFilter] = useState("all"); // all, onsite, offsite
  const [expandedRows, setExpandedRows] = useState({});

  const todayString = todayPacificDateString();

  // Calculate days since service date
  const getDaysSince = useCallback((dateString) => {
    if (!dateString) return 0;
    const [year, month, day] = todayString.split("-").map(Number);
    const today = new Date(year, month - 1, day);
    
    const serviceDateStr = pacificDateStringFrom(dateString);
    const [sYear, sMonth, sDay] = serviceDateStr.split("-").map(Number);
    const serviceDate = new Date(sYear, sMonth - 1, sDay);
    
    const diffTime = today.getTime() - serviceDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [todayString]);

  // Format date for display
  const formatDateLabel = useCallback((dateString) => {
    if (!dateString) return "Unknown";
    const serviceDateStr = pacificDateStringFrom(dateString);
    const [year, month, day] = serviceDateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, []);

  // Statuses that indicate laundry is NOT picked up yet (for onsite)
  const onsiteUnpickedStatuses = useMemo(() => [
    LAUNDRY_STATUS?.WAITING,
    LAUNDRY_STATUS?.WASHER,
    LAUNDRY_STATUS?.DRYER,
    LAUNDRY_STATUS?.DONE,
  ], [LAUNDRY_STATUS]);

  // Statuses that indicate laundry is NOT picked up yet (for offsite)
  const offsiteUnpickedStatuses = useMemo(() => [
    LAUNDRY_STATUS?.PENDING,
    LAUNDRY_STATUS?.TRANSPORTED,
    LAUNDRY_STATUS?.RETURNED,
  ], [LAUNDRY_STATUS]);

  // Get all unpicked laundry from previous dates
  const orphanedLaundry = useMemo(() => {
    if (!laundryRecords || !Array.isArray(laundryRecords)) return [];

    return laundryRecords
      .filter((record) => {
        // Must be from a previous date (not today)
        const recordDateStr = pacificDateStringFrom(record.date);
        if (recordDateStr >= todayString) return false;

        // Must not be cancelled
        if (record.status === LAUNDRY_STATUS?.CANCELLED) return false;

        const isOffsite = record.laundryType === "offsite" || record.offsite;

        // Check if it's in an unpicked status
        if (isOffsite) {
          return offsiteUnpickedStatuses.includes(record.status);
        } else {
          return onsiteUnpickedStatuses.includes(record.status);
        }
      })
      .map((record) => {
        const guest = guests?.find((g) => g.id === record.guestId);
        const legalName =
          guest?.name ||
          `${guest?.firstName || ""} ${guest?.lastName || ""}`.trim() ||
          "Unknown Guest";
        const preferredName = (guest?.preferredName || "").trim();
        const displayName =
          preferredName && preferredName.toLowerCase() !== legalName.toLowerCase()
            ? `${preferredName} (${legalName})`
            : legalName;
        const isOffsite = record.laundryType === "offsite" || record.offsite;

        return {
          ...record,
          guestName: displayName,
          guestLegalName: legalName,
          daysSince: getDaysSince(record.date),
          dateLabel: formatDateLabel(record.date),
          isOffsite,
        };
      });
  }, [
    laundryRecords,
    guests,
    todayString,
    LAUNDRY_STATUS,
    onsiteUnpickedStatuses,
    offsiteUnpickedStatuses,
    getDaysSince,
    formatDateLabel,
  ]);

  // Apply filters and sorting
  const filteredAndSortedLaundry = useMemo(() => {
    let result = [...orphanedLaundry];

    // Apply type filter
    if (typeFilter === "onsite") {
      result = result.filter((r) => !r.isOffsite);
    } else if (typeFilter === "offsite") {
      result = result.filter((r) => r.isOffsite);
    }

    // Apply search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.guestName.toLowerCase().includes(search) ||
          (r.bagNumber && String(r.bagNumber).toLowerCase().includes(search))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "days-desc":
          return b.daysSince - a.daysSince;
        case "days-asc":
          return a.daysSince - b.daysSince;
        case "name":
          return a.guestName.localeCompare(b.guestName);
        case "bag": {
          const bagA = a.bagNumber || "";
          const bagB = b.bagNumber || "";
          return String(bagA).localeCompare(String(bagB));
        }
        default:
          return b.daysSince - a.daysSince;
      }
    });

    return result;
  }, [orphanedLaundry, typeFilter, searchTerm, sortBy]);

  // Mark laundry as picked up
  const handleMarkPickedUp = useCallback(
    async (record) => {
      const newStatus = record.isOffsite
        ? LAUNDRY_STATUS?.OFFSITE_PICKED_UP
        : LAUNDRY_STATUS?.PICKED_UP;

      const success = await updateLaundryStatus(record.id, newStatus);
      if (success) {
        toast.success(`${record.guestName}'s laundry marked as picked up`);
      } else {
        toast.error("Failed to update laundry status");
      }
    },
    [updateLaundryStatus, LAUNDRY_STATUS]
  );

  // Toggle row expansion
  const toggleRow = (recordId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  // Status badge component
  const getStatusBadge = (status) => {
    const statusConfig = {
      [LAUNDRY_STATUS?.WAITING]: {
        icon: Clock,
        label: "Waiting",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      },
      [LAUNDRY_STATUS?.WASHER]: {
        icon: WashingMachine,
        label: "Washer",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      },
      [LAUNDRY_STATUS?.DRYER]: {
        icon: Wind,
        label: "Dryer",
        className: "bg-purple-100 text-purple-700 border-purple-200",
      },
      [LAUNDRY_STATUS?.DONE]: {
        icon: Package,
        label: "Ready",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      [LAUNDRY_STATUS?.PENDING]: {
        icon: Clock,
        label: "Pending",
        className: "bg-amber-100 text-amber-700 border-amber-200",
      },
      [LAUNDRY_STATUS?.TRANSPORTED]: {
        icon: Truck,
        label: "In Transit",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      },
      [LAUNDRY_STATUS?.RETURNED]: {
        icon: Package,
        label: "Returned",
        className: "bg-teal-100 text-teal-700 border-teal-200",
      },
    };

    const config = statusConfig[status] || {
      icon: Clock,
      label: status || "Unknown",
      className: "bg-gray-100 text-gray-600 border-gray-200",
    };
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.className}`}
      >
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  // Days badge with urgency coloring
  const getDaysBadge = (daysSince) => {
    let urgencyClass = "bg-gray-100 text-gray-600 border-gray-200";
    let urgencyIcon = null;

    if (daysSince >= 7) {
      urgencyClass = "bg-red-100 text-red-700 border-red-300";
      urgencyIcon = <AlertTriangle size={12} className="text-red-500" />;
    } else if (daysSince >= 3) {
      urgencyClass = "bg-orange-100 text-orange-700 border-orange-300";
    } else if (daysSince >= 1) {
      urgencyClass = "bg-amber-100 text-amber-700 border-amber-300";
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${urgencyClass}`}
      >
        {urgencyIcon}
        {daysSince === 0 ? "Today" : daysSince === 1 ? "1 day" : `${daysSince} days`}
      </span>
    );
  };

  // Statistics
  const stats = useMemo(() => {
    const onsiteCount = orphanedLaundry.filter((r) => !r.isOffsite).length;
    const offsiteCount = orphanedLaundry.filter((r) => r.isOffsite).length;
    const urgentCount = orphanedLaundry.filter((r) => r.daysSince >= 7).length;
    const warningCount = orphanedLaundry.filter(
      (r) => r.daysSince >= 3 && r.daysSince < 7
    ).length;

    return { total: orphanedLaundry.length, onsiteCount, offsiteCount, urgentCount, warningCount };
  }, [orphanedLaundry]);

  if (stats.total === 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border-2 border-emerald-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <CheckCircle size={24} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-900 text-lg">All Caught Up!</h3>
            <p className="text-emerald-700 text-sm">
              No orphaned laundry from previous days
            </p>
          </div>
        </div>
        <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
          All laundry from previous service days has been picked up. Great job keeping things organized!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-amber-50 via-white to-orange-50 px-4 py-4 border-b border-amber-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                Pending Pickup
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {stats.total} item{stats.total !== 1 ? "s" : ""}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Laundry from previous days awaiting pickup
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {stats.urgentCount > 0 && (
              <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                <AlertTriangle size={10} />
                {stats.urgentCount} urgent
              </span>
            )}
            {stats.warningCount > 0 && (
              <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-semibold">
                {stats.warningCount} attention
              </span>
            )}
            <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">
              {stats.onsiteCount} on-site
            </span>
            <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
              {stats.offsiteCount} off-site
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by guest name or bag number..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">All Types</option>
              <option value="onsite">On-site Only</option>
              <option value="offsite">Off-site Only</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="days-desc">Oldest First</option>
              <option value="days-asc">Newest First</option>
              <option value="name">By Name</option>
              <option value="bag">By Bag #</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {filteredAndSortedLaundry.length === 0 ? (
          <div className="p-8 text-center">
            <Search size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">No matching laundry found</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("all");
              }}
              className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredAndSortedLaundry.map((record) => {
            const isExpanded = expandedRows[record.id];

            return (
              <div
                key={record.id}
                className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                  record.daysSince >= 7 ? "bg-red-50/30" : record.daysSince >= 3 ? "bg-orange-50/30" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Guest Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleRow(record.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          {record.guestName}
                        </span>
                        {record.isOffsite && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            OFFSITE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {record.dateLabel}
                        </span>
                        {record.bagNumber && (
                          <span className="flex items-center gap-1 text-purple-600 font-medium">
                            <Hash size={10} />
                            {record.bagNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status & Days */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getDaysBadge(record.daysSince)}
                    {getStatusBadge(record.status)}
                  </div>
                </div>

                {/* Expanded Details & Action */}
                {isExpanded && (
                  <div className="mt-3 ml-10 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 text-xs text-gray-600">
                        <p className="flex items-center gap-2">
                          <User size={12} className="text-gray-400" />
                          <span className="font-medium">Guest:</span> {record.guestName}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar size={12} className="text-gray-400" />
                          <span className="font-medium">Service Date:</span> {record.dateLabel}
                        </p>
                        {record.bagNumber && (
                          <p className="flex items-center gap-2">
                            <Hash size={12} className="text-gray-400" />
                            <span className="font-medium">Bag Number:</span> {record.bagNumber}
                          </p>
                        )}
                        <p className="flex items-center gap-2">
                          <Clock size={12} className="text-gray-400" />
                          <span className="font-medium">Days Since Service:</span>{" "}
                          <span className={record.daysSince >= 7 ? "text-red-600 font-bold" : ""}>
                            {record.daysSince} day{record.daysSince !== 1 ? "s" : ""}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          {record.isOffsite ? (
                            <Truck size={12} className="text-blue-500" />
                          ) : (
                            <WashingMachine size={12} className="text-purple-500" />
                          )}
                          <span className="font-medium">Type:</span>{" "}
                          {record.isOffsite ? "Off-site Laundry" : "On-site Laundry"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleMarkPickedUp(record)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm hover:shadow-md"
                      >
                        <CheckCircle size={16} />
                        Mark as Picked Up
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {filteredAndSortedLaundry.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
          <p className="flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-500" />
            Showing {filteredAndSortedLaundry.length} of {stats.total} pending pickup
            {stats.urgentCount > 0 && (
              <span className="text-red-600 font-medium">
                • {stats.urgentCount} item{stats.urgentCount !== 1 ? "s" : ""} 7+ days old
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default OrphanedLaundryTracker;
