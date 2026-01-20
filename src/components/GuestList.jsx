import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { FixedSizeList as List } from "react-window";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";
import { animated as Animated } from "@react-spring/web";
import { useStagger, SpringIcon } from "../utils/animations";
import toast from "react-hot-toast";
import haptics from "../utils/haptics";
import {
  User,
  Users,
  Home,
  MapPin,
  Phone,
  CalendarClock,
  Utensils,
  ShowerHead,
  WashingMachine,
  Search,
  ChevronDown,
  ChevronUp,
  UserPlus,
  X,
  AlertCircle,
  AlertTriangle,
  Plus,
  PlusCircle,
  Eraser,
  Scissors,
  Gift,
  Bike,
  RotateCcw,
  Ban,
  Lightbulb,
  Link,
  Check,
  UserCheck,
  Loader2,
} from "lucide-react";
import GuestListRow from "./GuestListRow";
import { useAppContext } from "../context/useAppContext";
import { useGuestsStore } from "../stores/useGuestsStore";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from "../context/constants";
import Selectize from "./Selectize";
import GuestCreateForm from "./guest/GuestCreateForm";
import LinkedGuestsManager from "./guest/LinkedGuestsManager";
import { WaiverBadge } from "./ui/WaiverBadge";
import { findFuzzySuggestions, formatSuggestionDisplay } from "../utils/fuzzyMatch";
import { flexibleNameSearch } from "../utils/flexibleNameSearch";
import { isActiveGuest, getLastMealLabel } from "../utils/guestActivity";
import { findPotentialDuplicates } from "../utils/duplicateDetection";
import MobileServiceSheet from "./MobileServiceSheet";

const VIRTUALIZATION_THRESHOLD = 40;
const DEFAULT_ITEM_HEIGHT = 208;
const COMPACT_ITEM_HEIGHT = 72;
// Adaptive height for few results (1-3 matches) - more space-efficient
const ADAPTIVE_ITEM_HEIGHT = 120;
const ITEM_VERTICAL_GAP = 16;
const COMPACT_ITEM_GAP = 8;
const ADAPTIVE_ITEM_GAP = 12;
const VIRTUAL_ITEM_SIZE = DEFAULT_ITEM_HEIGHT + ITEM_VERTICAL_GAP;
// Show compact cards when more than 3 results (was 5 - now more aggressive)
const COMPACT_THRESHOLD = 3;
// Show adaptive (medium) sized cards when 2-3 results  
const ADAPTIVE_THRESHOLD = 1;
const MIN_VISIBLE_ROWS = 5;
const MAX_VISIBLE_ROWS = 12;

const formatTimeLabel = (timeStr) => {
  if (!timeStr) return "";
  const [hoursStr, minutesStr] = String(timeStr).split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatShowerSlotLabel = (slotTime) => formatTimeLabel(slotTime) || slotTime;

const formatLaundryRangeLabel = (range) => {
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
};

const BAY_AREA_CITIES = [
  "Campbell",
  "Cupertino",
  "Gilroy",
  "Los Altos Hills",
  "Los Altos",
  "Los Gatos",
  "Milpitas",
  "Monte Sereno",
  "Morgan Hill",
  "Mountain View",
  "Palo Alto",
  "San Jose",
  "Santa Clara",
  "Saratoga",
  "Sunnyvale",
];

const formatDateTimeLocal = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getDefaultBanUntil = () => {
  const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return formatDateTimeLocal(oneWeekLater);
};


const toTitleCase = (str) => {
  if (!str || typeof str !== "string") return "";
  // Preserve single spaces between words (for middle names like "John Michael")
  // Only collapse multiple consecutive spaces into one
  return str
    .replace(/\s+/g, ' ') // Collapse multiple spaces to single space
    .split(' ')
    .map((word) => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
};

const GuestList = () => {
  const {
    guests,
    isDataLoaded,
    mealRecords,
    extraMealRecords,
    showerRecords,
    laundryRecords,
    holidayRecords,
    haircutRecords,
    bicycleRecords,
    setShowerPickerGuest,
    setLaundryPickerGuest,
    addMealRecord,
    addExtraMealRecord,
    addGuest,
    setBicyclePickerGuest,
    actionHistory,
    undoAction,
    transferAllGuestRecords,
    addLunchBagRecord,
  } = useAppContext();

  const { addHaircutRecord, addHolidayRecord } = useAppContext();
  const { updateGuest, removeGuest } = useAppContext();
  const { banGuest, clearGuestBan } = useAppContext();

  // Guest proxy (linked guests) store functions and state
  // guestProxies subscription ensures component re-renders when linked guests change
  const guestProxies = useGuestsStore((state) => state.guestProxies);
  const linkGuests = useGuestsStore((state) => state.linkGuests);
  const unlinkGuests = useGuestsStore((state) => state.unlinkGuests);
  const getWarningsForGuest = useGuestsStore((state) => state.getWarningsForGuest);
  const addGuestWarning = useGuestsStore((state) => state.addGuestWarning);
  const removeGuestWarning = useGuestsStore((state) => state.removeGuestWarning);
  const syncGuests = useGuestsStore((state) => state.syncGuests);

  // Wrapper for getLinkedGuests that uses AppContext guests for consistency
  // This fixes the issue where newly linked guests couldn't receive meals because
  // the store's getLinkedGuests was returning guests from Zustand's guest array
  // instead of AppContext's guest array
  const getLinkedGuests = useCallback(
    (guestId) => {
      if (!guestId) return [];
      // Get linked guest IDs from the store's proxy relationships
      const linkedGuestIds = new Set();
      (guestProxies || []).forEach((proxy) => {
        if (proxy.guestId === guestId) {
          linkedGuestIds.add(proxy.proxyId);
        } else if (proxy.proxyId === guestId) {
          linkedGuestIds.add(proxy.guestId);
        }
      });
      // Return guest objects from AppContext's guests array (not Zustand store)
      return (guests || []).filter((g) => linkedGuestIds.has(g.id));
    },
    [guestProxies, guests]
  );


  // Sync guests from AppContext to the store to ensure they exist for linking
  // This is critical when running locally where AppContext manages the source of truth
  useEffect(() => {
    if (guests && guests.length > 0) {
      syncGuests(guests);
    }
  }, [guests, syncGuests]);


  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [expandedGuest, setExpandedGuest] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGuestIndex, setSelectedGuestIndex] = useState(-1);
  const [listHeight, setListHeight] = useState(
    VIRTUAL_ITEM_SIZE * MIN_VISIBLE_ROWS,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    guest: null,
    mealCount: 0,
    showerCount: 0,
    laundryCount: 0,
  });
  const [mealTransferModal, setMealTransferModal] = useState({
    isOpen: false,
    sourceGuest: null,
    mealCount: 0,
    selectedTargetGuest: null,
    searchTerm: "",
  });
  const [createFormData, setCreateFormData] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
    housingStatus: "Unhoused",
    location: "Mountain View", // Smart default - most common location
    age: "",
    gender: "",
    notes: "",
    bicycleDescription: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState("");

  const [pendingMealGuests, setPendingMealGuests] = useState(new Set());
  const [pendingExtraMealGuests, setPendingExtraMealGuests] = useState(new Set());
  const [pendingActions, setPendingActions] = useState(new Set());
  // Track recently logged meals for success animation
  const [recentlyLoggedMeals, setRecentlyLoggedMeals] = useState(new Set());
  const [banEditor, setBanEditor] = useState({
    guestId: null,
    until: "",
    reason: "",
    // Program-specific bans - if all false, it's a blanket ban
    bannedFromBicycle: false,
    bannedFromMeals: false,
    bannedFromShower: false,
    bannedFromLaundry: false,
  });
  const [banError, setBanError] = useState("");
  const [banSubmittingId, setBanSubmittingId] = useState(null);

  // Warning editor state
  const [warningEditor, setWarningEditor] = useState({
    guestId: null,
    message: "",
    severity: 1,
  });
  const [warningSubmitting, setWarningSubmitting] = useState(false);
  const [showWarningForm, setShowWarningForm] = useState(null); // guestId or null

  // Mobile service sheet state for tablet/mobile quick actions
  const [mobileServiceSheet, setMobileServiceSheet] = useState({
    isOpen: false,
    guest: null,
  });

  const [editingGuestId, setEditingGuestId] = useState(null);
  const [linkingGuestId, setLinkingGuestId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
    housingStatus: "Unhoused",
    location: "",
    age: "",
    gender: "",
    notes: "",
    bicycleDescription: "",
  });



  const guestsList = useMemo(() => guests || [], [guests]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Track guests who already have a shower booked today (limit: 1 per day)
  const guestsWithShowerToday = useMemo(() => {
    const today = todayPacificDateString();
    const guestIds = new Set();
    (showerRecords || []).forEach((record) => {
      if (pacificDateStringFrom(record.date) === today && record.guestId) {
        guestIds.add(String(record.guestId));
      }
    });
    return guestIds;
  }, [showerRecords]);

  // Track guests who already have laundry booked today (limit: 1 per day)
  const guestsWithLaundryToday = useMemo(() => {
    const today = todayPacificDateString();
    const guestIds = new Set();
    (laundryRecords || []).forEach((record) => {
      if (pacificDateStringFrom(record.date) === today && record.guestId) {
        guestIds.add(String(record.guestId));
      }
    });
    return guestIds;
  }, [laundryRecords]);

  // Detect when initial load is complete
  // Only consider loaded when isDataLoaded is true (from AppContext)
  // This prevents showing "Ready to search" before data has actually loaded
  useEffect(() => {
    if (isDataLoaded) {
      // Small delay to allow UI to settle after data load
      const timer = setTimeout(() => setIsInitialLoad(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isDataLoaded]);

  const searchInputRef = useRef(null);
  const createFirstNameRef = useRef(null);
  const listRef = useRef(null);
  const listContainerRef = useRef(null);
  const guestCardRefs = useRef({});
  const focusTimersRef = useRef(new Map());

  const focusGuestCard = useCallback((guestId) => {
    if (!guestId) return;

    const attemptFocus = () => {
      const card = guestCardRefs.current[guestId];
      if (card && typeof card.focus === "function") {
        card.focus();
        const existingTimer = focusTimersRef.current.get(guestId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          focusTimersRef.current.delete(guestId);
        }
        return true;
      }
      return false;
    };

    const schedule = () => {
      if (attemptFocus()) {
        return;
      }
      const existingTimer = focusTimersRef.current.get(guestId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      const timeoutId = window.setTimeout(schedule, 50);
      focusTimersRef.current.set(guestId, timeoutId);
    };

    requestAnimationFrame(schedule);
  }, []);

  const resetCardFocus = useCallback(() => {
    setSelectedGuestIndex(-1);
    setExpandedGuest(null);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [setExpandedGuest]);

  useEffect(() => {
    const timers = focusTimersRef.current;
    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (banEditor.guestId && expandedGuest !== banEditor.guestId) {
      setBanEditor({ guestId: null, until: "", reason: "" });
      setBanError("");
    }
  }, [banEditor.guestId, expandedGuest]);

  const handleShowCreateForm = useCallback(() => {
    const rawSearch = searchTerm.trim();
    // Special handling: if search ends with " mv", default city to Mountain View
    let defaultCity = "Mountain View";
    let workingSearch = rawSearch;

    if (rawSearch.toLowerCase().endsWith(" mv")) {
      defaultCity = "Mountain View";
      workingSearch = rawSearch.slice(0, -3).trim();
    } else if (rawSearch.toLowerCase().endsWith(" mountain view")) {
      defaultCity = "Mountain View";
      workingSearch = rawSearch.slice(0, -14).trim();
    }

    const searchParts = workingSearch.split(/\s+/);
    const firstName = searchParts[0] || "";
    const lastName = searchParts.slice(1).join(" ") || "";

    setCreateFormData((prev) => ({
      ...prev,
      firstName,
      lastName,
      preferredName: "",
      location: defaultCity,
    }));
    setShowCreateForm(true);
    setCreateError("");
  }, [searchTerm]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const target = e.target;
      const tagName = target?.tagName;
      const isEditableTarget =
        target &&
        (tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          target.isContentEditable);

      const key = typeof e.key === "string" ? e.key.toLowerCase() : "";

      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Cmd/Ctrl + Alt + G to open create guest form
      if ((e.metaKey || e.ctrlKey) && e.altKey && key === "g") {
        if (isEditableTarget || showCreateForm) {
          return;
        }
        e.preventDefault();
        handleShowCreateForm();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleShowCreateForm, showCreateForm]);

  // Check for potential duplicates while creating a guest
  const { firstName: createFirstName, lastName: createLastName } = createFormData;

  useEffect(() => {
    if (!showCreateForm) {
      setDuplicateWarning("");
      return;
    }

    const checkDuplicates = () => {
      const firstName = createFirstName;
      const lastName = createLastName;
      // improved check: must have significant length
      if (!firstName || !lastName || firstName.length < 2 || lastName.length < 2) {
        setDuplicateWarning("");
        return;
      }

      const duplicates = findPotentialDuplicates(firstName, lastName, guestsList);

      if (duplicates.length > 0) {
        // Show the top match
        const topMatch = duplicates[0];
        const matchName = `${topMatch.guest.firstName} ${topMatch.guest.lastName}`;
        // Add nickname hint if available
        const preferred = topMatch.guest.preferredName ? ` "${topMatch.guest.preferredName}"` : "";

        setDuplicateWarning(
          `Possible duplicate found: ${matchName}${preferred} (Reason: ${topMatch.reason})`
        );
      } else {
        setDuplicateWarning("");
      }
    };

    const timer = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timer);
  }, [createFirstName, createLastName, showCreateForm, guestsList]);

  const filteredGuests = useMemo(() => {
    return flexibleNameSearch(debouncedSearchTerm, guestsList);
  }, [guestsList, debouncedSearchTerm]);

  // Fuzzy name suggestions to catch typos and phonetic matches
  const fuzzySuggestions = useMemo(() => {
    // Show suggestions when search has input, and either no matches or very few matches
    // (This allows "did you mean" to appear even if we found a few low-quality direct matches)
    if (!debouncedSearchTerm.trim() || filteredGuests.length >= 3) {
      return [];
    }
    // Need at least 2 characters to suggest
    if (debouncedSearchTerm.trim().length < 2) {
      return [];
    }
    return findFuzzySuggestions(debouncedSearchTerm, guestsList, 5);
  }, [debouncedSearchTerm, filteredGuests.length, guestsList]);

  // Apply sorting to filtered guests
  const sortedGuests = useMemo(() => {
    if (!sortConfig.key || filteredGuests.length === 0) {
      return filteredGuests;
    }

    const sorted = [...filteredGuests].sort((a, b) => {
      let aValue = "";
      let bValue = "";

      if (sortConfig.key === "firstName") {
        aValue = (a.firstName || "").toLowerCase();
        bValue = (b.firstName || "").toLowerCase();
      } else if (sortConfig.key === "lastName") {
        aValue = (a.lastName || "").toLowerCase();
        bValue = (b.lastName || "").toLowerCase();
      }

      const comparison = aValue.localeCompare(bValue);
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredGuests, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        // Toggle direction if same key is clicked
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      } else {
        // Set new sort key with ascending direction
        return { key, direction: "asc" };
      }
    });
  };

  const shouldVirtualize =
    sortedGuests.length > VIRTUALIZATION_THRESHOLD &&
    expandedGuest === null &&
    !showCreateForm;

  // Determine card sizing based on number of results:
  // - 1 result: full size (exact match)
  // - 2-3 results: adaptive (medium) size 
  // - 4+ results: compact size
  const isCompact = sortedGuests.length > COMPACT_THRESHOLD;
  const isAdaptive = !isCompact && sortedGuests.length > ADAPTIVE_THRESHOLD;
  const effectiveItemSize = isCompact
    ? COMPACT_ITEM_HEIGHT + COMPACT_ITEM_GAP
    : isAdaptive
      ? ADAPTIVE_ITEM_HEIGHT + ADAPTIVE_ITEM_GAP
      : VIRTUAL_ITEM_SIZE;

  const trail = useStagger(
    shouldVirtualize ? 0 : (filteredGuests || []).length,
    true,
  );

  useEffect(() => {
    if (!filteredGuests.length) {
      setListHeight(VIRTUAL_ITEM_SIZE * MIN_VISIBLE_ROWS);
      return;
    }

    if (!shouldVirtualize) {
      const clamped = Math.min(
        Math.max(filteredGuests.length, MIN_VISIBLE_ROWS),
        MAX_VISIBLE_ROWS,
      );
      setListHeight(VIRTUAL_ITEM_SIZE * clamped);
      return;
    }

    const updateHeight = () => {
      const viewportHeight = window.innerHeight || 0;
      const rect = listContainerRef.current?.getBoundingClientRect();
      const topOffset = rect ? rect.top : 0;
      const available = Math.max(
        VIRTUAL_ITEM_SIZE * MIN_VISIBLE_ROWS,
        viewportHeight - topOffset - 48,
      );
      const desired =
        Math.min(filteredGuests.length, MAX_VISIBLE_ROWS) * VIRTUAL_ITEM_SIZE;
      setListHeight(
        Math.max(
          VIRTUAL_ITEM_SIZE * MIN_VISIBLE_ROWS,
          Math.min(available, desired),
        ),
      );
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [filteredGuests.length, shouldVirtualize]);

  useEffect(() => {
    if (selectedGuestIndex < 0) return;

    if (shouldVirtualize) {
      // For virtualized lists, use the list's scrollToItem method
      listRef.current?.scrollToItem(selectedGuestIndex, "smart");
    } else {
      // For non-virtualized lists, scroll the selected card into view
      const selectedGuest = sortedGuests[selectedGuestIndex];
      if (selectedGuest) {
        const cardElement = guestCardRefs.current[selectedGuest.id];
        if (cardElement && typeof cardElement.scrollIntoView === "function") {
          cardElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest"
          });
        }
      }
    }
  }, [selectedGuestIndex, shouldVirtualize, sortedGuests]);

  const createTokens = useMemo(
    () => searchTerm.trim().split(/\s+/).filter(Boolean),
    [searchTerm],
  );
  const hasMinimumNameParts =
    createTokens.length >= 2 &&
    createTokens[0].length >= 1 &&
    createTokens[1].length >= 1;

  const shouldShowCreateOption =
    hasMinimumNameParts &&
    searchTerm.trim().length > 2 &&
    filteredGuests.length === 0;

  const toggleExpanded = useCallback((guestId) => {
    haptics.selection();
    setExpandedGuest((prev) => (prev === guestId ? null : guestId));
  }, []);


  // pickedUpByGuestId is optional - used when a linked/proxy guest picks up meals for another
  const handleMealSelection = useCallback((guestId, count, pickedUpByGuestId = null) => {
    if (pendingMealGuests.has(guestId)) return;
    const today = todayPacificDateString();
    const alreadyHasMeal = mealRecords.some(
      (record) =>
        record.guestId === guestId &&
        pacificDateStringFrom(record.date) === today,
    );

    if (alreadyHasMeal) {
      haptics.warning();
      toast.error(
        "Guest already received meals today. Only one meal per day is allowed.",
      );
      return;
    }

    try {
      haptics.buttonPress();
      setPendingMealGuests((prev) => {
        const next = new Set(prev);
        next.add(guestId);
        return next;
      });
      // Pass pickedUpByGuestId to track who physically picked up the meal (for linked guests metrics)
      const rec = addMealRecord(guestId, count, null, pickedUpByGuestId);
      if (rec) {
        // Auto-add lunch bag for each guest getting a meal (except Fridays - no lunch bags on breakfast days)
        const dayOfWeek = new Date(today + 'T12:00:00').getDay();
        if (dayOfWeek !== 5) { // Skip Fridays (day 5)
          try {
            addLunchBagRecord(1, today);
          } catch (lunchBagError) {
            console.warn('Failed to auto-add lunch bag:', lunchBagError);
          }
        }
        // Add to recently logged meals for success animation
        setRecentlyLoggedMeals((prev) => {
          const next = new Set(prev);
          next.add(guestId);
          return next;
        });
        // Clear from recently logged after animation completes (600ms)
        setTimeout(() => {
          setRecentlyLoggedMeals((prev) => {
            const next = new Set(prev);
            next.delete(guestId);
            return next;
          });
        }, 600);
        // Delay haptic feedback slightly to sync with visual confirmation
        setTimeout(() => {
          haptics.success();
        }, 100);
        const proxyNote = pickedUpByGuestId ? " (picked up by linked guest)" : "";
        toast.success(`${count} meal${count > 1 ? "s" : ""} logged for guest!${proxyNote}`);
      }
    } catch (error) {
      haptics.error();
      toast.error(`Error logging meals: ${error.message}`);
    }
  }, [pendingMealGuests, mealRecords, addMealRecord, addLunchBagRecord]);

  const handleAddExtraMeals = useCallback(async (guestId, count, guestName = "guest") => {
    if (!guestId || pendingExtraMealGuests.has(guestId)) return;
    const friendlyName = guestName || "guest";

    // Check if guest already has a standard meal today
    const today = todayPacificDateString();
    const hasStandardMeal = mealRecords.some(
      (record) =>
        record.guestId === guestId &&
        pacificDateStringFrom(record.date) === today
    );

    if (!hasStandardMeal) {
      haptics.error();
      toast.error("Guest must check in for a regular meal first");
      return;
    }

    try {
      haptics.buttonPress();
      setPendingExtraMealGuests((prev) => {
        const next = new Set(prev);
        next.add(guestId);
        return next;
      });
      const record = await addExtraMealRecord(guestId, count);
      if (record) {
        haptics.success();
        toast.success(
          `${count} extra meal${count > 1 ? "s" : ""} logged for ${friendlyName}!`,
        );
      }
    } catch (error) {
      haptics.error();
      toast.error(`Error adding extra meals: ${error?.message || "Unable to save extra meals"}`);
    } finally {
      setPendingExtraMealGuests((prev) => {
        const next = new Set(prev);
        next.delete(guestId);
        return next;
      });
    }
  }, [pendingExtraMealGuests, mealRecords, addExtraMealRecord]);



  const openBanEditorForGuest = useCallback((guest) => {
    haptics.selection();
    setBanEditor({
      guestId: guest.id,
      until: guest.bannedUntil
        ? formatDateTimeLocal(guest.bannedUntil)
        : getDefaultBanUntil(),
      reason: guest.banReason || "",
      bannedFromBicycle: guest.bannedFromBicycle || false,
      bannedFromMeals: guest.bannedFromMeals || false,
      bannedFromShower: guest.bannedFromShower || false,
      bannedFromLaundry: guest.bannedFromLaundry || false,
    });
    setBanError("");
  }, []);

  const closeBanEditor = useCallback(() => {
    setBanEditor({
      guestId: null,
      until: "",
      reason: "",
      bannedFromBicycle: false,
      bannedFromMeals: false,
      bannedFromShower: false,
      bannedFromLaundry: false,
    });
    setBanError("");
  }, []);

  const handleBanFieldChange = useCallback((field, value) => {
    setBanEditor((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleBanSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!banEditor.guestId) return;

    if (!banEditor.until) {
      const message = "Select when the ban should end.";
      setBanError(message);
      toast.error(message);
      haptics.error();
      return;
    }

    setBanSubmittingId(banEditor.guestId);

    try {
      await banGuest(banEditor.guestId, {
        bannedUntil: banEditor.until,
        banReason: banEditor.reason,
        bannedFromBicycle: banEditor.bannedFromBicycle,
        bannedFromMeals: banEditor.bannedFromMeals,
        bannedFromShower: banEditor.bannedFromShower,
        bannedFromLaundry: banEditor.bannedFromLaundry,
      });
      haptics.success();
      toast.success("Ban saved");
      closeBanEditor();
    } catch (error) {
      const message = error?.message || "Unable to update ban.";
      setBanError(message);
      haptics.error();
      toast.error(message);
    } finally {
      setBanSubmittingId(null);
    }
  }, [banEditor, banGuest, closeBanEditor]);

  const handleUnbanGuest = useCallback(async (guest) => {
    if (!guest) return;
    haptics.buttonPress();
    setBanSubmittingId(guest.id);

    try {
      await clearGuestBan(guest.id);
      haptics.success();
      toast.success("Ban lifted");
      if (banEditor.guestId === guest.id) {
        closeBanEditor();
      }
    } catch (error) {
      const message = error?.message || "Unable to lift ban.";
      haptics.error();
      toast.error(message);
    } finally {
      setBanSubmittingId(null);
    }
  }, [banEditor.guestId, clearGuestBan, closeBanEditor]);

  // ============ Warning Handlers ============
  const openWarningForm = useCallback((guestId) => {
    setShowWarningForm(guestId);
    setWarningEditor({
      guestId,
      message: "",
      severity: 1,
    });
  }, []);

  const closeWarningForm = useCallback(() => {
    setShowWarningForm(null);
    setWarningEditor({
      guestId: null,
      message: "",
      severity: 1,
    });
  }, []);

  const handleWarningFieldChange = useCallback((field, value) => {
    setWarningEditor((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleAddWarning = useCallback(async (event) => {
    event.preventDefault();
    if (!warningEditor.guestId || !warningEditor.message.trim()) {
      toast.error("Please enter a warning message");
      haptics.error();
      return;
    }

    setWarningSubmitting(true);
    try {
      await addGuestWarning(warningEditor.guestId, {
        message: warningEditor.message.trim(),
        severity: warningEditor.severity,
      });
      haptics.success();
      toast.success("Warning added");
      closeWarningForm();
    } catch (error) {
      const message = error?.message || "Unable to add warning.";
      haptics.error();
      toast.error(message);
    } finally {
      setWarningSubmitting(false);
    }
  }, [warningEditor, addGuestWarning, closeWarningForm]);

  const handleRemoveWarning = useCallback(async (warningId) => {
    if (!warningId) return;
    haptics.buttonPress();
    try {
      const success = await removeGuestWarning(warningId);
      if (success) {
        haptics.success();
        toast.success("Warning removed");
      }
    } catch (error) {
      const message = error?.message || "Unable to remove warning.";
      haptics.error();
      toast.error(message);
    }
  }, [removeGuestWarning]);



  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    [],
  );

  const formatStatusLabel = (value) => {
    if (!value) return "";
    return value
      .toString()
      .replace(/[_-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const formatRelativeTime = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60 * 1000) return "just now";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} wk${weeks === 1 ? "" : "s"} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mo${months === 1 ? "" : "s"} ago`;
    const years = Math.floor(days / 365);
    return `${years} yr${years === 1 ? "" : "s"} ago`;
  };

  const todayServicesByGuest = useMemo(() => {
    const today = todayPacificDateString();
    const map = new Map();

    // Helper to add service if it's from today
    const addTodayService = (guestId, record, serviceType, icon, iconClass) => {
      if (!guestId || !record || !record.date) return;
      const recordDate = pacificDateStringFrom(record.date);
      if (recordDate === today) {
        if (!map.has(guestId)) map.set(guestId, []);
        map.get(guestId).push({ serviceType, icon, iconClass, record });
      }
    };

    (mealRecords || []).forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Meal",
        Utensils,
        "text-green-600",
      ),
    );
    (extraMealRecords || []).forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Extra",
        Utensils,
        "text-green-500",
      ),
    );
    (showerRecords || []).forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Shower",
        ShowerHead,
        "text-emerald-600",
      ),
    );
    (laundryRecords || []).forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Laundry",
        WashingMachine,
        "text-emerald-700",
      ),
    );
    (holidayRecords || []).forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Holiday",
        Gift,
        "text-amber-500",
      ),
    );
    (haircutRecords || []).forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Haircut",
        Scissors,
        "text-pink-500",
      ),
    );
    (bicycleRecords || []).forEach((record) =>
      addTodayService(record.guestId, record, "Bicycle", Bike, "text-sky-500"),
    );

    return map;
  }, [
    mealRecords,
    extraMealRecords,
    showerRecords,
    laundryRecords,
    holidayRecords,
    haircutRecords,
    bicycleRecords,
  ]);

  const latestServiceByGuest = useMemo(() => {
    const map = new Map();
    const addCandidate = (
      guestId,
      dateValue,
      summary,
      icon,
      iconClass = "",
    ) => {
      if (!guestId || !dateValue) return;
      const resolvedDate =
        dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (Number.isNaN(resolvedDate.getTime())) return;
      const key = String(guestId);
      const existing = map.get(key);
      if (!existing || resolvedDate > existing.date) {
        map.set(key, { summary, icon, iconClass, date: resolvedDate });
      }
    };

    mealRecords.forEach((record) => {
      if (!record?.guestId) return;
      const summary = `Meal${record.count > 1 ? `s (${record.count})` : ""}`;
      addCandidate(
        record.guestId,
        record.date,
        summary,
        Utensils,
        "text-green-600",
      );
    });

    extraMealRecords.forEach((record) => {
      if (!record?.guestId) return;
      const summary = `Extra meals${record.count ? ` (${record.count})` : ""}`;
      addCandidate(
        record.guestId,
        record.date,
        summary,
        Utensils,
        "text-green-500",
      );
    });

    showerRecords.forEach((record) => {
      if (!record?.guestId) return;
      const statusLabel = formatStatusLabel(record.status);
      const summary = statusLabel ? `Shower (${statusLabel})` : "Shower";
      addCandidate(
        record.guestId,
        record.date,
        summary,
        ShowerHead,
        "text-emerald-600",
      );
    });

    laundryRecords.forEach((record) => {
      if (!record?.guestId) return;
      const typeLabel =
        record.laundryType === "offsite" ? "Off-site" : "On-site";
      const statusLabel = formatStatusLabel(record.status);
      const detailText = [typeLabel, statusLabel].filter(Boolean).join(" · ");
      const summary = detailText ? `Laundry (${detailText})` : "Laundry";
      addCandidate(
        record.guestId,
        record.date,
        summary,
        WashingMachine,
        "text-emerald-700",
      );
    });

    holidayRecords.forEach((record) => {
      if (!record?.guestId) return;
      addCandidate(
        record.guestId,
        record.date,
        "Holiday service",
        Gift,
        "text-amber-500",
      );
    });

    haircutRecords.forEach((record) => {
      if (!record?.guestId) return;
      addCandidate(
        record.guestId,
        record.date,
        "Haircut",
        Scissors,
        "text-pink-500",
      );
    });

    bicycleRecords.forEach((record) => {
      if (!record?.guestId) return;
      const summary = record.repairType
        ? `Bicycle repair (${record.repairType})`
        : "Bicycle repair";
      addCandidate(record.guestId, record.date, summary, Bike, "text-sky-500");
    });

    return map;
  }, [
    mealRecords,
    extraMealRecords,
    showerRecords,
    laundryRecords,
    holidayRecords,
    haircutRecords,
    bicycleRecords,
  ]);

  const validateField = (name, value) => {
    switch (name) {
      case "firstName":
      case "lastName":
        return value.trim().length < 1 ? "This field is required" : "";
      case "location":
        return value.trim().length < 1 ? "Location is required" : "";
      case "age":
        return !value ? "Please select an age group" : "";
      case "gender":
        return !value ? "Please select a gender" : "";
      default:
        return "";
    }
  };

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    // Live title-casing for name fields
    const transformed =
      name === "firstName" || name === "lastName" || name === "preferredName"
        ? toTitleCase(value)
        : value;
    setCreateFormData((prev) => ({ ...prev, [name]: transformed }));

    // Inline validation
    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleNameBlur = (e) => {
    const { name, value } = e.target;
    if ((name === "firstName" || name === "lastName" || name === "preferredName") && value.trim()) {
      setCreateFormData((prev) => ({
        ...prev,
        [name]: toTitleCase(value.trim()),
      }));
    }

    // Check for potential duplicates when first and last names are available
    if (name === "firstName" || name === "lastName") {
      const firstName =
        name === "firstName" ? value.trim() : createFormData.firstName;
      const lastName =
        name === "lastName" ? value.trim() : createFormData.lastName;

      if (firstName && lastName) {
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        const possibleDuplicate = guests.find(
          (guest) =>
            guest.name?.toLowerCase() === fullName ||
            (guest.firstName?.toLowerCase() === firstName.toLowerCase() &&
              guest.lastName?.toLowerCase() === lastName.toLowerCase()),
        );

        if (possibleDuplicate) {
          setDuplicateWarning(
            `A guest named "${possibleDuplicate.name}" already exists. Please verify this is a different person.`,
          );
        } else {
          setDuplicateWarning("");
        }
      }
    }
  };

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    setCreateError("");
    if (!createFormData.firstName.trim() || !createFormData.lastName.trim()) {
      setCreateError("Please enter both first and last name");
      return;
    }
    if (!createFormData.location.trim()) {
      setCreateError("Location is required");
      return;
    }
    if (!createFormData.age) {
      setCreateError("Age group is required");
      return;
    }
    if (!createFormData.gender) {
      setCreateError("Gender is required");
      return;
    }
    setIsCreating(true);
    try {
      const guestData = {
        ...createFormData,
        preferredName: createFormData.preferredName?.trim() || "",
        bicycleDescription: createFormData.bicycleDescription?.trim() || "",
        name: `${createFormData.firstName.trim()} ${createFormData.lastName.trim()}`,
      };
      const newGuest = await addGuest(guestData);
      setCreateFormData({
        firstName: "",
        lastName: "",
        preferredName: "",
        housingStatus: "Unhoused",
        location: "",
        age: "",
        gender: "",
        notes: "",
        bicycleDescription: "",
      });
      setShowCreateForm(false);
      setSearchTerm(
        newGuest.preferredName ||
        newGuest.name ||
        `${guestData.firstName} ${guestData.lastName}`.trim(),
      );
      setExpandedGuest(newGuest.id);
    } catch (err) {
      setCreateError(`Error creating guest: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCreateFormData({
      firstName: "",
      lastName: "",
      preferredName: "",
      housingStatus: "Unhoused",
      location: "Mountain View",
      age: "",
      gender: "",
      notes: "",
      bicycleDescription: "",
    });
    setCreateError("");
    setFieldErrors({});
    setDuplicateWarning("");
  };

  useEffect(() => {
    if (!showCreateForm) return;
    const focusTimer = requestAnimationFrame(() => {
      createFirstNameRef.current?.focus();
    });
    return () => cancelAnimationFrame(focusTimer);
  }, [showCreateForm]);

  const startEditingGuest = useCallback((guest) => {
    setEditingGuestId(guest.id);
    setEditFormData({
      firstName: guest.firstName || "",
      lastName: guest.lastName || "",
      preferredName: guest.preferredName || "",
      housingStatus: guest.housingStatus || "Unhoused",
      location: guest.location || "",
      age: guest.age || "",
      gender: guest.gender || "",
      notes: guest.notes || "",
      bicycleDescription: guest.bicycleDescription || "",
    });
  }, []);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    const transformed =
      name === "firstName" || name === "lastName" || name === "preferredName"
        ? toTitleCase(value)
        : value;
    setEditFormData((prev) => ({ ...prev, [name]: transformed }));
  }, []);

  const handleEditNameBlur = useCallback((e) => {
    const { name, value } = e.target;
    if ((name === "firstName" || name === "lastName") && value.trim()) {
      setEditFormData((prev) => ({
        ...prev,
        [name]: toTitleCase(value.trim()),
      }));
    }
  }, []);

  const saveEditedGuest = useCallback(async () => {
    if (!editFormData.firstName.trim() || !editFormData.lastName.trim()) {
      toast.error("Please enter both first and last name");
      return;
    }
    if (!editFormData.age || !editFormData.gender) {
      toast.error("Please select age and gender");
      return;
    }
    const updates = {
      ...editFormData,
      firstName: toTitleCase(editFormData.firstName.trim()),
      lastName: toTitleCase(editFormData.lastName.trim()),
      preferredName: editFormData.preferredName?.trim() || "",
      bicycleDescription: editFormData.bicycleDescription?.trim() || "",
      name: `${toTitleCase(editFormData.firstName.trim())} ${toTitleCase(editFormData.lastName.trim())}`.trim(),
    };
    const success = await updateGuest(editingGuestId, updates);
    if (success) {
      toast.success("Guest updated");
      setEditingGuestId(null);
    }
  }, [editFormData, editingGuestId, updateGuest]);

  const cancelEditing = useCallback(() => setEditingGuestId(null), []);

  const deleteGuest = useCallback((guest) => {
    const guestMealCount = (mealRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;
    const guestExtraMealCount = (extraMealRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;
    const guestShowerCount = (showerRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;
    const guestLaundryCount = (laundryRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;
    const guestBicycleCount = (bicycleRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;
    const guestHolidayCount = (holidayRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;
    const guestHaircutCount = (haircutRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;

    const totalRecords =
      guestMealCount +
      guestExtraMealCount +
      guestShowerCount +
      guestLaundryCount +
      guestBicycleCount +
      guestHolidayCount +
      guestHaircutCount;

    // If guest has ANY records, show transfer modal instead of delete confirmation
    if (totalRecords > 0) {
      setMealTransferModal({
        isOpen: true,
        sourceGuest: guest,
        mealCount: totalRecords,
        selectedTargetGuest: null,
        searchTerm: "",
      });
      return;
    }

    // If no records, show normal delete confirmation
    setDeleteConfirmation({
      isOpen: true,
      guest,
      mealCount: 0,
      showerCount: 0,
      laundryCount: 0,
    });
  }, [
    mealRecords,
    extraMealRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    holidayRecords,
    haircutRecords
  ]);

  const handleTransferMeals = async () => {
    const { sourceGuest, selectedTargetGuest, mealCount } = mealTransferModal;

    if (!selectedTargetGuest) {
      toast.error("Please select a guest to transfer records to");
      return;
    }

    try {
      // Transfer ALL records using the context function
      const success = await transferAllGuestRecords(sourceGuest.id, selectedTargetGuest.id);

      if (!success) {
        toast.error("Failed to transfer records");
        return;
      }

      toast.success(
        `✓ Transferred ${mealCount} record${mealCount === 1 ? "" : "s"} to ${selectedTargetGuest.name}`
      );

      // Close transfer modal and proceed with deletion
      setMealTransferModal({
        isOpen: false,
        sourceGuest: null,
        mealCount: 0,
        selectedTargetGuest: null,
        searchTerm: "",
      });

      // Now delete the guest
      removeGuest(sourceGuest.id);
      toast.success(`Guest ${sourceGuest.name} deleted`);

      // Cleanup state to prevent index shifting issues
      if (expandedGuest === sourceGuest.id) setExpandedGuest(null);
      setSelectedGuestIndex(-1); // Critical: Reset index after deletion
    } catch (error) {
      console.error("Error transferring records:", error);
      toast.error("Failed to transfer records");
    }
  };

  const confirmDelete = () => {
    const guest = deleteConfirmation.guest;
    removeGuest(guest.id);
    toast.success("Guest deleted");

    // Cleanup state to prevent index shifting issues
    if (expandedGuest === guest.id) setExpandedGuest(null);
    setSelectedGuestIndex(-1); // Critical: Reset index after deletion

    setDeleteConfirmation({ isOpen: false, guest: null });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, guest: null });
  };

  const renderExpandedContent = useCallback((guest) => {
    if (!guest) return null;

    const isBanned = Boolean(guest.isBanned);
    const bannedUntilDate =
      isBanned && guest.bannedUntil && !Number.isNaN(new Date(guest.bannedUntil).getTime())
        ? new Date(guest.bannedUntil)
        : null;
    const banSummaryLabel = bannedUntilDate
      ? dateTimeFormatter.format(bannedUntilDate)
      : null;

    // Check if guest is banned from specific services
    const hasProgramSpecificBans = guest.bannedFromMeals || guest.bannedFromShower || guest.bannedFromLaundry || guest.bannedFromBicycle;
    const isBannedFromMeals = isBanned && (!hasProgramSpecificBans || guest.bannedFromMeals);
    const isBannedFromShower = isBanned && (!hasProgramSpecificBans || guest.bannedFromShower);
    const isBannedFromLaundry = isBanned && (!hasProgramSpecificBans || guest.bannedFromLaundry);
    const isBannedFromBicycle = isBanned && (!hasProgramSpecificBans || guest.bannedFromBicycle);

    // Build program-specific ban tooltip
    const banTooltip = (() => {
      if (!isBanned) return "";
      const nameLabel = guest.preferredName || guest.name || "Guest";
      const bannedPrograms = [];
      if (guest.bannedFromMeals) bannedPrograms.push("Meals");
      if (guest.bannedFromShower) bannedPrograms.push("Showers");
      if (guest.bannedFromLaundry) bannedPrograms.push("Laundry");
      if (guest.bannedFromBicycle) bannedPrograms.push("Bicycle");

      const programsText = bannedPrograms.length > 0
        ? `from ${bannedPrograms.join(", ")}`
        : "from all services";
      const untilText = banSummaryLabel ? ` until ${banSummaryLabel}` : "";
      const reasonText = guest.banReason ? ` Reason: ${guest.banReason}` : "";

      return `${nameLabel} is banned ${programsText}${untilText}.${reasonText}`;
    })();

    const isBanEditorOpen = banEditor.guestId === guest.id;
    const banFormMinValue = isBanEditorOpen
      ? formatDateTimeLocal(new Date(Date.now() + 5 * 60 * 1000))
      : null;

    return (
      <div className="border-t border-emerald-200 p-4 bg-white">

        <div className="flex justify-end gap-2 mb-3">
          {editingGuestId !== guest.id && (
            <>
              <button
                onClick={() => startEditingGuest(guest)}
                className="px-4 py-3 min-h-[44px] border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors touch-manipulation"
              >
                Edit
              </button>
              {getLinkedGuests(guest.id).length === 0 && (
                <button
                  onClick={() => setLinkingGuestId(guest.id)}
                  className="px-4 py-3 min-h-[44px] border border-purple-300 hover:bg-purple-50 rounded-md text-sm font-medium text-purple-600 transition-colors touch-manipulation inline-flex items-center gap-2"
                >
                  <Link size={16} />
                  Link Guest
                </button>
              )}
              <button
                onClick={() => deleteGuest(guest)}
                className="px-4 py-3 min-h-[44px] border border-red-300 hover:bg-red-50 rounded-md text-sm font-medium text-red-600 transition-colors touch-manipulation"
              >
                Delete
              </button>
            </>
          )}
        </div>
        {guest.isBanned ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <AlertCircle
                  size={20}
                  className="text-red-500 mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    {(() => {
                      const bannedPrograms = [];
                      if (guest.bannedFromMeals) bannedPrograms.push("Meals");
                      if (guest.bannedFromShower) bannedPrograms.push("Showers");
                      if (guest.bannedFromLaundry) bannedPrograms.push("Laundry");
                      if (guest.bannedFromBicycle) bannedPrograms.push("Bicycle");

                      if (bannedPrograms.length === 0) {
                        return `Guest is banned from all services${banSummaryLabel ? ` until ${banSummaryLabel}` : "."}`;
                      }
                      return `Guest is banned from ${bannedPrograms.join(", ")}${banSummaryLabel ? ` until ${banSummaryLabel}` : "."}`;
                    })()}
                  </p>
                  {guest.banReason && (
                    <p className="mt-1 text-sm text-red-700">
                      Reason: {guest.banReason}
                    </p>
                  )}
                  {/* Show which programs are still allowed */}
                  {(() => {
                    const hasProgramBans = guest.bannedFromMeals || guest.bannedFromShower || guest.bannedFromLaundry || guest.bannedFromBicycle;
                    if (!hasProgramBans) return null;

                    const allowedPrograms = [];
                    if (!guest.bannedFromMeals) allowedPrograms.push("Meals");
                    if (!guest.bannedFromShower) allowedPrograms.push("Showers");
                    if (!guest.bannedFromLaundry) allowedPrograms.push("Laundry");
                    if (!guest.bannedFromBicycle) allowedPrograms.push("Bicycle");

                    if (allowedPrograms.length === 0) return null;

                    return (
                      <p className="mt-1 text-sm text-green-700">
                        ✓ Still allowed: {allowedPrograms.join(", ")}
                      </p>
                    );
                  })()}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openBanEditorForGuest(guest)}
                  className="px-4 py-2 rounded-md border border-red-200 bg-white text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                  disabled={banSubmittingId === guest.id}
                >
                  Update Ban
                </button>
                <button
                  type="button"
                  onClick={() => handleUnbanGuest(guest)}
                  className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={banSubmittingId === guest.id}
                >
                  Lift Ban
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-md border border-gray-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle size={18} className="text-gray-400" aria-hidden="true" />
              <span>This guest can receive services.</span>
            </div>
            <button
              type="button"
              onClick={() => openBanEditorForGuest(guest)}
              className="px-4 py-2 rounded-md bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors"
              disabled={banSubmittingId === guest.id}
            >
              <span className="inline-flex items-center gap-2">
                <Ban size={16} />
                Ban Guest
              </span>
            </button>
          </div>
        )}
        {isBanEditorOpen && (
          <form
            onSubmit={handleBanSubmit}
            className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4 space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-blue-900 mb-1 uppercase tracking-wide">
                  Ban ends*
                </label>
                <input
                  type="datetime-local"
                  value={banEditor.until}
                  min={banFormMinValue || undefined}
                  onChange={(event) =>
                    handleBanFieldChange("until", event.target.value)
                  }
                  className="w-full px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                />
                <p className="mt-1 text-xs text-blue-700">
                  Choose when the guest can return for services.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-900 mb-1 uppercase tracking-wide">
                  Reason (optional)
                </label>
                <textarea
                  value={banEditor.reason}
                  onChange={(event) =>
                    handleBanFieldChange("reason", event.target.value)
                  }
                  className="w-full px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  rows={3}
                  placeholder="Provide context staff should know"
                />
              </div>
            </div>

            {/* Program-specific ban selection */}
            <div>
              <label className="block text-xs font-semibold text-blue-900 mb-2 uppercase tracking-wide">
                Ban from specific programs (optional)
              </label>
              <p className="text-xs text-blue-700 mb-3">
                Select programs to ban from. Leave all unchecked to ban from all services.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 p-2 rounded border border-blue-200 bg-white cursor-pointer hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={banEditor.bannedFromMeals}
                    onChange={(e) => handleBanFieldChange("bannedFromMeals", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-900">Meals</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded border border-blue-200 bg-white cursor-pointer hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={banEditor.bannedFromShower}
                    onChange={(e) => handleBanFieldChange("bannedFromShower", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-900">Showers</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded border border-blue-200 bg-white cursor-pointer hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={banEditor.bannedFromLaundry}
                    onChange={(e) => handleBanFieldChange("bannedFromLaundry", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-900">Laundry</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded border border-blue-200 bg-white cursor-pointer hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={banEditor.bannedFromBicycle}
                    onChange={(e) => handleBanFieldChange("bannedFromBicycle", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-900">Bicycle</span>
                </label>
              </div>
            </div>

            {banError && (
              <p className="text-sm text-red-600" role="alert">
                {banError}
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={closeBanEditor}
                className="px-4 py-2 rounded-md border border-blue-200 bg-white text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={banSubmittingId === banEditor.guestId}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={banSubmittingId === banEditor.guestId}
              >
                {banSubmittingId === banEditor.guestId ? "Saving..." : "Save Ban"}
              </button>
            </div>
          </form>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {guest.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone size={16} className="text-gray-500" />
              <span>{guest.phone}</span>
            </div>
          )}
          {guest.birthdate && (
            <div className="flex items-center gap-2 text-sm">
              <CalendarClock size={16} className="text-gray-500" />
              <span>{guest.birthdate}</span>
            </div>
          )}
        </div>
        {guest.preferredName && editingGuestId !== guest.id && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-blue-700 mb-4">
            <User size={16} className="text-blue-500" />
            <span className="font-medium">Preferred:</span>
            <span className="text-blue-900 font-semibold">
              {guest.preferredName}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">Legal: {guest.name}</span>
          </div>
        )}
        {guest.bicycleDescription && editingGuestId !== guest.id && (
          <div className="mb-4 flex items-start gap-2 text-sm text-sky-700">
            <Bike size={16} className="text-sky-500 mt-0.5" />
            <div>
              <span className="font-medium text-gray-700">
                Bicycle on file:
              </span>{" "}
              <span className="text-gray-700">
                {guest.bicycleDescription}
              </span>
            </div>
          </div>
        )}
        {/* Linked Guests Manager - auto-show if has linked guests, or when linking is active */}
        {(linkingGuestId === guest.id || getLinkedGuests(guest.id).length > 0) && editingGuestId !== guest.id && (
          <div className="mb-4">
            <LinkedGuestsManager
              guest={guest}
              allGuests={guestsList}
              linkedGuests={getLinkedGuests(guest.id)}
              onLinkGuest={linkGuests}
              onUnlinkGuest={unlinkGuests}
              onAssignMeals={handleMealSelection}
              mealRecords={mealRecords}
              actionHistory={actionHistory}
              onUndoAction={undoAction}
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setLinkingGuestId(null)}
                className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
        {editingGuestId === guest.id && (
          <div className="mb-4 bg-white p-4 rounded border border-blue-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                  First Name*
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={editFormData.firstName}
                  onChange={handleEditChange}
                  onBlur={handleEditNameBlur}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                  Last Name*
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={editFormData.lastName}
                  onChange={handleEditChange}
                  onBlur={handleEditNameBlur}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                  Preferred Name
                </label>
                <input
                  type="text"
                  name="preferredName"
                  value={editFormData.preferredName}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                  Housing Status
                </label>
                <p className="text-xs text-gray-600 mb-2 flex items-start gap-1.5">
                  <span className="text-blue-500 font-medium">💙</span>
                  <span>
                    Please ask: "Where did you sleep last night?" Select the option that best describes their current situation.
                    <span className="block mt-1 text-[11px] text-gray-600">
                      Spanish: “¿Dónde durmió anoche?”
                    </span>
                    <span className="block mt-0.5 text-[11px] text-gray-600">
                      Mandarin: “您昨晚睡在哪里？” (Pinyin: Nín zuówǎn shuì zài nǎlǐ?)
                    </span>
                  </span>
                </p>
                <select
                  name="housingStatus"
                  value={editFormData.housingStatus}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                >
                  {HOUSING_STATUSES.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                  Age Group*
                </label>
                <select
                  name="age"
                  value={editFormData.age}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                >
                  <option value="">Select age group</option>
                  {AGE_GROUPS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                  Gender*
                </label>
                <select
                  name="gender"
                  value={editFormData.gender}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                >
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                  Location*
                </label>
                <Selectize
                  options={[
                    ...BAY_AREA_CITIES.map((c) => ({
                      value: c,
                      label: c,
                    })),
                    {
                      value: "Outside Santa Clara County",
                      label: "Outside Santa Clara County",
                    },
                  ]}
                  value={editFormData.location}
                  onChange={(val) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      location: val,
                    }))
                  }
                  placeholder="Select location"
                  size="sm"
                  className="w-full"
                  buttonClassName="w-full px-3 py-2 border-2 border-gray-300 rounded text-left text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  searchable
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={editFormData.notes}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1 uppercase tracking-wide">
                  Bicycle Description
                </label>
                <textarea
                  name="bicycleDescription"
                  value={editFormData.bicycleDescription}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                  rows="3"
                />
              </div>
            </div>
            <div className="sticky bottom-0 left-0 right-0 flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 bg-white -m-4 p-4">
              <button
                onClick={saveEditedGuest}
                className="px-4 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors touch-manipulation"
              >
                Save
              </button>
              <button
                onClick={cancelEditing}
                className="px-4 py-3 min-h-[44px] border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {guest.notes && editingGuestId !== guest.id && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Notes:</h4>
            <p className="text-sm bg-white p-2 rounded border">
              {guest.notes}
            </p>
          </div>
        )}

        {/* Warnings Section */}
        {editingGuestId !== guest.id && (
          <div className="mb-4">
            {(() => {
              const guestWarnings = getWarningsForGuest(guest.id) || [];
              const hasWarnings = guestWarnings.length > 0;
              const isFormOpen = showWarningForm === guest.id;

              return (
                <div className="rounded-md border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-600" />
                      Warnings {hasWarnings && `(${guestWarnings.length})`}
                    </h4>
                    {!isFormOpen && (
                      <button
                        type="button"
                        onClick={() => openWarningForm(guest.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300"
                      >
                        <Plus size={14} />
                        Add Warning
                      </button>
                    )}
                  </div>

                  {/* Add warning form */}
                  {isFormOpen && (
                    <form onSubmit={handleAddWarning} className="mb-4 p-3 bg-white rounded-md border border-amber-200 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1 uppercase tracking-wide">
                          Warning Message*
                        </label>
                        <textarea
                          value={warningEditor.message}
                          onChange={(e) => handleWarningFieldChange("message", e.target.value)}
                          className="w-full px-3 py-2 border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
                          rows={2}
                          placeholder="Enter warning details..."
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1 uppercase tracking-wide">
                          Severity
                        </label>
                        <select
                          value={warningEditor.severity}
                          onChange={(e) => handleWarningFieldChange("severity", Number(e.target.value))}
                          className="w-full px-3 py-2 border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
                        >
                          <option value={1}>Low</option>
                          <option value={2}>Medium</option>
                          <option value={3}>High</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={closeWarningForm}
                          className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          disabled={warningSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={warningSubmitting || !warningEditor.message.trim()}
                        >
                          {warningSubmitting ? "Saving..." : "Add Warning"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Display existing warnings */}
                  {hasWarnings ? (
                    <div className="space-y-2">
                      {guestWarnings.map((warning) => (
                        <div
                          key={warning.id}
                          className={`p-3 rounded-md border ${warning.severity >= 3
                            ? "bg-red-50 border-red-200"
                            : warning.severity === 2
                              ? "bg-orange-50 border-orange-200"
                              : "bg-yellow-50 border-yellow-200"
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${warning.severity >= 3
                                  ? "bg-red-100 text-red-800"
                                  : warning.severity === 2
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-yellow-100 text-yellow-800"
                                  }`}>
                                  {warning.severity >= 3 ? "High" : warning.severity === 2 ? "Medium" : "Low"}
                                </span>
                                {warning.createdAt && (
                                  <span className="text-xs text-gray-500">
                                    {new Date(warning.createdAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-800">{warning.message}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveWarning(warning.id)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove warning"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !isFormOpen && (
                    <p className="text-sm text-amber-700">No active warnings for this guest.</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <div>
            {(() => {
              const today = todayPacificDateString();
              const todayMealRecord = mealRecords.find(
                (record) =>
                  record.guestId === guest.id &&
                  pacificDateStringFrom(record.date) === today,
              );
              const alreadyHasMeal =
                pendingMealGuests.has(guest.id) || !!todayMealRecord;
              const isPendingMeal = pendingMealGuests.has(guest.id);
              const hasPendingExtraMeal = pendingExtraMealGuests.has(guest.id);
              const mealCount = todayMealRecord?.count || 0;

              return (
                <div className="flex flex-wrap gap-2">
                  <div className="space-x-1 relative">
                    {alreadyHasMeal ? (
                      <button
                        disabled={true}
                        className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${isBannedFromMeals
                          ? "bg-red-100 text-red-500 cursor-not-allowed"
                          : "bg-emerald-50 text-emerald-700 cursor-not-allowed border border-emerald-200"
                          }`}
                        title={`Already received ${mealCount} meal${mealCount > 1 ? "s" : ""} today`}
                      >
                        <SpringIcon>
                          <Check size={16} className="text-emerald-600" />
                        </SpringIcon>
                        {mealCount} Meal{mealCount > 1 ? "s" : ""}
                      </button>
                    ) : (
                      [1, 2].map((count) => {
                        const isDisabled = isBannedFromMeals || isPendingMeal;

                        return (
                          <button
                            key={count}
                            onClick={() =>
                              handleMealSelection(guest.id, count)
                            }
                            disabled={isDisabled}
                            className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${isBannedFromMeals
                              ? "bg-red-100 text-red-500 cursor-not-allowed"
                              : isPendingMeal
                                ? "bg-green-200 text-green-700 cursor-wait animate-pulse"
                                : "bg-green-100 hover:bg-green-200 text-green-800 active:bg-green-300 hover:shadow-sm active:scale-95"
                              }`}
                            title={
                              isBannedFromMeals
                                ? banTooltip
                                : `Give ${count} meal${count > 1 ? "s" : ""}`
                            }
                          >
                            <SpringIcon>
                              <Utensils size={16} />
                            </SpringIcon>
                            {count} Meal{count > 1 ? "s" : ""}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {alreadyHasMeal && !isBannedFromMeals && (
                    <>
                      {(() => {
                        const today = todayPacificDateString();
                        const guestMealAction = actionHistory.find(
                          (action) =>
                            action.type === "MEAL_ADDED" &&
                            action.data?.guestId === guest.id &&
                            pacificDateStringFrom(
                              new Date(action.timestamp),
                            ) === today,
                        );

                        if (!guestMealAction) return null;

                        return (
                          <button
                            onClick={async () => {
                              haptics.undo();
                              const success = await undoAction(
                                guestMealAction.id,
                              );
                              if (success) {
                                haptics.success();
                                toast.success(
                                  "Check-in undone successfully",
                                );
                                setPendingMealGuests((prev) => {
                                  const next = new Set(prev);
                                  next.delete(guest.id);
                                  return next;
                                });
                              } else {
                                haptics.error();
                              }
                            }}
                            className="p-2 rounded-md inline-flex items-center justify-center transition-all duration-200 touch-manipulation bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-800 hover:shadow-sm active:scale-95 hover:rotate-12"
                            title="Undo today's check-in"
                            aria-label="Undo check-in"
                          >
                            <SpringIcon>
                              <RotateCcw size={18} />
                            </SpringIcon>
                          </button>
                        );
                      })()}

                      <button
                        onClick={() => {
                          haptics.buttonPress();
                          setSearchTerm("");
                          setExpandedGuest(null);
                          searchInputRef.current?.focus();
                          toast.success("Ready for next guest");
                        }}
                        className="px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-800 hover:shadow-sm active:scale-95"
                        title="Complete check-in and search for next guest"
                      >
                        <SpringIcon>
                          <UserPlus size={16} />
                        </SpringIcon>
                        <span className="hidden sm:inline">
                          Complete Check-in
                        </span>
                        <span className="sm:hidden">Next</span>
                      </button>
                      {!isBannedFromMeals && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[1, 2].map((extraCount) => (
                            <button
                              key={extraCount}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleAddExtraMeals(
                                  guest.id,
                                  extraCount,
                                  guest.preferredName || guest.name,
                                );
                              }}
                              disabled={hasPendingExtraMeal}
                              title={`Add ${extraCount} extra meal${extraCount > 1 ? "s" : ""}`}
                              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${hasPendingExtraMeal
                                ? "bg-emerald-200 text-emerald-800 cursor-wait animate-pulse"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 hover:text-emerald-800 shadow-sm"
                                }`}
                            >
                              <Plus size={14} />
                              <span>{extraCount} Extra</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {(() => {
              const today = todayPacificDateString();
              const haircutAction = actionHistory.find(
                (action) =>
                  action.type === "HAIRCUT_LOGGED" &&
                  action.data?.guestId === guest.id &&
                  pacificDateStringFrom(new Date(action.timestamp)) ===
                  today,
              );
              const alreadyHasHaircut = !!haircutAction;
              const isPendingHaircut = pendingActions.has(`haircut-${guest.id}`);

              return (
                <>
                  {alreadyHasHaircut ? (
                    <button
                      disabled={true}
                      className="px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-pink-50 text-pink-700 cursor-not-allowed border border-pink-200"
                      title="Haircut already logged today"
                    >
                      <Check size={16} className="text-pink-600" />
                      <span className="hidden sm:inline">Haircut</span>
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (isBanned) {
                          haptics.error();
                          if (banTooltip) toast.error(banTooltip);
                          return;
                        }
                        const actionKey = `haircut-${guest.id}`;
                        if (pendingActions.has(actionKey)) return;

                        haptics.buttonPress();
                        setPendingActions((prev) => new Set(prev).add(actionKey));
                        try {
                          const rec = await addHaircutRecord(guest.id);
                          if (rec) {
                            haptics.success();
                            toast.success("Haircut logged");
                          }
                        } catch {
                          haptics.error();
                        } finally {
                          setPendingActions((prev) => {
                            const next = new Set(prev);
                            next.delete(actionKey);
                            return next;
                          });
                        }
                      }}
                      disabled={isBanned || isPendingHaircut}
                      className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${isBanned
                        ? "bg-red-100 text-red-500 cursor-not-allowed"
                        : isPendingHaircut
                          ? "bg-pink-200 text-pink-600 cursor-wait animate-pulse"
                          : "bg-pink-100 hover:bg-pink-200 active:bg-pink-300 text-pink-800 hover:shadow-sm active:scale-95"
                        }`}
                      title={isBanned ? banTooltip : "Log haircut for today"}
                    >
                      <Scissors size={16} />
                      <span className="hidden sm:inline">
                        {isPendingHaircut
                          ? "Saving..."
                          : "Haircut"}
                      </span>
                    </button>
                  )}

                  {alreadyHasHaircut && (
                    <button
                      onClick={async () => {
                        haptics.undo();
                        const success = await undoAction(haircutAction.id);
                        if (success) {
                          haptics.success();
                          toast.success("Haircut undone");
                        } else {
                          haptics.error();
                        }
                      }}
                      className="px-3 py-2 min-h-[44px] rounded-md text-xs font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-800 hover:shadow-sm active:scale-95 hover:-rotate-12"
                      title="Undo haircut"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {(() => {
              const today = todayPacificDateString();
              const holidayAction = actionHistory.find(
                (action) =>
                  action.type === "HOLIDAY_LOGGED" &&
                  action.data?.guestId === guest.id &&
                  pacificDateStringFrom(new Date(action.timestamp)) ===
                  today,
              );
              const alreadyHasHoliday = !!holidayAction;

              return (
                <>
                  {alreadyHasHoliday ? (
                    <button
                      disabled={true}
                      className="px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-amber-50 text-amber-700 cursor-not-allowed border border-amber-200"
                      title="Holiday already logged today"
                    >
                      <Check size={16} className="text-amber-600" />
                      <span className="hidden sm:inline">Holiday</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (isBanned) {
                          haptics.error();
                          if (banTooltip) toast.error(banTooltip);
                          return;
                        }
                        haptics.buttonPress();
                        const rec = addHolidayRecord(guest.id);
                        if (rec) {
                          haptics.success();
                          toast.success("Holiday logged");
                        }
                      }}
                      disabled={isBanned}
                      className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${isBanned
                        ? "bg-red-100 text-red-500 cursor-not-allowed"
                        : "bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 hover:shadow-sm active:scale-95"
                        }`}
                      title={isBanned ? banTooltip : "Log holiday service for today"}
                    >
                      <Gift size={16} />
                      <span className="hidden sm:inline">Holiday</span>
                    </button>
                  )}

                  {alreadyHasHoliday && (
                    <button
                      onClick={async () => {
                        haptics.undo();
                        const success = await undoAction(holidayAction.id);
                        if (success) {
                          haptics.success();
                          toast.success("Holiday undone");
                        } else {
                          haptics.error();
                        }
                      }}
                      className="px-3 py-2 min-h-[44px] rounded-md text-xs font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-800 hover:shadow-sm active:scale-95 hover:-rotate-12"
                      title="Undo holiday"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {(() => {
              const today = todayPacificDateString();
              const bicycleAction = actionHistory.find(
                (action) =>
                  action.type === "BICYCLE_LOGGED" &&
                  action.data?.guestId === guest.id &&
                  pacificDateStringFrom(new Date(action.timestamp)) ===
                  today,
              );
              const alreadyHasBicycle = !!bicycleAction;
              const hasBicycleDesc = guest.bicycleDescription?.trim();

              return (
                <>
                  {alreadyHasBicycle ? (
                    <button
                      disabled={true}
                      className="px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-sky-50 text-sky-700 cursor-not-allowed border border-sky-200"
                      title="Bicycle repair already logged today"
                    >
                      <Check size={16} className="text-sky-600" />
                      <span className="hidden sm:inline">Bicycle</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (isBannedFromBicycle) {
                          haptics.error();
                          const bicycleBanTooltip = `${guest.preferredName || guest.name || "Guest"} is banned from Bicycle${banSummaryLabel ? ` until ${banSummaryLabel}` : ""}${guest.banReason ? `. Reason: ${guest.banReason}` : ""}`;
                          if (bicycleBanTooltip) toast.error(bicycleBanTooltip);
                          return;
                        }
                        if (!hasBicycleDesc) {
                          haptics.warning();
                          toast.error(
                            "Please add a bicycle description to this guest's profile before logging repairs.",
                          );
                          return;
                        }
                        haptics.buttonPress();
                        setBicyclePickerGuest(guest);
                      }}
                      className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${isBannedFromBicycle
                        ? "bg-red-100 text-red-500 cursor-not-allowed"
                        : !hasBicycleDesc
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-800 hover:shadow-sm active:scale-95"
                        }`}
                      title={
                        isBannedFromBicycle
                          ? `${guest.preferredName || guest.name || "Guest"} is banned from Bicycle${banSummaryLabel ? ` until ${banSummaryLabel}` : ""}${guest.banReason ? `. Reason: ${guest.banReason}` : ""}`
                          : !hasBicycleDesc
                            ? "Add bicycle description to guest profile first"
                            : "Log bicycle repair for today"
                      }
                      disabled={isBannedFromBicycle || !hasBicycleDesc}
                    >
                      <Bike size={16} />
                      <span className="hidden sm:inline">Bicycle</span>
                    </button>
                  )}

                  {alreadyHasBicycle && (
                    <button
                      onClick={async () => {
                        haptics.undo();
                        const success = await undoAction(bicycleAction.id);
                        if (success) {
                          haptics.success();
                          toast.success("Bicycle repair undone");
                        } else {
                          haptics.error();
                        }
                      }}
                      className="px-3 py-2 min-h-[44px] rounded-md text-xs font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-800 hover:shadow-sm active:scale-95 hover:-rotate-12"
                      title="Undo bicycle repair"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {(() => {
              const hasShowerToday = guestsWithShowerToday.has(String(guest.id));
              const isDisabled = isBannedFromShower || hasShowerToday;

              // Build shower-specific ban tooltip
              const showerBanTooltip = isBannedFromShower
                ? `${guest.preferredName || guest.name || "Guest"} is banned from Showers${banSummaryLabel ? ` until ${banSummaryLabel}` : ""}${guest.banReason ? `. Reason: ${guest.banReason}` : ""}`
                : "";

              const tooltipText = isBannedFromShower
                ? showerBanTooltip
                : hasShowerToday
                  ? "Already has a shower booked today"
                  : "Book a shower";

              return (
                <button
                  onClick={() => {
                    if (isDisabled) {
                      haptics.error();
                      if (tooltipText) toast.error(tooltipText);
                      return;
                    }
                    haptics.buttonPress();
                    setShowerPickerGuest(guest);
                  }}
                  disabled={isDisabled}
                  className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${isBannedFromShower
                    ? "bg-red-100 text-red-500 cursor-not-allowed"
                    : hasShowerToday
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 hover:shadow-sm active:scale-95"
                    }`}
                  title={tooltipText}
                >
                  <SpringIcon>
                    <ShowerHead size={16} />
                  </SpringIcon>
                  <span className="hidden sm:inline">Book </span>
                  Shower
                  {hasShowerToday && <span className="ml-1">✓</span>}
                </button>
              );
            })()}

            {(() => {
              const today = todayPacificDateString();
              const showerAction = actionHistory.find(
                (action) =>
                  action.type === "SHOWER_BOOKED" &&
                  action.data?.guestId === guest.id &&
                  pacificDateStringFrom(new Date(action.timestamp)) ===
                  today,
              );

              if (!showerAction) return null;

              return (
                <button
                  onClick={async () => {
                    haptics.undo();
                    const success = await undoAction(showerAction.id);
                    if (success) {
                      haptics.success();
                      toast.success("Shower booking undone");
                    } else {
                      haptics.error();
                    }
                  }}
                  className="px-3 py-2 min-h-[44px] rounded-md text-xs font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-800 hover:shadow-sm active:scale-95 hover:-rotate-12"
                  title="Undo shower booking"
                >
                  <RotateCcw size={14} />
                </button>
              );
            })()}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {(() => {
              const hasLaundryToday = guestsWithLaundryToday.has(String(guest.id));
              const isDisabled = isBannedFromLaundry || hasLaundryToday;

              // Build laundry-specific ban tooltip
              const laundryBanTooltip = isBannedFromLaundry
                ? `${guest.preferredName || guest.name || "Guest"} is banned from Laundry${banSummaryLabel ? ` until ${banSummaryLabel}` : ""}${guest.banReason ? `. Reason: ${guest.banReason}` : ""}`
                : "";

              const tooltipText = isBannedFromLaundry
                ? laundryBanTooltip
                : hasLaundryToday
                  ? "Already has laundry booked today"
                  : "Book laundry";

              return (
                <button
                  onClick={() => {
                    if (isDisabled) {
                      haptics.error();
                      if (tooltipText) toast.error(tooltipText);
                      return;
                    }
                    haptics.buttonPress();
                    setLaundryPickerGuest(guest);
                  }}
                  disabled={isDisabled}
                  className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${isBannedFromLaundry
                    ? "bg-red-100 text-red-500 cursor-not-allowed"
                    : hasLaundryToday
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 hover:shadow-sm active:scale-95"
                    }`}
                  title={tooltipText}
                >
                  <SpringIcon>
                    <WashingMachine size={16} />
                  </SpringIcon>
                  <span className="hidden sm:inline">Book </span>
                  Laundry
                  {hasLaundryToday && <span className="ml-1">✓</span>}
                </button>
              );
            })()}

            {(() => {
              const today = todayPacificDateString();
              const laundryAction = actionHistory.find(
                (action) =>
                  action.type === "LAUNDRY_BOOKED" &&
                  action.data?.guestId === guest.id &&
                  pacificDateStringFrom(new Date(action.timestamp)) ===
                  today,
              );

              if (!laundryAction) return null;

              return (
                <button
                  onClick={async () => {
                    haptics.undo();
                    const success = await undoAction(laundryAction.id);
                    if (success) {
                      haptics.success();
                      toast.success("Laundry booking undone");
                    } else {
                      haptics.error();
                    }
                  }}
                  className="px-3 py-2 min-h-[44px] rounded-md text-xs font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-800 hover:shadow-sm active:scale-95 hover:-rotate-12"
                  title="Undo laundry booking"
                >
                  <RotateCcw size={14} />
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }, [
    dateTimeFormatter,
    banEditor, editingGuestId, startEditingGuest, getLinkedGuests, setLinkingGuestId, deleteGuest,
    banSubmittingId, handleUnbanGuest, openBanEditorForGuest, handleBanSubmit, handleBanFieldChange, closeBanEditor, banError,
    guestsList, linkGuests, unlinkGuests, handleMealSelection, mealRecords, actionHistory, undoAction,
    editFormData, handleEditChange, handleEditNameBlur, saveEditedGuest, cancelEditing,
    getWarningsForGuest, showWarningForm, openWarningForm, handleAddWarning, handleWarningFieldChange, warningEditor, warningSubmitting, closeWarningForm, handleRemoveWarning,
    pendingMealGuests, pendingExtraMealGuests, setPendingMealGuests, setSearchTerm, setExpandedGuest, searchInputRef,
    handleAddExtraMeals, pendingActions, setPendingActions, addHaircutRecord, addHolidayRecord,
    setBicyclePickerGuest, guestsWithShowerToday, setShowerPickerGuest, guestsWithLaundryToday, setLaundryPickerGuest,
    linkingGuestId
  ]);

  const itemData = React.useMemo(() => ({
    guests: sortedGuests,
    latestServiceByGuest,
    todayServicesByGuest,
    guestsWithShowerToday,
    guestsWithLaundryToday,
    pendingMealGuests,
    recentlyLoggedMeals,
    mealRecords,
    extraMealRecords,
    showerRecords,
    laundryRecords,
    selectedGuestIndex,
    expandedGuest,
    editingGuestId,
    searchTerm,
    isBanEditorOpenId: banEditor.guestId,
    // Handlers
    toggleExpanded,
    setSelectedGuestIndex,
    storeGuestCardRef: (el, id) => {
      if (el) {
        guestCardRefs.current[id] = el;
      } else {
        delete guestCardRefs.current[id];
      }
    },
    handleMealSelection,
    setShowerPickerGuest,
    setLaundryPickerGuest,
    setSearchTerm,
    setExpandedGuest,
    setMobileServiceSheet,
    // Utils
    dateTimeFormatter,
    formatRelativeTime,
    getLinkedGuests,
    getWarningsForGuest,
    isActiveGuest,
    getLastMealLabel,
    formatShowerSlotLabel,
    formatLaundryRangeLabel,
    formatDateTimeLocal,
    todayPacificDateString,
    pacificDateStringFrom,
    searchInputRef,
    // Animation
    trail,
    shouldVirtualize,
    // Render prop
    renderExpandedContent,
    compact: isCompact,
    adaptive: isAdaptive,
    resetCardFocus,
    focusGuestCard
  }), [
    sortedGuests, latestServiceByGuest, todayServicesByGuest, guestsWithShowerToday, guestsWithLaundryToday,
    pendingMealGuests, recentlyLoggedMeals, mealRecords, extraMealRecords, showerRecords, laundryRecords,
    selectedGuestIndex, expandedGuest, editingGuestId, searchTerm, banEditor.guestId,
    trail, shouldVirtualize, isCompact, isAdaptive, toggleExpanded, setSelectedGuestIndex, handleMealSelection,
    setShowerPickerGuest, setLaundryPickerGuest, setSearchTerm, setExpandedGuest, setMobileServiceSheet,
    // dependencies for utils if any (mostly stable or imported)
    // ref
    searchInputRef,
    // rendering
    renderExpandedContent, // stable wrapper
    resetCardFocus, focusGuestCard,
    // Utils needed for memo safety
    dateTimeFormatter, getLinkedGuests, getWarningsForGuest
  ]);

  return (
    <div className="space-y-6">
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        guest={deleteConfirmation.guest}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        mealCount={deleteConfirmation.mealCount}
        showerCount={deleteConfirmation.showerCount}
        laundryCount={deleteConfirmation.laundryCount}
      />

      {/* Mobile Service Sheet - for tablet/mobile quick actions */}
      <MobileServiceSheet
        isOpen={mobileServiceSheet.isOpen}
        onClose={() => setMobileServiceSheet({ isOpen: false, guest: null })}
        guest={mobileServiceSheet.guest}
        // Meal props
        onMealSelect={(guestId, count) => {
          handleMealSelection(guestId, count);
        }}
        hasMealToday={
          mobileServiceSheet.guest
            ? (() => {
              const today = todayPacificDateString();
              return mealRecords.some(
                (record) =>
                  record.guestId === mobileServiceSheet.guest.id &&
                  pacificDateStringFrom(record.date) === today
              );
            })()
            : false
        }
        mealCount={
          mobileServiceSheet.guest
            ? (() => {
              const today = todayPacificDateString();
              const todayMealRecord = mealRecords.find(
                (record) =>
                  record.guestId === mobileServiceSheet.guest.id &&
                  pacificDateStringFrom(record.date) === today
              );
              const guestExtraMeals = extraMealRecords.filter(
                (record) =>
                  record.guestId === mobileServiceSheet.guest.id &&
                  pacificDateStringFrom(record.date) === today
              );
              const extraMealsCount = guestExtraMeals.reduce(
                (sum, r) => sum + (r.count || 1),
                0
              );
              return (todayMealRecord?.count || 0) + extraMealsCount;
            })()
            : 0
        }
        isPendingMeal={
          mobileServiceSheet.guest
            ? pendingMealGuests.has(mobileServiceSheet.guest.id)
            : false
        }
        isBannedFromMeals={
          mobileServiceSheet.guest
            ? (() => {
              const guest = mobileServiceSheet.guest;
              const isBanned = Boolean(guest.isBanned);
              const hasProgramSpecificBans =
                guest.bannedFromMeals ||
                guest.bannedFromShower ||
                guest.bannedFromLaundry ||
                guest.bannedFromBicycle;
              return isBanned && (!hasProgramSpecificBans || guest.bannedFromMeals);
            })()
            : false
        }
        // Shower props
        onShowerSelect={(guest) => {
          haptics.buttonPress();
          setShowerPickerGuest(guest);
        }}
        hasShowerToday={
          mobileServiceSheet.guest
            ? guestsWithShowerToday.has(String(mobileServiceSheet.guest.id))
            : false
        }
        isBannedFromShower={
          mobileServiceSheet.guest
            ? (() => {
              const guest = mobileServiceSheet.guest;
              const isBanned = Boolean(guest.isBanned);
              const hasProgramSpecificBans =
                guest.bannedFromMeals ||
                guest.bannedFromShower ||
                guest.bannedFromLaundry ||
                guest.bannedFromBicycle;
              return isBanned && (!hasProgramSpecificBans || guest.bannedFromShower);
            })()
            : false
        }
        // Laundry props
        onLaundrySelect={(guest) => {
          haptics.buttonPress();
          setLaundryPickerGuest(guest);
        }}
        hasLaundryToday={
          mobileServiceSheet.guest
            ? guestsWithLaundryToday.has(String(mobileServiceSheet.guest.id))
            : false
        }
        isBannedFromLaundry={
          mobileServiceSheet.guest
            ? (() => {
              const guest = mobileServiceSheet.guest;
              const isBanned = Boolean(guest.isBanned);
              const hasProgramSpecificBans =
                guest.bannedFromMeals ||
                guest.bannedFromShower ||
                guest.bannedFromLaundry ||
                guest.bannedFromBicycle;
              return isBanned && (!hasProgramSpecificBans || guest.bannedFromLaundry);
            })()
            : false
        }
      />

      {/* Meal Transfer Modal */}
      {mealTransferModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle size={24} className="text-amber-600" />
              Transfer Meal Records
            </h2>

            <p className="text-gray-600 mb-4">
              <strong>{mealTransferModal.sourceGuest?.name}</strong> has <strong>{mealTransferModal.mealCount}</strong> meal record{mealTransferModal.mealCount === 1 ? "" : "s"} that need to be transferred before deletion.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer to:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search guests by name..."
                  value={mealTransferModal.searchTerm}
                  onChange={(e) =>
                    setMealTransferModal((prev) => ({
                      ...prev,
                      searchTerm: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                {mealTransferModal.searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg z-10">
                    {guests
                      .filter((g) => g.id !== mealTransferModal.sourceGuest?.id)
                      .filter((g) => {
                        const searchLower = mealTransferModal.searchTerm.toLowerCase();
                        const firstName = (g.firstName || "").toLowerCase();
                        const lastName = (g.lastName || "").toLowerCase();
                        const fullName = `${firstName} ${lastName}`;
                        return (
                          firstName.includes(searchLower) ||
                          lastName.includes(searchLower) ||
                          fullName.includes(searchLower)
                        );
                      })
                      .slice(0, 10)
                      .map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            setMealTransferModal((prev) => ({
                              ...prev,
                              selectedTargetGuest: g,
                              searchTerm: "",
                            }));
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-emerald-50 transition-colors text-sm"
                        >
                          {g.name || `${g.firstName} ${g.lastName}`}
                        </button>
                      ))}
                    {guests
                      .filter((g) => g.id !== mealTransferModal.sourceGuest?.id)
                      .filter((g) => {
                        const searchLower = mealTransferModal.searchTerm.toLowerCase();
                        const firstName = (g.firstName || "").toLowerCase();
                        const lastName = (g.lastName || "").toLowerCase();
                        const fullName = `${firstName} ${lastName}`;
                        return (
                          firstName.includes(searchLower) ||
                          lastName.includes(searchLower) ||
                          fullName.includes(searchLower)
                        );
                      }).length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          No guests found
                        </div>
                      )}
                  </div>
                )}
              </div>
              {mealTransferModal.selectedTargetGuest && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-800">
                  Selected: <strong>{mealTransferModal.selectedTargetGuest.name || `${mealTransferModal.selectedTargetGuest.firstName} ${mealTransferModal.selectedTargetGuest.lastName}`}</strong>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setMealTransferModal({
                    isOpen: false,
                    sourceGuest: null,
                    mealCount: 0,
                    selectedTargetGuest: null,
                    searchTerm: "",
                  })
                }
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferMeals}
                disabled={!mealTransferModal.selectedTargetGuest}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Transfer & Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Enhanced Search Bar */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
          <div className="relative bg-white rounded-xl border-2 border-gray-200 group-focus-within:border-blue-400 transition-all duration-300 shadow-sm group-focus-within:shadow-lg group-focus-within:shadow-blue-100">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={22} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search guests..."
              aria-label="Search guests by name"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedGuestIndex(-1);
              }}
              onKeyDown={(e) => {
                const key = e.key;
                const displayedResults = sortedGuests;
                const hasResults = displayedResults.length > 0;

                if (key === "Enter") {
                  if (shouldShowCreateOption && !showCreateForm) {
                    e.preventDefault();
                    handleShowCreateForm();
                  } else if (
                    selectedGuestIndex >= 0 &&
                    displayedResults[selectedGuestIndex]
                  ) {
                    e.preventDefault();
                    toggleExpanded(displayedResults[selectedGuestIndex].id);
                  } else if (hasResults) {
                    e.preventDefault();
                    setSelectedGuestIndex(0);
                    focusGuestCard(displayedResults[0].id);
                  }
                } else if (key === "ArrowDown" && hasResults) {
                  e.preventDefault();
                  setSelectedGuestIndex((prev) =>
                    prev < displayedResults.length - 1 ? prev + 1 : 0,
                  );
                } else if (key === "ArrowUp" && hasResults) {
                  e.preventDefault();
                  setSelectedGuestIndex((prev) =>
                    prev > 0 ? prev - 1 : displayedResults.length - 1,
                  );
                } else if (key === "Escape") {
                  setSelectedGuestIndex(-1);
                  setSearchTerm("");
                }
              }}
              ref={searchInputRef}
              className="w-full pl-12 pr-14 py-4 text-lg bg-transparent rounded-xl focus:outline-none transition-all duration-200 placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  searchInputRef.current && searchInputRef.current.focus();
                }}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
                title="Clear (Esc)"
              >
                <SpringIcon>
                  <X size={18} />
                </SpringIcon>
              </button>
            )}
          </div>
          {/* Search results count badge - removed to reduce clutter */}
        </div>

        {/* Keyboard shortcuts hint - hidden on mobile, visible on sm+ screens */}
        <div className="hidden sm:flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">Ctrl+K</kbd>
          <span>Focus search</span>
          <span className="text-gray-300">•</span>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">↑↓</kbd>
          <span>Navigate results</span>
          <span className="text-gray-300">•</span>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">Enter</kbd>
          <span>Open first card / Expand</span>
          <span className="text-gray-300">•</span>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">1</kbd>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">2</kbd>
          <span>Log meals while card selected</span>
          <span className="text-gray-300">•</span>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">R</kbd>
          <span>Reset card / back to search</span>
          <span className="text-gray-300">•</span>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">Esc</kbd>
          <span>Clear</span>
        </div>
      </div>

      {shouldShowCreateOption && !showCreateForm && (
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-200/30 rounded-full blur-2xl" />
          <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-indigo-200/30 rounded-full blur-xl" />
          <div className="relative flex flex-col items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg animate-pulse" />
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
                <UserPlus size={28} className="text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">
                No matches for "{searchTerm}"
              </h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                This guest isn't in the system yet. Create a new profile to get them checked in.
              </p>
            </div>
            <button
              onClick={handleShowCreateForm}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl inline-flex items-center gap-2.5 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
            >
              <Plus size={20} className="transition-transform group-hover:rotate-90 duration-300" />
              <span>Create New Guest</span>
            </button>
            <p className="text-xs text-gray-500">
              Press <kbd className="px-1.5 py-0.5 bg-white/80 border border-gray-200 rounded text-gray-600 font-mono">Enter</kbd> to quick create
            </p>
          </div>
        </div>
      )}

      {showCreateForm && (
        <GuestCreateForm
          formData={createFormData}
          fieldErrors={fieldErrors}
          isCreating={isCreating}
          createError={createError}
          duplicateWarning={duplicateWarning}
          onChange={handleCreateFormChange}
          onNameBlur={handleNameBlur}
          onSubmit={handleCreateGuest}
          onCancel={handleCancelCreate}
          onLocationChange={(val) => setCreateFormData((prev) => ({ ...prev, location: val }))}
          firstNameRef={createFirstNameRef}
        />




      )}






      {!showCreateForm && (
        <>
          {searchTerm.trim().length === 0 ? (
            <div className="space-y-4">
              {isInitialLoad ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex space-x-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="rounded-xl bg-gradient-to-br from-gray-200 to-gray-100 h-12 w-12"></div>
                      <div className="flex-1 space-y-2.5 py-1">
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full w-3/4"></div>
                        <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-100 p-8">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-100/30 rounded-full blur-2xl" />
                  <div className="relative flex flex-col items-center text-center">
                    <div className="mb-4 p-4 rounded-2xl bg-white shadow-sm border border-gray-100">
                      <Search size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to search</h3>
                    <p className="text-gray-500 text-sm max-w-xs">
                      Start typing a name to find guests. For privacy, no names are shown until you search.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span>Privacy-first design</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : filteredGuests.length === 0 && !shouldShowCreateOption ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-8 text-center">
                <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-amber-200/30 rounded-full blur-2xl" />
                <div className="relative flex flex-col items-center">
                  <div className="mb-4 p-4 rounded-2xl bg-white shadow-sm border border-amber-100">
                    <Search size={28} className="text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No guests found
                  </h3>
                  <p className="text-gray-600 max-w-sm">
                    Try adjusting your search terms or add more letters to narrow down results
                  </p>
                  {!hasMinimumNameParts && searchTerm.trim().length > 0 && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-amber-200 text-sm text-gray-700">
                      <strong className="text-amber-700">💡 Tip:</strong> Type the guest's first AND last name, then press Enter to create a new guest profile.
                    </div>
                  )}
                </div>
              </div>

              {/* "Did you mean?" suggestions */}
              {fuzzySuggestions.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb size={18} className="text-blue-500" />
                    <h4 className="font-medium text-gray-900">Did you mean?</h4>
                  </div>
                  <div className="space-y-2">
                    {fuzzySuggestions.map((suggestion) => {
                      const display = formatSuggestionDisplay(suggestion);
                      return (
                        <button
                          key={suggestion.id}
                          onClick={() => {
                            haptics.buttonPress();
                            // Set search to the suggested name and expand the guest
                            const searchName = display.preferredName || display.fullName;
                            setSearchTerm(searchName);
                            setExpandedGuest(suggestion.id);
                          }}
                          className="w-full flex items-center gap-3 p-3 bg-white hover:bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-200 transition-all duration-200 group"
                        >
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                            <User size={18} className="text-blue-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                              {display.displayName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {Math.round(display.score * 100)}% match
                              {suggestion.location && ` • ${suggestion.location}`}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-blue-400 group-hover:text-blue-600 transition-colors">
                            <ChevronDown size={16} className="rotate-[-90deg]" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Click a suggestion to view that guest
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              className="space-y-4"
              key={`search-results-${searchTerm}-${filteredGuests.length}`}
            >
              {searchTerm && filteredGuests.length > 0 && (
                <div className="space-y-3">
                  {/* Enhanced results header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 rounded-lg">
                        <Users size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {filteredGuests.length} {filteredGuests.length === 1 ? "guest" : "guests"} found
                        </p>
                        <p className="text-xs text-gray-500">
                          Searching for "{searchTerm}"
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-full">
                      <kbd className="px-1.5 py-0.5 bg-white rounded text-emerald-800 font-mono border border-emerald-200">↑↓</kbd>
                      <span>Navigate</span>
                      <span className="text-emerald-400">•</span>
                      <kbd className="px-1.5 py-0.5 bg-white rounded text-emerald-800 font-mono border border-emerald-200">Enter</kbd>
                      <span>Expand</span>
                    </div>
                  </div>

                  {/* Sort buttons - enhanced */}
                  <div className="flex gap-2 px-1">
                    <span className="text-xs text-gray-500 self-center mr-1">Sort:</span>
                    <button
                      onClick={() => handleSort("firstName")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 touch-manipulation ${sortConfig.key === "firstName"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
                        }`}
                      title="Sort by first name"
                    >
                      First Name {sortConfig.key === "firstName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </button>
                    <button
                      onClick={() => handleSort("lastName")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 touch-manipulation ${sortConfig.key === "lastName"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
                        }`}
                      title="Sort by last name"
                    >
                      Last Name {sortConfig.key === "lastName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </button>
                  </div>
                </div>
              )}
              {shouldVirtualize ? (
                <div
                  ref={listContainerRef}
                  className="relative w-full"
                  data-testid="guest-list-virtualized"
                >
                  <List
                    height={listHeight}
                    itemCount={sortedGuests.length}
                    itemSize={effectiveItemSize}
                    overscanCount={6}
                    width="100%"
                    ref={listRef}
                    itemData={itemData}
                  >
                    {GuestListRow}
                  </List>
                </div>
              ) : (
                sortedGuests.map((guest, i) => (
                  <GuestListRow
                    key={`guest-${guest.id}-${searchTerm}`}
                    index={i}
                    style={trail[i]}
                    data={itemData}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders when AppContext changes
// but the guest-related data hasn't changed
export default React.memo(GuestList);
