import React, { useMemo, useState, useCallback, useEffect, startTransition } from "react";
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
  CheckCircle,
  LogOutIcon,
  Clock,
  CalendarClock,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Truck,
  Edit3,
  BrushCleaning,
  RotateCcw,
  X,
  XCircle,
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
  Bed,
  Bike,
  Download,
  Trash2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useAppContext } from "../../context/useAppContext";
import { useAuth } from "../../context/useAuth";
import { useGuestsStore } from "../../stores/useGuestsStore";
import ShowerBooking from "../../components/ShowerBooking";
import CompactShowerCard from "../../components/CompactShowerCard";
import LaundryBooking from "../../components/LaundryBooking";
import StickyQuickActions from "../../components/StickyQuickActions";
import Selectize from "../../components/Selectize";
import DonutCardRecharts from "../../components/charts/DonutCardRecharts";
import TrendLineRecharts from "../../components/charts/TrendLineRecharts";
import LaundryKanban from "../../components/lanes/LaundryKanban";
import OrphanedLaundryTracker from "../../components/OrphanedLaundryTracker";
import { WaiverBadge } from "../../components/ui/WaiverBadge";
import Donations from "../../components/Donations";
import LaPlazaDonations from "../../components/LaPlazaDonations";
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
  isoFromPacificDateString,
} from "../../utils/date";
import { getMealServiceStatus } from "../../utils/mealServiceTime";
import {
  getBicycleServiceCount,
  isBicycleStatusCountable,
} from "../../utils/bicycles";
import {
  MEAL_REPORT_TYPE_ORDER,
  MEAL_REPORT_TYPE_LABELS,
  createDefaultMealReportTypes,
  createEmptyMealTotals,
  FILTER_STORAGE_KEY,
  toCsvValue,
} from "./services/utils";
import BicycleRepairsSection from "./services/sections/BicycleRepairsSection";
import OverviewSection from "./services/sections/OverviewSection";
import TimelineSection from "./services/sections/TimelineSection";
import CompactShowerList from "../../components/CompactShowerList";
import CompactLaundryList from "../../components/CompactLaundryList";
import ShowerDetailModal from "../../components/ShowerDetailModal";
import SlotBlockManager from "../../components/SlotBlockManager";
import SectionRefreshButton from "../../components/SectionRefreshButton";

const pacificWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "long",
});

const getPacificWeekdayLabel = (pacificDateStr) => {
  if (!pacificDateStr) return "";
  try {
    const iso = isoFromPacificDateString(pacificDateStr);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return pacificWeekdayFormatter.format(date);
  } catch {
    return "";
  }
};

const Services = () => {
  const getWarningsForGuest = useGuestsStore((state) => state.getWarningsForGuest);
  const {
    getTodayMetrics,
    getTodayLaundryWithGuests,
    mealRecords,
    rvMealRecords,
    addRvMealRecord,
    shelterMealRecords,
    addShelterMealRecord,
    addUnitedEffortMealRecord,
    unitedEffortMealRecords,
    extraMealRecords,
    addExtraMealRecord,
    deleteExtraMealRecord,
    dayWorkerMealRecords,
    removeMealAttendanceRecord,
    addDayWorkerMealRecord,
    deleteDayWorkerMealRecord,
    lunchBagRecords,
    addLunchBagRecord,
    deleteLunchBagRecord,
    deleteRvMealRecord,
    deleteShelterMealRecord,
    deleteUnitedEffortMealRecord,
    addAutomaticMealEntries,
    hasAutomaticMealsForDay,
    laundryRecords,
    showerRecords,
    haircutRecords,
    holidayRecords,
    guests,
    showerPickerGuest,
    setShowerPickerGuest,
    laundryPickerGuest,
    setLaundryPickerGuest,
    LAUNDRY_STATUS,
    updateLaundryStatus,
    updateLaundryBagNumber,
    actionHistory,
    undoAction,
    clearActionHistory,
    allShowerSlots,
    cancelShowerRecord,
    cancelMultipleShowers,
    rescheduleShower,
    updateShowerStatus,
    cancelLaundryRecord,
    cancelMultipleLaundry,
    canGiveItem,
    getLastGivenItem,
    giveItem,
    getDaysUntilAvailable,
    bicycleRecords,
    updateBicycleRecord,
    deleteBicycleRecord,
    setBicycleStatus,
    moveBicycleRecord,
    BICYCLE_REPAIR_STATUS,
    activeServiceSection: activeSection,
    setActiveServiceSection: setActiveSection,
  } = useAppContext();
  const { user } = useAuth();
  const quickActionRole = user?.role ?? "staff";

  const handleEndShowerDay = async () => {
    const today = todayPacificDateString();
    const pendingShowers = showerRecords.filter(
      (r) =>
        pacificDateStringFrom(r.date) === today &&
        r.status !== "done"
    );

    if (pendingShowers.length === 0) {
      toast.error("No pending showers to cancel.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to end the service day? This will cancel all ${pendingShowers.length} remaining showers (booked, awaiting, and waitlisted).`,
      )
    ) {
      const success = await cancelMultipleShowers(
        pendingShowers.map((r) => r.id),
      );
      if (success) {
        toast.success(`Cancelled ${pendingShowers.length} showers.`);
      }
    }
  };

  const handleEndLaundryDay = async () => {
    const today = todayPacificDateString();
    const pendingLaundry = laundryRecords.filter(
      (r) =>
        pacificDateStringFrom(r.date) === today &&
        r.laundryType === "onsite" &&
        r.status === LAUNDRY_STATUS.WAITING,
    );

    if (pendingLaundry.length === 0) {
      toast.error("No pending on-site laundry to cancel.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to end the service day? This will cancel all ${pendingLaundry.length} pending on-site laundry loads.`,
      )
    ) {
      const success = await cancelMultipleLaundry(
        pendingLaundry.map((r) => r.id),
      );
      if (success) {
        toast.success(`Cancelled ${pendingLaundry.length} laundry loads.`);
      }
    }
  };

  // Auto-add preset meal entries when meal service ends
  const [autoMealsAdded, setAutoMealsAdded] = useState(() => {
    // Check if we already added auto meals for today
    const stored = localStorage.getItem('hopes-corner-auto-meals-date');
    return stored === todayPacificDateString();
  });

  useEffect(() => {
    // Only run this effect if we haven't already added auto meals today
    if (autoMealsAdded) return;

    const today = todayPacificDateString();
    const dayOfWeek = new Date(today + 'T12:00:00').getDay();

    // Check if today has automatic meal entries configured
    if (!hasAutomaticMealsForDay || !hasAutomaticMealsForDay(dayOfWeek)) return;

    const checkAndTrigger = () => {
      const status = getMealServiceStatus();

      // If meal service has ended and we haven't added entries yet
      if (status.type === 'ended' && !autoMealsAdded) {
        // Mark as added immediately to prevent double-triggering
        setAutoMealsAdded(true);
        localStorage.setItem('hopes-corner-auto-meals-date', today);

        // Add the automatic meal entries
        addAutomaticMealEntries(today)
          .then((result) => {
            if (result.success) {
              toast.success(`✅ Automatic meal entries added: ${result.summary}`);
            }
          })
          .catch((error) => {
            console.error('Failed to add automatic meal entries:', error);
          });
      }
    };

    // Check immediately
    checkAndTrigger();

    // Also check periodically (every minute) in case the user leaves the page open
    const interval = setInterval(checkAndTrigger, 60000);

    return () => clearInterval(interval);
  }, [autoMealsAdded, addAutomaticMealEntries, hasAutomaticMealsForDay]);

  // Handle Thursday retroactive meals on Friday
  useEffect(() => {
    const today = todayPacificDateString();
    const dateObj = new Date(today + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();

    // Only process on Friday (day 5)
    if (dayOfWeek !== 5) return;

    // Check if we already tried to add Thursday's meals today
    const stored = localStorage.getItem('hopes-corner-thursday-meals-added-check');
    if (stored === today) return;

    // Calculate Thursday's date
    const thursdayDate = new Date(dateObj);
    thursdayDate.setDate(thursdayDate.getDate() - 1);
    const thursdayStr = pacificDateStringFrom(thursdayDate);

    // Mark as checked today immediately to prevent race conditions
    localStorage.setItem('hopes-corner-thursday-meals-added-check', today);

    // Call addAutomaticMealEntries for Thursday
    addAutomaticMealEntries(thursdayStr)
      .then((result) => {
        if (result.success && result.added > 0) {
          toast.success(`✅ Retroactively added Thursday's meal entries: ${result.summary}`);
        }
      })
      .catch((error) => {
        console.error('Failed to add retroactive Thursday meal entries:', error);
      });
  }, [addAutomaticMealEntries]);

  const todayLaundryWithGuests = getTodayLaundryWithGuests();

  // Create set of guest IDs that have laundry today for filtering showers
  const laundryGuestIdsSet = new Set(
    (todayLaundryWithGuests || []).map((l) => l.guestId),
  );

  const parseTimeToMinutes = useCallback((t) => {
    if (!t) return Number.POSITIVE_INFINITY;
    const [h, m] = String(t).split(":");
    const hh = parseInt(h, 10);
    const mm = parseInt(m, 10);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return Number.POSITIVE_INFINITY;
    return hh * 60 + mm;
  }, []);

  const getGuestNameDetails = useCallback(
    (guestId) => {
      // Robust lookup: try primary UUID first (string-safe), then fall back to human-readable external_id
      const guest =
        guests.find((g) => String(g.id) === String(guestId)) ||
        guests.find((g) => String(g.guestId) === String(guestId)) ||
        null;
      const fallback = "Unknown Guest";
      const isOrphaned = !guest && guestId; // Has guestId but no matching guest
      const legalName =
        guest?.name ||
        `${guest?.firstName || ""} ${guest?.lastName || ""}`.trim() ||
        fallback;
      const preferredName = (guest?.preferredName || "").trim();
      const hasPreferred =
        Boolean(preferredName) &&
        preferredName.toLowerCase() !== legalName.toLowerCase();
      const displayName = hasPreferred
        ? `${preferredName} (${legalName})`
        : legalName;

      // Log orphaned records for debugging
      if (isOrphaned) {
        console.warn(
          '[DATA INTEGRITY] Orphaned record detected - guest not found:',
          { guestId, message: 'This record references a guest that no longer exists' }
        );
      }

      return {
        guest,
        legalName,
        preferredName,
        hasPreferred,
        displayName,
        sortKey: legalName.toLowerCase(),
        isOrphaned, // Flag to identify orphaned records in UI
        originalGuestId: guestId, // Expose for debugging
      };
    },
    [guests],
  );

  // Report generation state - only compute expensive metrics when explicitly requested
  const [reportsGenerated, setReportsGenerated] = useState(false);
  const [isGeneratingReports, setIsGeneratingReports] = useState(false);

  // Sticky Quick Actions state
  const [showQuickActions] = useState(true);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  // Timeline filter state
  const [timelineViewFilter, setTimelineViewFilter] = useState("all");
  const [showCompletedTimeline, setShowCompletedTimeline] = useState(false);

  // View mode state for compact vs detailed views
  const [showerViewMode, setShowerViewMode] = useState("compact"); // "detailed" or "compact"
  const [showerTab, setShowerTab] = useState("active"); // "active", "completed", "waitlist"
  const [selectedShowerRecord, setSelectedShowerRecord] = useState(null); // For modal detail view
  const [expandedCompletedShowers, setExpandedCompletedShowers] = useState(false); // Collapse/expand completed showers section

  const [editingBagNumber, setEditingBagNumber] = useState(null);
  const [newBagNumber, setNewBagNumber] = useState("");
  const [showUndoPanel, setShowUndoPanel] = useState(false);
  const [bagPromptOpen, setBagPromptOpen] = useState(false);
  const [bagPromptRecord, setBagPromptRecord] = useState(null);
  const [bagPromptNextStatus, setBagPromptNextStatus] = useState(null);
  const [bagPromptValue, setBagPromptValue] = useState("");
  const [rvMealCount, setRvMealCount] = useState("");
  const [isAddingRvMeals, setIsAddingRvMeals] = useState(false);
  const [shelterMealCount, setShelterMealCount] = useState("");
  const [isAddingShelterMeals, setIsAddingShelterMeals] = useState(false);
  const [ueMealCount, setUeMealCount] = useState("");
  const [isAddingUeMeals, setIsAddingUeMeals] = useState(false);
  const [extraMealCount, setExtraMealCount] = useState("");
  const [isAddingExtraMeals, setIsAddingExtraMeals] = useState(false);
  const [lunchBagCount, setLunchBagCount] = useState("");
  const [isAddingLunchBags, setIsAddingLunchBags] = useState(false);
  const [dayWorkerMealCount, setDayWorkerMealCount] = useState("");
  const [isAddingDayWorkerMeals, setIsAddingDayWorkerMeals] = useState(false);
  const [mealTypeTab, setMealTypeTab] = useState("guest");
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

  // Optimized lookup maps for quick record retrieval - prevents slow .find() operations
  const showerRecordsMap = useMemo(() => {
    const map = new Map();
    (showerRecords || []).forEach(r => map.set(r.id, r));
    return map;
  }, [showerRecords]);

  // Optimized handler for shower guest click - uses map lookup instead of .find()
  const handleShowerGuestClickOptimized = useCallback((guestId, recordId) => {
    const record = showerRecordsMap.get(recordId);
    if (record) {
      // Use startTransition for non-urgent UI updates to improve responsiveness
      startTransition(() => {
        setSelectedShowerRecord(record);
      });
    }
  }, [showerRecordsMap]);

  // Scroll detection for quick actions visibility
  useEffect(() => {
    let timeoutId;
    const handleScroll = () => {
      const scrollY = window.scrollY;

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

  // Auto-refresh service slots every 2 minutes when page is in focus
  useEffect(() => {
    let refreshInterval;

    const startAutoRefresh = () => {
      // Set up interval for every 2 minutes
      refreshInterval = setInterval(() => {
        if (navigator.onLine) {
          // Trigger sync by dispatching a storage event that SyncContext listens for
          const now = Date.now().toString();
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: "hopes-corner-sync-trigger",
              newValue: now,
            })
          );
        }
      }, 2 * 60 * 1000); // 2 minutes
    };

    const stopAutoRefresh = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoRefresh();
      } else {
        startAutoRefresh();
      }
    };

    // Start auto-refresh if page is visible
    if (!document.hidden) {
      startAutoRefresh();
    }

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAutoRefresh();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const [showerLaundryFilter, setShowerLaundryFilter] = useState(
    () => savedFilters?.showerLaundryFilter ?? "any",
  );
  const [showerSort, setShowerSort] = useState(
    () => savedFilters?.showerSort ?? "time-asc",
  );
  const [expandedShowerRows, setExpandedShowerRows] = useState({});

  const [expandedCompletedBicycleCards, setExpandedCompletedBicycleCards] =
    useState({});
  const [bicycleViewMode, setBicycleViewMode] = useState(
    () => savedFilters?.bicycleViewMode ?? "kanban",
  );
  const [laundryViewMode, setLaundryViewMode] = useState(
    () => savedFilters?.laundryViewMode === "list" ? "kanban" : (savedFilters?.laundryViewMode ?? "kanban"),
  );

  // Laundry time-travel feature: allow staff to view and manage laundry from past dates
  const [laundryViewDate, setLaundryViewDate] = useState(today);

  // Bicycle time-travel feature: allow staff to view and manage bicycle repairs from past dates
  const [bicycleViewDate, setBicycleViewDate] = useState(today);

  // Format date for display
  const formatServiceDayLabel = (dateString) => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  // Helper to go to previous laundry date (go back 1 day at a time through history)
  const goToPreviousLaundryDate = useCallback(() => {
    setLaundryViewDate((prevDate) => {
      const [year, month, day] = prevDate.split("-").map(Number);
      const currentDate = new Date(year, month - 1, day);
      currentDate.setDate(currentDate.getDate() - 1);
      const newYear = currentDate.getFullYear();
      const newMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
      const newDay = String(currentDate.getDate()).padStart(2, "0");
      return `${newYear}-${newMonth}-${newDay}`;
    });
  }, []);

  // Helper to go to next laundry date (go forward 1 day at a time, but not past today)
  const goToNextLaundryDate = useCallback(() => {
    setLaundryViewDate((prevDate) => {
      const [year, month, day] = prevDate.split("-").map(Number);
      const currentDate = new Date(year, month - 1, day);
      currentDate.setDate(currentDate.getDate() + 1);
      const newYear = currentDate.getFullYear();
      const newMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
      const newDay = String(currentDate.getDate()).padStart(2, "0");
      const newDateString = `${newYear}-${newMonth}-${newDay}`;
      // Don't go past today
      if (newDateString > today) {
        return today;
      }
      return newDateString;
    });
  }, [today]);

  // Shower time-travel feature: allow staff to view and manage showers from past dates
  const [showerViewDate, setShowerViewDate] = useState(today);

  // Helper to go to previous shower date (go back 1 day at a time through history)
  const goToPreviousShowerDate = useCallback(() => {
    setShowerViewDate((prevDate) => {
      const [year, month, day] = prevDate.split("-").map(Number);
      const currentDate = new Date(year, month - 1, day);
      currentDate.setDate(currentDate.getDate() - 1);
      const newYear = currentDate.getFullYear();
      const newMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
      const newDay = String(currentDate.getDate()).padStart(2, "0");
      return `${newYear}-${newMonth}-${newDay}`;
    });
  }, []);

  // Helper to go to next shower date (go forward 1 day at a time, but not past today)
  const goToNextShowerDate = useCallback(() => {
    setShowerViewDate((prevDate) => {
      const [year, month, day] = prevDate.split("-").map(Number);
      const currentDate = new Date(year, month - 1, day);
      currentDate.setDate(currentDate.getDate() + 1);
      const newYear = currentDate.getFullYear();
      const newMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
      const newDay = String(currentDate.getDate()).padStart(2, "0");
      const newDateString = `${newYear}-${newMonth}-${newDay}`;
      // Don't go past today
      if (newDateString > today) {
        return today;
      }
      return newDateString;
    });
  }, [today]);

  // Helper to go to previous bicycle date (go back 1 day at a time through history)
  const goToPreviousBicycleDate = useCallback(() => {
    setBicycleViewDate((prevDate) => {
      const [year, month, day] = prevDate.split("-").map(Number);
      const currentDate = new Date(year, month - 1, day);
      currentDate.setDate(currentDate.getDate() - 1);
      const newYear = currentDate.getFullYear();
      const newMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
      const newDay = String(currentDate.getDate()).padStart(2, "0");
      return `${newYear}-${newMonth}-${newDay}`;
    });
  }, []);

  // Helper to go to next bicycle date (go forward 1 day at a time, but not past today)
  const goToNextBicycleDate = useCallback(() => {
    setBicycleViewDate((prevDate) => {
      const [year, month, day] = prevDate.split("-").map(Number);
      const currentDate = new Date(year, month - 1, day);
      currentDate.setDate(currentDate.getDate() + 1);
      const newYear = currentDate.getFullYear();
      const newMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
      const newDay = String(currentDate.getDate()).padStart(2, "0");
      const newDateString = `${newYear}-${newMonth}-${newDay}`;
      // Don't go past today
      if (newDateString > today) {
        return today;
      }
      return newDateString;
    });
  }, [today]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      showerLaundryFilter,
      showerSort,
      bicycleViewMode,
      laundryViewMode,
    };
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist Services filters", error);
    }
  }, [
    showerLaundryFilter,
    showerSort,
    bicycleViewMode,
    laundryViewMode,
  ]);

  const parseLaundryStartToMinutes = useCallback(
    (range) => {
      if (!range) return Number.POSITIVE_INFINITY;
      const [start] = String(range).split(" - ");
      return parseTimeToMinutes(start);
    },
    [parseTimeToMinutes],
  );

  const getGuestName = useCallback(
    (guestId) => getGuestNameDetails(guestId).displayName,
    [getGuestNameDetails],
  );

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
    (record) => pacificDateStringFrom(record.date) === showerViewDate,
  );
  const todayWaitlisted = todayShowerRecords
    .filter((r) => {
      if (r.status !== "waitlisted") return false;
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
      if (showerSort === "time-desc")
        return parseTimeToMinutes(b.time) - parseTimeToMinutes(a.time);
      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });
  const todayBookedShowers = todayShowerRecords.filter(
    (r) => r.status !== "waitlisted",
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
      case "cancelled":
        return {
          label: "Cancelled",
          icon: XCircle,
          iconClass: "text-red-500",
          chipClass: "bg-red-50 text-red-700 border border-red-200",
          badgeClass: "bg-red-100 text-red-700 border border-red-200",
        };
      default:
        return {
          label: "Scheduled",
          icon: CalendarClock,
          iconClass: "text-blue-500",
          chipClass: "bg-blue-50 text-blue-700 border border-blue-200",
          badgeClass: "bg-blue-100 text-blue-700 border border-blue-200",
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

  const filteredShowers = [...(todayBookedShowers || [])].filter((r) => {
    if (showerLaundryFilter === "with" && !laundryGuestIdsSet.has(r.guestId))
      return false;
    if (
      showerLaundryFilter === "without" &&
      laundryGuestIdsSet.has(r.guestId)
    )
      return false;
    return true;
  });

  const sortShowersForDisplay = (records) => {
    const list = [...records];
    list.sort((a, b) => {
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
    return list;
  };

  const filteredLaundry = [...(todayLaundryWithGuests || [])]
    .sort((a, b) => {
      return (
        parseLaundryStartToMinutes(a.time) - parseLaundryStartToMinutes(b.time)
      );
    });

  const activeShowers = sortShowersForDisplay(
    filteredShowers.filter((record) => record.status !== "done"),
  );

  // Sort completed showers by when they were actually completed (lastUpdated timestamp)
  // This maintains the order they were completed in the default view
  const completedShowers = [...filteredShowers.filter((record) => record.status === "done")]
    .sort((a, b) => {
      const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return aTime - bTime;
    });

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

  const isCompletedBicycleStatus = useCallback(
    (status) => isBicycleStatusCountable(status),
    [],
  );

  const toCountValue = useCallback(
    (value) => (typeof value === "number" ? value : Number(value) || 0),
    [],
  );

  // Only compute when viewing the reports section AND user has explicitly requested reports
  const monthAggregates = useMemo(() => {
    // Skip expensive computation unless explicitly requested
    if (!reportsGenerated || (activeSection !== "reports" && activeSection !== "overview")) {
      return {
        mealsServed: 0,
        showersBooked: 0,
        laundryLoads: 0,
        haircuts: 0,
        holidays: 0,
        bicycles: 0,
      };
    }

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
      sumCount((shelterMealRecords || []).filter((r) => inMonth(r.date))) +
      sumCount((unitedEffortMealRecords || []).filter((r) => inMonth(r.date))) +
      sumCount((extraMealRecords || []).filter((r) => inMonth(r.date))) +
      sumCount((dayWorkerMealRecords || []).filter((r) => inMonth(r.date)));

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
      bicycles: (bicycleRecords || [])
        .filter((r) => inMonth(r.date) && isCompletedBicycleStatus(r.status))
        .reduce((sum, record) => sum + getBicycleServiceCount(record), 0),
    };
  }, [
    reportsGenerated,
    activeSection,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    showerRecords,
    laundryRecords,
    haircutRecords,
    holidayRecords,
    bicycleRecords,
    isLaundryCompleted,
    isCompletedBicycleStatus,
    toCountValue,
  ]);

  // Only compute when viewing the reports section AND user has explicitly requested reports
  const yearAggregates = useMemo(() => {
    // Skip expensive computation unless explicitly requested
    if (!reportsGenerated || (activeSection !== "reports" && activeSection !== "overview")) {
      return {
        mealsServed: 0,
        showersBooked: 0,
        laundryLoads: 0,
        haircuts: 0,
        holidays: 0,
        bicycles: 0,
      };
    }

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
      sumCount((shelterMealRecords || []).filter((r) => inYear(r.date))) +
      sumCount((unitedEffortMealRecords || []).filter((r) => inYear(r.date))) +
      sumCount((extraMealRecords || []).filter((r) => inYear(r.date))) +
      sumCount((dayWorkerMealRecords || []).filter((r) => inYear(r.date)));

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
      bicycles: (bicycleRecords || [])
        .filter((r) => inYear(r.date) && isCompletedBicycleStatus(r.status))
        .reduce((sum, record) => sum + getBicycleServiceCount(record), 0),
    };
  }, [
    reportsGenerated,
    activeSection,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    showerRecords,
    laundryRecords,
    haircutRecords,
    holidayRecords,
    bicycleRecords,
    isLaundryCompleted,
    isCompletedBicycleStatus,
    toCountValue,
  ]);

  // Only compute when viewing the reports section AND user has explicitly requested reports
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

  const toggleCompletedBicycleCard = useCallback((id) => {
    setExpandedCompletedBicycleCards((prev = {}) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const selectedRvMealRecords = rvMealRecords.filter(
    (record) => pacificDateStringFrom(record.date || "") === selectedDate,
  );

  const selectedShelterMealRecords = shelterMealRecords.filter(
    (record) => pacificDateStringFrom(record.date || "") === selectedDate,
  );

  const selectedDateBicycleRepairs = (bicycleRecords || []).filter(
    (r) => pacificDateStringFrom(r.date || "") === bicycleViewDate,
  );

  const renderBicycleRepairsSection = () => (
    <BicycleRepairsSection
      bicycleRepairs={selectedDateBicycleRepairs}
      bicycleViewMode={bicycleViewMode}
      onChangeViewMode={setBicycleViewMode}
      guests={guests}
      updateBicycleRecord={updateBicycleRecord}
      deleteBicycleRecord={deleteBicycleRecord}
      setBicycleStatus={setBicycleStatus}
      moveBicycleRecord={moveBicycleRecord}
      expandedCompletedBicycleCards={expandedCompletedBicycleCards}
      onToggleCompletedCard={toggleCompletedBicycleCard}
      BICYCLE_REPAIR_STATUS={BICYCLE_REPAIR_STATUS}
      getGuestNameDetails={getGuestNameDetails}
      bicycleViewDate={bicycleViewDate}
      onPreviousDate={goToPreviousBicycleDate}
      onNextDate={goToNextBicycleDate}
      formatServiceDayLabel={formatServiceDayLabel}
      today={today}
    />
  );

  const headerSpring = useFadeInUp();
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

  const handleAddShelterMeals = () => {
    if (
      !shelterMealCount ||
      isNaN(shelterMealCount) ||
      parseInt(shelterMealCount) <= 0
    ) {
      enhancedToast.validationError(
        "Please enter a valid number of Shelter meals",
      );
      return;
    }

    setIsAddingShelterMeals(true);
    try {
      addShelterMealRecord(shelterMealCount, selectedDate);
      toast.success(
        `Added ${shelterMealCount} Shelter meals for ${new Date(selectedDate + "T00:00:00").toLocaleDateString()}!`,
      );
      setShelterMealCount("");
    } catch (error) {
      toast.error(`Error adding Shelter meals: ${error.message}`);
    } finally {
      setIsAddingShelterMeals(false);
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

  const handleStatusChange = async (recordId, newStatus) => {
    const success = await updateLaundryStatus(recordId, newStatus);
    if (success) {
      const info = getLaundryStatusInfo(newStatus);
      enhancedToast.success(`Laundry status updated to ${info.label}`);
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

  // Report generation handler - runs expensive computations on-demand
  const handleGenerateReports = useCallback(() => {
    setIsGeneratingReports(true);

    // Use startTransition to make the computation non-blocking
    startTransition(() => {
      // Set flag to trigger expensive computations
      setReportsGenerated(true);

      // Give a small delay to show loading state
      setTimeout(() => {
        setIsGeneratingReports(false);
        enhancedToast.success("Reports generated successfully");
      }, 100);
    });
  }, []);

  const handleRefreshReports = useCallback(() => {
    setIsGeneratingReports(true);

    // Force re-computation by toggling the flag
    startTransition(() => {
      setReportsGenerated(false);
      setTimeout(() => {
        setReportsGenerated(true);
        setTimeout(() => {
          setIsGeneratingReports(false);
          enhancedToast.success("Reports refreshed");
        }, 100);
      }, 50);
    });
  }, []);

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

    const saved = await updateLaundryBagNumber(bagPromptRecord.id, val);
    if (!saved) {
      return;
    }

    if (bagPromptNextStatus) {
      await handleStatusChange(bagPromptRecord.id, bagPromptNextStatus);
    }

    setBagPromptOpen(false);
    setBagPromptRecord(null);
    setBagPromptNextStatus(null);
    setBagPromptValue("");
    toast.success("Bag number saved and status updated");
  };

  const startEditingBagNumber = (recordId, currentBagNumber) => {
    setEditingBagNumber(recordId);
    setNewBagNumber(currentBagNumber || "");
  };

  const handleBagNumberChange = useCallback((value) => {
    setNewBagNumber(value);
  }, []);

  const handleBagNumberKeyDown = useCallback(
    async (e, event) => {
      if (e.key === "Enter") {
        if (event.originalRecord && newBagNumber) {
          const success = await updateLaundryBagNumber(
            event.originalRecord.id,
            parseInt(newBagNumber, 10),
          );
          if (success) {
            setEditingBagNumber(null);
            setNewBagNumber("");
            toast.success(`Bag #${newBagNumber} updated`);
          }
        }
      } else if (e.key === "Escape") {
        setEditingBagNumber(null);
        setNewBagNumber("");
      }
    },
    [newBagNumber, updateLaundryBagNumber],
  );

  const handleBagNumberSave = useCallback(
    async (event) => {
      if (event.originalRecord && newBagNumber) {
        const success = await updateLaundryBagNumber(
          event.originalRecord.id,
          parseInt(newBagNumber, 10),
        );
        if (success) {
          setEditingBagNumber(null);
          setNewBagNumber("");
          toast.success(`Bag #${newBagNumber} updated`);
        }
      }
    },
    [newBagNumber, updateLaundryBagNumber],
  );

  const handleBagNumberCancel = useCallback(() => {
    setEditingBagNumber(null);
    setNewBagNumber("");
  }, []);

  const handleBagNumberEdit = useCallback((eventId, bagNumber) => {
    setEditingBagNumber(eventId);
    setNewBagNumber(bagNumber?.toString() || "");
  }, []);

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
    { id: "donations", label: "Donations", icon: FileText },
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
      <div className="flex items-center gap-2">
        {/* Reschedule button */}
        <button
          type="button"
          onClick={() => setShowerPickerGuest(record.guestId)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 transition-all font-medium text-sm"
          title="Reschedule shower"
        >
          <Calendar size={18} />
          <span className="hidden sm:inline">Reschedule</span>
        </button>

        {/* Toggle completion status */}
        <button
          type="button"
          onClick={async () => {
            const nextStatus = isCompleted ? "awaiting" : "done";
            const success = await updateShowerStatus(record.id, nextStatus);
            if (success) {
              toast.success(
                nextStatus === "done"
                  ? "Marked as completed"
                  : "Reopened shower",
              );
            }
          }}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border font-medium text-sm transition-all ${isCompleted
            ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-300"
            }`}
          title={isCompleted ? "Reopen shower" : "Mark as done"}
        >
          {isCompleted ? (
            <>
              <RotateCcw size={18} />
              <span className="hidden sm:inline">Reopen</span>
            </>
          ) : (
            <>
              <CheckCircle2Icon size={18} />
              <span className="hidden sm:inline">Complete</span>
            </>
          )}
        </button>
        {/* Waiver badge for pending showers (staff dismisses externally-signed waivers) */}
        {!isCompleted && (
          <div className="ml-2">
            <WaiverBadge guestId={record.guestId} serviceType="shower" />
          </div>
        )}
      </div>
    );
  };


  const renderLaundryActions = (event) => {
    if (!event.originalRecord) return null;

    const record = event.originalRecord;
    const statusInfo = getLaundryStatusInfo(record.status);

    // Consider these laundry statuses as completed for waiver visibility
    const laundryCompletedSet = new Set([
      LAUNDRY_STATUS.DONE,
      LAUNDRY_STATUS.PICKED_UP,
      LAUNDRY_STATUS.RETURNED,
      LAUNDRY_STATUS.OFFSITE_PICKED_UP,
    ]);

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
    const statusTooltip = statusInfo
      ? `Current status: ${statusInfo.label}`
      : undefined;

    return (
      <div
        className="flex items-center gap-2 flex-wrap"
        title={statusTooltip}
        aria-label={statusTooltip}
      >
        {/* Bag number edit */}
        <button
          type="button"
          onClick={() => startEditingBagNumber(record.id, record.bagNumber)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-50 text-purple-600 hover:text-purple-700 border border-purple-200 hover:border-purple-300 transition-all font-medium text-sm"
          title="Edit bag number"
        >
          <Edit3 size={18} />
          <span className="hidden sm:inline">Bag</span>
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
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border font-medium text-sm transition-all ${buttonConfig.idleClass}`}
              title={buttonConfig.label}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{buttonConfig.label}</span>
            </button>
          );
        })}

        {/* Reschedule button */}
        <button
          type="button"
          onClick={() => setLaundryPickerGuest(record.guestId)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 transition-all font-medium text-sm"
          title="Reschedule laundry"
        >
          <Calendar size={18} />
          <span className="hidden sm:inline">Reschedule</span>
        </button>

        {/* Waiver badge for pending laundry loads (shown before picked up/done) */}
        {!laundryCompletedSet.has(record.status) && (
          <div className="ml-2">
            <WaiverBadge guestId={record.guestId} serviceType="laundry" />
          </div>
        )}
      </div>
    );
  };

  const renderTimelineSection = () => (
    <TimelineSection
      timelineEvents={timelineEvents}
      timelineViewFilter={timelineViewFilter}
      setTimelineViewFilter={setTimelineViewFilter}
      showCompletedTimeline={showCompletedTimeline}
      setShowCompletedTimeline={setShowCompletedTimeline}
      setActiveSection={setActiveSection}
      renderShowerActions={renderShowerActions}
      renderLaundryActions={renderLaundryActions}
      handleBagNumberChange={handleBagNumberChange}
      handleBagNumberKeyDown={handleBagNumberKeyDown}
      handleBagNumberSave={handleBagNumberSave}
      handleBagNumberCancel={handleBagNumberCancel}
      handleBagNumberEdit={handleBagNumberEdit}
      editingBagNumber={editingBagNumber}
      newBagNumber={newBagNumber}
      isAdmin={user?.role === "admin" || user?.role === "board" || user?.role === "staff"}
      onEndShowerDay={handleEndShowerDay}
      onEndLaundryDay={handleEndLaundryDay}
    />
  );

  const renderOverviewSection = () => (
    <OverviewSection
      todayMetrics={todayMetrics}
      guests={guests}
      monthAggregates={monthAggregates}
      yearAggregates={yearAggregates}
      todayShowerRecords={todayShowerRecords}
      activeShowers={activeShowers}
      activeLaundry={activeLaundry}
      completedLaundry={completedLaundry}
      todayWaitlisted={todayWaitlisted}
      todayLaundryWithGuests={todayLaundryWithGuests}
      todayBicycleRepairs={selectedDateBicycleRepairs}
      timelineEvents={timelineEvents}
      selectedGuestMealRecords={selectedGuestMealRecords}
      setActiveSection={setActiveSection}
      reportsGenerated={reportsGenerated}
      isGeneratingReports={isGeneratingReports}
      onGenerateReports={handleGenerateReports}
      onRefreshReports={handleRefreshReports}
      onEndShowerDay={handleEndShowerDay}
      onEndLaundryDay={handleEndLaundryDay}
      isAdmin={user?.role === "admin" || user?.role === "board" || user?.role === "staff"}
    />
  );

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
    (shelterMealRecords || []).forEach((record) =>
      addRecord(record?.date, "shelter", record?.count),
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

      const weekdayLabel = getPacificWeekdayLabel(day);
      rows.push([day, weekdayLabel, ...values, rowTotal]);
    });

    if (!rows.length) {
      toast.error("No meals matched those filters.");
      return;
    }

    const header = [
      "Date",
      "Day of week",
      ...selectedTypes.map((type) => MEAL_REPORT_TYPE_LABELS[type]),
      "Daily total",
    ];
    const grandTotal = selectedTypes.reduce(
      (sum, type) => sum + (totals[type] || 0),
      0,
    );
    const totalsRow = [
      "Total",
      "",
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
    shelterMealRecords,
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
        id: "shelter",
        label: "Shelter meals",
        description: "Meals served at partner shelter sites.",
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

        {(user?.role === "admin" || user?.role === "board" || user?.role === "staff") && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                <XCircle size={18} className="text-red-600" /> End Service Day
              </h3>
              <p className="text-sm text-red-700">
                Bulk cancel all remaining booked/waiting showers and waiting laundry for today.
                This is typically done at the end of the service day to clear the queues.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleEndShowerDay}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors border border-red-200"
              >
                <ShowerHead size={18} />
                End Shower Day
              </button>
              <button
                onClick={handleEndLaundryDay}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors border border-red-200"
              >
                <WashingMachine size={18} />
                End Laundry Day
              </button>
            </div>
          </div>
        )}

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
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${isActive
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
                aria-label="Reset defaults"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-200 hover:text-blue-600"
              >
                <BrushCleaning size={16} /> Reset defaults
              </button>
              <button
                type="button"
                onClick={handleDownloadMealReport}
                disabled={!canDownloadMealReport}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${canDownloadMealReport
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "cursor-not-allowed bg-gray-300"
                  }`}
              >
                <Download size={12} /> Download CSV
              </button>
            </div>
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

    // Identify new guests (first meal ever) for the selected day
    const newGuestIds = new Set();
    const uniqueGuestIds = new Set();

    selectedGuestMealRecords.forEach((record) => {
      if (record.guestId) {
        uniqueGuestIds.add(record.guestId);

        // Check if this guest has any meal records before the selected date
        const hasPreviousMeals = mealRecords.some((r) =>
          r.guestId === record.guestId &&
          pacificDateStringFrom(r.date) < selectedDate
        );

        if (!hasPreviousMeals) {
          newGuestIds.add(record.guestId);
        }
      }
    });

    const totalUniqueGuests = uniqueGuestIds.size;
    const totalNewGuests = newGuestIds.size;

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
    const totalShelterMeals = selectedShelterMealRecords.reduce(
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
      totalDayWorkerMeals +
      totalShelterMeals;
    const totalMealsExcludingLunch = totalMeals;
    const selectedDateLabel = new Date(
      selectedDate + "T00:00:00",
    ).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const isTodaySelected = selectedDate === today;

    const shiftMealsDate = (offset) => {
      const current = new Date(mealsDate + "T00:00:00");
      current.setDate(current.getDate() + offset);
      const newDate = pacificDateStringFrom(current);
      setMealsDate(newDate);
    };

    return (
      <div className="min-h-screen space-y-6 pb-8">
        {/* Hero Date Navigator */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 shadow-lg">
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-32 translate-x-32 rounded-full bg-gradient-to-br from-emerald-200/30 to-teal-200/30 blur-3xl" />

          <div className="relative flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
                <div className="rounded-2xl bg-emerald-600 p-3 shadow-lg">
                  <Utensils size={28} className="text-white" />
                </div>
                Daily Meals
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Track guest, partner, and community meal programs
              </p>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-4 rounded-2xl border border-emerald-300/50 bg-white/80 p-4 shadow-md backdrop-blur-sm">
              <button
                type="button"
                onClick={() => shiftMealsDate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200 hover:scale-110 active:scale-95"
                title="Previous day"
              >
                <ChevronLeft size={24} strokeWidth={2.5} />
              </button>

              <div className="text-center">
                <input
                  type="date"
                  value={mealsDate}
                  onChange={(event) => setMealsDate(event.target.value)}
                  max={todayShorthand}
                  className="mb-1 rounded-lg border-2 border-emerald-300 bg-white px-4 py-2 text-center text-sm font-semibold text-emerald-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <p className="text-xs font-medium text-emerald-700">
                  {selectedDateLabel}
                </p>
              </div>

              <button
                type="button"
                onClick={() => shiftMealsDate(1)}
                disabled={isTodaySelected}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:scale-100"
                title="Next day"
              >
                <ChevronRight size={24} strokeWidth={2.5} />
              </button>

              <div className="h-8 w-px bg-emerald-200" />

              <button
                type="button"
                onClick={() => setMealsDate(todayShorthand)}
                disabled={isTodaySelected}
                className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Auto-entries status indicator */}
        {hasAutomaticMealsForDay && hasAutomaticMealsForDay(new Date(selectedDate + 'T12:00:00').getDay()) && (
          <div className="flex items-center justify-center">
            {autoMealsAdded ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
                <CheckCircle size={18} />
                Preset meals auto-added for today
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700">
                <Clock size={18} />
                Preset meals will be added when service ends
              </div>
            )}
          </div>
        )}

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-emerald-100 p-3">
                  <Utensils size={24} className="text-emerald-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Total Meals
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {totalMealsExcludingLunch.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Served today (excl. lunch bags)
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-blue-100 p-3">
                  <Users size={24} className="text-blue-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Guest Meals
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {totalGuestMeals.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {mergedGuestMeals.length} entries logged
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-teal-100 p-3">
                  <Users size={24} className="text-teal-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Unique Guests
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {totalUniqueGuests.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {totalNewGuests > 0 ? `${totalNewGuests} new` : 'returning guests'}
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm transition hover:shadow-md" title="Number of meal records picked up by a different guest on behalf of the intended recipient. Counts meals, not unique proxies.">
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-orange-100 p-3">
                  <Users size={24} className="text-orange-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  Proxy Pickups
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-orange-900">
                {mergedGuestMeals.filter(r => r.pickedUpByProxyId).length}
              </p>
              <p className="mt-1 text-sm text-orange-700">
                meal records picked up by proxies
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-amber-100 p-3">
                  <Apple size={24} className="text-amber-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Lunch Bags
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {totalLunchBags.toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-gray-600">to-go lunch bags</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-purple-100 p-3">
                  <HeartHandshake size={24} className="text-purple-600" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Partner Meals
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {(
                  totalRvMeals +
                  totalShelterMeals +
                  totalUeMeals +
                  totalDayWorkerMeals
                ).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                RV, Shelter, UE, Day Worker
              </p>
            </div>
          </div>
        </div>

        {/* Meal Category Breakdown */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-blue-100 p-3">
                  <Users size={22} className="text-blue-600" />
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  {mergedGuestMeals.length} entries
                </span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                Guest Meals
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalGuestMeals.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-gray-600">
                Direct guest service meals
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-indigo-100 p-3">
                  <SquarePlus size={22} className="text-indigo-600" />
                </div>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  {selectedDayWorkerMealRecords.length} records
                </span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                Day Worker Center
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalDayWorkerMeals.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-gray-600">
                Partner drop-off meals
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-orange-100 p-3">
                  <Caravan size={22} className="text-orange-600" />
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                  {selectedRvMealRecords.length} logs
                </span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                RV Meals
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalRvMeals.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-gray-600">Outreach delivery</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-purple-100 p-3">
                  <Bed size={22} className="text-purple-600" />
                </div>
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                  {selectedShelterMealRecords.length} logs
                </span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                Shelter Meals
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalShelterMeals.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-gray-600">Shelter delivery</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-sky-100 p-3">
                  <HeartHandshake size={22} className="text-sky-600" />
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                  {selectedUeMealRecords.length} logs
                </span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                United Effort
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalUeMeals.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-gray-600">Partner pickup</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-amber-100 p-3">
                  <Sparkles size={22} className="text-amber-600" />
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                  Combined
                </span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">
                Extra Meals
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalCombinedExtras.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-gray-600">
                Guest: {totalGuestExtraMeals} • Walk-up: {totalExtraMeals}
              </p>
            </div>
          </div>
        </div>

        {/* Meal Type Tabs */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          {[
            { id: "guest", label: "Guest Meals", icon: Users },
            { id: "dw", label: "Day Worker", icon: SquarePlus },
            { id: "rv", label: "RV Meals", icon: Caravan },
            { id: "shelter", label: "Shelter", icon: Bed },
            { id: "ue", label: "United Effort", icon: HeartHandshake },
            { id: "extras", label: "Extra Meals", icon: Sparkles },
            { id: "lunch", label: "Lunch Bags", icon: Apple },
            // eslint-disable-next-line no-unused-vars
          ].map(({ id, label, icon: IconComponent }) => (
            <button
              key={id}
              onClick={() => setMealTypeTab(id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${mealTypeTab === id
                ? "bg-emerald-600 text-white shadow-md"
                : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              <IconComponent size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Meal Input Forms */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Day Worker Section */}
          <div style={{ display: mealTypeTab === "dw" ? "block" : "none" }} className="space-y-4">
            <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-100 p-3">
                      <SquarePlus size={22} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Day Worker Center
                      </h3>
                      <p className="text-xs text-gray-600">
                        Partner drop-off meals
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700">
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
                    className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                        addDayWorkerMealRecord(
                          dayWorkerMealCount,
                          selectedDate,
                        );
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
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isAddingDayWorkerMeals ? "Saving…" : "Add DW meals"}
                  </button>
                </div>
                {selectedDayWorkerMealRecords.length > 0 ? (
                  <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-800">
                      Entries for {selectedDateLabel}
                    </div>
                    <ul className="space-y-2">
                      {selectedDayWorkerMealRecords.map((record) => (
                        <li
                          key={record.id}
                          className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">
                              {new Date(record.date).toLocaleTimeString()}
                            </span>
                            <span className="text-sm font-bold text-indigo-700">
                              {record.count} meals
                            </span>
                          </div>
                          <button
                            onClick={() => deleteDayWorkerMealRecord(record.id)}
                            className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition hover:bg-red-100 hover:text-red-600"
                            title="Delete this entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                    No day worker meals logged yet for this date.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* RV and Shelter Section */}
          <div style={{ display: mealTypeTab === "rv" || mealTypeTab === "shelter" ? "block" : "none" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div style={{ display: mealTypeTab === "rv" ? "block" : "none" }} className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-orange-100 p-3">
                        <Caravan size={22} className="text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          RV Meals
                        </h3>
                        <p className="text-xs text-gray-600">
                          Outreach delivery
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700">
                      {totalRvMeals.toLocaleString()} today
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      value={rvMealCount}
                      onChange={(event) => setRvMealCount(event.target.value)}
                      placeholder="Number of RV meals"
                      className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                      min="1"
                      disabled={isAddingRvMeals}
                    />
                    <button
                      onClick={handleAddRvMeals}
                      disabled={isAddingRvMeals || !rvMealCount}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isAddingRvMeals ? "Saving…" : "Add RV"}
                    </button>
                  </div>
                  {selectedRvMealRecords.length > 0 ? (
                    <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-800">
                        Entries for {selectedDateLabel}
                      </div>
                      <ul className="space-y-2">
                        {selectedRvMealRecords.map((record) => (
                          <li
                            key={record.id}
                            className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">
                                {new Date(record.date).toLocaleTimeString()}
                              </span>
                              <span className="text-sm font-bold text-orange-700">
                                {record.count} meals
                              </span>
                            </div>
                            <button
                              onClick={() => deleteRvMealRecord(record.id)}
                              className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition hover:bg-red-100 hover:text-red-600"
                              title="Delete this entry"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                      No RV meals logged yet for this date.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: mealTypeTab === "shelter" ? "block" : "none" }} className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-purple-100 p-3">
                        <Bed size={22} className="text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Shelter Meals
                        </h3>
                        <p className="text-xs text-gray-600">
                          Shelter delivery
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700">
                      {totalShelterMeals.toLocaleString()} today
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      value={shelterMealCount}
                      onChange={(event) =>
                        setShelterMealCount(event.target.value)
                      }
                      placeholder="Number of Shelter meals"
                      className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
                      min="1"
                      disabled={isAddingShelterMeals}
                    />
                    <button
                      onClick={handleAddShelterMeals}
                      disabled={isAddingShelterMeals || !shelterMealCount}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isAddingShelterMeals ? "Saving…" : "Add Shelter"}
                    </button>
                  </div>
                  {selectedShelterMealRecords.length > 0 ? (
                    <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-purple-800">
                        Entries for {selectedDateLabel}
                      </div>
                      <ul className="space-y-2">
                        {selectedShelterMealRecords.map((record) => (
                          <li
                            key={record.id}
                            className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">
                                {new Date(record.date).toLocaleTimeString()}
                              </span>
                              <span className="text-sm font-bold text-purple-700">
                                {record.count} meals
                              </span>
                            </div>
                            <button
                              onClick={() => deleteShelterMealRecord(record.id)}
                              className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition hover:bg-red-100 hover:text-red-600"
                              title="Delete this entry"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                      No Shelter meals logged yet for this date.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* United Effort and Extra Meals Section */}
          <div style={{ display: mealTypeTab === "ue" || mealTypeTab === "extras" ? "block" : "none" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div style={{ display: mealTypeTab === "ue" ? "block" : "none" }} className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-sky-100 p-3">
                        <HeartHandshake size={22} className="text-sky-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          United Effort
                        </h3>
                        <p className="text-xs text-gray-600">Partner pickup</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700">
                      {totalUeMeals.toLocaleString()} today
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      value={ueMealCount}
                      onChange={(event) => setUeMealCount(event.target.value)}
                      placeholder="Number of United Effort meals"
                      className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
                      min="1"
                      disabled={isAddingUeMeals}
                    />
                    <button
                      onClick={handleAddUeMeals}
                      disabled={isAddingUeMeals || !ueMealCount}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isAddingUeMeals ? "Saving…" : "Add UE"}
                    </button>
                  </div>
                  {selectedUeMealRecords.length > 0 ? (
                    <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100/50 p-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-800">
                        Entries for {selectedDateLabel}
                      </div>
                      <ul className="space-y-2">
                        {selectedUeMealRecords.map((record) => (
                          <li
                            key={record.id}
                            className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">
                                {new Date(record.date).toLocaleTimeString()}
                              </span>
                              <span className="text-sm font-bold text-sky-700">
                                {record.count} meals
                              </span>
                            </div>
                            <button
                              onClick={() => deleteUnitedEffortMealRecord(record.id)}
                              className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition hover:bg-red-100 hover:text-red-600"
                              title="Delete this entry"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                      No United Effort meals logged yet for this date.
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: mealTypeTab === "extras" ? "block" : "none" }} className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-100 p-3">
                        <Sparkles size={22} className="text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Extra Meals
                        </h3>
                        <p className="text-xs text-gray-600">
                          Walk-ups without guest record
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
                      {totalExtraMeals.toLocaleString()} today
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="number"
                      value={extraMealCount}
                      onChange={(event) =>
                        setExtraMealCount(event.target.value)
                      }
                      placeholder="Number of extra meals"
                      className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                      min="1"
                      disabled={isAddingExtraMeals}
                    />
                    <button
                      onClick={handleAddExtraMeals}
                      disabled={isAddingExtraMeals || !extraMealCount}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isAddingExtraMeals ? "Saving…" : "Add Extras"}
                    </button>
                  </div>
                  {selectedGlobalExtraMealRecords.length > 0 ? (
                    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">
                        Entries for {selectedDateLabel}
                      </div>
                      <ul className="space-y-2">
                        {selectedGlobalExtraMealRecords.map((record) => (
                          <li
                            key={record.id}
                            className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">
                                {new Date(record.date).toLocaleTimeString()}
                              </span>
                              <span className="text-sm font-bold text-amber-700">
                                {record.count} meals
                              </span>
                            </div>
                            <button
                              onClick={() => deleteExtraMealRecord(record.id)}
                              className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition hover:bg-red-100 hover:text-red-600"
                              title="Delete this entry"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                      No unassigned extra meals logged yet for this date.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lunch Bags Section */}
          <div style={{ display: mealTypeTab === "lunch" ? "block" : "none" }} className="w-full">
            <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-lime-100 p-3">
                      <Apple size={22} className="text-lime-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Lunch Bags
                      </h3>
                      <p className="text-xs text-gray-600">
                        For takeout purposes
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-lime-100 px-3 py-1.5 text-xs font-bold text-lime-700">
                    {totalLunchBags.toLocaleString()} today
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="number"
                    value={lunchBagCount}
                    onChange={(event) => setLunchBagCount(event.target.value)}
                    placeholder="Number of lunch bags"
                    className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-lime-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lime-200"
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
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-600 to-lime-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isAddingLunchBags ? "Saving…" : "Add Bags"}
                  </button>
                </div>
                {selectedLunchBagRecords.length > 0 ? (
                  <div className="rounded-2xl border-2 border-lime-200 bg-gradient-to-br from-lime-50 to-lime-100/50 p-4">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-lime-800">
                      Entries for {selectedDateLabel}
                    </div>
                    <ul className="space-y-2">
                      {selectedLunchBagRecords.map((record) => (
                        <li
                          key={record.id}
                          className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">
                              {new Date(record.date).toLocaleTimeString()}
                            </span>
                            <span className="text-sm font-bold text-lime-700">
                              {record.count} bag{record.count > 1 ? "s" : ""}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteLunchBagRecord(record.id)}
                            className="flex items-center justify-center rounded-lg p-1.5 text-gray-400 transition hover:bg-red-100 hover:text-red-600"
                            title="Delete this entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                    No lunch bags logged yet for this date.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Guest Meal Log - Revamped */}
        <div style={{ display: mealTypeTab === "guest" ? "block" : "none" }} className="relative overflow-hidden rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 shadow-lg">

          <div className="relative space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 shadow-lg">
                    <Utensils size={24} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Guest Meal Log
                  </h2>
                </div>
                <p className="text-sm text-gray-600 ml-0">
                  Detailed meal entries for {selectedDateLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-emerald-200 px-4 py-2 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700">
                    Total Entries
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 mt-0.5">
                    {mergedGuestMeals.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-blue-200 px-4 py-2 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-700">
                    Total Meals
                  </p>
                  <p className="text-2xl font-bold text-blue-900 mt-0.5">
                    {totalGuestMeals.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {mergedGuestMeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-white/40 backdrop-blur-sm py-16">
                <div className="rounded-full bg-emerald-100 p-4 mb-4">
                  <Utensils size={40} className="text-emerald-500" />
                </div>
                <p className="text-base font-semibold text-gray-700">
                  No meal entries yet
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Meals will appear here as they are logged
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mergedGuestMeals.map((rec, index) => {
                  const isExtraGuestMeal = !!(
                    rec.guestId &&
                    extraMealRecords.some((er) => er.id === rec.id)
                  );
                  const isNewGuest = newGuestIds.has(rec.guestId);
                  const guestDetails = getGuestNameDetails(rec.guestId);
                  const isOrphaned = guestDetails.isOrphaned;
                  return (
                    <div
                      key={rec.id}
                      className={`group relative overflow-visible rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${isOrphaned
                        ? 'border-red-300 bg-red-50/70 hover:border-red-400 hover:bg-red-50/90'
                        : 'border-emerald-200/60 bg-white/70 hover:border-emerald-300 hover:bg-white/90'
                        } backdrop-blur-sm`}
                    >
                      <div className={`absolute left-0 top-0 w-1 h-full rounded-l-2xl bg-gradient-to-b ${isOrphaned
                        ? 'from-red-400 to-orange-400'
                        : 'from-emerald-400 to-teal-400'
                        } opacity-0 group-hover:opacity-100 transition-opacity`} />

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Guest Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div className={`flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br ${isOrphaned
                              ? 'from-red-400 to-orange-500'
                              : 'from-emerald-400 to-teal-500'
                              } flex items-center justify-center shadow-sm`}>
                              <span className="text-xs font-bold text-white">
                                {index + 1}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className={`truncate font-semibold text-sm ${isOrphaned ? 'text-red-700' : 'text-gray-900'}`}>
                                {guestDetails.displayName}
                              </h3>
                            </div>
                            {isOrphaned && (
                              <span
                                className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200"
                                title={`Guest ID: ${guestDetails.originalGuestId || "unknown"} (Loaded: ${guests.length} guests)`}
                              >
                                ⚠️ Orphaned Record ({String(guestDetails.originalGuestId)})
                              </span>
                            )}
                            {isNewGuest && !isExtraGuestMeal && !isOrphaned && (
                              <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                ✨ New Guest
                              </span>
                            )}
                            {isExtraGuestMeal && (
                              <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                ★ Extra
                              </span>
                            )}
                            {rec.pickedUpByProxyId && (
                              <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200" title={`Picked up by proxy: ${getGuestNameDetails(rec.pickedUpByProxyId).displayName}`}>
                                🤝 Proxy Pickup
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-11">
                            <Clock size={12} className="text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(rec.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {rec.pickedUpByProxyId && (
                              <span className="text-xs text-orange-600">
                                via {getGuestNameDetails(rec.pickedUpByProxyId).displayName}
                              </span>
                            )}
                            {rec.pendingSync && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 animate-pulse">
                                ⟳ Syncing
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-shrink-0 items-center gap-2 ml-0 sm:ml-4 pt-2 sm:pt-0">
                          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200 shadow-sm">
                            <div className="flex items-center gap-1">
                              <Utensils size={14} className="text-emerald-700" />
                              <span className="font-bold text-sm text-emerald-900">
                                {rec.count}
                              </span>
                            </div>
                          </div>
                          <button
                            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 border-2 border-red-300 text-red-600 shadow-md transition-all hover:bg-red-200 hover:border-red-400 hover:text-red-700 hover:shadow-lg active:scale-95 relative z-10 group/btn"
                            title="Delete this entry"
                            aria-label="Delete meal entry"
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
                            <Trash2 size={20} />
                          </button>
                        </div>
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
      case "donations":
        return renderDonationsSection();
      case "export":
        return renderExportSection();
      default:
        return renderOverviewSection();
    }
  };

  const renderDonationsSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Donations />
        <LaPlazaDonations />
      </div>
    </div>
  );

  // Shared End Service Day component for consistent UI across sections
  const EndServiceDayActions = ({ onEndShowerDay, onEndLaundryDay, showShower = false, showLaundry = false }) => {
    const isAdmin = user?.role === "admin" || user?.role === "board" || user?.role === "staff";
    if (!isAdmin || (!showShower && !showLaundry)) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <XCircle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">End Service Day</h3>
            <p className="text-xs text-red-700">
              Cancel all remaining bookings to close for the day
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {showShower && (
            <button
              onClick={onEndShowerDay}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-700 bg-white border-2 border-red-300 rounded-lg hover:bg-red-100 hover:border-red-400 transition-all"
            >
              <ShowerHead size={16} />
              End Showers
            </button>
          )}
          {showLaundry && (
            <button
              onClick={onEndLaundryDay}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-700 bg-white border-2 border-red-300 rounded-lg hover:bg-red-100 hover:border-red-400 transition-all"
            >
              <WashingMachine size={16} />
              End Laundry
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleToggleShowerDetails = useCallback((recordId) => {
    setExpandedShowerRows((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  }, []);

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

    const renderShowerCard = (record, animationStyle, context = {}) => {
      const guest = guests.find((g) => g.id === record.guestId);
      const { index = 0, section = "active" } = context;

      return (
        <CompactShowerCard
          key={record.id}
          record={record}
          guest={guest}
          index={index}
          section={section}
          animationStyle={animationStyle}
          isExpanded={Boolean(expandedShowerRows[record.id])}
          onToggleExpand={() => handleToggleShowerDetails(record.id)}

          // Context functions
          canGiveItem={canGiveItem}
          getDaysUntilAvailable={getDaysUntilAvailable}
          getLastGivenItem={getLastGivenItem}
          giveItem={giveItem}
          getWarningsForGuest={getWarningsForGuest}
          updateShowerStatus={updateShowerStatus}
          rescheduleShower={rescheduleShower}
          cancelShowerRecord={cancelShowerRecord}

          // Helpers
          sectionrefreshButton={null} // not needed inside card
          showerSlotOptions={showerSlotOptions}
          formatShowerSlotLabel={formatShowerSlotLabel}
          laundryLinked={guest ? laundryGuestIdsSet.has(guest.id) : false}
          onCloseModal={() => setSelectedShowerRecord(null)}
        />
      );
    };

    // Compact view mode - return simplified list
    if (showerViewMode === "compact") {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ShowerHead className="text-blue-600" size={20} />
                <span>Today's Showers</span>
              </h2>
              <SectionRefreshButton serviceType="shower" size="sm" variant="ghost" />
            </div>
          </div>

          {/* End Service Day - Consistent placement at top of section */}
          <EndServiceDayActions
            onEndShowerDay={handleEndShowerDay}
            onEndLaundryDay={handleEndLaundryDay}
            showShower={true}
            showLaundry={false}
          />

          {/* Date Navigation for Shower Time Travel */}
          {showerViewDate !== today && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <History size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Viewing Showers from {formatServiceDayLabel(showerViewDate)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowerViewDate(today)}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-200 transition-colors whitespace-nowrap"
                >
                  Back to Today
                </button>
              </div>
            </div>
          )}

          {/* Date Navigation Buttons */}
          <div className="flex items-center justify-between gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2">
            <button
              type="button"
              onClick={goToPreviousShowerDate}
              className="px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors inline-flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              Previous Day
            </button>

            <div className="text-center text-sm font-medium text-gray-600">
              {formatServiceDayLabel(showerViewDate)}
            </div>

            <button
              type="button"
              onClick={goToNextShowerDate}
              disabled={showerViewDate >= today}
              className="px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Day
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Slot Block Manager - Only visible to admin/staff */}
          <SlotBlockManager serviceType="shower" />

          <CompactShowerList onGuestClick={handleShowerGuestClickOptimized} viewDate={showerViewDate} />

          {/* Modal for detailed view */}
          {selectedShowerRecord && (
            <ShowerDetailModal
              isOpen={!!selectedShowerRecord}
              onClose={() => setSelectedShowerRecord(null)}
              showerRecord={selectedShowerRecord}
              guest={guests.find(g => g.id === selectedShowerRecord.guestId)}
            >
              {renderShowerCard(selectedShowerRecord, {}, { section: "modal" })}
            </ShowerDetailModal>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">View:</span>
            <button
              type="button"
              onClick={() => setShowerViewMode("detailed")}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white"
            >
              Detailed
            </button>
            <button
              type="button"
              onClick={() => setShowerViewMode("compact")}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Compact
            </button>
          </div>
        </div>
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
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ShowerHead className="text-blue-600" size={20} />
                    <span>Today's Showers</span>
                  </h2>
                  <SectionRefreshButton serviceType="shower" size="sm" variant="ghost" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Manage the flow of guests, update statuses, and keep
                  essentials stocked.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                {(user?.role === "admin" || user?.role === "board" || user?.role === "staff") && (
                  <button
                    onClick={handleEndShowerDay}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-full hover:bg-red-100 transition-all"
                  >
                    <XCircle size={14} />
                    End Service Day
                  </button>
                )}
                <span className="bg-blue-100 text-blue-700 font-medium px-3 py-1 rounded-full">
                  {todayShowerRecords.filter((r) => r.status === "done").length}{" "}
                  completed
                </span>
              </div>
            </div>

            {/* Date Navigation for Shower Time Travel */}
            {showerViewDate !== today && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <History size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Viewing Showers from {formatServiceDayLabel(showerViewDate)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowerViewDate(today)}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-200 transition-colors whitespace-nowrap"
                  >
                    Back to Today
                  </button>
                </div>
              </div>
            )}

            {/* Date Navigation Buttons */}
            <div className="flex items-center justify-between gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2">
              <button
                type="button"
                onClick={goToPreviousShowerDate}
                className="px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors inline-flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Previous Day
              </button>

              <div className="text-center text-sm font-medium text-gray-600">
                {formatServiceDayLabel(showerViewDate)}
              </div>

              <button
                type="button"
                onClick={goToNextShowerDate}
                disabled={showerViewDate >= today}
                className="px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Day
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setShowerTab("active")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${showerTab === "active"
                  ? "border-blue-500 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                <Clock size={16} />
                <span>Active Queue</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${showerTab === "active" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>
                  {activeShowers.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowerTab("completed")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${showerTab === "completed"
                  ? "border-emerald-500 text-emerald-600 bg-emerald-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                <CheckCircle size={16} />
                <span>Completed</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${showerTab === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                  }`}>
                  {completedShowers.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowerTab("waitlist")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${showerTab === "waitlist"
                  ? "border-amber-500 text-amber-600 bg-amber-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                <History size={16} />
                <span>Waitlist</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${showerTab === "waitlist" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                  }`}>
                  {todayWaitlisted.length}
                </span>
              </button>
            </div>

            {/* Tab Content: Active Queue */}
            {showerTab === "active" && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <select
                        value={showerLaundryFilter}
                        onChange={(event) => setShowerLaundryFilter(event.target.value)}
                        className="px-3 py-2 text-sm font-bold bg-white border-2 border-blue-100 rounded-xl focus:border-blue-300 focus:ring-0 appearance-none cursor-pointer text-gray-700"
                      >
                        <option value="any">Any Laundry</option>
                        <option value="with">With Laundry</option>
                        <option value="without">No Laundry</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Sort By:</span>
                    <div className="relative">
                      <select
                        value={showerSort}
                        onChange={(event) => setShowerSort(event.target.value)}
                        className="px-3 py-2 text-sm font-bold bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-200 focus:ring-0 appearance-none cursor-pointer text-gray-600"
                      >
                        <option value="time-asc">Time (Earliest)</option>
                        <option value="time-desc">Time (Latest)</option>
                        <option value="name">Guest Name</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {activeShowers.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-blue-100 rounded-2xl text-center py-16 px-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShowerHead size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No active showers</h3>
                    <p className="text-gray-500 max-w-xs mx-auto">
                      Guests with assigned slots for today will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeShowers.map((record, idx) =>
                      renderShowerCard(record, activeShowersTrail[idx], {
                        index: idx,
                        section: "active",
                      }),
                    )}
                  </div>
                )}

                {/* Collapsible Completed Showers Section */}
                {completedShowers.length > 0 && (
                  <div className="mt-8 rounded-xl border-2 border-emerald-100 bg-emerald-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedCompletedShowers(!expandedCompletedShowers)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-emerald-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2Icon size={20} className="text-emerald-600" />
                        <span className="text-base font-bold text-emerald-900">
                          Done Showers
                        </span>
                        <span className="ml-2 px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                          {completedShowers.length}
                        </span>
                      </div>
                      {expandedCompletedShowers ? (
                        <ChevronUp size={20} className="text-emerald-600" />
                      ) : (
                        <ChevronDown size={20} className="text-emerald-600" />
                      )}
                    </button>

                    {expandedCompletedShowers && (
                      <div className="border-t-2 border-emerald-100 bg-white p-6 space-y-4">
                        {completedShowers.map((record, idx) =>
                          renderShowerCard(record, completedShowersTrail[idx], {
                            index: idx,
                            section: "completed",
                          }),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Tab Content: Completed */}
            {showerTab === "completed" && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <select
                        value={showerLaundryFilter}
                        onChange={(event) => setShowerLaundryFilter(event.target.value)}
                        className="px-3 py-2 text-sm font-bold bg-white border-2 border-emerald-100 rounded-xl focus:border-emerald-300 focus:ring-0 appearance-none cursor-pointer text-gray-700"
                      >
                        <option value="any">Any Laundry</option>
                        <option value="with">With Laundry</option>
                        <option value="without">No Laundry</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="px-3 py-2 bg-emerald-50 border-2 border-emerald-100 rounded-xl flex items-center gap-2">
                      <CheckCircle2Icon size={14} className="text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-700">
                        {completedShowers.length} Completed
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Sort By:</span>
                    <div className="relative">
                      <select
                        value={showerSort}
                        onChange={(event) => setShowerSort(event.target.value)}
                        className="px-3 py-2 text-sm font-bold bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-emerald-200 focus:ring-0 appearance-none cursor-pointer text-gray-600"
                      >
                        <option value="time-asc">Time (Earliest)</option>
                        <option value="time-desc">Time (Latest)</option>
                        <option value="name">Guest Name</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {completedShowers.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-emerald-100 rounded-2xl text-center py-16 px-6">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2Icon size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No completed showers</h3>
                    <p className="text-gray-500 max-w-xs mx-auto">
                      Once guests finish their showers, they will be listed here for your records.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedShowers.map((record, idx) =>
                      renderShowerCard(record, completedShowersTrail[idx], {
                        index: idx,
                        section: "completed",
                      }),
                    )}
                  </div>
                )}
              </>
            )}

            {/* Tab Content: Waitlist */}
            {showerTab === "waitlist" && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <select
                        value={showerLaundryFilter}
                        onChange={(event) => setShowerLaundryFilter(event.target.value)}
                        className="px-3 py-2 text-sm font-bold bg-white border-2 border-amber-100 rounded-xl focus:border-amber-300 focus:ring-0 appearance-none cursor-pointer text-gray-700"
                      >
                        <option value="any">Any Laundry</option>
                        <option value="with">With Laundry</option>
                        <option value="without">No Laundry</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="px-3 py-2 bg-amber-50 border-2 border-amber-100 rounded-xl flex items-center gap-2">
                      <History size={14} className="text-amber-600" />
                      <span className="text-sm font-bold text-amber-700">
                        {todayWaitlisted.length} Waitlisted
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Sort By:</span>
                    <div className="relative">
                      <select
                        value={showerSort}
                        onChange={(event) => setShowerSort(event.target.value)}
                        className="px-3 py-2 text-sm font-bold bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-amber-200 focus:ring-0 appearance-none cursor-pointer text-gray-600"
                      >
                        <option value="time-asc">Time (Earliest)</option>
                        <option value="time-desc">Time (Latest)</option>
                        <option value="name">Guest Name</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {todayWaitlisted.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-amber-100 rounded-2xl text-center py-16 px-6">
                    <div className="w-16 h-16 bg-amber-50 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Waitlist is empty</h3>
                    <p className="text-gray-500 max-w-xs mx-auto">
                      When all slots are full, guests added to the waitlist will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayWaitlisted.map((record, idx) =>
                      renderShowerCard(record, waitlistTrail[idx], {
                        index: idx,
                        section: "waitlist",
                      }),
                    )}

                    <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-start gap-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 mb-1">Waitlist Management</h4>
                        <p className="text-xs text-amber-700 leading-relaxed">
                          Guests marked as <strong>Priority</strong> are next in line.
                          Assign them to a slot or mark them complete as soon as a shower becomes available.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLaundrySection = () => {
    return (
      <div className="space-y-6">
        {/* End Service Day - Consistent placement at top of section */}
        <EndServiceDayActions
          onEndShowerDay={handleEndShowerDay}
          onEndLaundryDay={handleEndLaundryDay}
          showShower={false}
          showLaundry={true}
        />

        {/* Pending Pickup - Orphaned Laundry from Previous Days */}
        <OrphanedLaundryTracker />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 lg:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <WashingMachine className="text-purple-600" size={20} />
                    <span>Today's Laundry</span>
                  </h2>
                  <SectionRefreshButton serviceType="laundry" size="sm" variant="ghost" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Monitor bag progress, adjust slots, and update statuses in one
                  place.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="bg-purple-100 text-purple-700 font-medium px-3 py-1 rounded-full">
                    {todayLaundryWithGuests.length} records
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    Showing {filteredLaundry.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setLaundryViewMode("kanban")}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${laundryViewMode === "kanban"
                      ? "bg-white text-purple-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    Kanban
                  </button>
                  <button
                    type="button"
                    onClick={() => setLaundryViewMode("compact")}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${laundryViewMode === "compact"
                      ? "bg-white text-purple-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    Compact
                  </button>
                </div>
              </div>
            </div>

            {/* Slot Block Manager - Only visible to admin/staff, shown in both views */}
            <SlotBlockManager serviceType="laundry" />

            {laundryViewMode === "kanban" ? (
              <LaundryKanban
                laundryRecords={filteredLaundry}
                guests={guests}
                updateLaundryStatus={updateLaundryStatus}
                updateLaundryBagNumber={updateLaundryBagNumber}
                cancelLaundryRecord={cancelLaundryRecord}
                attemptLaundryStatusChange={attemptLaundryStatusChange}
              />
            ) : (
              <div className="space-y-3">
                {/* Date Navigation for Laundry Time Travel */}
                {laundryViewDate !== today && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <History size={16} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          Viewing Laundry from {formatServiceDayLabel(laundryViewDate)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLaundryViewDate(today)}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-200 transition-colors whitespace-nowrap"
                      >
                        Back to Today
                      </button>
                    </div>
                  </div>
                )}

                {/* Date Navigation Buttons */}
                <div className="flex items-center justify-between gap-2 bg-purple-50 border border-purple-100 rounded-lg p-2">
                  <button
                    type="button"
                    onClick={goToPreviousLaundryDate}
                    className="px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors inline-flex items-center gap-1"
                  >
                    <ChevronLeft size={16} />
                    Previous Day
                  </button>

                  <div className="text-center text-sm font-medium text-gray-600">
                    {formatServiceDayLabel(laundryViewDate)}
                  </div>

                  <button
                    type="button"
                    onClick={goToNextLaundryDate}
                    disabled={laundryViewDate >= today}
                    className="px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Day
                    <ChevronRight size={16} />
                  </button>
                </div>

                <CompactLaundryList
                  viewDate={laundryViewDate}
                  onGuestClick={() => {
                    // When clicking in compact view, switch to kanban for full interaction
                    setLaundryViewMode("kanban");
                  }}
                />
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeSection === section.id
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
            className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100"
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-900">
              Bag number required
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Please enter a bag number before changing laundry status. This
              helps track a guest's laundry.
            </p>
            <div className="mb-6">
              <input
                type="text"
                value={bagPromptValue}
                onChange={(e) => setBagPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    confirmBagPrompt();
                  } else if (e.key === "Escape") {
                    setBagPromptOpen(false);
                  }
                }}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="e.g., 33 or 54 or Green 45"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBagPromptOpen(false)}
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBagPrompt}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
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
        role={quickActionRole}
        shortcutsEnabled={quickActionsVisible && showQuickActions}
        onClose={() => setQuickActionsVisible(false)}
      />
    </div>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders
// Only re-renders when service records actually change
export default React.memo(Services);
