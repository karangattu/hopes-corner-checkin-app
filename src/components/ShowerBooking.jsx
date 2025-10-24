import React, { useEffect, useMemo, useState } from "react";
import {
  ShowerHead,
  Clock,
  X,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Info,
  ClipboardList,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";
import toast from "react-hot-toast";

const humanizeStatus = (status) => {
  if (!status) return "Booked";
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

const formatSlotLabel = (slotTime) => {
  if (!slotTime) return "";
  const [hours, minutes] = slotTime.split(":").map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const toMinutes = (slotTime) => {
  const [hours, minutes] = slotTime.split(":").map(Number);
  return hours * 60 + minutes;
};

const ShowerBooking = () => {
  const {
    showerPickerGuest,
    setShowerPickerGuest,
    allShowerSlots,
    addShowerRecord,
    addShowerWaitlist,
    showerRecords,
    guests,
  } = useAppContext();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const todayString = todayPacificDateString();

  useEffect(() => {
    setError("");
    setSuccess(false);
  }, [showerPickerGuest]);

  const slotsWithDetails = useMemo(() => {
    return allShowerSlots
      .map((slotTime) => {
        const todaysRecords = (showerRecords || []).filter(
          (record) =>
            record.time === slotTime &&
            pacificDateStringFrom(record.date) === todayString &&
            record.status !== "waitlisted",
        );
        const count = todaysRecords.length;
        const guestsInSlot = todaysRecords.map((record) => {
          const guest = guests?.find((g) => g.id === record.guestId);
          return {
            id: record.id,
            name: guest?.name || "Guest",
          };
        });
        const statuses = todaysRecords.map((record) => record.status);
        return {
          slotTime,
          label: formatSlotLabel(slotTime),
          count,
          guests: guestsInSlot,
          statuses,
          isFull: count >= 2,
          isNearlyFull: count === 1,
          sortKey: toMinutes(slotTime),
        };
      })
      .sort((a, b) => {
        if (a.isFull !== b.isFull) return a.isFull ? 1 : -1;
        if (a.isNearlyFull !== b.isNearlyFull) return a.isNearlyFull ? 1 : -1;
        return a.sortKey - b.sortKey;
      });
  }, [allShowerSlots, showerRecords, guests, todayString]);

  const totalCapacity = allShowerSlots.length * 2;
  const occupied = slotsWithDetails.reduce((sum, slot) => sum + slot.count, 0);
  const available = Math.max(totalCapacity - occupied, 0);
  const capacityProgress = Math.min(
    (occupied / Math.max(totalCapacity, 1)) * 100,
    100,
  );
  const allSlotsFull = slotsWithDetails.every((slot) => slot.isFull);
  const nextAvailableSlot = slotsWithDetails.find((slot) => !slot.isFull);

  const waitlistToday = useMemo(
    () =>
      (showerRecords || []).filter(
        (record) =>
          record.status === "waitlisted" &&
          pacificDateStringFrom(record.date) === todayString,
      ),
    [showerRecords, todayString],
  );

  const guestShowerHistory = useMemo(() => {
    if (!showerPickerGuest) return [];
    return (
      showerRecords
        ?.filter((record) => record.guestId === showerPickerGuest.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4) || []
    );
  }, [showerPickerGuest, showerRecords]);

  const statusChipStyles = {
    booked: "bg-blue-100 text-blue-800",
    done: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-700",
    waitlisted: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-indigo-100 text-indigo-800",
  };

  const handleBookShower = (slotTime) => {
    if (!showerPickerGuest) return;

    console.log(
      "handleBookShower called",
      slotTime,
      "guest:",
      showerPickerGuest?.id,
    );

    try {
      addShowerRecord(showerPickerGuest.id, slotTime);
      setSuccess(true);
      setError("");

      setTimeout(() => {
        setSuccess(false);
        setShowerPickerGuest(null);
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to book shower slot");
      setSuccess(false);
    }
  };

  const handleWaitlist = () => {
    if (!showerPickerGuest) return;
    try {
      addShowerWaitlist(showerPickerGuest.id);
      setSuccess(true);
      toast.success("Guest added to shower waitlist");
      setTimeout(() => {
        setSuccess(false);
        setShowerPickerGuest(null);
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to add to waitlist");
    }
  };

  if (!showerPickerGuest) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-3xl lg:max-w-4xl md:max-h-[92vh] h-[88vh] md:h-auto overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-2 duration-300">
        <div className="sticky top-0 bg-gradient-to-br from-sky-50 to-blue-50 border-b border-blue-100 p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white p-2.5 md:p-3 rounded-xl shadow-md">
              <ShowerHead size={22} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                Book a Shower
              </h2>
              <p className="text-xs md:text-sm text-gray-600">
                Schedule for{" "}
                <span className="font-semibold">{showerPickerGuest?.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowerPickerGuest(null)}
            className="text-gray-400 hover:text-gray-600 hover:bg-white/80 p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 text-green-700 rounded flex items-center gap-2">
              <CheckCircle size={18} />
              Shower booking saved!
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 flex gap-3">
            <Sparkles size={20} className="mt-1 shrink-0" />
            <div>
              <p className="font-semibold">Quick overview</p>
              <p className="leading-relaxed">
                Each slot supports two guests. We’ll surface the best available
                options first so you can confirm quickly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <p className="text-xs uppercase text-gray-500 tracking-wide">
                Next availability
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {nextAvailableSlot ? nextAvailableSlot.label : "No slots left"}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                We’ll highlight remaining openings so you can book confidently.
              </p>
            </div>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <p className="text-xs uppercase text-gray-500 tracking-wide">
                Capacity today
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900">
                  {occupied}
                </span>
                <span className="text-sm text-gray-600">/ {totalCapacity}</span>
              </div>
              <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${capacityProgress >= 100 ? "bg-red-400" : capacityProgress >= 70 ? "bg-amber-400" : "bg-blue-500"}`}
                  style={{ width: `${capacityProgress}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <Users size={14} />
                {available > 0
                  ? `${available} spots remaining`
                  : "All shower spots taken"}
              </p>
            </div>
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
              <p className="text-xs uppercase text-gray-500 tracking-wide">
                Waitlist today
              </p>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {waitlistToday.length}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                We’ll queue guests and notify when a slot frees up.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Select Available Time Slot:
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Maximum of 2 guests per time slot
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slotsWithDetails.map((slot) => (
                <button
                  key={slot.slotTime}
                  onClick={() =>
                    !slot.isFull && handleBookShower(slot.slotTime)
                  }
                  disabled={slot.isFull}
                  className={`flex flex-col items-start gap-3 p-4 border rounded-lg transition-all duration-200 text-sm w-full min-h-[100px] ${
                    slot.isFull
                      ? "bg-gray-100 cursor-not-allowed text-gray-500 border-gray-200"
                      : slot.isNearlyFull
                        ? "bg-yellow-50 hover:bg-yellow-100 hover:shadow-md active:scale-98 border-yellow-300 text-gray-800 shadow-sm"
                        : "bg-white hover:bg-blue-50 hover:shadow-md active:scale-98 text-gray-800 hover:border-blue-500 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg sm:text-base font-semibold">
                      {slot.label}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Users size={16} />
                      {slot.count}/2
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 w-full">
                    {slot.guests.length > 0 ? (
                      slot.guests.map((guest) => (
                        <span
                          key={guest.id}
                          className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 max-w-full truncate"
                        >
                          {guest.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                        Available
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {allSlotsFull && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900 space-y-3">
              <div className="flex items-start gap-2">
                <Info size={18} className="mt-0.5" />
                <p>
                  All shower slots are currently full. Add this guest to the
                  waitlist so they’re next in line when a spot opens up.
                </p>
              </div>
              <button
                onClick={handleWaitlist}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
              >
                Add to Waitlist
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ClipboardList size={16} /> Guest shower history
            </h3>
            {guestShowerHistory.length > 0 ? (
              <ul className="space-y-3">
                {guestShowerHistory.map((record) => (
                  <li
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {formatDateTime(record.date)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.time
                          ? formatSlotLabel(record.time)
                          : "Waitlist entry"}
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
                No shower history yet. Book a slot to start the record.
              </div>
            )}
          </div>

          <div className="pb-2">
            <button
              onClick={() => setShowerPickerGuest(null)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-lg flex items-center justify-center gap-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowerBooking;
