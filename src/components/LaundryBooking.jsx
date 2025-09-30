import React, { useEffect, useMemo, useState } from "react";
import {
  WashingMachine,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Sparkles,
  Users,
  ClipboardList,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";

const humanizeStatus = (status) => {
  if (!status) return "Pending";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatDateTime = (isoString) => {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoString));
};

const LaundryBooking = () => {
  const {
    laundryPickerGuest,
    setLaundryPickerGuest,
    allLaundrySlots,
    addLaundryRecord,
    laundrySlots,
    laundryRecords,
    guests,
    settings,
    LAUNDRY_STATUS,
  } = useAppContext();

  const [selectedLaundryType, setSelectedLaundryType] = useState("onsite");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [bagNumber, setBagNumber] = useState("");

  const laundryTypes = [
    {
      id: "onsite",
      label: "On-site Laundry",
      description: "Laundry done on premises",
    },
    {
      id: "offsite",
      label: "Off-site Laundry",
      description: "Laundry sent to external service",
    },
  ];

  const todayString = todayPacificDateString();

  useEffect(() => {
    if (!laundryPickerGuest) {
      setSelectedLaundryType("onsite");
    }
    setBagNumber("");
    setError("");
    setSuccess(false);
  }, [laundryPickerGuest]);

  useEffect(() => {
    setBagNumber("");
    setError("");
    setSuccess(false);
  }, [selectedLaundryType]);

  const isSlotBooked = (slotTime) =>
    laundrySlots.some((slot) => slot.time === slotTime);

  const handleBookLaundry = (slotTime = null) => {
    if (!laundryPickerGuest) return;

    try {
      addLaundryRecord(
        laundryPickerGuest.id,
        slotTime,
        selectedLaundryType,
        bagNumber.trim(),
      );
      setSuccess(true);
      setError("");

      setTimeout(() => {
        setSuccess(false);
        setLaundryPickerGuest(null);
        setBagNumber("");
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to book laundry");
      setSuccess(false);
    }
  };

  const onsiteCapacity = settings?.maxOnsiteLaundrySlots ?? 5;
  const onsiteSlotsTaken = useMemo(
    () =>
      laundrySlots.filter(
        (slot) => slot.laundryType === "onsite" || !slot.laundryType,
      ).length,
    [laundrySlots],
  );
  const onsiteSlotsRemaining = Math.max(onsiteCapacity - onsiteSlotsTaken, 0);
  const onsiteProgress = Math.min(
    (onsiteSlotsTaken / Math.max(onsiteCapacity, 1)) * 100,
    100,
  );
  const capacityReached = onsiteSlotsTaken >= onsiteCapacity;

  const offsiteTodayCount = useMemo(
    () =>
      laundryRecords?.filter(
        (record) =>
          record.laundryType === "offsite" &&
          pacificDateStringFrom(record.date) === todayString,
      ).length || 0,
    [laundryRecords, todayString],
  );

  const slotAssignments = useMemo(() => {
    const map = new Map();
    laundrySlots.forEach((slot) => {
      if (!slot.time) return;
      if (slot.laundryType && slot.laundryType !== "onsite") return;
      const guest = guests?.find((g) => g.id === slot.guestId);
      const matchingRecord = laundryRecords?.find(
        (record) =>
          record.guestId === slot.guestId &&
          record.time === slot.time &&
          record.laundryType === "onsite" &&
          pacificDateStringFrom(record.date) === todayString,
      );
      map.set(slot.time, {
        guestName: guest?.name || "Guest",
        status:
          matchingRecord?.status || slot.status || LAUNDRY_STATUS?.WAITING,
      });
    });
    return map;
  }, [laundrySlots, laundryRecords, guests, LAUNDRY_STATUS, todayString]);

  const guestLaundryHistory = useMemo(() => {
    if (!laundryPickerGuest) return [];
    return (
      laundryRecords
        ?.filter((record) => record.guestId === laundryPickerGuest.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4) || []
    );
  }, [laundryPickerGuest, laundryRecords]);

  const statusChipStyles = {
    [LAUNDRY_STATUS?.WAITING]: "bg-amber-100 text-amber-800",
    [LAUNDRY_STATUS?.WASHER]: "bg-blue-100 text-blue-800",
    [LAUNDRY_STATUS?.DRYER]: "bg-sky-100 text-sky-800",
    [LAUNDRY_STATUS?.DONE]: "bg-emerald-100 text-emerald-800",
    [LAUNDRY_STATUS?.PICKED_UP]: "bg-green-200 text-green-900",
    [LAUNDRY_STATUS?.PENDING]: "bg-purple-100 text-purple-800",
    [LAUNDRY_STATUS?.TRANSPORTED]: "bg-indigo-100 text-indigo-800",
    [LAUNDRY_STATUS?.RETURNED]: "bg-teal-100 text-teal-800",
    [LAUNDRY_STATUS?.OFFSITE_PICKED_UP]: "bg-lime-100 text-lime-800",
  };

  if (!laundryPickerGuest) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="sticky top-0 bg-gradient-to-br from-purple-50 to-indigo-50 border-b border-purple-100 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500 text-white p-3 rounded-xl shadow-md">
              <WashingMachine size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Book Laundry Service
              </h2>
              <p className="text-sm text-gray-600">
                Schedule laundry for{" "}
                <span className="font-semibold">
                  {laundryPickerGuest?.name}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setLaundryPickerGuest(null)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 text-green-700 rounded flex items-center gap-2">
              <CheckCircle size={18} />
              Laundry booking saved!
            </div>
          )}

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex gap-3 text-sm text-purple-900">
            <Sparkles size={20} className="mt-1 shrink-0" />
            <div>
              <p className="font-semibold">Laundry concierge overview</p>
              <p className="leading-relaxed">
                Choose the service that fits this guest best. On-site slots are
                limited, while off-site bookings queue for the next courier run.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <p className="text-xs uppercase text-gray-500 tracking-wide">
                On-site capacity
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900">
                  {onsiteSlotsTaken}
                </span>
                <span className="text-sm text-gray-600">
                  / {onsiteCapacity}
                </span>
              </div>
              <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${onsiteProgress >= 100 ? "bg-red-400" : onsiteProgress >= 80 ? "bg-amber-400" : "bg-purple-500"}`}
                  style={{ width: `${onsiteProgress}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <Users size={14} />
                {onsiteSlotsRemaining > 0
                  ? `${onsiteSlotsRemaining} slots remain today`
                  : "All on-site slots taken"}
              </p>
            </div>

            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <p className="text-xs uppercase text-gray-500 tracking-wide">
                Off-site drop-offs
              </p>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {offsiteTodayCount}
              </div>
              <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                Off-site loads are grouped for courier pickup. Add a bag number
                to keep things organized.
              </p>
            </div>

            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <p className="text-xs uppercase text-gray-500 tracking-wide">
                Guest insights
              </p>
              {guestLaundryHistory.length > 0 ? (
                <div className="mt-2 text-sm text-gray-700">
                  <p className="font-medium">
                    Last laundry: {formatDateTime(guestLaundryHistory[0].date)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Status:{" "}
                    <span className="font-medium">
                      {humanizeStatus(guestLaundryHistory[0].status)}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  No previous laundry records.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Select Laundry Type:
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {laundryTypes.map((type) => (
                <div key={type.id} className="relative">
                  <input
                    type="radio"
                    name="laundryType"
                    id={`laundry-type-${type.id}`}
                    className="peer absolute opacity-0"
                    checked={selectedLaundryType === type.id}
                    onChange={() => setSelectedLaundryType(type.id)}
                  />
                  <label
                    htmlFor={`laundry-type-${type.id}`}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedLaundryType === type.id
                        ? "bg-purple-100 border-purple-500 text-purple-900 shadow-sm"
                        : "bg-white hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="font-medium text-base">{type.label}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {type.description}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {selectedLaundryType === "onsite" ? (
            <div className="space-y-4">
              <div className="p-4 border border-purple-100 bg-purple-50 rounded-lg text-sm text-purple-900 flex gap-3">
                <Info size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">On-site wash plan</p>
                  <p className="text-xs text-purple-800">
                    Pick one available slot. Each guest is limited to a single
                    on-site load per day.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bag or ticket number{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={bagNumber}
                  onChange={(event) => setBagNumber(event.target.value)}
                  placeholder="Example: Washer #2 or Bag 14"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Select Available Time Slot:
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Maximum of {onsiteCapacity} on-site laundry slots per day
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {allLaundrySlots.map((slotTime) => {
                    const booked = isSlotBooked(slotTime);
                    const slotInfo = slotAssignments.get(slotTime);

                    return (
                      <button
                        key={slotTime}
                        onClick={() =>
                          !booked &&
                          !capacityReached &&
                          handleBookLaundry(slotTime)
                        }
                        disabled={booked || capacityReached}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 border rounded-lg transition-all duration-200 text-left ${
                          booked || capacityReached
                            ? "bg-gray-100 cursor-not-allowed text-gray-500 border-gray-200"
                            : "bg-white hover:bg-purple-50 text-gray-800 hover:border-purple-500 shadow-sm"
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
                            <Clock size={18} />
                            <span>{slotTime}</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {booked
                              ? "Currently assigned"
                              : "Tap to reserve this hour"}
                          </p>
                        </div>

                        <div className="flex flex-col items-start sm:items-end gap-1">
                          {slotInfo ? (
                            <>
                              <span className="text-sm font-medium text-gray-700">
                                {slotInfo.guestName}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${statusChipStyles[slotInfo.status] || "bg-gray-200 text-gray-700"}`}
                              >
                                {humanizeStatus(slotInfo.status)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                              Available
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-sm text-gray-600">
                <span>
                  <span className="font-semibold">{onsiteSlotsTaken}</span> /{" "}
                  {onsiteCapacity} on-site slots booked today
                </span>
                <button
                  onClick={() => setLaundryPickerGuest(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bag or ticket number{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={bagNumber}
                  onChange={(event) => setBagNumber(event.target.value)}
                  placeholder="Example: Off-site bundle 12"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Off-site laundry doesn't require time slots. Items will be
                  processed over multiple days.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                <button
                  onClick={() => handleBookLaundry()}
                  className="bg-purple-500 hover:bg-purple-600 active:scale-95 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 order-2 sm:order-1 transition-all hover:shadow-md"
                >
                  Book Off-site Laundry
                </button>
                <button
                  onClick={() => setLaundryPickerGuest(null)}
                  className="bg-gray-200 hover:bg-gray-300 active:scale-95 text-gray-800 px-4 py-2 rounded-lg flex items-center justify-center gap-2 order-1 sm:order-2 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ClipboardList size={16} /> Guest laundry history
            </h3>
            {guestLaundryHistory.length > 0 ? (
              <ul className="space-y-3">
                {guestLaundryHistory.map((record) => (
                  <li
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {record.laundryType === "onsite"
                          ? "On-site laundry"
                          : "Off-site laundry"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(record.date)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${statusChipStyles[record.status] || "bg-gray-200 text-gray-700"}`}
                    >
                      {humanizeStatus(record.status)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-500 bg-gray-50">
                No laundry history yet. Book a slot to start the record.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaundryBooking;
