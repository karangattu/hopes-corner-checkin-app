import { useMemo, useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import enhancedToast from "../../utils/toast";
import {
  ClipboardList,
  ShowerHead,
  WashingMachine,
  Utensils,
  ShoppingBag,
  DropletIcon,
  FanIcon,
  CheckCircle2Icon,
  LogOutIcon,
  Clock,
  CalendarClock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Truck,
  Edit3,
  RotateCcw,
  X,
  History,
  BarChart3,
  Users,
  Circle,
  Sparkles,
  Apple,
  Caravan,
  HeartHandshake,
  SquarePlus,
  Scissors,
  Gift,
  Shirt,
  Bed,
  Backpack,
  Bike,
  TentTree,
  Footprints,
  TrendingUp,
  Download,
} from "lucide-react";
import { useAppContext } from "../../context/useAppContext";
import ShowerBooking from "../../components/ShowerBooking";
import LaundryBooking from "../../components/LaundryBooking";
import StickyQuickActions from "../../components/StickyQuickActions";
import Selectize from "../../components/Selectize";
import DonutCard from "../../components/charts/DonutCard";
import TrendLine from "../../components/charts/TrendLine";
import {
  useFadeInUp,
  useScaleIn,
  useStagger,
  animated as Animated,
  SpringIcon,
} from "../../utils/animations";
import {
  todayPacificDateString,
  pacificDateStringFrom,
} from "../../utils/date";

const MEAL_REPORT_TYPE_ORDER = [
  "guest",
  "dayWorker",
  "rv",
  "unitedEffort",
  "extras",
  "lunchBags",
];

const MEAL_REPORT_TYPE_LABELS = {
  guest: "Guest meals",
  dayWorker: "Day Worker Center meals",
  rv: "RV meals",
  unitedEffort: "United Effort meals",
  extras: "Extra meals",
  lunchBags: "Lunch bags",
};

const createDefaultMealReportTypes = () => ({
  guest: true,
  dayWorker: true,
  rv: true,
  unitedEffort: true,
  extras: true,
  lunchBags: false,
});

const createEmptyMealTotals = () =>
  MEAL_REPORT_TYPE_ORDER.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {});

const FILTER_STORAGE_KEY = "services-filters-v1";

const toCsvValue = (value) => {
  const stringValue = String(value ?? "");
  if (/[",\n]/u.test(stringValue)) {
    return `"${stringValue.replace(/"/gu, '""')}"`;
  }
  return stringValue;
};

const Services = () => {
  const {
    getTodayMetrics,
    getTodayLaundryWithGuests,
    mealRecords,
    rvMealRecords,
    addRvMealRecord,
    addUnitedEffortMealRecord,
    unitedEffortMealRecords,
    extraMealRecords,
    addExtraMealRecord,
    dayWorkerMealRecords,
    removeMealAttendanceRecord,
    addDayWorkerMealRecord,
    lunchBagRecords,
    addLunchBagRecord,
    laundryRecords,
    showerRecords,
    haircutRecords,
    holidayRecords,
    guests,
    showerPickerGuest,
    laundryPickerGuest,
    LAUNDRY_STATUS,
    updateLaundryStatus,
    updateLaundryBagNumber,
    setLaundryRecords,
    actionHistory,
    undoAction,
    clearActionHistory,
    allShowerSlots,
    allLaundrySlots,
    cancelShowerRecord,
    rescheduleShower,
    updateShowerStatus,
    cancelLaundryRecord,
    rescheduleLaundry,
    canGiveItem,
    getLastGivenItem,
    giveItem,
    getNextAvailabilityDate,
    getDaysUntilAvailable,
    bicycleRecords,
    updateBicycleRecord,
    deleteBicycleRecord,
    setBicycleStatus,
    moveBicycleRecord,
    settings,
    BICYCLE_REPAIR_STATUS,
  } = useAppContext();

  const [activeSection, setActiveSection] = useState("overview");

  // Sticky Quick Actions state
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const [editingBagNumber, setEditingBagNumber] = useState(null);
  const [newBagNumber, setNewBagNumber] = useState("");
  const [showUndoPanel, setShowUndoPanel] = useState(false);
  const [bagPromptOpen, setBagPromptOpen] = useState(false);
  const [bagPromptRecord, setBagPromptRecord] = useState(null);
  const [bagPromptNextStatus, setBagPromptNextStatus] = useState(null);
  const [bagPromptValue, setBagPromptValue] = useState("");
  const [rvMealCount, setRvMealCount] = useState("");
  const [isAddingRvMeals, setIsAddingRvMeals] = useState(false);
  const [ueMealCount, setUeMealCount] = useState("");
  const [isAddingUeMeals, setIsAddingUeMeals] = useState(false);
  const [extraMealCount, setExtraMealCount] = useState("");
  const [isAddingExtraMeals, setIsAddingExtraMeals] = useState(false);
  const [lunchBagCount, setLunchBagCount] = useState("");
  const [isAddingLunchBags, setIsAddingLunchBags] = useState(false);
  const [dayWorkerMealCount, setDayWorkerMealCount] = useState("");
  const [isAddingDayWorkerMeals, setIsAddingDayWorkerMeals] = useState(false);
  const today = todayPacificDateString();
  const [mealsDate, setMealsDate] = useState(today);

  const [mealReportStart, setMealReportStart] = useState(() => {
    const now = new Date();
    return pacificDateStringFrom(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
  });
  const [mealReportEnd, setMealReportEnd] = useState(today);
  const [mealReportTypes, setMealReportTypes] = useState(() =>
    createDefaultMealReportTypes(),
  );

  const savedFilters = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      console.warn("Failed to read saved Services filters", error);
      return null;
    }
  }, []);

  // Scroll detection for quick actions visibility
  useEffect(() => {
    let timeoutId;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Show quick actions when user scrolls down past 100px
      // Hide when near top or on desktop
      const shouldShow = scrollY > 100 && window.innerWidth < 768;
      setQuickActionsVisible(shouldShow);

      // Auto-hide after 3 seconds of no scrolling
      clearTimeout(timeoutId);
      if (shouldShow) {
        timeoutId = setTimeout(() => {
          setQuickActionsVisible(false);
        }, 3000);
      }
    };

    const handleResize = () => {
      // Hide on desktop/tablet
      if (window.innerWidth >= 768) {
        setQuickActionsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    // Initial check
    handleScroll();
    handleResize();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const [showerStatusFilter, setShowerStatusFilter] = useState(
    () => savedFilters?.showerStatusFilter ?? "all",
  );
  const [showerLaundryFilter, setShowerLaundryFilter] = useState(
    () => savedFilters?.showerLaundryFilter ?? "any",
  );
  const [showerSort, setShowerSort] = useState(
    () => savedFilters?.showerSort ?? "time-asc",
  );
  const [showCompletedShowers, setShowCompletedShowers] = useState(() =>
    Boolean(savedFilters?.showCompletedShowers),
  );

  const [laundryTypeFilter, setLaundryTypeFilter] = useState(
    () => savedFilters?.laundryTypeFilter ?? "any",
  );
  const [laundryStatusFilter, setLaundryStatusFilter] = useState(
    () => savedFilters?.laundryStatusFilter ?? "any",
  );
  const [laundrySort, setLaundrySort] = useState(
    () => savedFilters?.laundrySort ?? "time-asc",
  );
  const [showCompletedLaundry, setShowCompletedLaundry] = useState(() =>
    Boolean(savedFilters?.showCompletedLaundry),
  );
  const [expandedCompletedBicycleCards, setExpandedCompletedBicycleCards] =
    useState({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      showerStatusFilter,
      showerLaundryFilter,
      showerSort,
      showCompletedShowers,
      laundryTypeFilter,
      laundryStatusFilter,
      laundrySort,
      showCompletedLaundry,
    };
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist Services filters", error);
    }
  }, [
    showerStatusFilter,
    showerLaundryFilter,
    showerSort,
    showCompletedShowers,
    laundryTypeFilter,
    laundryStatusFilter,
    laundrySort,
    showCompletedLaundry,
  ]);

  const todayMetrics = getTodayMetrics();

  const todayShorthand = today;

  const selectedDate = mealsDate || todayShorthand;
  const selectedGuestMealRecords = mealRecords.filter(
    (record) => pacificDateStringFrom(record.date || "") === selectedDate,
  );
  const selectedGuestExtraMealRecords = (extraMealRecords || []).filter(
    (r) => r.guestId && pacificDateStringFrom(r.date || "") === selectedDate,
  );

  const todayShowerRecords = showerRecords.filter(
    (record) => pacificDateStringFrom(record.date) === todayShorthand,
  );
  const todayWaitlisted = todayShowerRecords.filter(
    (r) => r.status === "waitlisted",
  );
  const todayBookedShowers = todayShowerRecords.filter(
    (r) => r.status !== "waitlisted",
  );

  const todayLaundryWithGuests = getTodayLaundryWithGuests();

  const parseTimeToMinutes = useCallback((t) => {
    if (!t) return Number.POSITIVE_INFINITY;
    const [h, m] = String(t).split(":");
    const hh = parseInt(h, 10);
    const mm = parseInt(m, 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return Number.POSITIVE_INFINITY;
    return hh * 60 + mm;
  }, []);

  const parseLaundryStartToMinutes = useCallback(
    (range) => {
      if (!range) return Number.POSITIVE_INFINITY;
      const [start] = String(range).split(" - ");
      return parseTimeToMinutes(start);
    },
    [parseTimeToMinutes],
  );

  const formatTimeLabel = useCallback((timeStr) => {
    if (!timeStr) return "";
    const [hoursStr, minutesStr] = String(timeStr).split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, []);

  const formatLaundryRangeLabel = useCallback(
    (range) => {
      if (!range) return "Off-site (no slot)";
      const [start, end] = String(range).split(" - ");
      const formattedStart = formatTimeLabel(start);
      const formattedEnd = end ? formatTimeLabel(end) : "";
      if (!formattedEnd) return formattedStart;
      const [startTime, startPeriod] = formattedStart.split(" ");
      const [endTime, endPeriod] = formattedEnd.split(" ");
      if (startPeriod && endPeriod && startPeriod === endPeriod) {
        return `${startTime} - ${endTime} ${startPeriod}`;
      }
      return `${formattedStart} - ${formattedEnd}`;
    },
    [formatTimeLabel],
  );

  const formatShowerSlotLabel = useCallback(
    (slotTime) => formatTimeLabel(slotTime) || slotTime,
    [formatTimeLabel],
  );

  const getGuestNameDetails = useCallback(
    (guestId) => {
      const guest = guests.find((g) => g.id === guestId) || null;
      const fallback = "Unknown Guest";
      const legalName =
        guest?.name ||
        `${guest?.firstName || ""} ${guest?.lastName || ""}`.trim() ||
        fallback;
      const preferredName = (guest?.preferredName || "").trim();
      const hasPreferred =
        Boolean(preferredName) &&
        preferredName.toLowerCase() !== legalName.toLowerCase();
      const primaryName = hasPreferred ? preferredName : legalName;
      const displayName = hasPreferred
        ? `${preferredName} (${legalName})`
        : legalName;
      return {
        guest,
        legalName,
        preferredName,
        hasPreferred,
        primaryName,
        displayName,
        sortKey: legalName.toLowerCase(),
      };
    },
    [guests],
  );

  const getGuestName = useCallback(
    (guestId) => getGuestNameDetails(guestId).displayName,
    [getGuestNameDetails],
  );

  const getShowerStatusInfo = useCallback((status) => {
    switch (status) {
      case "done":
        return {
          label: "Completed",
          icon: CheckCircle2Icon,
          iconClass: "text-emerald-600",
          chipClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
          badgeClass:
            "bg-emerald-100 text-emerald-700 border border-emerald-200",
        };
      case "awaiting":
        return {
          label: "Awaiting",
          icon: Circle,
          iconClass: "fill-blue-300 text-blue-400",
          chipClass: "bg-blue-50 text-blue-700 border border-blue-200",
          badgeClass: "bg-blue-100 text-blue-700 border border-blue-200",
        };
      case "waitlisted":
        return {
          label: "Waitlisted",
          icon: Clock,
          iconClass: "text-amber-500",
          chipClass: "bg-amber-50 text-amber-700 border border-amber-200",
          badgeClass: "bg-amber-100 text-amber-700 border border-amber-200",
        };
      default:
        return {
          label: "Scheduled",
          icon: ShowerHead,
          iconClass: "text-slate-500",
          chipClass: "bg-slate-50 text-slate-700 border border-slate-200",
          badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
        };
    }
  }, []);

  const getLaundryStatusInfo = useCallback(
    (status) => {
      switch (status) {
        case LAUNDRY_STATUS.WAITING:
          return {
            icon: ShoppingBag,
            color: "text-gray-500",
            bgColor: "bg-gray-100",
            textColor: "text-gray-800",
            label: "Waiting",
          };
        case LAUNDRY_STATUS.WASHER:
          return {
            icon: DropletIcon,
            color: "text-blue-500",
            bgColor: "bg-blue-100",
            textColor: "text-blue-800",
            label: "In Washer",
          };
        case LAUNDRY_STATUS.DRYER:
          return {
            icon: FanIcon,
            color: "text-orange-500",
            bgColor: "bg-orange-100",
            textColor: "text-orange-800",
            label: "In Dryer",
          };
        case LAUNDRY_STATUS.DONE:
          return {
            icon: CheckCircle2Icon,
            color: "text-green-500",
            bgColor: "bg-green-100",
            textColor: "text-green-800",
            label: "Done",
          };
        case LAUNDRY_STATUS.PICKED_UP:
          return {
            icon: LogOutIcon,
            color: "text-purple-500",
            bgColor: "bg-purple-100",
            textColor: "text-purple-800",
            label: "Picked Up",
          };
        case LAUNDRY_STATUS.PENDING:
          return {
            icon: Clock,
            color: "text-yellow-500",
            bgColor: "bg-yellow-100",
            textColor: "text-yellow-800",
            label: "Waiting",
          };
        case LAUNDRY_STATUS.TRANSPORTED:
          return {
            icon: Truck,
            color: "text-blue-500",
            bgColor: "bg-blue-100",
            textColor: "text-blue-800",
            label: "Transported",
          };
        case LAUNDRY_STATUS.RETURNED:
          return {
            icon: CheckCircle2Icon,
            color: "text-green-500",
            bgColor: "bg-green-100",
            textColor: "text-green-800",
            label: "Returned",
          };
        case LAUNDRY_STATUS.OFFSITE_PICKED_UP:
          return {
            icon: LogOutIcon,
            color: "text-purple-500",
            bgColor: "bg-purple-100",
            textColor: "text-purple-800",
            label: "Picked Up",
          };
        default:
          return {
            icon: ShoppingBag,
            color: "text-gray-500",
            bgColor: "bg-gray-100",
            textColor: "text-gray-800",
            label: "Unknown",
          };
      }
    },
    [LAUNDRY_STATUS],
  );

  const laundryGuestIdsSet = new Set(
    (todayLaundryWithGuests || []).map((l) => l.guestId),
  );
  const filteredShowers = [...(todayBookedShowers || [])]
    .filter((r) => {
      if (showerStatusFilter === "awaiting" && r.status === "done")
        return false;
      if (showerStatusFilter === "done" && r.status !== "done") return false;
      if (showerLaundryFilter === "with" && !laundryGuestIdsSet.has(r.guestId))
        return false;
      if (
        showerLaundryFilter === "without" &&
        laundryGuestIdsSet.has(r.guestId)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (showerSort === "name") {
        const an = getGuestNameDetails(a.guestId).sortKey;
        const bn = getGuestNameDetails(b.guestId).sortKey;
        return an.localeCompare(bn);
      }
      if (showerSort === "status") {
        const rank = (r) => (r.status === "done" ? 1 : 0);
        const diff = rank(a) - rank(b);
        return diff !== 0
          ? diff
          : parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      }
      if (showerSort === "time-desc")
        return parseTimeToMinutes(b.time) - parseTimeToMinutes(a.time);
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });

  const statusOrder = {
    [LAUNDRY_STATUS?.WAITING]: 0,
    [LAUNDRY_STATUS?.WASHER]: 1,
    [LAUNDRY_STATUS?.DRYER]: 2,
    [LAUNDRY_STATUS?.DONE]: 3,
    [LAUNDRY_STATUS?.PICKED_UP]: 4,
    [LAUNDRY_STATUS?.PENDING]: 0,
    [LAUNDRY_STATUS?.TRANSPORTED]: 1,
    [LAUNDRY_STATUS?.RETURNED]: 2,
    [LAUNDRY_STATUS?.OFFSITE_PICKED_UP]: 3,
  };
  const filteredLaundry = [...(todayLaundryWithGuests || [])]
    .filter((r) => {
      if (laundryTypeFilter !== "any" && r.laundryType !== laundryTypeFilter)
        return false;
      if (laundryStatusFilter !== "any" && r.status !== laundryStatusFilter)
        return false;
      return true;
    })
    .sort((a, b) => {
      if (laundrySort === "name")
        return (a.guestSortKey || "").localeCompare(b.guestSortKey || "");
      if (laundrySort === "status") {
        const ar = statusOrder[a.status] ?? 99;
        const br = statusOrder[b.status] ?? 99;
        const diff = ar - br;
        if (diff !== 0) return diff;
        return (
          parseLaundryStartToMinutes(a.time) -
          parseLaundryStartToMinutes(b.time)
        );
      }
      if (laundrySort === "time-desc")
        return (
          parseLaundryStartToMinutes(b.time) -
          parseLaundryStartToMinutes(a.time)
        );
      return (
        parseLaundryStartToMinutes(a.time) - parseLaundryStartToMinutes(b.time)
      );
    });

  const activeShowers = filteredShowers.filter(
    (record) => record.status !== "done",
  );
  const completedShowers = filteredShowers.filter(
    (record) => record.status === "done",
  );

  const completedLaundryStatuses = useMemo(
    () =>
      new Set([
        LAUNDRY_STATUS?.DONE,
        LAUNDRY_STATUS?.PICKED_UP,
        LAUNDRY_STATUS?.RETURNED,
        LAUNDRY_STATUS?.OFFSITE_PICKED_UP,
      ]),
    [LAUNDRY_STATUS],
  );
  const isLaundryCompleted = useCallback(
    (status) => completedLaundryStatuses.has(status),
    [completedLaundryStatuses],
  );

  const isCompletedBicycleStatus = useCallback((status) => {
    const normalized = (status || "").toString().toLowerCase();
    return (
      !status ||
      normalized === "done" ||
      normalized === "completed" ||
      normalized === "ready" ||
      normalized === "finished"
    );
  }, []);

  const toCountValue = useCallback(
    (value) => (typeof value === "number" ? value : Number(value) || 0),
    [],
  );

  const monthAggregates = useMemo(() => {
    const now = new Date();
    const monthStartPT = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(now.getFullYear(), now.getMonth(), 1));

    const inMonth = (iso) => {
      if (!iso) return false;
      const formatted = pacificDateStringFrom(iso);
      return formatted ? formatted >= monthStartPT : false;
    };

    const sumCount = (records = []) =>
      records.reduce((sum, record) => sum + toCountValue(record?.count), 0);

    const mealTotal =
      sumCount((mealRecords || []).filter((r) => inMonth(r.date))) +
      sumCount((rvMealRecords || []).filter((r) => inMonth(r.date))) +
      sumCount((unitedEffortMealRecords || []).filter((r) => inMonth(r.date))) +
      sumCount((extraMealRecords || []).filter((r) => inMonth(r.date))) +
      sumCount((dayWorkerMealRecords || []).filter((r) => inMonth(r.date))) +
      sumCount((lunchBagRecords || []).filter((r) => inMonth(r.date)));

    return {
      mealsServed: mealTotal,
      showersBooked: (showerRecords || []).filter(
        (r) => inMonth(r.date) && r.status === "done",
      ).length,
      laundryLoads: (laundryRecords || []).filter(
        (r) => inMonth(r.date) && isLaundryCompleted(r.status),
      ).length,
      haircuts: (haircutRecords || []).filter((r) => inMonth(r.date)).length,
      holidays: (holidayRecords || []).filter((r) => inMonth(r.date)).length,
      bicycles: (bicycleRecords || []).filter(
        (r) => inMonth(r.date) && isCompletedBicycleStatus(r.status),
      ).length,
    };
  }, [
    mealRecords,
    rvMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    showerRecords,
    laundryRecords,
    haircutRecords,
    holidayRecords,
    bicycleRecords,
    isLaundryCompleted,
    isCompletedBicycleStatus,
    toCountValue,
  ]);

  const yearAggregates = useMemo(() => {
    const now = new Date();
    const yearStartPT = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(now.getFullYear(), 0, 1));

    const inYear = (iso) => {
      if (!iso) return false;
      const formatted = pacificDateStringFrom(iso);
      return formatted ? formatted >= yearStartPT : false;
    };

    const sumCount = (records = []) =>
      records.reduce((sum, record) => sum + toCountValue(record?.count), 0);

    const mealTotal =
      sumCount((mealRecords || []).filter((r) => inYear(r.date))) +
      sumCount((rvMealRecords || []).filter((r) => inYear(r.date))) +
      sumCount((unitedEffortMealRecords || []).filter((r) => inYear(r.date))) +
      sumCount((extraMealRecords || []).filter((r) => inYear(r.date))) +
      sumCount((dayWorkerMealRecords || []).filter((r) => inYear(r.date))) +
      sumCount((lunchBagRecords || []).filter((r) => inYear(r.date)));

    return {
      mealsServed: mealTotal,
      showersBooked: (showerRecords || []).filter(
        (r) => inYear(r.date) && r.status === "done",
      ).length,
      laundryLoads: (laundryRecords || []).filter(
        (r) => inYear(r.date) && isLaundryCompleted(r.status),
      ).length,
      haircuts: (haircutRecords || []).filter((r) => inYear(r.date)).length,
      holidays: (holidayRecords || []).filter((r) => inYear(r.date)).length,
      bicycles: (bicycleRecords || []).filter(
        (r) => inYear(r.date) && isCompletedBicycleStatus(r.status),
      ).length,
    };
  }, [
    mealRecords,
    rvMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    showerRecords,
    laundryRecords,
    haircutRecords,
    holidayRecords,
    bicycleRecords,
    isLaundryCompleted,
    isCompletedBicycleStatus,
    toCountValue,
  ]);

  const dailyServiceTotals = useMemo(() => {
    const entries = new Map();
    const ensureEntry = (day) => {
      if (!day) return null;
      if (!entries.has(day)) {
        entries.set(day, {
          date: day,
          meals: 0,
          showers: 0,
          laundry: 0,
          haircuts: 0,
          holidays: 0,
          bicycles: 0,
        });
      }
      return entries.get(day);
    };

    const addValue = (dateInput, key, amount = 1) => {
      if (amount === 0 || amount === undefined || amount === null) return;
      const day = pacificDateStringFrom(dateInput);
      if (!day) return;
      const entry = ensureEntry(day);
      if (entry) {
        entry[key] += amount;
      }
    };

    (mealRecords || []).forEach((record) =>
      addValue(record?.date, "meals", toCountValue(record?.count)),
    );
    (rvMealRecords || []).forEach((record) =>
      addValue(record?.date, "meals", toCountValue(record?.count)),
    );
    (unitedEffortMealRecords || []).forEach((record) =>
      addValue(record?.date, "meals", toCountValue(record?.count)),
    );
    (extraMealRecords || []).forEach((record) =>
      addValue(record?.date, "meals", toCountValue(record?.count)),
    );
    (dayWorkerMealRecords || []).forEach((record) =>
      addValue(record?.date, "meals", toCountValue(record?.count)),
    );
    (lunchBagRecords || []).forEach((record) =>
      addValue(record?.date, "meals", toCountValue(record?.count)),
    );

    (showerRecords || []).forEach((record) => {
      if (record?.status === "done") {
        addValue(record?.date, "showers", 1);
      }
    });

    (laundryRecords || []).forEach((record) => {
      if (isLaundryCompleted(record?.status)) {
        addValue(record?.date, "laundry", 1);
      }
    });

    (haircutRecords || []).forEach((record) =>
      addValue(record?.date, "haircuts", 1),
    );
    (holidayRecords || []).forEach((record) =>
      addValue(record?.date, "holidays", 1),
    );
    (bicycleRecords || []).forEach((record) => {
      if (isCompletedBicycleStatus(record?.status)) {
        addValue(record?.date, "bicycles", 1);
      }
    });

    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const today = new Date();
    const windowDays = 30;
    const timeline = [];
    for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
      const ref = new Date(today);
      ref.setDate(ref.getDate() - offset);
      const key = formatter.format(ref);
      const existing = entries.get(key);
      if (existing) {
        timeline.push({ ...existing });
      } else {
        timeline.push({
          date: key,
          meals: 0,
          showers: 0,
          laundry: 0,
          haircuts: 0,
          holidays: 0,
          bicycles: 0,
        });
      }
    }

    return timeline;
  }, [
    mealRecords,
    rvMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    showerRecords,
    laundryRecords,
    haircutRecords,
    holidayRecords,
    bicycleRecords,
    isLaundryCompleted,
    isCompletedBicycleStatus,
    toCountValue,
  ]);

  const activeLaundry = filteredLaundry.filter(
    (record) => !isLaundryCompleted(record.status),
  );
  const completedLaundry = filteredLaundry.filter((record) =>
    isLaundryCompleted(record.status),
  );

  const activeShowersTrail = useStagger((activeShowers || []).length, true);
  const completedShowersTrail = useStagger(
    (completedShowers || []).length,
    true,
  );
  const waitlistTrail = useStagger((todayWaitlisted || []).length, true);
  const activeLaundryTrail = useStagger((activeLaundry || []).length, true);
  const completedLaundryTrail = useStagger(
    (completedLaundry || []).length,
    true,
  );

  const timelineEvents = useMemo(() => {
    const events = [];

    todayBookedShowers.forEach((record) => {
      const nameDetails = getGuestNameDetails(record.guestId);
      const statusInfo = getShowerStatusInfo(record.status);
      const accentClass =
        record.status === "done"
          ? "bg-emerald-500"
          : record.status === "awaiting"
            ? "bg-blue-500"
            : "bg-slate-400";
      const iconWrapperClass =
        record.status === "done"
          ? "bg-emerald-100 text-emerald-700"
          : record.status === "awaiting"
            ? "bg-blue-100 text-blue-700"
            : "bg-slate-100 text-slate-700";

      events.push({
        id: `shower-${record.id}`,
        type: "shower",
        title: nameDetails.primaryName,
        subtitle: nameDetails.hasPreferred
          ? `Legal: ${nameDetails.legalName}`
          : "Shower booking",
        timeLabel: formatShowerSlotLabel(record.time) || "No slot",
        detail:
          record.status === "done"
            ? "Completed shower"
            : record.status === "awaiting"
              ? "Awaiting arrival"
              : "Scheduled shower",
        statusLabel: statusInfo.label,
        statusClass: statusInfo.chipClass,
        iconWrapperClass,
        accentClass,
        icon: ShowerHead,
        sortValue: parseTimeToMinutes(record.time),
        originalRecord: record, // Add original record for actions
        meta: {
          record,
          guestId: record.guestId,
        },
      });
    });

    todayWaitlisted.forEach((record, index) => {
      const nameDetails = record.guestId
        ? getGuestNameDetails(record.guestId)
        : null;
      const statusInfo = getShowerStatusInfo("waitlisted");

      events.push({
        id: `waitlist-${record.id || index}`,
        type: "waitlist",
        title: nameDetails?.primaryName || "Waitlist guest",
        subtitle: nameDetails?.hasPreferred
          ? `Legal: ${nameDetails.legalName}`
          : "Awaiting shower slot",
        timeLabel: record.time
          ? formatShowerSlotLabel(record.time)
          : "Waitlist",
        detail: `Position #${index + 1}`,
        statusLabel: statusInfo.label,
        statusClass: statusInfo.chipClass,
        iconWrapperClass: "bg-amber-100 text-amber-700",
        accentClass: "bg-amber-500",
        icon: Clock,
        sortValue: record.time
          ? parseTimeToMinutes(record.time) + index * 0.01
          : Number.MAX_SAFE_INTEGER - (todayWaitlisted.length - index),
        meta: {
          position: index + 1,
        },
      });
    });

    todayLaundryWithGuests.forEach((record) => {
      const statusInfo = getLaundryStatusInfo(record.status);
      const accentClass = statusInfo.color
        ? statusInfo.color.replace("text-", "bg-")
        : "bg-indigo-500";
      const iconWrapperClass =
        record.laundryType === "offsite"
          ? "bg-purple-100 text-purple-700"
          : "bg-indigo-100 text-indigo-700";
      const guestName = record.guestName || getGuestName(record.guestId);
      const laundryTypeLabel =
        record.laundryType === "offsite" ? "Off-site" : "On-site";

      events.push({
        id: `laundry-${record.id}`,
        type: "laundry",
        title: guestName,
        subtitle: `${laundryTypeLabel} laundry`,
        timeLabel: formatLaundryRangeLabel(record.time),
        detail: `Status · ${statusInfo.label}`,
        statusLabel: statusInfo.label,
        statusClass: `${statusInfo.bgColor} ${statusInfo.textColor} border border-transparent`,
        iconWrapperClass,
        accentClass,
        icon: WashingMachine,
        sortValue: parseLaundryStartToMinutes(record.time),
        originalRecord: record, // Add original record for actions
        meta: {
          bagNumber: record.bagNumber,
        },
      });
    });

    return events.filter(Boolean).sort((a, b) => {
      const aVal = Number.isFinite(a.sortValue)
        ? a.sortValue
        : Number.MAX_SAFE_INTEGER;
      const bVal = Number.isFinite(b.sortValue)
        ? b.sortValue
        : Number.MAX_SAFE_INTEGER;
      if (aVal !== bVal) return aVal - bVal;
      return a.type.localeCompare(b.type);
    });
  }, [
    todayBookedShowers,
    todayWaitlisted,
    todayLaundryWithGuests,
    getGuestNameDetails,
    getGuestName,
    getShowerStatusInfo,
    getLaundryStatusInfo,
    formatShowerSlotLabel,
    formatLaundryRangeLabel,
    parseTimeToMinutes,
    parseLaundryStartToMinutes,
  ]);

  const timelineTrail = useStagger((timelineEvents || []).length, true);
  const toggleCompletedBicycleCard = useCallback((id) => {
    setExpandedCompletedBicycleCards((prev = {}) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const selectedRvMealRecords = rvMealRecords.filter(
    (record) => pacificDateStringFrom(record.date || "") === selectedDate,
  );

  const repairTypes = [
    "Flat Tire",
    "Brake Adjustment",
    "Gear Adjustment",
    "Chain Replacement",
    "Wheel Truing",
    "Basic Tune Up",
    "Drivetrain Cleaning",
    "Cable Replacement",
    "Headset Adjustment",
    "New Bicycle",
    "Other",
  ];
  const todayBicycleRepairs = (bicycleRecords || []).filter(
    (r) => pacificDateStringFrom(r.date || "") === today,
  );
  const sortedBicycleRepairs = [...todayBicycleRepairs].sort(
    (a, b) => (b.priority || 0) - (a.priority || 0),
  );
  const renderBicycleRepairsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bike className="text-sky-600" size={20} />{" "}
            <span>Today's Bicycle Repairs</span>
          </h2>
          <div className="flex items-center gap-2">
            <span className="bg-sky-100 text-sky-800 text-xs font-medium px-3 py-1 rounded-full">
              {sortedBicycleRepairs.length} repairs
            </span>
          </div>
        </div>
        {sortedBicycleRepairs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No bicycle repairs logged today. Use the Bicycle button when
            searching for a guest to add one.
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
                            onClick={() => toggleCompletedBicycleCard(rec.id)}
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
                              onClick={() => moveBicycleRecord(rec.id, "down")}
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
                            Repair:
                          </span>{" "}
                          {rec.repairType || "—"}
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Repair Type
                          </label>
                          <select
                            value={rec.repairType}
                            onChange={(event) =>
                              updateBicycleRecord(rec.id, {
                                repairType: event.target.value,
                              })
                            }
                            className="w-full border rounded px-2 py-1 text-sm"
                          >
                            {repairTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
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
    </div>
  );

  const headerSpring = useFadeInUp();
  const overviewSummarySpring = useFadeInUp();
  const overviewHighlightsSpring = useFadeInUp();
  const overviewSnapshotSpring = useFadeInUp();
  const overviewLinksSpring = useFadeInUp();
  const timelineHeaderSpring = useFadeInUp();
  const timelineStatsSpring = useFadeInUp();
  const timelineListSpring = useFadeInUp();
  const modalSpring = useScaleIn([bagPromptOpen]);

  const handleAddRvMeals = () => {
    if (!rvMealCount || isNaN(rvMealCount) || parseInt(rvMealCount) <= 0) {
      enhancedToast.validationError("Please enter a valid number of RV meals");
      return;
    }

    setIsAddingRvMeals(true);
    try {
      addRvMealRecord(rvMealCount, selectedDate);
      toast.success(
        `Added ${rvMealCount} RV meals for ${new Date(selectedDate + "T00:00:00").toLocaleDateString()}!`,
      );
      setRvMealCount("");
    } catch (error) {
      toast.error(`Error adding RV meals: ${error.message}`);
    } finally {
      setIsAddingRvMeals(false);
    }
  };

  const handleAddUeMeals = () => {
    if (!ueMealCount || isNaN(ueMealCount) || parseInt(ueMealCount) <= 0) {
      enhancedToast.validationError(
        "Please enter a valid number of United Effort meals",
      );
      return;
    }

    setIsAddingUeMeals(true);
    try {
      addUnitedEffortMealRecord(ueMealCount, selectedDate);
      toast.success(
        `Added ${ueMealCount} United Effort meals for ${new Date(selectedDate + "T00:00:00").toLocaleDateString()}!`,
      );
      setUeMealCount("");
    } catch (error) {
      toast.error(`Error adding United Effort meals: ${error.message}`);
    } finally {
      setIsAddingUeMeals(false);
    }
  };

  const handleAddExtraMeals = () => {
    if (
      !extraMealCount ||
      isNaN(extraMealCount) ||
      parseInt(extraMealCount) <= 0
    ) {
      enhancedToast.validationError(
        "Please enter a valid number of extra meals",
      );
      return;
    }

    setIsAddingExtraMeals(true);
    try {
      addExtraMealRecord(null, extraMealCount, selectedDate);
      toast.success(
        `Added ${extraMealCount} extra meal${parseInt(extraMealCount, 10) > 1 ? "s" : ""} for ${new Date(selectedDate + "T00:00:00").toLocaleDateString()}!`,
      );
      setExtraMealCount("");
    } catch (error) {
      toast.error(`Error adding extra meals: ${error.message}`);
    } finally {
      setIsAddingExtraMeals(false);
    }
  };

  const handleStatusChange = (recordId, newStatus) => {
    updateLaundryStatus(recordId, newStatus);
    const info = getLaundryStatusInfo(newStatus);
    enhancedToast.success(`Laundry status updated to ${info.label}`);
  };

  const handleBagNumberUpdate = async (recordId, bagNumber) => {
    try {
      await updateLaundryBagNumber(recordId, bagNumber);
      setEditingBagNumber(null);
      setNewBagNumber("");
      enhancedToast.success("Bag number updated");
    } catch (error) {
      enhancedToast.error("Failed to update bag number");
    }
  };

  // Quick Actions handlers
  const handleQuickShower = () => {
    setActiveSection("showers");
    setQuickActionsVisible(false);
    // Scroll to top to show shower booking
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuickLaundry = () => {
    setActiveSection("laundry");
    setQuickActionsVisible(false);
    // Scroll to top to show laundry booking
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuickDonation = () => {
    setActiveSection("overview"); // Navigate to overview where donations are
    setQuickActionsVisible(false);
    // Scroll to top to show overview
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const attemptLaundryStatusChange = (record, newStatus) => {
    const hasBag = !!(record.bagNumber && String(record.bagNumber).trim());
    if (!hasBag) {
      setBagPromptRecord(record);
      setBagPromptNextStatus(newStatus);
      setBagPromptValue("");
      setBagPromptOpen(true);
      return;
    }
    handleStatusChange(record.id, newStatus);
  };

  const confirmBagPrompt = async () => {
    const val = (bagPromptValue || "").trim();
    if (!val) {
      toast.error("Please enter a bag number");
      return;
    }
    if (!bagPromptRecord) {
      setBagPromptOpen(false);
      return;
    }

    try {
      // Update bag number first
      await updateLaundryBagNumber(bagPromptRecord.id, val);

      // Then update status if needed
      if (bagPromptNextStatus) {
        handleStatusChange(bagPromptRecord.id, bagPromptNextStatus);
      }

      setBagPromptOpen(false);
      setBagPromptRecord(null);
      setBagPromptNextStatus(null);
      setBagPromptValue("");
      toast.success("Bag number saved and status updated");
    } catch (error) {
      toast.error("Failed to update bag number");
    }
  };

  const startEditingBagNumber = (recordId, currentBagNumber) => {
    setEditingBagNumber(recordId);
    setNewBagNumber(currentBagNumber || "");
  };

  const handleUndoAction = async (actionId) => {
    const success = await undoAction(actionId);
    if (success) {
      toast.success("Action undone");
    }
  };

  const todayActionHistory = actionHistory.filter((action) => {
    const actionDate = new Date(action.timestamp);
    const today = todayPacificDateString();
    const actionPT = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(actionDate);
    return actionPT === today;
  });

  const sections = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "timeline", label: "Timeline", icon: CalendarClock },
    { id: "meals", label: "Meals", icon: Utensils },
    { id: "showers", label: "Showers", icon: ShowerHead },
    { id: "laundry", label: "Laundry", icon: WashingMachine },
    { id: "bicycles", label: "Bicycle Repairs", icon: Bike },
    { id: "reports", label: "Insights & data", icon: TrendingUp },
    { id: "export", label: "Data export", icon: Download },
  ];

  const currentSectionMeta =
    sections.find((s) => s.id === activeSection) || sections[0];

  const Breadcrumbs = () => {
    return (
      <nav
        aria-label="Breadcrumb"
        className="text-xs sm:text-sm mb-4 flex items-center gap-2 flex-wrap"
      >
        <button
          onClick={() => setActiveSection("overview")}
          className={`hover:underline focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-1 ${activeSection === "overview" ? "font-semibold text-blue-700" : "text-gray-600"}`}
        >
          Dashboard
        </button>
        <span className="text-gray-400">/</span>
        {activeSection !== "overview" ? (
          <>
            <button
              onClick={() => setActiveSection(currentSectionMeta.id)}
              className="font-semibold text-gray-900 flex items-center gap-1 px-1 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
            >
              <currentSectionMeta.icon size={14} /> {currentSectionMeta.label}
            </button>
          </>
        ) : (
          <span className="text-gray-500">Home</span>
        )}
      </nav>
    );
  };

  // Timeline action renderers
  const renderShowerActions = (event) => {
    if (!event.originalRecord) return null;

    const record = event.originalRecord;
    const isCompleted = record.status === "done";

    return (
      <div className="flex items-center gap-1">
        {/* Reschedule button */}
        <button
          type="button"
          onClick={() => setShowerPickerGuest(record.guestId)}
          className="p-1 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700"
          title="Reschedule shower"
        >
          <Calendar size={14} />
        </button>

        {/* Toggle completion status */}
        <button
          type="button"
          onClick={() => {
            const nextStatus = isCompleted ? "awaiting" : "done";
            updateShowerStatus(record.id, nextStatus);
            toast.success(
              nextStatus === "done" ? "Marked as completed" : "Reopened shower",
            );
          }}
          className={`p-1 rounded text-xs px-2 py-1 ${
            isCompleted
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          }`}
          title={isCompleted ? "Reopen shower" : "Mark as done"}
        >
          {isCompleted ? (
            <RotateCcw size={12} />
          ) : (
            <CheckCircle2Icon size={12} />
          )}
        </button>
      </div>
    );
  };

  const renderLaundryActions = (event) => {
    if (!event.originalRecord) return null;

    const record = event.originalRecord;
    const statusInfo = getLaundryStatusInfo(record.status);

    // Get available status transitions based on current status and laundry type
    const getStatusButtons = () => {
      const buttons = [];

      if (record.laundryType === "onsite") {
        // Onsite laundry workflow
        if (record.status === LAUNDRY_STATUS.WAITING) {
          buttons.push({
            value: LAUNDRY_STATUS.WASHER,
            label: "Start Wash",
            icon: DropletIcon,
            activeClass: "bg-blue-100 text-blue-700",
            idleClass: "bg-blue-50 text-blue-600 hover:bg-blue-100",
          });
        } else if (record.status === LAUNDRY_STATUS.WASHER) {
          buttons.push({
            value: LAUNDRY_STATUS.DRYER,
            label: "To Dryer",
            icon: FanIcon,
            activeClass: "bg-orange-100 text-orange-700",
            idleClass: "bg-orange-50 text-orange-600 hover:bg-orange-100",
          });
        } else if (record.status === LAUNDRY_STATUS.DRYER) {
          buttons.push({
            value: LAUNDRY_STATUS.DONE,
            label: "Done",
            icon: CheckCircle2Icon,
            activeClass: "bg-green-100 text-green-700",
            idleClass: "bg-green-50 text-green-600 hover:bg-green-100",
          });
        } else if (record.status === LAUNDRY_STATUS.DONE) {
          buttons.push({
            value: LAUNDRY_STATUS.PICKED_UP,
            label: "Picked Up",
            icon: LogOutIcon,
            activeClass: "bg-purple-100 text-purple-700",
            idleClass: "bg-purple-50 text-purple-600 hover:bg-purple-100",
          });
        }
      } else {
        // Offsite laundry workflow
        if (record.status === LAUNDRY_STATUS.PENDING) {
          buttons.push({
            value: LAUNDRY_STATUS.TRANSPORTED,
            label: "Transport",
            icon: Truck,
            activeClass: "bg-blue-100 text-blue-700",
            idleClass: "bg-blue-50 text-blue-600 hover:bg-blue-100",
          });
        } else if (record.status === LAUNDRY_STATUS.TRANSPORTED) {
          buttons.push({
            value: LAUNDRY_STATUS.RETURNED,
            label: "Returned",
            icon: CheckCircle2Icon,
            activeClass: "bg-green-100 text-green-700",
            idleClass: "bg-green-50 text-green-600 hover:bg-green-100",
          });
        } else if (record.status === LAUNDRY_STATUS.RETURNED) {
          buttons.push({
            value: LAUNDRY_STATUS.OFFSITE_PICKED_UP,
            label: "Picked Up",
            icon: LogOutIcon,
            activeClass: "bg-purple-100 text-purple-700",
            idleClass: "bg-purple-50 text-purple-600 hover:bg-purple-100",
          });
        }
      }

      return buttons;
    };

    const statusButtons = getStatusButtons();

    return (
      <div className="flex items-center gap-1">
        {/* Bag number edit */}
        <button
          type="button"
          onClick={() => startEditingBagNumber(record.id, record.bagNumber)}
          className="p-1 rounded hover:bg-purple-50 text-purple-600 hover:text-purple-700"
          title="Edit bag number"
        >
          <Edit3 size={12} />
        </button>

        {/* Status progression buttons */}
        {statusButtons.map((buttonConfig) => {
          const Icon = buttonConfig.icon;
          return (
            <button
              key={buttonConfig.value}
              type="button"
              onClick={() =>
                attemptLaundryStatusChange(record, buttonConfig.value)
              }
              className={`text-xs font-medium px-2 py-1 rounded border transition-colors ${buttonConfig.idleClass}`}
              title={buttonConfig.label}
            >
              <Icon size={12} />
            </button>
          );
        })}

        {/* Reschedule button */}
        <button
          type="button"
          onClick={() => setLaundryPickerGuest(record.guestId)}
          className="p-1 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700"
          title="Reschedule laundry"
        >
          <Calendar size={14} />
        </button>
      </div>
    );
  };

  const renderTimelineSection = () => {
    const totalEvents = timelineEvents.length;
    const showerEvents = timelineEvents.filter(
      (event) => event.type === "shower",
    );
    const waitlistEvents = timelineEvents.filter(
      (event) => event.type === "waitlist",
    );
    const laundryEvents = timelineEvents.filter(
      (event) => event.type === "laundry",
    );
    const showerCompleted = showerEvents.filter(
      (event) => event.statusLabel === "Completed",
    ).length;
    const showerActive = showerEvents.length - showerCompleted;
    const laundryCompletedLabels = new Set(["Done", "Picked Up", "Returned"]);
    const laundryCompleted = laundryEvents.filter((event) =>
      laundryCompletedLabels.has(event.statusLabel),
    ).length;
    const laundryActive = laundryEvents.length - laundryCompleted;

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Quick Actions Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <SquarePlus size={16} className="text-blue-600" />
            Quick Add Services
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSection("showers")}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg text-sm font-medium transition-colors"
            >
              <ShowerHead size={14} />
              Add Shower
            </button>
            <button
              onClick={() => setActiveSection("laundry")}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-sm font-medium transition-colors"
            >
              <WashingMachine size={14} />
              Add Laundry
            </button>
            <button
              onClick={() => setActiveSection("meals")}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-sm font-medium transition-colors"
            >
              <Utensils size={14} />
              Add Meal
            </button>
            <button
              onClick={() => setActiveSection("bicycles")}
              className="flex items-center gap-2 px-3 py-2 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg text-sm font-medium transition-colors"
            >
              <Bike size={14} />
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
              <h2 className="text-2xl font-semibold mt-2">Today's timeline</h2>
              <p className="text-sm text-white/80 mt-3 max-w-xl">
                Follow showers and laundry from the first slot to the last
                pickup. Use the stats below to balance staff coverage and keep
                the queues moving.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 min-w-[150px]">
                <div className="text-xs uppercase tracking-wide text-white/70">
                  Logged touchpoints
                </div>
                <div className="text-lg font-semibold">
                  {totalEvents.toLocaleString()}
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 min-w-[150px]">
                <div className="text-xs uppercase tracking-wide text-white/70">
                  Shower queue
                </div>
                <div className="text-lg font-semibold">
                  {waitlistEvents.length > 0
                    ? `${waitlistEvents.length} waiting`
                    : "No waitlist"}
                </div>
              </div>
            </div>
          </div>
        </Animated.div>

        <Animated.div
          style={timelineStatsSpring}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          {[
            {
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
              accent:
                "bg-emerald-50 border border-emerald-100 text-emerald-700",
            },
          ].map(({ label, value, description, accent }) => (
            <div
              key={label}
              className={`rounded-2xl px-3 py-3 md:px-4 md:py-4 shadow-sm ${accent}`}
            >
              <p className="text-xs uppercase tracking-wide font-semibold">
                {label}
              </p>
              <p className="text-xl md:text-2xl font-semibold mt-1 md:mt-2">
                {value}
              </p>
              <p className="text-xs mt-1 md:mt-2 text-current/80">
                {description}
              </p>
            </div>
          ))}
        </Animated.div>

        <Animated.div
          style={timelineListSpring}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6"
        >
          {totalEvents === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No shower or laundry activity recorded yet today. Log bookings
              from the other tabs to populate this view.
            </div>
          ) : (
            <ol className="relative border-l border-gray-200">
              {timelineEvents.map((event, index) => {
                const style = timelineTrail[index] || {};
                const Icon = event.icon;
                return (
                  <Animated.li
                    key={event.id}
                    style={style}
                    className="ml-6 pb-4 md:pb-6 last:pb-0 relative"
                  >
                    <span className="absolute -left-[21px] top-2 flex items-center justify-center">
                      <span
                        className={`h-3 w-3 rounded-full ${event.accentClass}`}
                      />
                    </span>
                    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 md:px-4 md:py-3 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${event.iconWrapperClass}`}
                          >
                            <Icon size={18} />
                          </span>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {event.title}
                              </p>
                              {event.statusLabel ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${event.statusClass}`}
                                >
                                  {event.statusLabel}
                                </span>
                              ) : null}
                            </div>
                            {event.subtitle ? (
                              <p className="text-xs text-gray-500">
                                {event.subtitle}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            {event.timeLabel}
                          </div>
                          {/* Action buttons for timeline entries */}
                          {event.type === "shower" &&
                            renderShowerActions(event)}
                          {event.type === "laundry" &&
                            renderLaundryActions(event)}
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
                        {event.meta?.bagNumber ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-xs font-semibold text-purple-800">
                            <ShoppingBag size={10} />
                            Bag #{event.meta.bagNumber}
                          </span>
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
          )}
        </Animated.div>
      </div>
    );
  };

  const renderOverviewSection = () => {
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
      {
        id: "link-insights",
        title: "Insights & data",
        description: "View reports or export CSV snapshots for record keeping.",
        Icon: BarChart3,
        accent: "bg-slate-50 border border-slate-100 text-slate-700",
        onClick: () => setActiveSection("reports"),
        actions: [
          { label: "Open reports", handler: () => setActiveSection("reports") },
          { label: "Data export", handler: () => setActiveSection("export") },
        ],
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
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <Calendar size={14} /> Month to date
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Snapshot of the activity recorded since the start of the month.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {monthHighlights.map(
                  ({ id, label, value, Icon, badgeClass }) => {
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
                  },
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                <History size={14} /> Calendar year to date
              </h3>
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
                <DonutCard
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

  const renderReportsSection = () => {
    const tm = {
      mealsServed: todayMetrics?.mealsServed ?? 0,
      showersBooked: todayMetrics?.showersBooked ?? 0,
      laundryLoads: todayMetrics?.laundryLoads ?? 0,
      haircuts: todayMetrics?.haircuts ?? 0,
      holidays: todayMetrics?.holidays ?? 0,
      bicycles: todayMetrics?.bicycles ?? 0,
    };

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

    const today = new Date();
    const monthDaysElapsed = Math.max(1, today.getDate());
    const oneDayMs = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.max(
      1,
      Math.floor((today - new Date(today.getFullYear(), 0, 0)) / oneDayMs),
    );
    const lastSevenWindow = dailyServiceTotals.slice(-7);
    const lastSevenTotals = lastSevenWindow.reduce(
      (acc, day) => ({
        meals: acc.meals + (day?.meals ?? 0),
        showers: acc.showers + (day?.showers ?? 0),
        laundry: acc.laundry + (day?.laundry ?? 0),
        haircuts: acc.haircuts + (day?.haircuts ?? 0),
        holidays: acc.holidays + (day?.holidays ?? 0),
        bicycles: acc.bicycles + (day?.bicycles ?? 0),
      }),
      {
        meals: 0,
        showers: 0,
        laundry: 0,
        haircuts: 0,
        holidays: 0,
        bicycles: 0,
      },
    );

    const metricCards = [
      {
        id: "meals",
        label: "Meals served",
        icon: Utensils,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        monthTotal: monthMetrics.mealsServed,
        monthAvg: Math.round(monthMetrics.mealsServed / monthDaysElapsed) || 0,
        yearTotal: yearMetrics.mealsServed,
        yearAvg: Math.round(yearMetrics.mealsServed / dayOfYear) || 0,
        todayTotal: tm.mealsServed,
        weekTotal: lastSevenTotals.meals,
      },
      {
        id: "showers",
        label: "Showers completed",
        icon: ShowerHead,
        iconBg: "bg-sky-100",
        iconColor: "text-sky-600",
        monthTotal: monthMetrics.showersBooked,
        monthAvg:
          Math.round(monthMetrics.showersBooked / monthDaysElapsed) || 0,
        yearTotal: yearMetrics.showersBooked,
        yearAvg: Math.round(yearMetrics.showersBooked / dayOfYear) || 0,
        todayTotal: tm.showersBooked,
        weekTotal: lastSevenTotals.showers,
      },
      {
        id: "laundry",
        label: "Laundry loads",
        icon: WashingMachine,
        iconBg: "bg-purple-100",
        iconColor: "text-purple-600",
        monthTotal: monthMetrics.laundryLoads,
        monthAvg: Math.round(monthMetrics.laundryLoads / monthDaysElapsed) || 0,
        yearTotal: yearMetrics.laundryLoads,
        yearAvg: Math.round(yearMetrics.laundryLoads / dayOfYear) || 0,
        todayTotal: tm.laundryLoads,
        weekTotal: lastSevenTotals.laundry,
      },
      {
        id: "haircuts",
        label: "Haircuts",
        icon: Scissors,
        iconBg: "bg-pink-100",
        iconColor: "text-pink-600",
        monthTotal: monthMetrics.haircuts,
        monthAvg: Math.round(monthMetrics.haircuts / monthDaysElapsed) || 0,
        yearTotal: yearMetrics.haircuts,
        yearAvg: Math.round(yearMetrics.haircuts / dayOfYear) || 0,
        todayTotal: tm.haircuts,
        weekTotal: lastSevenTotals.haircuts,
      },
      {
        id: "holidays",
        label: "Holiday support",
        icon: Gift,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        monthTotal: monthMetrics.holidays,
        monthAvg: Math.round(monthMetrics.holidays / monthDaysElapsed) || 0,
        yearTotal: yearMetrics.holidays,
        yearAvg: Math.round(yearMetrics.holidays / dayOfYear) || 0,
        todayTotal: tm.holidays,
        weekTotal: lastSevenTotals.holidays,
      },
      {
        id: "bicycles",
        label: "Bicycle repairs",
        icon: Bike,
        iconBg: "bg-sky-100",
        iconColor: "text-sky-600",
        monthTotal: monthMetrics.bicycles,
        monthAvg: Math.round(monthMetrics.bicycles / monthDaysElapsed) || 0,
        yearTotal: yearMetrics.bicycles,
        yearAvg: Math.round(yearMetrics.bicycles / dayOfYear) || 0,
        todayTotal: tm.bicycles,
        weekTotal: lastSevenTotals.bicycles,
      },
    ];

    const chartHasData = dailyServiceTotals.some(
      (day) =>
        day?.meals ||
        day?.showers ||
        day?.laundry ||
        day?.haircuts ||
        day?.holidays ||
        day?.bicycles,
    );
    const laundryMealRatio = monthMetrics.mealsServed
      ? Math.round(
          (monthMetrics.laundryLoads / Math.max(1, monthMetrics.mealsServed)) *
            100,
        )
      : 0;
    const weeklyLaundryAvg =
      Math.round(
        lastSevenTotals.laundry / Math.max(1, lastSevenWindow.length),
      ) || 0;
    const weeklyShowersAvg =
      Math.round(
        lastSevenTotals.showers / Math.max(1, lastSevenWindow.length),
      ) || 0;

    const insightCards = [
      {
        id: "meals-insight",
        title: "Meals momentum",
        stat: `${monthMetrics.mealsServed.toLocaleString()} meals MTD`,
        description: `Averaging ${Math.round(monthMetrics.mealsServed / monthDaysElapsed).toLocaleString()} per day with ${lastSevenTotals.meals.toLocaleString()} served over the last seven days.`,
      },
      {
        id: "laundry-insight",
        title: "Laundry throughput",
        stat: `${monthMetrics.laundryLoads.toLocaleString()} loads`,
        description: `${laundryMealRatio}% of meal visits included laundry this month. Roughly ${weeklyLaundryAvg.toLocaleString()} loads per day over the last week.`,
      },
      {
        id: "showers-insight",
        title: "Shower coverage",
        stat: `${monthMetrics.showersBooked.toLocaleString()} showers`,
        description: `Completing about ${weeklyShowersAvg.toLocaleString()} showers per day this week. Year to date you have supported ${yearMetrics.showersBooked.toLocaleString()} showers.`,
      },
      {
        id: "bicycle-insight",
        title: "Bike shop impact",
        stat: `${monthMetrics.bicycles.toLocaleString()} repairs`,
        description: `${lastSevenTotals.bicycles.toLocaleString()} bicycles were finished this week. Keep statuses updated so the queue stays accurate.`,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} />
                Service insights & trends
              </h2>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Monitor momentum across every service. Use these numbers when
                planning volunteer staffing or reporting out to the board.
              </p>
            </div>
            <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
              Updated {today.toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${card.iconBg}`}
                  >
                    <Icon size={20} className={card.iconColor} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {card.label}
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {card.monthTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  MTD avg {card.monthAvg.toLocaleString()} / day · Today{" "}
                  {card.todayTotal.toLocaleString()}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      7-day total
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {card.weekTotal.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Year to date
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {card.yearTotal.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Avg {card.yearAvg.toLocaleString()} / day
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 flex items-center gap-2">
                <History size={14} /> 30-day activity trend
              </h3>
              <span className="text-xs text-gray-400">
                Rolling daily totals
              </span>
            </div>
            {chartHasData ? (
              <TrendLine
                days={dailyServiceTotals}
                metrics={["meals", "showers", "laundry"]}
              />
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
                No chart data recorded yet. Log services to build a 30-day view.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" /> Key insights
            </h3>
            <ul className="space-y-4">
              {insightCards.map((insight) => (
                <li
                  key={insight.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-1"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {insight.title}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {insight.stat}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {insight.description}
                  </p>
                </li>
              ))}
            </ul>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Need a CSV?
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Jump to the data export tab to download roster and template
                files.
              </p>
              <button
                type="button"
                onClick={() => setActiveSection("export")}
                className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
              >
                <Download size={14} /> Open data exports
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const resetMealReportTypes = useCallback(() => {
    setMealReportTypes(createDefaultMealReportTypes());
  }, [setMealReportTypes]);

  const selectAllMealReportTypes = useCallback(() => {
    const allSelected = MEAL_REPORT_TYPE_ORDER.reduce((acc, type) => {
      acc[type] = true;
      return acc;
    }, {});
    setMealReportTypes(allSelected);
  }, [setMealReportTypes]);

  const toggleMealReportType = useCallback(
    (type) => {
      setMealReportTypes((prev) => ({
        ...prev,
        [type]: !prev[type],
      }));
    },
    [setMealReportTypes],
  );

  const handleDownloadMealReport = useCallback(() => {
    if (!mealReportStart || !mealReportEnd) {
      toast.error("Select a start and end date before downloading.");
      return;
    }

    if (mealReportStart > mealReportEnd) {
      toast.error("The start date must be before the end date.");
      return;
    }

    const selectedTypes = MEAL_REPORT_TYPE_ORDER.filter(
      (type) => mealReportTypes[type],
    );

    if (!selectedTypes.length) {
      toast.error("Pick at least one meal type to include.");
      return;
    }

    const totals = createEmptyMealTotals();
    const dailyTotals = new Map();

    const ensureDayEntry = (day) => {
      if (!dailyTotals.has(day)) {
        dailyTotals.set(day, createEmptyMealTotals());
      }
      return dailyTotals.get(day);
    };

    const addRecord = (recordDate, type, rawCount) => {
      const day = pacificDateStringFrom(recordDate || "");
      if (!day) return;
      if (day < mealReportStart || day > mealReportEnd) return;
      if (!MEAL_REPORT_TYPE_ORDER.includes(type)) return;
      const count = toCountValue(rawCount);
      if (!count) return;

      const entry = ensureDayEntry(day);
      entry[type] += count;
      totals[type] += count;
    };

    (mealRecords || []).forEach((record) =>
      addRecord(record?.date, "guest", record?.count),
    );
    (dayWorkerMealRecords || []).forEach((record) =>
      addRecord(record?.date, "dayWorker", record?.count),
    );
    (rvMealRecords || []).forEach((record) =>
      addRecord(record?.date, "rv", record?.count),
    );
    (unitedEffortMealRecords || []).forEach((record) =>
      addRecord(record?.date, "unitedEffort", record?.count),
    );
    (extraMealRecords || []).forEach((record) =>
      addRecord(record?.date, "extras", record?.count),
    );
    (lunchBagRecords || []).forEach((record) =>
      addRecord(record?.date, "lunchBags", record?.count),
    );

    const sortedDays = Array.from(dailyTotals.keys()).sort();
    const rows = [];

    sortedDays.forEach((day) => {
      const entry = dailyTotals.get(day) || createEmptyMealTotals();
      const values = selectedTypes.map((type) => entry[type] || 0);
      const rowTotal = values.reduce((sum, value) => sum + value, 0);

      if (rowTotal === 0) {
        return;
      }

      rows.push([day, ...values, rowTotal]);
    });

    if (!rows.length) {
      toast.error("No meals matched those filters.");
      return;
    }

    const header = [
      "Date",
      ...selectedTypes.map((type) => MEAL_REPORT_TYPE_LABELS[type]),
      "Daily total",
    ];
    const grandTotal = selectedTypes.reduce(
      (sum, type) => sum + (totals[type] || 0),
      0,
    );
    const totalsRow = [
      "Total",
      ...selectedTypes.map((type) => totals[type] || 0),
      grandTotal,
    ];

    const csvLines = [
      header.map(toCsvValue).join(","),
      ...rows.map((row) => row.map(toCsvValue).join(",")),
      totalsRow.map(toCsvValue).join(","),
    ];

    const csvContent = csvLines.join("\n");
    const fileName = `meal-report_${mealReportStart}_to_${mealReportEnd}.csv`;

    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Meal report downloaded.");
    } catch (error) {
      console.error("Failed to download meal report", error);
      toast.error("Something went wrong exporting the meal report.");
    }
  }, [
    dayWorkerMealRecords,
    extraMealRecords,
    lunchBagRecords,
    mealRecords,
    mealReportEnd,
    mealReportStart,
    mealReportTypes,
    rvMealRecords,
    toCountValue,
    unitedEffortMealRecords,
  ]);

  const renderExportSection = () => {
    const mealReportTypeOptions = [
      {
        id: "guest",
        label: "Guest meals",
        description: "Meals given to registered guests.",
      },
      {
        id: "dayWorker",
        label: "Day Worker Center meals",
        description: "Partner deliveries to the Day Worker Center.",
      },
      {
        id: "rv",
        label: "RV meals",
        description: "Outreach meals served to RV communities.",
      },
      {
        id: "unitedEffort",
        label: "United Effort meals",
        description: "Meals prepared for United Effort partners.",
      },
      {
        id: "extras",
        label: "Extra meals",
        description: "Guest extras and unassigned walk-up meals.",
      },
      {
        id: "lunchBags",
        label: "Lunch bags",
        description: "Bagged lunches prepared for takeout.",
      },
    ];

    const activeMealTypeCount = mealReportTypeOptions.filter(
      (option) => mealReportTypes[option.id],
    ).length;
    const mealReportRangeInvalid = Boolean(
      mealReportStart && mealReportEnd && mealReportStart > mealReportEnd,
    );
    const canDownloadMealReport = Boolean(
      mealReportStart &&
        mealReportEnd &&
        !mealReportRangeInvalid &&
        activeMealTypeCount > 0,
    );

    const exportCards = [
      {
        id: "guest-roster",
        title: "Guest roster (.csv)",
        description:
          "Download the latest roster with preferred names for offline check-in or reporting.",
        icon: Users,
        href: "/guest_list.csv",
        meta: `${guests.length.toLocaleString()} guests currently in the system`,
      },
      {
        id: "guest-template",
        title: "Guest import template",
        description:
          "Start new batch uploads with the official column headers and sample formatting.",
        icon: SquarePlus,
        href: "/guest_template.csv",
        meta: "CSV includes notes for email/phone columns",
      },
    ];

    const bestPractices = [
      'Add the date to exported filenames, e.g., "services-2025-03-15.csv" for easier retrieval later.',
      "Store downloads in a secure shared drive (Google Drive, SharePoint, etc.) so the whole team can access the history.",
      "Capture exports before clearing queues or using the System Utilities reset to keep an audit trail.",
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Download className="text-slate-600" size={20} /> Data exports &
            backups
          </h2>
          <p className="text-sm text-gray-500 max-w-2xl">
            Keep reliable offsite copies of your records. The links below pull
            the same files used throughout the dashboard so you can archive them
            or share with partners.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Utensils size={18} className="text-blue-600" /> Custom meal
              summary (.csv)
            </h3>
            <p className="text-sm text-gray-600">
              Pick a date range, choose which meal programs to include, and
              download a daily breakdown. Lunch bags stay out of the total by
              default—turn them on if you need the outreach count.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm text-gray-700 gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Start date
              </span>
              <input
                type="date"
                value={mealReportStart || ""}
                onChange={(event) => setMealReportStart(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="flex flex-col text-sm text-gray-700 gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                End date
              </span>
              <input
                type="date"
                value={mealReportEnd || ""}
                onChange={(event) => setMealReportEnd(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {mealReportRangeInvalid && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              <Circle size={14} className="text-red-500" /> Start date must be
              on or before the end date.
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Meal types
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {mealReportTypeOptions.map((option) => {
                const isActive = Boolean(mealReportTypes[option.id]);
                return (
                  <label
                    key={option.id}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                      isActive
                        ? "border-blue-200 bg-blue-50/80 shadow-sm"
                        : "border-gray-200 hover:border-blue-200 hover:bg-blue-50/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleMealReportType(option.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex flex-col text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs font-medium text-gray-500">
              {activeMealTypeCount} of {mealReportTypeOptions.length} meal types
              selected
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllMealReportTypes}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600"
              >
                <Circle size={12} /> Select all
              </button>
              <button
                type="button"
                onClick={resetMealReportTypes}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-blue-200 hover:text-blue-600"
              >
                <RotateCcw size={12} /> Reset defaults
              </button>
              <button
                type="button"
                onClick={handleDownloadMealReport}
                disabled={!canDownloadMealReport}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${
                  canDownloadMealReport
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "cursor-not-allowed bg-gray-300"
                }`}
              >
                <Download size={12} /> Download CSV
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportCards.map((card) => {
            const Icon = card.icon;
            return (
              <a
                key={card.id}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="group bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Icon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                      {card.title}
                    </h3>
                    <p className="text-xs text-blue-600 font-semibold">
                      Opens in a new tab
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {card.description}
                </p>
                <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 self-start">
                  {card.meta}
                </span>
              </a>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 flex items-center gap-2">
            <ClipboardList size={14} /> Record keeping best practices
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            {bestPractices.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-600">
            Looking for richer analytics? Visit the Admin Dashboard &rarr;
            Reports tab to export combined meal, laundry, and shower summaries
            by date range.
          </div>
        </div>
      </div>
    );
  };

  const renderMealsSection = () => {
    const mergedGuestMeals = [
      ...selectedGuestMealRecords,
      ...selectedGuestExtraMealRecords,
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalGuestMeals = mergedGuestMeals.reduce(
      (sum, record) => sum + record.count,
      0,
    );
    const totalGuestExtraMeals = selectedGuestExtraMealRecords.reduce(
      (sum, record) => sum + record.count,
      0,
    );
    const totalRvMeals = selectedRvMealRecords.reduce(
      (sum, record) => sum + record.count,
      0,
    );
    const selectedUeMealRecords = (unitedEffortMealRecords || []).filter(
      (record) => pacificDateStringFrom(record.date || "") === selectedDate,
    );
    const totalUeMeals = selectedUeMealRecords.reduce(
      (sum, record) => sum + record.count,
      0,
    );
    const selectedGlobalExtraMealRecords = (extraMealRecords || []).filter(
      (record) =>
        !record.guestId &&
        pacificDateStringFrom(record.date || "") === selectedDate,
    );
    const totalExtraMeals = selectedGlobalExtraMealRecords.reduce(
      (sum, record) => sum + record.count,
      0,
    );
    const totalCombinedExtras = totalExtraMeals + totalGuestExtraMeals;
    const selectedDayWorkerMealRecords = (dayWorkerMealRecords || []).filter(
      (record) => pacificDateStringFrom(record.date || "") === selectedDate,
    );
    const totalDayWorkerMeals = selectedDayWorkerMealRecords.reduce(
      (sum, record) => sum + record.count,
      0,
    );
    const selectedLunchBagRecords = (lunchBagRecords || []).filter((r) =>
      (r.date || "").startsWith(selectedDate),
    );
    const totalLunchBags = selectedLunchBagRecords.reduce(
      (sum, record) => sum + (record.count || 0),
      0,
    );
    const totalMeals =
      totalGuestMeals +
      totalRvMeals +
      totalUeMeals +
      totalExtraMeals +
      totalDayWorkerMeals;
    const totalMealsExcludingLunch = totalMeals;
    const selectedDateLabel = new Date(
      selectedDate + "T00:00:00",
    ).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const highlightStats = [
      {
        id: "core-total",
        title: "Total meals (excl. lunch bags)",
        value: totalMealsExcludingLunch,
        Icon: Utensils,
        description: `Guest, partner, and extra meals logged for ${selectedDateLabel}.`,
      },
      {
        id: "lunch-bags",
        title: "Lunch bags packed",
        value: totalLunchBags,
        Icon: Apple,
        description: `Ready-to-go outreach lunches recorded on ${selectedDateLabel}.`,
      },
    ];

    const mealCategoryCards = [
      {
        id: "guest-meals",
        title: "Guest meals",
        value: totalGuestMeals,
        Icon: Users,
        chip: `${mergedGuestMeals.length} entries`,
        tone: "bg-emerald-100 text-emerald-700",
      },
      {
        id: "day-worker",
        title: "Day Worker Center",
        value: totalDayWorkerMeals,
        Icon: SquarePlus,
        chip: `${selectedDayWorkerMealRecords.length} records`,
        tone: "bg-indigo-100 text-indigo-700",
      },
      {
        id: "rv-meals",
        title: "RV meals",
        value: totalRvMeals,
        Icon: Caravan,
        chip: `${selectedRvMealRecords.length} logs`,
        tone: "bg-orange-100 text-orange-700",
      },
      {
        id: "united-effort",
        title: "United Effort",
        value: totalUeMeals,
        Icon: HeartHandshake,
        chip: `${selectedUeMealRecords.length} logs`,
        tone: "bg-sky-100 text-sky-700",
      },
      {
        id: "extra-meals",
        title: "Extra meals",
        value: totalCombinedExtras,
        Icon: Sparkles,
        chip: `Guest extras ${totalGuestExtraMeals.toLocaleString()} • Global extras ${totalExtraMeals.toLocaleString()}`,
        tone: "bg-amber-100 text-amber-700",
      },
    ];

    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-sky-500 text-white shadow-sm p-6 lg:p-8 space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/70 font-semibold">
                Meals tracker
              </p>
              <h2 className="text-2xl font-semibold">Daily meal operations</h2>
              <p className="text-sm text-white/80">
                Pick a date to log partner meals, walk-up extras, and lunch bag
                prep. Totals refresh instantly so shifts and reports stay in
                sync.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-[220px]">
              {highlightStats.map((stat) => {
                const Icon = stat.Icon;
                return (
                  <div
                    key={stat.id}
                    className="bg-white/15 border border-white/20 rounded-2xl px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-white/80 text-xs uppercase tracking-wide font-semibold">
                      <Icon size={14} className="text-white" />
                      {stat.title}
                    </div>
                    <p className="text-2xl font-semibold mt-2">
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/70 mt-1 leading-relaxed">
                      {stat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Meals date
              </label>
              <div className="text-sm text-white/80">
                Entries will be logged for{" "}
                <span className="font-semibold text-white">
                  {selectedDateLabel}
                </span>
                .
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="date"
                value={mealsDate}
                onChange={(event) => setMealsDate(event.target.value)}
                className="px-3 py-2 rounded-md text-sm bg-white text-gray-900 border border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-200"
                max={todayShorthand}
              />
              <span className="text-xs text-white/70">
                Tip: adjust to backfill or correct earlier days.
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {mealCategoryCards.map((card) => {
            const Icon = card.Icon;
            return (
              <div
                key={card.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Icon size={20} className="text-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {card.title}
                      </p>
                      <p className="text-xl font-semibold text-gray-900">
                        {card.value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {card.chip && (
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full border ${card.tone}`}
                    >
                      {card.chip}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Captured for {selectedDateLabel}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <SquarePlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-indigo-900">
                      Day Worker Center
                    </h3>
                    <p className="text-xs text-indigo-600">
                      Partner drop-off meals
                    </p>
                  </div>
                </div>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                  {totalDayWorkerMeals.toLocaleString()} today
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  value={dayWorkerMealCount}
                  onChange={(event) =>
                    setDayWorkerMealCount(event.target.value)
                  }
                  placeholder="Number of meals delivered"
                  className="flex-1 px-3 py-2 border border-indigo-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  min="1"
                  disabled={isAddingDayWorkerMeals}
                />
                <button
                  onClick={() => {
                    if (
                      !dayWorkerMealCount ||
                      isNaN(dayWorkerMealCount) ||
                      parseInt(dayWorkerMealCount, 10) <= 0
                    ) {
                      toast.error("Enter a valid number of meals");
                      return;
                    }
                    setIsAddingDayWorkerMeals(true);
                    try {
                      addDayWorkerMealRecord(dayWorkerMealCount, selectedDate);
                      toast.success(
                        `Added ${dayWorkerMealCount} day worker meals for ${selectedDateLabel}!`,
                      );
                      setDayWorkerMealCount("");
                    } catch (error) {
                      toast.error(`Error: ${error.message}`);
                    } finally {
                      setIsAddingDayWorkerMeals(false);
                    }
                  }}
                  disabled={isAddingDayWorkerMeals || !dayWorkerMealCount}
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:bg-indigo-300"
                >
                  {isAddingDayWorkerMeals ? "Saving…" : "Add DW meals"}
                </button>
              </div>
              {selectedDayWorkerMealRecords.length > 0 ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700 space-y-1">
                  <div className="font-semibold text-indigo-800">
                    Entries for {selectedDateLabel}
                  </div>
                  <ul className="space-y-1">
                    {selectedDayWorkerMealRecords.map((record) => (
                      <li key={record.id} className="flex justify-between">
                        <span>
                          {new Date(record.date).toLocaleTimeString()}
                        </span>
                        <span className="font-semibold">
                          {record.count} meals
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-indigo-500">
                  No day worker meals logged yet for this date.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                      <Caravan size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-orange-900">
                        RV meals
                      </h3>
                      <p className="text-xs text-orange-600">
                        Outreach delivery
                      </p>
                    </div>
                  </div>
                  <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-3 py-1 rounded-full">
                    {totalRvMeals.toLocaleString()} today
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="number"
                    value={rvMealCount}
                    onChange={(event) => setRvMealCount(event.target.value)}
                    placeholder="Number of RV meals"
                    className="flex-1 px-3 py-2 border border-orange-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    min="1"
                    disabled={isAddingRvMeals}
                  />
                  <button
                    onClick={handleAddRvMeals}
                    disabled={isAddingRvMeals || !rvMealCount}
                    className="px-4 py-2 rounded-md bg-orange-600 text-white text-sm font-semibold hover:bg-orange-500 disabled:bg-orange-300"
                  >
                    {isAddingRvMeals ? "Saving…" : "Add RV meals"}
                  </button>
                </div>
                {selectedRvMealRecords.length > 0 ? (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-700 space-y-1">
                    <div className="font-semibold text-orange-800">
                      Entries for {selectedDateLabel}
                    </div>
                    <ul className="space-y-1">
                      {selectedRvMealRecords.map((record) => (
                        <li key={record.id} className="flex justify-between">
                          <span>
                            {new Date(record.date).toLocaleTimeString()}
                          </span>
                          <span className="font-semibold">
                            {record.count} meals
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-orange-500">
                    No RV meals logged yet for this date.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
                      <HeartHandshake size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-sky-900">
                        United Effort meals
                      </h3>
                      <p className="text-xs text-sky-600">Partner pickup</p>
                    </div>
                  </div>
                  <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-3 py-1 rounded-full">
                    {totalUeMeals.toLocaleString()} today
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="number"
                    value={ueMealCount}
                    onChange={(event) => setUeMealCount(event.target.value)}
                    placeholder="Number of United Effort meals"
                    className="flex-1 px-3 py-2 border border-sky-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    min="1"
                    disabled={isAddingUeMeals}
                  />
                  <button
                    onClick={handleAddUeMeals}
                    disabled={isAddingUeMeals || !ueMealCount}
                    className="px-4 py-2 rounded-md bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500 disabled:bg-sky-300"
                  >
                    {isAddingUeMeals ? "Saving…" : "Add UE meals"}
                  </button>
                </div>
                {selectedUeMealRecords.length > 0 ? (
                  <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-xs text-sky-700 space-y-1">
                    <div className="font-semibold text-sky-800">
                      Entries for {selectedDateLabel}
                    </div>
                    <ul className="space-y-1">
                      {selectedUeMealRecords.map((record) => (
                        <li key={record.id} className="flex justify-between">
                          <span>
                            {new Date(record.date).toLocaleTimeString()}
                          </span>
                          <span className="font-semibold">
                            {record.count} meals
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-sky-500">
                    No United Effort meals logged yet for this date.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-amber-900">
                      Extra meals
                    </h3>
                    <p className="text-xs text-amber-600">
                      Walk-ups without guest record
                    </p>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full">
                  {totalExtraMeals.toLocaleString()} today
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  value={extraMealCount}
                  onChange={(event) => setExtraMealCount(event.target.value)}
                  placeholder="Number of extra meals"
                  className="flex-1 px-3 py-2 border border-amber-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  min="1"
                  disabled={isAddingExtraMeals}
                />
                <button
                  onClick={handleAddExtraMeals}
                  disabled={isAddingExtraMeals || !extraMealCount}
                  className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500 disabled:bg-amber-300"
                >
                  {isAddingExtraMeals ? "Saving…" : "Add extra meals"}
                </button>
              </div>
              {selectedGlobalExtraMealRecords.length > 0 ? (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 space-y-1">
                  <div className="font-semibold text-amber-800">
                    Entries for {selectedDateLabel}
                  </div>
                  <ul className="space-y-1">
                    {selectedGlobalExtraMealRecords.map((record) => (
                      <li key={record.id} className="flex justify-between">
                        <span>
                          {new Date(record.date).toLocaleTimeString()}
                        </span>
                        <span className="font-semibold">
                          {record.count} meals
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-amber-500">
                  No unassigned extra meals logged yet for this date.
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-lime-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-lime-50 text-lime-600 flex items-center justify-center">
                    <Apple size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-lime-900">
                      Lunch bags
                    </h3>
                    <p className="text-xs text-lime-600">
                      For takeout purposes
                    </p>
                  </div>
                </div>
                <span className="bg-lime-100 text-lime-800 text-xs font-semibold px-3 py-1 rounded-full">
                  {totalLunchBags.toLocaleString()} today
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  value={lunchBagCount}
                  onChange={(event) => setLunchBagCount(event.target.value)}
                  placeholder="Number of lunch bags"
                  className="flex-1 px-3 py-2 border border-lime-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                  min="1"
                  disabled={isAddingLunchBags}
                />
                <button
                  onClick={() => {
                    if (
                      !lunchBagCount ||
                      isNaN(lunchBagCount) ||
                      parseInt(lunchBagCount, 10) <= 0
                    ) {
                      toast.error("Enter a valid number of lunch bags");
                      return;
                    }
                    setIsAddingLunchBags(true);
                    try {
                      addLunchBagRecord(lunchBagCount, selectedDate);
                      toast.success(
                        `Added ${lunchBagCount} lunch bag${parseInt(lunchBagCount, 10) > 1 ? "s" : ""} for ${selectedDateLabel}`,
                      );
                      setLunchBagCount("");
                    } catch (error) {
                      toast.error(error.message || "Error adding lunch bags");
                    } finally {
                      setIsAddingLunchBags(false);
                    }
                  }}
                  disabled={isAddingLunchBags || !lunchBagCount}
                  className="px-4 py-2 rounded-md bg-lime-600 text-white text-sm font-semibold hover:bg-lime-500 disabled:bg-lime-300"
                >
                  {isAddingLunchBags ? "Saving…" : "Add lunch bags"}
                </button>
              </div>
              {selectedLunchBagRecords.length > 0 ? (
                <div className="bg-lime-50 border border-lime-100 rounded-lg p-3 text-xs text-lime-700 space-y-1">
                  <div className="font-semibold text-lime-800">
                    Entries for {selectedDateLabel}
                  </div>
                  <ul className="space-y-1">
                    {selectedLunchBagRecords.map((record) => (
                      <li key={record.id} className="flex justify-between">
                        <span>
                          {new Date(record.date).toLocaleTimeString()}
                        </span>
                        <span className="font-semibold">
                          {record.count} bag{record.count > 1 ? "s" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-lime-500">
                  No lunch bags logged yet for this date.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Utensils className="text-emerald-600" size={22} />
                  Guest meal log
                </h2>
                <p className="text-sm text-gray-500">
                  Includes guest-specific meals and guest extras for{" "}
                  {selectedDateLabel}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">
                  {totalGuestMeals.toLocaleString()} guest meals
                </span>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                  {totalMealsExcludingLunch.toLocaleString()} meals excl. lunch
                  bags
                </span>
              </div>
            </div>

            {mergedGuestMeals.length === 0 ? (
              <div className="border border-dashed border-emerald-200 rounded-xl text-center py-12 text-sm text-emerald-600 bg-emerald-50">
                No guest meals logged for this date yet.
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl divide-y">
                {mergedGuestMeals.map((rec) => {
                  const isExtraGuestMeal = !!(
                    rec.guestId &&
                    extraMealRecords.some((er) => er.id === rec.id)
                  );
                  return (
                    <div
                      key={rec.id}
                      className="p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {getGuestName(rec.guestId)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(rec.date).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                          {rec.count} meal{rec.count > 1 ? "s" : ""}
                        </span>
                        {isExtraGuestMeal && (
                          <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                            Extra
                          </span>
                        )}
                        <button
                          className="text-xs font-medium px-2.5 py-1 rounded-full border border-red-200 text-red-700 hover:bg-red-50"
                          title="Delete this entry"
                          onClick={async () => {
                            const matchingMeal = actionHistory.find(
                              (a) =>
                                a.type === "MEAL_ADDED" &&
                                a.data?.recordId === rec.id,
                            );
                            const matchingExtra = actionHistory.find(
                              (a) =>
                                a.type === "EXTRA_MEALS_ADDED" &&
                                a.data?.recordId === rec.id,
                            );
                            if (matchingMeal) {
                              const ok = await undoAction(matchingMeal.id);
                              if (ok) {
                                toast.success("Meal entry deleted");
                                return;
                              }
                            } else if (matchingExtra) {
                              const ok = await undoAction(matchingExtra.id);
                              if (ok) {
                                toast.success("Extra meal entry deleted");
                                return;
                              }
                            }
                            const recordType =
                              rec.type ||
                              (isExtraGuestMeal ? "extra" : "guest");
                            const ok = await removeMealAttendanceRecord(
                              rec.id,
                              recordType,
                            );
                            if (ok) {
                              toast.success(
                                isExtraGuestMeal
                                  ? "Extra meal entry deleted"
                                  : "Meal entry deleted",
                              );
                            } else {
                              toast.error("Unable to delete meal entry.");
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "overview":
        return renderOverviewSection();
      case "timeline":
        return renderTimelineSection();
      case "meals":
        return renderMealsSection();
      case "showers":
        return renderShowersSection();
      case "laundry":
        return renderLaundrySection();
      case "bicycles":
        return renderBicycleRepairsSection();
      case "reports":
        return renderReportsSection();
      case "export":
        return renderExportSection();
      default:
        return renderOverviewSection();
    }
  };

  const renderShowersSection = () => {
    const slotDetails = allShowerSlots.map((slotTime) => {
      const bookings = todayBookedShowers.filter(
        (record) => record.time === slotTime,
      );
      const completed = bookings.filter(
        (record) => record.status === "done",
      ).length;
      return {
        slotTime,
        label: formatShowerSlotLabel(slotTime),
        count: bookings.length,
        completed,
        isFull: bookings.length >= 2,
      };
    });

    const totalCapacity = allShowerSlots.length * 2;
    const occupied = todayBookedShowers.length;
    const doneCount = todayBookedShowers.filter(
      (record) => record.status === "done",
    ).length;
    const capacityProgress = totalCapacity
      ? Math.min((occupied / totalCapacity) * 100, 100)
      : 0;
    const nextAvailable = slotDetails.find((detail) => detail.count < 2);
    const nextSlotLabel = nextAvailable ? nextAvailable.label : "Waitlist only";
    const nextSlotCapacity = nextAvailable ? 2 - nextAvailable.count : 0;
    const nearlyFull = slotDetails.filter(
      (detail) => detail.count === 1,
    ).length;
    const fullSlots = slotDetails.filter((detail) => detail.isFull).length;
    const showerSlotOptions = (allShowerSlots || []).map((slot) => ({
      value: slot,
      label: formatShowerSlotLabel(slot),
    }));

    const renderShowerCard = (record, animationStyle) => {
      if (!record) return null;
      const guest = guests.find((g) => g.id === record.guestId);
      const nameDetails = getGuestNameDetails(record.guestId);
      const guestName = nameDetails.primaryName;
      const canT = guest ? canGiveItem(guest.id, "tshirt") : false;
      const canSB = guest ? canGiveItem(guest.id, "sleeping_bag") : false;
      const canBP = guest ? canGiveItem(guest.id, "backpack") : false;
      const canTent = guest ? canGiveItem(guest.id, "tent") : false;
      const canFF = guest ? canGiveItem(guest.id, "flip_flops") : false;
      const daysT = guest ? getDaysUntilAvailable(guest.id, "tshirt") : 0;
      const daysSB = guest
        ? getDaysUntilAvailable(guest.id, "sleeping_bag")
        : 0;
      const daysBP = guest ? getDaysUntilAvailable(guest.id, "backpack") : 0;
      const daysTent = guest ? getDaysUntilAvailable(guest.id, "tent") : 0;
      const daysFF = guest ? getDaysUntilAvailable(guest.id, "flip_flops") : 0;
      const lastTGuest = guest ? getLastGivenItem(guest.id, "tshirt") : null;
      const lastSBGuest = guest
        ? getLastGivenItem(guest.id, "sleeping_bag")
        : null;
      const lastBPGuest = guest ? getLastGivenItem(guest.id, "backpack") : null;
      const lastTentGuest = guest ? getLastGivenItem(guest.id, "tent") : null;
      const lastFFGuest = guest
        ? getLastGivenItem(guest.id, "flip_flops")
        : null;
      const hasLaundryToday = guest ? laundryGuestIdsSet.has(guest.id) : false;
      const isDone = record.status === "done";
      const slotLabel = formatShowerSlotLabel(record.time);
      const bookedLabel = new Date(record.date).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const statusInfo = getShowerStatusInfo(record.status);
      const StatusIcon = statusInfo.icon;
      const statusIconSize = statusInfo.icon === Circle ? 10 : 12;
      const badgeIconSize = statusInfo.icon === Circle ? 12 : 14;
      const toggleStatusLabel = isDone ? "Reopen shower" : "Mark as complete";
      const toggleStatusClass = isDone
        ? "bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
        : "bg-blue-600 text-white border border-blue-600 hover:bg-blue-500";

      const essentialsConfig = guest
        ? [
            {
              key: "tshirt",
              label: "T-Shirt (Weekly)",
              buttonLabel: "Give T-Shirt",
              icon: Shirt,
              canGive: canT,
              lastRecord: lastTGuest,
              daysRemaining: daysT,
              successMessage: "T-Shirt given",
            },
            {
              key: "sleeping_bag",
              label: "Sleeping Bag (Monthly)",
              buttonLabel: "Give Sleeping Bag",
              icon: Bed,
              canGive: canSB,
              lastRecord: lastSBGuest,
              daysRemaining: daysSB,
              successMessage: "Sleeping bag given",
            },
            {
              key: "backpack",
              label: "Backpack (Monthly)",
              buttonLabel: "Give Backpack",
              icon: Backpack,
              canGive: canBP,
              lastRecord: lastBPGuest,
              daysRemaining: daysBP,
              successMessage: "Backpack given",
            },
            {
              key: "tent",
              label: "Tent (Monthly)",
              buttonLabel: "Give Tent",
              icon: TentTree,
              canGive: canTent,
              lastRecord: lastTentGuest,
              daysRemaining: daysTent,
              successMessage: "Tent given",
            },
            {
              key: "flip_flops",
              label: "Flip Flops (Monthly)",
              buttonLabel: "Give Flip Flops",
              icon: Footprints,
              canGive: canFF,
              lastRecord: lastFFGuest,
              daysRemaining: daysFF,
              successMessage: "Flip Flops given",
            },
          ]
        : [];

      const handleGiveItem = (itemKey, successMessage) => {
        if (!guest) return;
        try {
          giveItem(guest.id, itemKey);
          toast.success(successMessage);
        } catch (error) {
          toast.error(error.message);
        }
      };

      return (
        <Animated.div
          key={record.id}
          style={animationStyle}
          className="will-change-transform bg-white border border-blue-100 rounded-xl shadow-sm p-4"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-gray-900">
                    {guestName}
                  </span>
                  {nameDetails.hasPreferred && (
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      Legal: {nameDetails.legalName}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1 ${statusInfo.chipClass}`}
                  >
                    <StatusIcon
                      size={statusIconSize}
                      className={`${statusInfo.iconClass || ""} shrink-0`}
                    />
                    {statusInfo.label}
                  </span>
                  {hasLaundryToday && (
                    <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      Laundry today
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> Slot {slotLabel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <LogOutIcon size={12} className="rotate-180" /> Booked{" "}
                    {bookedLabel}
                  </span>
                </div>
              </div>
              <div
                className={`${statusInfo.badgeClass} px-3 py-1.5 text-xs font-medium rounded-full inline-flex items-center gap-1`}
              >
                <StatusIcon
                  size={badgeIconSize}
                  className={`${statusInfo.iconClass || ""} shrink-0`}
                />
                <span>{statusInfo.label}</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <span className="font-semibold text-blue-900 uppercase tracking-wide flex items-center gap-1">
                  <Clock size={12} className="text-blue-500" />
                  Slot
                </span>
                <Selectize
                  options={showerSlotOptions}
                  value={record.time || ""}
                  onChange={(time) => {
                    try {
                      rescheduleShower(record.id, time);
                      if (record.status === "waitlisted") {
                        updateShowerStatus(record.id, "awaiting");
                      }
                      const friendly = formatShowerSlotLabel(time);
                      toast.success(
                        `Shower moved to ${friendly || "new slot"}`,
                      );
                    } catch (error) {
                      toast.error(error.message);
                    }
                  }}
                  size="xs"
                  className="w-40"
                  placeholder="Select slot"
                  displayValue={
                    record.time
                      ? formatShowerSlotLabel(record.time)
                      : "Select slot"
                  }
                />
                <span className="text-[11px] text-blue-600">
                  2 guests max per slot
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const nextStatus = isDone ? "awaiting" : "done";
                      updateShowerStatus(record.id, nextStatus);
                      toast.success(
                        nextStatus === "done"
                          ? "Marked as completed"
                          : "Reopened shower",
                      );
                    } catch (error) {
                      toast.error(error.message);
                    }
                  }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${toggleStatusClass}`}
                >
                  {toggleStatusLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      cancelShowerRecord(record.id);
                      toast.success("Shower booking cancelled");
                    } catch (error) {
                      toast.error(error.message);
                    }
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 text-red-700 hover:bg-red-50"
                >
                  Cancel booking
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800 font-semibold text-xs uppercase tracking-wide mb-3">
                <Sparkles size={14} className="text-blue-500" />
                <span>Guest essentials kit</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {essentialsConfig.map((item) => {
                  const Icon = item.icon;
                  const nextDate = item.lastRecord
                    ? getNextAvailabilityDate(item.key, item.lastRecord.date)
                    : null;
                  const nextDateLabel = nextDate
                    ? nextDate.toLocaleDateString("en-CA")
                    : null;
                  return (
                    <div
                      key={item.key}
                      className="bg-white border border-blue-100 rounded-md p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                        <Icon size={16} className="text-blue-600" />
                        <span>{item.label}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-600 space-y-1">
                        {item.lastRecord ? (
                          <>
                            <div>
                              Last given:{" "}
                              {new Date(
                                item.lastRecord.date,
                              ).toLocaleDateString()}
                            </div>
                            {item.canGive ? (
                              <div className="text-green-600 font-semibold">
                                Available now
                              </div>
                            ) : (
                              <div className="text-orange-600 font-semibold">
                                Next: {nextDateLabel} ({item.daysRemaining}d)
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-green-600 font-semibold">
                            Never given — available now
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!item.canGive}
                        onClick={() =>
                          handleGiveItem(item.key, item.successMessage)
                        }
                        className="mt-3 w-full text-xs font-medium px-2 py-2 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          item.canGive
                            ? item.buttonLabel
                            : nextDateLabel
                              ? `Available ${nextDateLabel}`
                              : "Not yet available"
                        }
                      >
                        {item.buttonLabel}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Animated.div>
      );
    };

    const isCompletedShowersOpen =
      showCompletedShowers || activeShowers.length === 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100 p-3 md:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold uppercase tracking-wide">
              <Sparkles size={16} className="text-blue-500" />
              <span>Next availability</span>
            </div>
            <p className="mt-3 text-xl font-semibold text-blue-900">
              {nextSlotLabel}
            </p>
            <p className="mt-2 text-xs text-blue-700">
              {nextAvailable
                ? `${nextSlotCapacity} spot${nextSlotCapacity === 1 ? "" : "s"} remaining in this slot.`
                : "No open slots left today — add guests to the waitlist."}
            </p>
            {nearlyFull > 0 && (
              <p className="mt-3 text-[11px] text-blue-500">
                {nearlyFull} slot{nearlyFull === 1 ? "" : "s"} nearly full
              </p>
            )}
          </div>

          <div className="rounded-xl border border-sky-100 bg-white p-3 md:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sky-600 text-xs font-semibold uppercase tracking-wide">
              <BarChart3 size={16} className="text-sky-500" />
              <span>Capacity today</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-sky-900">
                {occupied}
              </span>
              <span className="text-sm text-sky-600">
                of {totalCapacity} spots
              </span>
            </div>
            <div className="mt-3 h-2 w-full bg-sky-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${capacityProgress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-sky-700">
              {doneCount} completed shower{doneCount === 1 ? "" : "s"} so far
            </p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 md:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold uppercase tracking-wide">
              <History size={16} className="text-amber-600" />
              <span>Waitlist today</span>
            </div>
            <div className="mt-3 text-2xl font-semibold text-amber-900">
              {todayWaitlisted.length}
            </div>
            <p className="mt-2 text-xs text-amber-700">
              We’ll notify guests as soon as a slot opens up. {fullSlots} slot
              {fullSlots === 1 ? "" : "s"} currently full.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 lg:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ShowerHead className="text-blue-600" size={20} />
                  <span>Today's Showers</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Manage the flow of guests, update statuses, and keep
                  essentials stocked.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="bg-blue-100 text-blue-700 font-medium px-3 py-1 rounded-full">
                  {todayShowerRecords.length} total bookings
                </span>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                  Showing {filteredShowers.length}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-3 md:space-y-0 md:flex md:flex-wrap md:gap-2">
              <select
                value={showerStatusFilter}
                onChange={(event) => setShowerStatusFilter(event.target.value)}
                className="w-full md:w-auto text-xs font-medium bg-white border border-blue-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="all">Status: All</option>
                <option value="awaiting">Status: Awaiting</option>
                <option value="done">Status: Done</option>
              </select>
              <select
                value={showerLaundryFilter}
                onChange={(event) => setShowerLaundryFilter(event.target.value)}
                className="w-full md:w-auto text-xs font-medium bg-white border border-blue-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="any">Laundry: Any</option>
                <option value="with">Laundry: With</option>
                <option value="without">Laundry: Without</option>
              </select>
              <select
                value={showerSort}
                onChange={(event) => setShowerSort(event.target.value)}
                className="w-full md:w-auto text-xs font-medium bg-white border border-blue-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="time-asc">Sort: Time ↑</option>
                <option value="time-desc">Sort: Time ↓</option>
                <option value="status">Sort: Status</option>
                <option value="name">Sort: Name</option>
              </select>
            </div>

            {filteredShowers.length === 0 ? (
              <div className="border border-dashed border-blue-200 rounded-lg text-center py-12 text-sm text-blue-700 bg-blue-50">
                No shower bookings match your filters.
              </div>
            ) : (
              <div className="space-y-5">
                {activeShowers.length > 0 ? (
                  <div className="space-y-4">
                    {activeShowers.map((record, idx) =>
                      renderShowerCard(record, activeShowersTrail[idx]),
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed border-blue-200 rounded-lg text-center py-10 text-sm text-blue-600 bg-blue-50">
                    No active shower bookings.
                  </div>
                )}

                {completedShowers.length > 0 && (
                  <div className="pt-4 border-t border-blue-100">
                    <button
                      type="button"
                      onClick={() => setShowCompletedShowers((prev) => !prev)}
                      className="w-full flex items-center justify-between text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg px-4 py-2 transition-colors"
                    >
                      <span>Completed showers ({completedShowers.length})</span>
                      {isCompletedShowersOpen ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {isCompletedShowersOpen && (
                      <div className="mt-3 space-y-3">
                        {completedShowers.map((record, idx) =>
                          renderShowerCard(record, completedShowersTrail[idx]),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {todayWaitlisted.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-amber-600" />
                <span>Waitlisted Guests</span>
              </h3>
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-3 py-1 rounded-full">
                {todayWaitlisted.length} waitlisted
              </span>
            </div>
            <div className="space-y-3">
              {waitlistTrail.map((style, idx) => {
                const record = todayWaitlisted[idx];
                if (!record) return null;
                const guest = guests.find((g) => g.id === record.guestId);
                const nameDetails = getGuestNameDetails(record.guestId);
                const guestName = nameDetails.primaryName;
                const canT = guest ? canGiveItem(guest.id, "tshirt") : false;
                const canSB = guest
                  ? canGiveItem(guest.id, "sleeping_bag")
                  : false;
                const canBP = guest ? canGiveItem(guest.id, "backpack") : false;

                const waitlistActions = guest
                  ? [
                      {
                        key: "tshirt",
                        label: "Give T-Shirt",
                        canGive: canT,
                        successMessage: "T-Shirt given",
                        days: getDaysUntilAvailable(guest.id, "tshirt"),
                        nextDate: getNextAvailabilityDate(
                          "tshirt",
                          getLastGivenItem(guest.id, "tshirt")?.date,
                        ),
                      },
                      {
                        key: "sleeping_bag",
                        label: "Give Sleeping Bag",
                        canGive: canSB,
                        successMessage: "Sleeping bag given",
                        days: getDaysUntilAvailable(guest.id, "sleeping_bag"),
                        nextDate: getNextAvailabilityDate(
                          "sleeping_bag",
                          getLastGivenItem(guest.id, "sleeping_bag")?.date,
                        ),
                      },
                      {
                        key: "backpack",
                        label: "Give Backpack",
                        canGive: canBP,
                        successMessage: "Backpack given",
                        days: getDaysUntilAvailable(guest.id, "backpack"),
                        nextDate: getNextAvailabilityDate(
                          "backpack",
                          getLastGivenItem(guest.id, "backpack")?.date,
                        ),
                      },
                    ]
                  : [];

                return (
                  <Animated.div
                    key={record.id}
                    style={style}
                    className="will-change-transform bg-amber-50 border border-amber-100 rounded-lg p-4"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">
                              {guestName}
                            </span>
                            {nameDetails.hasPreferred && (
                              <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                Legal: {nameDetails.legalName}
                              </span>
                            )}
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                              Waitlisted
                            </span>
                          </div>
                          <div className="text-xs text-amber-700 mt-1">
                            Added at{" "}
                            {new Date(record.date).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            try {
                              cancelShowerRecord(record.id);
                              toast.success("Waitlist entry cancelled");
                            } catch (err) {
                              toast.error(err.message);
                            }
                          }}
                          className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {waitlistActions.map((action) => {
                          const nextDateLabel = action.nextDate
                            ? action.nextDate.toLocaleDateString("en-CA")
                            : null;
                          return (
                            <button
                              key={action.key}
                              disabled={!action.canGive}
                              onClick={() => {
                                if (!guest) return;
                                try {
                                  giveItem(guest.id, action.key);
                                  toast.success(action.successMessage);
                                } catch (e) {
                                  toast.error(e.message);
                                }
                              }}
                              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={
                                action.canGive
                                  ? action.label
                                  : nextDateLabel
                                    ? `Available ${nextDateLabel}`
                                    : "Not yet available"
                              }
                            >
                              {action.label}
                              {!action.canGive && action.days > 0 && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                                  {action.days}d
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </Animated.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLaundrySection = () => {
    const onsiteCapacity = settings?.maxOnsiteLaundrySlots ?? 5;
    const onsiteLoads = todayLaundryWithGuests.filter(
      (record) => record.laundryType === "onsite",
    );
    const offsiteLoads = todayLaundryWithGuests.filter(
      (record) => record.laundryType === "offsite",
    );
    const onsiteUsed = onsiteLoads.length;
    const onsiteAvailable = Math.max(onsiteCapacity - onsiteUsed, 0);
    const onsiteProgress = onsiteCapacity
      ? Math.min((onsiteUsed / Math.max(onsiteCapacity, 1)) * 100, 100)
      : 0;
    const washerLoads = onsiteLoads.filter(
      (record) => record.status === LAUNDRY_STATUS.WASHER,
    ).length;
    const dryerLoads = onsiteLoads.filter(
      (record) => record.status === LAUNDRY_STATUS.DRYER,
    ).length;
    const pendingOffsite = offsiteLoads.filter(
      (record) => record.status === LAUNDRY_STATUS.PENDING,
    ).length;
    const transportedOffsite = offsiteLoads.filter(
      (record) => record.status === LAUNDRY_STATUS.TRANSPORTED,
    ).length;
    const readyForPickupCount = todayLaundryWithGuests.filter(
      (record) =>
        (record.laundryType === "onsite" &&
          record.status === LAUNDRY_STATUS.DONE) ||
        (record.laundryType === "offsite" &&
          record.status === LAUNDRY_STATUS.RETURNED),
    ).length;
    const baglessLoads = onsiteLoads.filter(
      (record) => !record.bagNumber || `${record.bagNumber}`.trim() === "",
    ).length;

    const typeOptions = [
      { value: "onsite", label: "On-site" },
      { value: "offsite", label: "Off-site" },
    ];

    const laundrySlotOptions = (allLaundrySlots || []).map((slot) => ({
      value: slot,
      label: formatLaundryRangeLabel(slot),
    }));

    const onsiteStatusButtons = [
      {
        value: LAUNDRY_STATUS.WAITING,
        label: "Waiting",
        icon: ShoppingBag,
        activeClass: "bg-gray-200 text-gray-500 border-gray-300 cursor-default",
        idleClass: "bg-white text-gray-700 border-gray-300 hover:bg-gray-100",
      },
      {
        value: LAUNDRY_STATUS.WASHER,
        label: "In Washer",
        icon: DropletIcon,
        activeClass: "bg-blue-100 text-blue-500 border-blue-200 cursor-default",
        idleClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
      },
      {
        value: LAUNDRY_STATUS.DRYER,
        label: "In Dryer",
        icon: FanIcon,
        activeClass:
          "bg-orange-100 text-orange-500 border-orange-200 cursor-default",
        idleClass:
          "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
      },
      {
        value: LAUNDRY_STATUS.DONE,
        label: "Done",
        icon: CheckCircle2Icon,
        activeClass:
          "bg-emerald-100 text-emerald-500 border-emerald-200 cursor-default",
        idleClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
      },
      {
        value: LAUNDRY_STATUS.PICKED_UP,
        label: "Picked Up",
        icon: LogOutIcon,
        activeClass:
          "bg-purple-100 text-purple-500 border-purple-200 cursor-default",
        idleClass:
          "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      },
    ];

    const offsiteStatusButtons = [
      {
        value: LAUNDRY_STATUS.PENDING,
        label: "Waiting",
        icon: Clock,
        activeClass:
          "bg-yellow-100 text-yellow-500 border-yellow-200 cursor-default",
        idleClass:
          "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
      },
      {
        value: LAUNDRY_STATUS.TRANSPORTED,
        label: "Transported",
        icon: Truck,
        activeClass: "bg-blue-100 text-blue-500 border-blue-200 cursor-default",
        idleClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
      },
      {
        value: LAUNDRY_STATUS.RETURNED,
        label: "Returned",
        icon: CheckCircle2Icon,
        activeClass:
          "bg-emerald-100 text-emerald-500 border-emerald-200 cursor-default",
        idleClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
      },
      {
        value: LAUNDRY_STATUS.OFFSITE_PICKED_UP,
        label: "Picked Up",
        icon: LogOutIcon,
        activeClass:
          "bg-purple-100 text-purple-500 border-purple-200 cursor-default",
        idleClass:
          "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      },
    ];

    const renderLaundryCard = (record, animationStyle) => {
      if (!record) return null;
      const statusInfo = getLaundryStatusInfo(record.status);
      const StatusIcon = statusInfo.icon;
      const isOnsite = record.laundryType === "onsite";
      const isEditingBag = editingBagNumber === record.id;
      const fallbackDetails = record.guestId
        ? getGuestNameDetails(record.guestId)
        : null;
      const hasPreferred = Boolean(
        record.guestHasPreferred ?? fallbackDetails?.hasPreferred,
      );
      const primaryName = hasPreferred
        ? record.guestPreferredName ||
          fallbackDetails?.primaryName ||
          record.guestName ||
          "Unknown Guest"
        : record.guestName || fallbackDetails?.primaryName || "Unknown Guest";
      const legalName =
        record.guestLegalName ||
        fallbackDetails?.legalName ||
        record.guestName ||
        "Unknown Guest";

      return (
        <Animated.div
          key={record.id}
          style={animationStyle}
          className="will-change-transform bg-white border border-purple-100 rounded-xl shadow-sm p-4"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-gray-900">
                    {primaryName}
                  </span>
                  {hasPreferred && (
                    <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      Legal: {legalName}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOnsite ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}
                  >
                    {isOnsite ? "On-site" : "Off-site"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} />{" "}
                    {isOnsite
                      ? formatLaundryRangeLabel(record.time)
                      : "Courier-managed window"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShoppingBag size={12} />
                    {isEditingBag ? (
                      <input
                        type="text"
                        value={newBagNumber}
                        onChange={(event) =>
                          setNewBagNumber(event.target.value)
                        }
                        className="px-2 py-1 text-xs border border-purple-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-300"
                        placeholder="Bag #"
                        onBlur={() =>
                          handleBagNumberUpdate(record.id, newBagNumber)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handleBagNumberUpdate(record.id, newBagNumber);
                          }
                          if (event.key === "Escape") {
                            setEditingBagNumber(null);
                            setNewBagNumber("");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          startEditingBagNumber(record.id, record.bagNumber)
                        }
                        className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full hover:bg-purple-100"
                      >
                        Bag #{record.bagNumber || "Add"}
                        <Edit3 size={10} className="opacity-60" />
                      </button>
                    )}
                  </span>
                </div>
              </div>
              <div
                className={`${statusInfo.bgColor} ${statusInfo.textColor} px-3 py-1.5 text-xs font-medium rounded-full inline-flex items-center gap-1 border border-white/60`}
              >
                <StatusIcon size={14} />
                <span>{statusInfo.label}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Selectize
                options={typeOptions}
                value={record.laundryType}
                onChange={(value) => {
                  try {
                    rescheduleLaundry(record.id, {
                      newLaundryType: value,
                      newTime:
                        value === "onsite"
                          ? record.time || laundrySlotOptions[0]?.value || null
                          : null,
                    });
                    toast.success("Laundry type updated");
                  } catch (err) {
                    toast.error(err.message);
                  }
                }}
                size="xs"
                className="w-32"
                displayValue={
                  record.laundryType === "offsite" ? "Off-site" : "On-site"
                }
              />
              {isOnsite && (
                <Selectize
                  options={laundrySlotOptions}
                  value={record.time || laundrySlotOptions[0]?.value || ""}
                  onChange={(time) => {
                    try {
                      rescheduleLaundry(record.id, { newTime: time });
                      toast.success("Laundry slot updated");
                    } catch (err) {
                      toast.error(err.message);
                    }
                  }}
                  size="xs"
                  className="w-44"
                  placeholder="Select slot"
                  displayValue={
                    record.time
                      ? formatLaundryRangeLabel(record.time)
                      : "Select slot"
                  }
                />
              )}
              <button
                onClick={() => {
                  try {
                    cancelLaundryRecord(record.id);
                    toast.success("Laundry booking cancelled");
                  } catch (err) {
                    toast.error(err.message);
                  }
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 text-red-700 hover:bg-red-50"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(isOnsite ? onsiteStatusButtons : offsiteStatusButtons).map(
                (buttonConfig) => {
                  const Icon = buttonConfig.icon;
                  const isActive = record.status === buttonConfig.value;
                  return (
                    <button
                      key={buttonConfig.value}
                      onClick={() =>
                        attemptLaundryStatusChange(record, buttonConfig.value)
                      }
                      disabled={isActive}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${isActive ? buttonConfig.activeClass : buttonConfig.idleClass}`}
                    >
                      <Icon size={12} className="inline mr-1" />
                      {buttonConfig.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </Animated.div>
      );
    };

    const isCompletedLaundryOpen =
      showCompletedLaundry || activeLaundry.length === 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-purple-100 p-3 md:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-purple-600 text-xs font-semibold uppercase tracking-wide">
              <WashingMachine size={16} className="text-purple-500" />
              <span>On-site loads</span>
            </div>
            <div className="mt-3 text-xl font-semibold text-purple-900">
              {onsiteUsed} / {onsiteCapacity}
            </div>
            <div className="mt-3 h-2 w-full bg-purple-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${onsiteProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-purple-700">
              {onsiteAvailable} slot{onsiteAvailable === 1 ? "" : "s"} remaining
              today
            </p>
            <p className="mt-3 text-[11px] text-purple-600">
              {washerLoads} washer • {dryerLoads} dryer
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-white p-3 md:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold uppercase tracking-wide">
              <Truck size={16} className="text-blue-500" />
              <span>Off-site pipeline</span>
            </div>
            <div className="mt-3 text-xl font-semibold text-blue-900">
              {offsiteLoads.length} bag{offsiteLoads.length === 1 ? "" : "s"}
            </div>
            <p className="mt-2 text-xs text-blue-700">
              {pendingOffsite} waiting • {transportedOffsite} in transit
            </p>
            <p className="mt-3 text-[11px] text-blue-500">
              Keep bag numbers handy for quick updates.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 md:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-wide">
              <CheckCircle2Icon size={16} className="text-emerald-600" />
              <span>Ready for pickup</span>
            </div>
            <div className="mt-3 text-xl font-semibold text-emerald-900">
              {readyForPickupCount}
            </div>
            <p className="mt-2 text-xs text-emerald-700">
              Bagless loads: {baglessLoads}
            </p>
            <p className="mt-3 text-[11px] text-emerald-600">
              Confirm bag numbers before changing status.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 lg:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <WashingMachine className="text-purple-600" size={20} />
                  <span>Today's Laundry</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Monitor bag progress, adjust slots, and update statuses in one
                  place.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="bg-purple-100 text-purple-700 font-medium px-3 py-1 rounded-full">
                  {todayLaundryWithGuests.length} records
                </span>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                  Showing {filteredLaundry.length}
                </span>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 space-y-3 md:space-y-0 md:flex md:flex-wrap md:gap-2">
              <select
                value={laundryTypeFilter}
                onChange={(event) => setLaundryTypeFilter(event.target.value)}
                className="w-full md:w-auto text-xs font-medium bg-white border border-purple-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="any">Type: Any</option>
                <option value="onsite">Type: On-site</option>
                <option value="offsite">Type: Off-site</option>
              </select>
              <select
                value={laundryStatusFilter}
                onChange={(event) => setLaundryStatusFilter(event.target.value)}
                className="w-full md:w-auto text-xs font-medium bg-white border border-purple-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="any">Status: Any</option>
                <option value={LAUNDRY_STATUS.WAITING}>Waiting</option>
                <option value={LAUNDRY_STATUS.WASHER}>In Washer</option>
                <option value={LAUNDRY_STATUS.DRYER}>In Dryer</option>
                <option value={LAUNDRY_STATUS.DONE}>Done</option>
                <option value={LAUNDRY_STATUS.PICKED_UP}>Picked Up</option>
                <option value={LAUNDRY_STATUS.PENDING}>Off-site Waiting</option>
                <option value={LAUNDRY_STATUS.TRANSPORTED}>Transported</option>
                <option value={LAUNDRY_STATUS.RETURNED}>Returned</option>
                <option value={LAUNDRY_STATUS.OFFSITE_PICKED_UP}>
                  Off-site Picked Up
                </option>
              </select>
              <select
                value={laundrySort}
                onChange={(event) => setLaundrySort(event.target.value)}
                className="w-full md:w-auto text-xs font-medium bg-white border border-purple-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="time-asc">Sort: Time ↑</option>
                <option value="time-desc">Sort: Time ↓</option>
                <option value="status">Sort: Status</option>
                <option value="name">Sort: Name</option>
              </select>
            </div>

            {filteredLaundry.length === 0 ? (
              <div className="border border-dashed border-purple-200 rounded-lg text-center py-12 text-sm text-purple-700 bg-purple-50">
                No laundry bookings match your filters.
              </div>
            ) : (
              <div className="space-y-5">
                {activeLaundry.length > 0 ? (
                  <div className="space-y-4">
                    {activeLaundry.map((record, idx) =>
                      renderLaundryCard(record, activeLaundryTrail[idx]),
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed border-purple-200 rounded-lg text-center py-10 text-sm text-purple-600 bg-purple-50">
                    No active laundry loads.
                  </div>
                )}

                {completedLaundry.length > 0 && (
                  <div className="pt-4 border-t border-purple-100">
                    <button
                      type="button"
                      onClick={() => setShowCompletedLaundry((prev) => !prev)}
                      className="w-full flex items-center justify-between text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-lg px-4 py-2 transition-colors"
                    >
                      <span>Completed laundry ({completedLaundry.length})</span>
                      {isCompletedLaundryOpen ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {isCompletedLaundryOpen && (
                      <div className="mt-3 space-y-3">
                        {completedLaundry.map((record, idx) =>
                          renderLaundryCard(record, completedLaundryTrail[idx]),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Animated.div
        style={headerSpring}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
      >
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2 text-emerald-800">
            <ClipboardList /> Services Management
          </h1>
          <p className="text-gray-500">
            View and manage all services: meals, showers, laundry, haircuts,
            holiday, bicycle
          </p>
        </div>
        {todayActionHistory.length > 0 && (
          <button
            onClick={() => setShowUndoPanel(!showUndoPanel)}
            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors self-start sm:self-auto"
          >
            <History size={16} />
            Undo Actions ({todayActionHistory.length})
          </button>
        )}
      </Animated.div>

      {showUndoPanel && todayActionHistory.length > 0 && (
        <div className="mt-2 bg-white border border-orange-200 rounded-lg p-3 sm:p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-orange-800 flex items-center gap-2">
              <History size={16} /> Recent actions
            </h3>
            <div className="flex gap-2">
              <button
                onClick={clearActionHistory}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowUndoPanel(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {todayActionHistory.map((action) => (
              <div
                key={action.id}
                className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded"
              >
                <div className="text-sm font-medium">{action.description}</div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </div>
                  <button
                    onClick={() => handleUndoAction(action.id)}
                    className="bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={12} /> Undo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 mb-4 md:mb-6 sticky top-0 z-10">
        <div className="mb-2 px-1">
          <Breadcrumbs />
        </div>
        <nav className="overflow-x-auto">
          <div className="flex gap-1 min-w-max pb-2 md:pb-0">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSection === section.id
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <SpringIcon>
                    <Icon size={16} />
                  </SpringIcon>
                  <span className="hidden xs:inline sm:hidden lg:inline">
                    {section.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {renderSectionContent()}

      {showerPickerGuest && <ShowerBooking />}
      {laundryPickerGuest && <LaundryBooking />}

      {bagPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setBagPromptOpen(false)}
          />
          <Animated.div
            style={modalSpring}
            className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100"
          >
            <h3 className="text-lg font-semibold mb-1">Bag number required</h3>
            <p className="text-sm text-gray-600 mb-3">
              Please enter a bag number before changing laundry status. This
              helps track a guest's laundry.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={bagPromptValue}
                onChange={(e) => setBagPromptValue(e.target.value)}
                className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="e.g., 33 or 54 or Green 45"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBagPromptOpen(false)}
                className="px-3 py-2 text-sm rounded-md border"
              >
                Cancel
              </button>
              <button
                onClick={confirmBagPrompt}
                className="px-3 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Save & Continue
              </button>
            </div>
          </Animated.div>
        </div>
      )}

      {/* Sticky Quick Actions for Mobile */}
      <StickyQuickActions
        isVisible={quickActionsVisible && showQuickActions}
        onShowerClick={handleQuickShower}
        onLaundryClick={handleQuickLaundry}
        onDonationClick={handleQuickDonation}
        onClose={() => setQuickActionsVisible(false)}
      />
    </div>
  );
};

export default Services;
