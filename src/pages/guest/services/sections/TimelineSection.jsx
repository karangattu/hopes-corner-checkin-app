import {
  Bike,
  CheckCircle2Icon,
  ChevronDown,
  ChevronUp,
  Clock,
  ShoppingBag,
  ShowerHead,
  SquarePlus,
  Utensils,
  WashingMachine,
  X,
} from "lucide-react";
import { animated as Animated, useFadeInUp, useStagger } from "../../../../utils/animations";

const TimelineSection = ({
  timelineEvents,
  timelineViewFilter,
  setTimelineViewFilter,
  showCompletedTimeline,
  setShowCompletedTimeline,
  setActiveSection,
  renderShowerActions,
  renderLaundryActions,
  handleBagNumberChange,
  handleBagNumberKeyDown,
  handleBagNumberSave,
  handleBagNumberCancel,
  handleBagNumberEdit,
  editingBagNumber,
  newBagNumber,
}) => {
  const totalEvents = timelineEvents.length;
  const showerEvents = timelineEvents.filter((event) => event.type === "shower");
  const waitlistEvents = timelineEvents.filter((event) => event.type === "waitlist");
  const laundryEvents = timelineEvents.filter((event) => event.type === "laundry");
  const showerCompleted = showerEvents.filter((event) => event.statusLabel === "Completed").length;
  const showerActive = showerEvents.length - showerCompleted;
  const laundryCompletedLabels = new Set(["Done", "Picked Up", "Returned"]);
  const laundryCompleted = laundryEvents.filter((event) => laundryCompletedLabels.has(event.statusLabel)).length;
  const laundryActive = laundryEvents.length - laundryCompleted;

  const isEventCompleted = (event) => {
    if (event.type === "shower") return event.statusLabel === "Completed";
    if (event.type === "laundry") return laundryCompletedLabels.has(event.statusLabel);
    return false;
  };

  const matchesViewFilter = (event) => {
    if (timelineViewFilter === "all") return true;
    if (timelineViewFilter === "showers") return event.type === "shower";
    if (timelineViewFilter === "laundry") return event.type === "laundry";
    if (timelineViewFilter === "waitlist") return event.type === "waitlist";
    return true;
  };

  const filteredEvents = timelineEvents.filter(
    (event) => matchesViewFilter(event) && !isEventCompleted(event),
  );

  const completedEvents = timelineEvents.filter(
    (event) => matchesViewFilter(event) && isEventCompleted(event),
  );

  const timelineTrail = useStagger(filteredEvents.length, true);
  const timelineHeaderSpring = useFadeInUp();
  const timelineStatsSpring = useFadeInUp();
  const timelineListSpring = useFadeInUp();

  const suggestions = {
    all: "Add showers, laundry, or other services to get started.",
    showers: "Head to the Showers tab to book a new shower slot.",
    laundry: "Visit the Laundry tab to add a new load.",
    waitlist: "The shower waitlist is empty — all guests are scheduled or completed.",
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <SquarePlus size={18} className="text-blue-600" />
          Quick Add Services
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSection("showers")}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm font-medium transition-colors"
          >
            <ShowerHead size={18} />
            Add Shower
          </button>
          <button
            onClick={() => setActiveSection("laundry")}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-sm font-medium transition-colors"
          >
            <WashingMachine size={18} />
            Add Laundry
          </button>
          <button
            onClick={() => setActiveSection("meals")}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-sm font-medium transition-colors"
          >
            <Utensils size={18} />
            Add Meal
          </button>
          <button
            onClick={() => setActiveSection("bicycles")}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg text-sm font-medium transition-colors"
          >
            <Bike size={18} />
            Add Bicycle
          </button>
        </div>
      </div>

      <Animated.div
        style={timelineHeaderSpring}
        className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white rounded-2xl p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/70 font-semibold">
              Field operations
            </p>
            <h2 className="text-2xl font-semibold mt-2">Today's services at a glance</h2>
            <p className="text-sm text-white/80 mt-3 max-w-xl">
              Track and manage all showers, laundry, and other services. Use tabs below to filter by type, or view all touchpoints together.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:gap-4">
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 min-w-[140px]">
              <div className="text-xs uppercase tracking-wide text-white/70">All touchpoints</div>
              <div className="text-lg font-semibold">{totalEvents.toLocaleString()}</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 min-w-[140px]">
              <div className="text-xs uppercase tracking-wide text-white/70">Showers</div>
              <div className="text-lg font-semibold">{showerActive.toLocaleString()} active</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 min-w-[140px]">
              <div className="text-xs uppercase tracking-wide text-white/70">Laundry</div>
              <div className="text-lg font-semibold">{laundryActive.toLocaleString()} in progress</div>
            </div>
            {waitlistEvents.length > 0 ? (
              <div className="bg-amber-500/20 backdrop-blur rounded-xl px-4 py-3 min-w-[140px] border border-amber-400/30">
                <div className="text-xs uppercase tracking-wide text-amber-100">Shower queue</div>
                <div className="text-lg font-semibold">{waitlistEvents.length} waiting</div>
              </div>
            ) : null}
          </div>
        </div>
      </Animated.div>

      <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
        {[
          { id: "all", label: "All Events", count: totalEvents, icon: null },
          { id: "showers", label: "Showers", count: showerEvents.length, icon: ShowerHead },
          { id: "laundry", label: "Laundry", count: laundryEvents.length, icon: WashingMachine },
          { id: "waitlist", label: "Shower Queue", count: waitlistEvents.length, icon: Clock },
        ].map(({ id, label, count, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setTimelineViewFilter(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
              timelineViewFilter === id
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            {TabIcon ? <TabIcon size={16} /> : null}
            {label}
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                timelineViewFilter === id ? "bg-white/20" : "bg-gray-100"
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <Animated.div
        style={timelineStatsSpring}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
      >
        {[{
          label: "Active showers",
          value: showerActive,
          description: `${showerCompleted.toLocaleString()} completed`,
          accent: "bg-sky-50 border border-sky-100 text-sky-700",
        },
        {
          label: "Waitlist",
          value: waitlistEvents.length,
          description:
            waitlistEvents.length > 0
              ? "Prioritize open slots"
              : "All guests scheduled",
          accent: "bg-amber-50 border border-amber-100 text-amber-700",
        },
        {
          label: "Laundry in progress",
          value: laundryActive,
          description: `${laundryCompleted.toLocaleString()} loads ready`,
          accent: "bg-indigo-50 border border-indigo-100 text-indigo-700",
        },
        {
          label: "Total tracked",
          value: totalEvents,
          description: "Includes showers, waitlist, laundry",
          accent: "bg-emerald-50 border border-emerald-100 text-emerald-700",
        }].map(({ label, value, description, accent }) => (
          <div key={label} className={`rounded-2xl px-3 py-3 md:px-4 md:py-4 shadow-sm ${accent}`}>
            <p className="text-xs uppercase tracking-wide font-semibold">{label}</p>
            <p className="text-xl md:text-2xl font-semibold mt-1 md:mt-2">{value}</p>
            <p className="text-xs mt-1 md:mt-2 text-current/80">{description}</p>
          </div>
        ))}
      </Animated.div>

      <Animated.div
        style={timelineListSpring}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6"
      >
        {totalEvents === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No shower or laundry activity recorded yet today. Log bookings from the other tabs to populate this view.
          </div>
        ) : (
          <>
            {filteredEvents.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-fit rounded-full bg-gray-100 p-3 mb-3">
                  <Clock size={24} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700">
                  No {timelineViewFilter === "all" ? "events" : `${timelineViewFilter}`} today
                </p>
                <p className="text-sm text-gray-500 mt-2">{suggestions[timelineViewFilter]}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <ol className="relative border-l border-gray-200">
                  {filteredEvents.map((event, index) => {
                    const style = timelineTrail[index] || {};
                    const Icon = event.icon;
                    return (
                      <Animated.li
                        key={event.id}
                        style={style}
                        className="ml-6 pb-4 md:pb-6 last:pb-0 relative"
                      >
                        <span className="absolute -left-[21px] top-2 flex items-center justify-center">
                          <span className={`h-3 w-3 rounded-full ${event.accentClass}`} />
                        </span>
                        <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 md:px-4 md:py-3 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${event.iconWrapperClass}`}>
                                <Icon size={26} />
                              </span>
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                                  {event.statusLabel ? (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${event.statusClass}`}>
                                      {event.statusLabel}
                                    </span>
                                  ) : null}
                                </div>
                                {event.subtitle ? (
                                  <p className="text-xs text-gray-500">{event.subtitle}</p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                {event.timeLabel}
                              </div>
                              {event.type === "shower" ? renderShowerActions(event) : null}
                              {event.type === "laundry" ? renderLaundryActions(event) : null}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 font-medium text-gray-600">
                              {event.type === "laundry"
                                ? "Laundry"
                                : event.type === "waitlist"
                                  ? "Shower waitlist"
                                  : "Shower"}
                            </span>
                            {event.detail ? <span>{event.detail}</span> : null}
                            {event.meta?.bagNumber || (event.type === "laundry" && editingBagNumber === event.id) ? (
                              editingBagNumber === event.id ? (
                                <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 border border-purple-400 px-3 py-1 text-sm font-semibold text-purple-800">
                                  <input
                                    type="number"
                                    value={newBagNumber}
                                    onChange={(event) => handleBagNumberChange(event.target.value)}
                                    onKeyDown={(keyboardEvent) => handleBagNumberKeyDown(keyboardEvent, event)}
                                    autoFocus
                                    className="w-14 text-center bg-white/90 text-purple-900 rounded border border-purple-300 text-sm font-semibold placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Bag #"
                                    min="1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleBagNumberSave(event)}
                                    className="p-1 hover:bg-white/50 rounded text-purple-700 transition-colors"
                                    title="Save (Enter)"
                                  >
                                    <CheckCircle2Icon size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleBagNumberCancel}
                                    className="p-1 hover:bg-white/50 rounded text-purple-700 transition-colors"
                                    title="Cancel (Esc)"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleBagNumberEdit(event.id, event.meta?.bagNumber)}
                                  className="inline-flex items-center gap-2 rounded-full bg-purple-100 border border-purple-200 hover:border-purple-300 hover:bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-800 cursor-pointer transition-colors"
                                  title="Click to edit bag number"
                                >
                                  <ShoppingBag size={14} />
                                  Bag #{event.meta.bagNumber}
                                </button>
                              )
                            ) : event.type === "laundry" ? (
                              <button
                                type="button"
                                onClick={() => handleBagNumberEdit(event.id, null)}
                                className="inline-flex items-center gap-2 rounded-full bg-purple-50 border border-purple-200 hover:border-purple-300 hover:bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700 cursor-pointer transition-colors"
                                title="Click to add bag number"
                              >
                                <ShoppingBag size={14} />
                                Add bag #
                              </button>
                            ) : null}
                            {event.meta?.position ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                                Queue #{event.meta.position}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Animated.li>
                    );
                  })}
                </ol>

                {completedEvents.length > 0 ? (
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <button
                      onClick={() => setShowCompletedTimeline((prev) => !prev)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 border border-emerald-200 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2Icon size={20} className="text-emerald-600" />
                        <div className="text-left">
                          <h3 className="text-sm font-semibold text-emerald-900">Completed Today</h3>
                          <p className="text-xs text-emerald-700">
                            {completedEvents.length} service
                            {completedEvents.length > 1 ? "s" : ""} finished
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold">
                          {completedEvents.length}
                        </span>
                        {showCompletedTimeline ? (
                          <ChevronUp size={20} className="text-emerald-600 group-hover:text-emerald-700" />
                        ) : (
                          <ChevronDown size={20} className="text-emerald-600 group-hover:text-emerald-700" />
                        )}
                      </div>
                    </button>

                    {showCompletedTimeline ? (
                      <ol className="relative border-l border-emerald-200 mt-4">
                        {completedEvents.map((event) => {
                          const Icon = event.icon;
                          return (
                            <li
                              key={event.id}
                              className="ml-6 pb-4 md:pb-6 last:pb-0 relative opacity-75"
                            >
                              <span className="absolute -left-[21px] top-2 flex items-center justify-center">
                                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                              </span>
                              <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 px-3 py-2 md:px-4 md:py-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="flex items-start gap-3">
                                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                      <Icon size={26} />
                                    </span>
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                                        {event.statusLabel ? (
                                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${event.statusClass}`}>
                                            {event.statusLabel}
                                          </span>
                                        ) : null}
                                      </div>
                                      {event.subtitle ? (
                                        <p className="text-xs text-gray-500">{event.subtitle}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    {event.timeLabel}
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </Animated.div>
    </div>
  );
};

export default TimelineSection;
