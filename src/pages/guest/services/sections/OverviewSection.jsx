import {
  BarChart3,
  Bike,
  Calendar,
  CalendarClock,
  Clock,
  Gift,
  History,
  Scissors,
  ShowerHead,
  Users,
  Utensils,
  WashingMachine,
} from "lucide-react";
import DonutCardRecharts from "../../../../components/charts/DonutCardRecharts";
import { animated as Animated, useFadeInUp } from "../../../../utils/animations";

const OverviewSection = ({
  todayMetrics,
  guests,
  monthAggregates,
  yearAggregates,
  todayShowerRecords,
  activeShowers,
  activeLaundry,
  completedLaundry,
  todayWaitlisted,
  todayLaundryWithGuests,
  todayBicycleRepairs,
  timelineEvents,
  selectedGuestMealRecords,
  setActiveSection,
  reportsGenerated = false,
  isGeneratingReports = false,
  onGenerateReports,
  onRefreshReports,
}) => {
  const headerSpring = useFadeInUp();
  const overviewSummarySpring = useFadeInUp();
  const overviewHighlightsSpring = useFadeInUp();
  const overviewSnapshotSpring = useFadeInUp();
  const overviewLinksSpring = useFadeInUp();

  const tm = {
    mealsServed: todayMetrics?.mealsServed ?? 0,
    showersBooked: todayMetrics?.showersBooked ?? 0,
    laundryLoads: todayMetrics?.laundryLoads ?? 0,
    haircuts: todayMetrics?.haircuts ?? 0,
    holidays: todayMetrics?.holidays ?? 0,
    bicycles: todayMetrics?.bicycles ?? 0,
  };

  const housingStatusCounts = guests.reduce((acc, guest) => {
    const status = guest?.housingStatus || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const monthMetrics = monthAggregates ?? {
    mealsServed: 0,
    showersBooked: 0,
    laundryLoads: 0,
    haircuts: 0,
    holidays: 0,
    bicycles: 0,
  };

  const yearMetrics = yearAggregates ?? {
    mealsServed: 0,
    showersBooked: 0,
    laundryLoads: 0,
    haircuts: 0,
    holidays: 0,
    bicycles: 0,
  };

  const showersCompletedToday = todayShowerRecords.filter(
    (record) => record.status === "done",
  ).length;
  const activeShowersCount = activeShowers.length;
  const laundryInProgress = activeLaundry.length;
  const laundryCompletedToday = completedLaundry.length;
  const waitlistCount = todayWaitlisted.length;
  const laundryRecordsToday = todayLaundryWithGuests.length;
  const bicyclesToday = todayBicycleRepairs.length;
  const currentDateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timelineEventCount = timelineEvents.length;
  const timelineQueueCount = timelineEvents.filter(
    (event) => event.type === "waitlist",
  ).length;
  const housingEntries = Object.entries(housingStatusCounts || {}).sort(
    (a, b) => b[1] - a[1],
  );
  const housingSubtitle =
    housingEntries
      .slice(0, 2)
      .map(([status, count]) => `${count} ${status.toLowerCase()}`)
      .join(" · ") || "Log guests to see housing mix";

  const summaryCards = [
    {
      id: "guests",
      title: "Guests on file",
      value: guests.length.toLocaleString(),
      subtitle: housingSubtitle,
      Icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "meals",
      title: "Meals served today",
      value: tm.mealsServed.toLocaleString(),
      subtitle: `${selectedGuestMealRecords.length.toLocaleString()} guest meal entries`,
      Icon: Utensils,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      id: "showers",
      title: "Showers completed",
      value: showersCompletedToday.toLocaleString(),
      subtitle: `${activeShowersCount.toLocaleString()} in progress`,
      Icon: ShowerHead,
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
    },
    {
      id: "laundry",
      title: "Laundry loads",
      value: tm.laundryLoads.toLocaleString(),
      subtitle: `${laundryInProgress.toLocaleString()} active · ${laundryCompletedToday.toLocaleString()} ready`,
      Icon: WashingMachine,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "waitlist",
      title: "Shower waitlist",
      value: waitlistCount.toLocaleString(),
      subtitle:
        showersCompletedToday + activeShowersCount > 0
          ? "Monitor capacity closely"
          : "No one waiting",
      Icon: Clock,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      id: "bicycles",
      title: "Bicycle repairs today",
      value: bicyclesToday.toLocaleString(),
      subtitle: `${tm.bicycles.toLocaleString()} completed overall`,
      Icon: Bike,
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
    },
  ];

  const monthHighlights = [
    {
      id: "month-meals",
      label: "Meals",
      value: monthMetrics.mealsServed,
      Icon: Utensils,
      badgeClass: "bg-emerald-50 text-emerald-700",
    },
    {
      id: "month-showers",
      label: "Showers",
      value: monthMetrics.showersBooked,
      Icon: ShowerHead,
      badgeClass: "bg-sky-50 text-sky-700",
    },
    {
      id: "month-laundry",
      label: "Laundry",
      value: monthMetrics.laundryLoads,
      Icon: WashingMachine,
      badgeClass: "bg-purple-50 text-purple-700",
    },
    {
      id: "month-haircuts",
      label: "Haircuts",
      value: monthMetrics.haircuts || 0,
      Icon: Scissors,
      badgeClass: "bg-pink-50 text-pink-600",
    },
    {
      id: "month-holidays",
      label: "Holiday support",
      value: monthMetrics.holidays || 0,
      Icon: Gift,
      badgeClass: "bg-amber-50 text-amber-600",
    },
    {
      id: "month-bikes",
      label: "Bicycle repairs",
      value: monthMetrics.bicycles || 0,
      Icon: Bike,
      badgeClass: "bg-sky-50 text-sky-600",
    },
  ];

  const yearHighlights = [
    {
      id: "year-meals",
      label: "Meals",
      value: yearMetrics.mealsServed,
      Icon: Utensils,
    },
    {
      id: "year-showers",
      label: "Showers",
      value: yearMetrics.showersBooked,
      Icon: ShowerHead,
    },
    {
      id: "year-laundry",
      label: "Laundry",
      value: yearMetrics.laundryLoads,
      Icon: WashingMachine,
    },
    {
      id: "year-haircuts",
      label: "Haircuts",
      value: yearMetrics.haircuts || 0,
      Icon: Scissors,
    },
    {
      id: "year-holidays",
      label: "Holiday support",
      value: yearMetrics.holidays || 0,
      Icon: Gift,
    },
    {
      id: "year-bikes",
      label: "Bicycle repairs",
      value: yearMetrics.bicycles || 0,
      Icon: Bike,
    },
  ];

  const quickLinks = [
    {
      id: "link-timeline",
      title: "Today's timeline",
      description: `${(
        timelineEventCount + timelineQueueCount
      ).toLocaleString()} touchpoints across showers & laundry`,
      Icon: CalendarClock,
      accent: "bg-blue-50 border border-blue-100 text-blue-700",
      onClick: () => setActiveSection("timeline"),
    },
    {
      id: "link-showers",
      title: "Manage showers",
      description: `${activeShowersCount.toLocaleString()} active · ${showersCompletedToday.toLocaleString()} completed`,
      Icon: ShowerHead,
      accent: "bg-sky-50 border border-sky-100 text-sky-700",
      onClick: () => setActiveSection("showers"),
    },
    {
      id: "link-laundry",
      title: "Laundry board",
      description: `${laundryInProgress.toLocaleString()} loads in progress · ${laundryRecordsToday.toLocaleString()} logged today`,
      Icon: WashingMachine,
      accent: "bg-purple-50 border border-purple-100 text-purple-700",
      onClick: () => setActiveSection("laundry"),
    },
    {
      id: "link-meals",
      title: "Meals & supplies",
      description: `${tm.mealsServed.toLocaleString()} meals served · ${tm.haircuts.toLocaleString()} haircuts`,
      Icon: Utensils,
      accent: "bg-emerald-50 border border-emerald-100 text-emerald-700",
      onClick: () => setActiveSection("meals"),
    },
  ];

  return (
    <div className="space-y-8">
      <Animated.div
        style={headerSpring}
        className="bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 text-white rounded-2xl p-6 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-100 font-semibold">
              Services management
            </p>
            <h2 className="text-2xl font-semibold mt-2">Overview</h2>
            <p className="text-sm text-blue-100 mt-3 max-w-lg">
              Track today’s activity at a glance and jump directly into the
              tools you use most.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 min-w-[160px]">
              <div className="text-xs uppercase tracking-wide text-blue-100/80">
                Today
              </div>
              <div className="text-lg font-semibold">{currentDateLabel}</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 min-w-[160px]">
              <div className="text-xs uppercase tracking-wide text-blue-100/80">
                Guests in system
              </div>
              <div className="text-lg font-semibold">
                {guests.length.toLocaleString()}
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 min-w-[160px]">
              <div className="text-xs uppercase tracking-wide text-blue-100/80">
                Staff focus
              </div>
              <div className="text-lg font-semibold">
                {waitlistCount > 0
                  ? `${waitlistCount} waiting for showers`
                  : "All queues clear"}
              </div>
            </div>
          </div>
        </div>
      </Animated.div>

      <Animated.div
        style={overviewSummarySpring}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4"
      >
        {summaryCards.map((card) => {
          const Icon = card.Icon;
          return (
            <div
              key={card.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${card.iconBg}`}
                >
                  <Icon size={20} className={card.iconColor} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {card.title}
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {card.value}
                </p>
              </div>
              {card.subtitle && (
                <p className="text-xs text-gray-500 leading-snug">
                  {card.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </Animated.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Animated.div
          style={overviewHighlightsSpring}
          className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6 xl:col-span-2"
        >
          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <Calendar size={14} /> Month to date
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  Snapshot of the activity recorded since the start of the month.
                </p>
              </div>
              {!reportsGenerated && (
                <button
                  onClick={onGenerateReports}
                  disabled={isGeneratingReports}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isGeneratingReports ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 size={16} />
                      Generate Reports
                    </>
                  )}
                </button>
              )}
              {reportsGenerated && (
                <button
                  onClick={onRefreshReports}
                  disabled={isGeneratingReports}
                  className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isGeneratingReports ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <History size={16} />
                      Refresh Reports
                    </>
                  )}
                </button>
              )}
            </div>
            {!reportsGenerated ? (
              <div className="mt-4 p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-center">
                <BarChart3 size={48} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium mb-1">Reports Not Generated</p>
                <p className="text-sm text-gray-500">
                  Click "Generate Reports" above to compute monthly and yearly statistics.<br />
                  This helps prevent slowdowns with large datasets (33k+ records).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {monthHighlights.map(({ id, label, value, Icon, badgeClass }) => {
                  const StatIcon = Icon;
                  return (
                    <div
                      key={id}
                      className="border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3 bg-gray-50/40"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {label}
                        </p>
                        <p className="text-xl font-semibold text-gray-900">
                          {value.toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                      >
                        <StatIcon size={16} className="mr-1" /> MTD
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
              <History size={14} /> Calendar year to date
            </h3>
            {!reportsGenerated ? (
              <div className="mt-4 p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-center">
                <History size={48} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium mb-1">Reports Not Generated</p>
                <p className="text-sm text-gray-500">
                  Click "Generate Reports" above to view year-to-date statistics.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {yearHighlights.map(({ id, label, value, Icon }) => {
                  const StatIcon = Icon;
                  return (
                    <div
                      key={id}
                      className="border border-gray-100 rounded-xl p-4 bg-white flex items-center gap-3 shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <StatIcon size={18} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {label}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {value.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Animated.div>

        <Animated.div
          style={overviewSnapshotSpring}
          className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Users size={16} className="text-blue-600" /> Guest snapshot
            </h3>
            <span className="text-xs text-gray-400">{currentDateLabel}</span>
          </div>
          <p className="text-sm text-gray-500">
            A quick look at the housing mix across all registered guests.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-3">
              {housingEntries.slice(0, 4).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between text-sm text-gray-600"
                >
                  <span className="font-medium text-gray-700">{status}</span>
                  <span className="font-semibold text-gray-900">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
              {housingEntries.length === 0 && (
                <p className="text-xs text-gray-400">
                  Add guests to populate this view.
                </p>
              )}
            </div>
            <div className="sm:pl-2">
              <DonutCardRecharts
                title="Housing mix"
                subtitle="Share of registered guests"
                dataMap={housingStatusCounts}
              />
            </div>
          </div>
        </Animated.div>
      </div>

      <Animated.div
        style={overviewLinksSpring}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {quickLinks.map(
          ({ id, title, description, Icon, accent, onClick, actions }) => {
            const CTAIcon = Icon;
            return (
              <div
                key={id}
                onClick={onClick}
                className={`text-left rounded-2xl border shadow-sm p-5 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${accent}`}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                  }
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center">
                    <CTAIcon size={20} className="text-current" />
                  </div>
                  <h4 className="text-base font-semibold">{title}</h4>
                </div>
                <p className="text-sm text-current/80 leading-relaxed">
                  {description}
                </p>
                {actions && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {actions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          action.handler();
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/70 text-gray-700 hover:bg-white"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          },
        )}
      </Animated.div>
    </div>
  );
};

export default OverviewSection;
