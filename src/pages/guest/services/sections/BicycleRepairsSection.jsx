import { useMemo } from "react";
import toast from "react-hot-toast";
import {
  Bike,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle2Icon,
} from "lucide-react";
import BicycleKanban from "../../../../components/lanes/BicycleKanban";
import { BICYCLE_REPAIR_TYPES } from "../utils";

const BicycleRepairsSection = ({
  bicycleRepairs,
  bicycleViewMode,
  onChangeViewMode,
  guests,
  updateBicycleRecord,
  deleteBicycleRecord,
  setBicycleStatus,
  moveBicycleRecord,
  expandedCompletedBicycleCards,
  onToggleCompletedCard,
  BICYCLE_REPAIR_STATUS,
  getGuestNameDetails,
  bicycleViewDate,
  onPreviousDate,
  onNextDate,
  formatServiceDayLabel,
  today,
}) => {
  const sortedBicycleRepairs = useMemo(
    () =>
      [...(bicycleRepairs || [])].sort(
        (a, b) => (b.priority || 0) - (a.priority || 0),
      ),
    [bicycleRepairs],
  );

  const isViewingToday = bicycleViewDate === today;
  const isViewingPast = bicycleViewDate < today;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bike className="text-sky-600" size={22} />
            <span>{isViewingToday ? "Today's" : ""} Bicycle Repairs</span>
          </h2>
          {/* Date navigation controls */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={onPreviousDate}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Previous day"
              title="Go to previous day"
            >
              <ChevronLeft size={18} />
            </button>
            <span className={`text-sm font-medium ${isViewingPast ? 'text-amber-600' : 'text-gray-700'}`}>
              {formatServiceDayLabel(bicycleViewDate)}
              {isViewingPast && (
                <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  Past
                </span>
              )}
            </span>
            <button
              onClick={onNextDate}
              disabled={isViewingToday}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next day"
              title={isViewingToday ? "Already viewing today" : "Go to next day"}
            >
              <ChevronRight size={18} />
            </button>
            {isViewingPast && (
              <button
                onClick={() => {
                  // Reset to today by calling onNextDate enough times or directly setting
                  // We'll call the parent to handle this more directly
                  let current = bicycleViewDate;
                  while (current < today) {
                    onNextDate();
                    const [y, m, d] = current.split("-").map(Number);
                    const date = new Date(y, m - 1, d);
                    date.setDate(date.getDate() + 1);
                    current = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  }
                }}
                className="ml-2 text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline"
              >
                Jump to Today
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {bicycleRepairs.length} repair
            {bicycleRepairs.length !== 1 ? "s" : ""} logged {isViewingToday ? "today" : "on this day"}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onChangeViewMode("kanban")}
            className={`px-4 py-2 text-sm font-medium rounded transition-all ${
              bicycleViewMode === "kanban"
                ? "bg-white text-sky-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => onChangeViewMode("list")}
            className={`px-4 py-2 text-sm font-medium rounded transition-all ${
              bicycleViewMode === "list"
                ? "bg-white text-sky-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {bicycleViewMode === "kanban" ? (
        <BicycleKanban
          bicycleRecords={bicycleRepairs}
          guests={guests}
          updateBicycleRecord={updateBicycleRecord}
          deleteBicycleRecord={deleteBicycleRecord}
          setBicycleStatus={setBicycleStatus}
          repairTypes={BICYCLE_REPAIR_TYPES}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bike className="text-sky-600" size={20} /> <span>Repair List</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="bg-sky-100 text-sky-800 text-xs font-medium px-3 py-1 rounded-full">
                {sortedBicycleRepairs.length} repairs
              </span>
            </div>
          </div>
          {sortedBicycleRepairs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No bicycle repairs logged {isViewingToday ? "today" : "on this day"}. {isViewingToday ? "Use the Bicycle button when searching for a guest to add one." : "Navigate to today to add new repairs."}
            </p>
          ) : (
            <ul className="space-y-3">
              {sortedBicycleRepairs.map((rec, idx) => {
                const nameDetails = getGuestNameDetails(rec.guestId);
                const guestBikeDescription =
                  nameDetails.guest?.bicycleDescription?.trim();
                const isDone = rec.status === BICYCLE_REPAIR_STATUS.DONE;
                const isExpanded =
                  !isDone || expandedCompletedBicycleCards[rec.id];

                return (
                  <li key={rec.id} className="border rounded-md p-3 bg-white">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                            <span>{nameDetails.primaryName}</span>
                            {nameDetails.hasPreferred && (
                              <span className="text-xs text-gray-500">
                                (Legal: {nameDetails.legalName})
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${
                                isDone
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                  : "border-sky-200 bg-sky-50 text-sky-600"
                              }`}
                            >
                              {isDone ? "Done" : "Active"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                            <span>Priority {idx + 1}</span>
                            {isDone ? (
                              <span>Completed</span>
                            ) : (
                              <span>Needs attention</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          {isDone && (
                            <button
                              type="button"
                              onClick={() => onToggleCompletedCard(rec.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
                            >
                              {isExpanded ? (
                                <>
                                  Hide details <ChevronUp size={12} />
                                </>
                              ) : (
                                <>
                                  Show details <ChevronDown size={12} />
                                </>
                              )}
                            </button>
                          )}
                          {isDone ? (
                            <button
                              type="button"
                              onClick={() =>
                                setBicycleStatus(
                                  rec.id,
                                  BICYCLE_REPAIR_STATUS.PENDING,
                                )
                              }
                              className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Reopen
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => moveBicycleRecord(rec.id, "up")}
                                disabled={idx === 0}
                                className="text-xs px-2 py-1 border rounded disabled:opacity-30"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  moveBicycleRecord(rec.id, "down")
                                }
                                disabled={idx === sortedBicycleRepairs.length - 1}
                                className="text-xs px-2 py-1 border rounded disabled:opacity-30"
                              >
                                ↓
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              deleteBicycleRecord(rec.id);
                              toast.success("Deleted");
                            }}
                            className="text-xs px-2 py-1 border rounded text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Bike size={14} className="text-sky-500" />
                        {guestBikeDescription ? (
                          <span className="text-gray-600">
                            {guestBikeDescription}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">
                            No bicycle description on file — edit the guest
                            profile to add one.
                          </span>
                        )}
                      </div>
                      {isDone && !isExpanded ? (
                        <div className="flex flex-col gap-1 text-xs text-gray-500">
                          <div className="inline-flex items-center gap-2 font-semibold text-emerald-600">
                            <CheckCircle2Icon size={14} /> Completed — expand to
                            adjust details.
                          </div>
                          {guestBikeDescription && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Bike:
                              </span>{" "}
                              {guestBikeDescription}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-gray-600">
                              Repair
                              {(rec.repairTypes?.length || 0) > 1 ? "s" : ""}:
                            </span>{" "}
                            {rec.repairTypes?.length > 0
                              ? rec.repairTypes.join(", ")
                              : rec.repairType || "—"}
                            {(rec.repairTypes?.length || 0) > 1 && (
                              <span className="ml-1 text-xs text-sky-600 font-medium">
                                ({rec.repairTypes.length} services)
                              </span>
                            )}
                          </div>
                          {rec.notes && (
                            <div>
                              <span className="font-semibold text-gray-600">
                                Notes:
                              </span>{" "}
                              {rec.notes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 mt-1">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Repair Types (select all that apply)
                            </label>
                            <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                              {BICYCLE_REPAIR_TYPES.map((type) => (
                                <label
                                  key={type}
                                  className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(
                                      rec.repairTypes || [rec.repairType]
                                    ).includes(type)}
                                    onChange={(event) => {
                                      const currentTypes = rec.repairTypes || [
                                        rec.repairType,
                                      ];
                                      const newTypes = event.target.checked
                                        ? [...currentTypes, type]
                                        : currentTypes.filter((t) => t !== type);
                                      updateBicycleRecord(rec.id, {
                                        repairTypes: newTypes,
                                      });
                                    }}
                                    className="w-3 h-3 text-sky-600 border-gray-300 rounded"
                                  />
                                  <span>{type}</span>
                                </label>
                              ))}
                            </div>
                            {(rec.repairTypes?.length || 0) > 0 && (
                              <div className="mt-1 text-xs text-sky-700 font-medium">
                                {rec.repairTypes.length} type
                                {rec.repairTypes.length > 1 ? "s" : ""} selected
                                = {rec.repairTypes.length} service
                                {rec.repairTypes.length > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Status
                            </label>
                            <select
                              value={rec.status || BICYCLE_REPAIR_STATUS.PENDING}
                              onChange={(event) =>
                                setBicycleStatus(rec.id, event.target.value)
                              }
                              className="w-full border rounded px-2 py-1 text-sm"
                            >
                              <option value={BICYCLE_REPAIR_STATUS.PENDING}>
                                Pending
                              </option>
                              <option value={BICYCLE_REPAIR_STATUS.IN_PROGRESS}>
                                Being Worked On
                              </option>
                              <option value={BICYCLE_REPAIR_STATUS.DONE}>
                                Done
                              </option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Notes {rec.repairType === "Other" && "(specify)"}
                            </label>
                            <input
                              value={rec.notes || ""}
                              onChange={(event) =>
                                updateBicycleRecord(rec.id, {
                                  notes: event.target.value,
                                })
                              }
                              className="w-full border rounded px-2 py-1 text-sm"
                              placeholder="Optional notes"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default BicycleRepairsSection;
