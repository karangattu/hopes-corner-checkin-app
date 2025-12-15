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
  Plus,
  PlusCircle,
  Eraser,
  Scissors,
  Gift,
  Bike,
  RotateCcw,
  Ban,
  Lightbulb,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from "../context/constants";
import Selectize from "./Selectize";
import GuestCreateForm from "./guest/GuestCreateForm";
import { WaiverBadge } from "./ui/WaiverBadge";
import { findFuzzySuggestions, formatSuggestionDisplay } from "../utils/fuzzyMatch";
import { flexibleNameSearch } from "../utils/flexibleNameSearch";

const VIRTUALIZATION_THRESHOLD = 40;
const DEFAULT_ITEM_HEIGHT = 208;
const ITEM_VERTICAL_GAP = 16;
const VIRTUAL_ITEM_SIZE = DEFAULT_ITEM_HEIGHT + ITEM_VERTICAL_GAP;
const MIN_VISIBLE_ROWS = 5;
const MAX_VISIBLE_ROWS = 12;

const GuestList = () => {
  const {
    guests,
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
  } = useAppContext();
  const { addHaircutRecord, addHolidayRecord } = useAppContext();
  const { updateGuest, removeGuest } = useAppContext();
  const { banGuest, clearGuestBan } = useAppContext();

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
  const [pendingActions, setPendingActions] = useState(new Set());
  const [banEditor, setBanEditor] = useState({
    guestId: null,
    until: "",
    reason: "",
  });
  const [banError, setBanError] = useState("");
  const [banSubmittingId, setBanSubmittingId] = useState(null);

  const [editingGuestId, setEditingGuestId] = useState(null);
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
  useEffect(() => {
    if (guests && guests.length >= 0) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [guests]);

  const searchInputRef = useRef(null);
  const createFirstNameRef = useRef(null);
  const listRef = useRef(null);
  const listContainerRef = useRef(null);
  const guestCardRefs = useRef({});

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
    const searchParts = searchTerm.trim().split(/\s+/);
    const firstName = searchParts[0] || "";
    const lastName = searchParts.slice(1).join(" ") || "";

    setCreateFormData((prev) => ({
      ...prev,
      firstName,
      lastName,
      preferredName: firstName,
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
        if (isEditableTarget) {
          return;
        }
        e.preventDefault();
        handleShowCreateForm();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleShowCreateForm]);

  const filteredGuests = useMemo(() => {
    return flexibleNameSearch(debouncedSearchTerm, guestsList);
  }, [guestsList, debouncedSearchTerm]);

  // Fuzzy name suggestions when no exact matches are found
  const fuzzySuggestions = useMemo(() => {
    // Only show suggestions when search has some input but no matches
    if (!debouncedSearchTerm.trim() || filteredGuests.length > 0) {
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

  const toggleExpanded = (guestId) => {
    haptics.selection();
    setExpandedGuest(expandedGuest === guestId ? null : guestId);
  };


  const handleMealSelection = (guestId, count) => {
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
      const rec = addMealRecord(guestId, count);
      if (rec) {
        haptics.success();
        toast.success(`${count} meal${count > 1 ? "s" : ""} logged for guest!`);
      }
    } catch (error) {
      haptics.error();
      toast.error(`Error logging meals: ${error.message}`);
    }
  };

  const handleAddExtraMeals = (guestId, count) => {
    try {
      haptics.buttonPress();
      addExtraMealRecord(guestId, count);
      haptics.success();
      toast.success(`${count} extra meal${count > 1 ? "s" : ""} added!`);
    } catch (error) {
      haptics.error();
      toast.error(`Error adding extra meals: ${error.message}`);
    }
  };

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

  const openBanEditorForGuest = (guest) => {
    haptics.selection();
    setBanEditor({
      guestId: guest.id,
      until: guest.bannedUntil
        ? formatDateTimeLocal(guest.bannedUntil)
        : getDefaultBanUntil(),
      reason: guest.banReason || "",
    });
    setBanError("");
  };

  const closeBanEditor = () => {
    setBanEditor({ guestId: null, until: "", reason: "" });
    setBanError("");
  };

  const handleBanFieldChange = (field, value) => {
    setBanEditor((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBanSubmit = async (event) => {
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
  };

  const handleUnbanGuest = async (guest) => {
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
  };

  const toTitleCase = (str) => {
    if (!str || typeof str !== "string") return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .trim();
  };

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

  const todayServicesByGuest = useMemo(() => {
    const today = todayPacificDateString();
    const map = new Map();

    // Helper to add service if it's from today
    const addTodayService = (guestId, record, serviceType, icon, iconClass) => {
      if (!guestId || !record?.date) return;
      const recordDate = pacificDateStringFrom(record.date);
      if (recordDate === today) {
        if (!map.has(guestId)) map.set(guestId, []);
        map.get(guestId).push({ serviceType, icon, iconClass, record });
      }
    };

    mealRecords.forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Meal",
        Utensils,
        "text-green-600",
      ),
    );
    extraMealRecords.forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Extra",
        Utensils,
        "text-green-500",
      ),
    );
    showerRecords.forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Shower",
        ShowerHead,
        "text-emerald-600",
      ),
    );
    laundryRecords.forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Laundry",
        WashingMachine,
        "text-emerald-700",
      ),
    );
    holidayRecords.forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Holiday",
        Gift,
        "text-amber-500",
      ),
    );
    haircutRecords.forEach((record) =>
      addTodayService(
        record.guestId,
        record,
        "Haircut",
        Scissors,
        "text-pink-500",
      ),
    );
    bicycleRecords.forEach((record) =>
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

  const startEditingGuest = (guest) => {
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
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const transformed =
      name === "firstName" || name === "lastName" || name === "preferredName"
        ? toTitleCase(value)
        : value;
    setEditFormData((prev) => ({ ...prev, [name]: transformed }));
  };

  const handleEditNameBlur = (e) => {
    const { name, value } = e.target;
    if ((name === "firstName" || name === "lastName") && value.trim()) {
      setEditFormData((prev) => ({
        ...prev,
        [name]: toTitleCase(value.trim()),
      }));
    }
  };

  const saveEditedGuest = async () => {
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
  };

  const cancelEditing = () => setEditingGuestId(null);

  const deleteGuest = (guest) => {
    const guestMealCount = (mealRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;
    const guestShowerCount = (showerRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;
    const guestLaundryCount = (laundryRecords || []).filter(
      (r) => r.guestId === guest.id,
    ).length;

    setDeleteConfirmation({
      isOpen: true,
      guest,
      mealCount: guestMealCount,
      showerCount: guestShowerCount,
      laundryCount: guestLaundryCount,
    });
  };

  const confirmDelete = () => {
    const guest = deleteConfirmation.guest;
    removeGuest(guest.id);
    toast.success("Guest deleted");
    if (expandedGuest === guest.id) setExpandedGuest(null);
    setDeleteConfirmation({ isOpen: false, guest: null });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, guest: null });
  };

  const renderGuestCard = (guest, index, options = {}) => {
    if (!guest) return null;

    const { style, key: keyOverride } = options;
    const lastService = latestServiceByGuest.get(String(guest.id));
    const ServiceIcon = lastService?.icon;
    const formattedDate = lastService
      ? dateTimeFormatter.format(lastService.date)
      : "";
    const fullDateTooltip = lastService
      ? lastService.date.toLocaleString()
      : "";
    const relativeLabel = lastService
      ? formatRelativeTime(lastService.date)
      : "";
    const todayServices = todayServicesByGuest.get(guest.id) || [];
    const isSelected = selectedGuestIndex === index;
    const isBanned = Boolean(guest.isBanned);
    const bannedUntilDate =
      isBanned && guest.bannedUntil && !Number.isNaN(new Date(guest.bannedUntil).getTime())
        ? new Date(guest.bannedUntil)
        : null;
    const banSummaryLabel = bannedUntilDate
      ? dateTimeFormatter.format(bannedUntilDate)
      : null;
    const banTooltip = isBanned
      ? `${guest.preferredName || guest.name || "Guest"} is banned${banSummaryLabel ? ` until ${banSummaryLabel}` : "."}${guest.banReason ? ` Reason: ${guest.banReason}` : ""}`
      : "";
    const isBanEditorOpen = banEditor.guestId === guest.id;
    const banFormMinValue = isBanEditorOpen
      ? formatDateTimeLocal(new Date(Date.now() + 5 * 60 * 1000))
      : null;

    const containerClass = `border rounded-lg hover:shadow-md transition-all bg-white hover:bg-white overflow-hidden ${
      isSelected ? "ring-4 ring-blue-500 border-blue-400 shadow-xl bg-blue-50 scale-[1.02]" : ""
    } ${expandedGuest === guest.id && !isSelected ? "ring-2 ring-emerald-300 border-emerald-200 bg-white" : ""} ${isBanned ? "border-red-300" : ""}`;

    let animationStyle = shouldVirtualize ? {} : trail[index] || {};

    if (shouldVirtualize && style) {
      const resolvedStyle = { ...style };

      const rawTop = resolvedStyle.top;
      const numericTop =
        typeof rawTop === "number"
          ? rawTop
          : typeof rawTop === "string"
            ? parseFloat(rawTop)
            : 0;
      if (!Number.isNaN(numericTop)) {
        const updatedTop = numericTop + ITEM_VERTICAL_GAP / 2;
        resolvedStyle.top =
          typeof rawTop === "string" ? `${updatedTop}px` : updatedTop;
      }

      const rawHeight = resolvedStyle.height;
      const numericHeight =
        typeof rawHeight === "number"
          ? rawHeight
          : typeof rawHeight === "string"
            ? parseFloat(rawHeight)
            : VIRTUAL_ITEM_SIZE;
      if (!Number.isNaN(numericHeight)) {
        const adjustedHeight = Math.max(
          numericHeight - ITEM_VERTICAL_GAP,
          DEFAULT_ITEM_HEIGHT,
        );
        resolvedStyle.height =
          typeof rawHeight === "string"
            ? `${adjustedHeight}px`
            : adjustedHeight;
      }

      resolvedStyle.width = "100%";
      animationStyle = resolvedStyle;
    }

    return (
      <Animated.div
        key={keyOverride ?? `guest-${guest.id}`}
        style={animationStyle}
        className={containerClass}
      >
        <div
          className="p-4 cursor-pointer flex justify-between items-center"
          onClick={() => toggleExpanded(guest.id)}
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <User size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900 flex-1">
                  {guest.preferredName ? (
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-lg font-semibold text-gray-900">
                        {guest.preferredName}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({guest.name})
                      </span>
                      <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        Preferred
                      </span>
                    </span>
                  ) : (
                    guest.name
                  )}
                </h3>
                <div className="flex gap-1 ml-2 items-center">
                  {(() => {
                    const isNewGuest =
                      guest.createdAt &&
                      pacificDateStringFrom(new Date(guest.createdAt)) ===
                        todayPacificDateString();

                    return isNewGuest ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                        NEW
                      </span>
                    ) : null;
                  })()}
                  {todayServices.length > 0 && (
                    <>
                      {todayServices.map((service, idx) => {
                        const Icon = service.icon;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border transition-all hover:scale-110 hover:shadow-sm"
                            title={`${service.serviceType} today`}
                          >
                            <Icon size={12} className={service.iconClass} />
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
              {/* Waiver badges for shower and laundry */}
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {(() => {
                  const servicesThatNeedWaivers = [];
                  
                  // Check if guest has shower records
                  const guestShowerRecords = showerRecords.filter(
                    (r) => r.guestId === guest.id
                  );
                  const hasShower = guestShowerRecords.length > 0;
                  
                  // Check if guest has laundry records
                  const guestLaundryRecords = laundryRecords.filter(
                    (r) => r.guestId === guest.id
                  );
                  const hasLaundry = guestLaundryRecords.length > 0;
                  
                  // Shower and laundry share a common waiver - only show one badge if either is used
                  if (hasShower || hasLaundry) {
                    servicesThatNeedWaivers.push('shower');
                  }
                  
                  return servicesThatNeedWaivers.map((service) => (
                    <WaiverBadge
                      key={`waiver-${guest.id}-${service}`}
                      guestId={guest.id}
                      serviceType={service}
                      onDismissed={() => {
                        toast.success(`${service} waiver acknowledged`);
                      }}
                    />
                  ));
                })()}
              </div>
              {guest.preferredName && (
                <p className="text-xs text-gray-500 mt-1">
                  Use their preferred name when greeting; legal name is shown in
                  parentheses.
                </p>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Home size={14} />
                <span>{guest.housingStatus}</span>
                {guest.location && (
                  <>
                    <span className="text-gray-300">•</span>
                    <MapPin size={14} />
                    <span>{guest.location}</span>
                  </>
                )}
              </div>
              {lastService && ServiceIcon && (
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                    <ServiceIcon
                      size={14}
                      className={`${lastService.iconClass || "text-blue-500"}`}
                    />
                    <span>{lastService.summary}</span>
                  </span>
                  {formattedDate && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span title={fullDateTooltip}>{formattedDate}</span>
                    </>
                  )}
                  {relativeLabel && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-400">{relativeLabel}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {expandedGuest === guest.id ? (
              <SpringIcon>
                <ChevronUp size={18} className="text-gray-400" />
              </SpringIcon>
            ) : (
              <SpringIcon>
                <ChevronDown size={18} className="text-gray-400" />
              </SpringIcon>
            )}
          </div>
        </div>
        {expandedGuest === guest.id && (
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
                        Guest is banned
                        {banSummaryLabel ? ` until ${banSummaryLabel}` : "."}
                      </p>
                      {guest.banReason && (
                        <p className="mt-1 text-sm text-red-700">
                          Reason: {guest.banReason}
                        </p>
                      )}
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
                        Please ask: "Do you have stable housing right now?" Select the option that best describes their current situation.
                            <span className="block mt-1 text-[11px] text-gray-600">
                              Spanish: “¿Tiene una vivienda estable en este momento?”
                            </span>
                            <span className="block mt-0.5 text-[11px] text-gray-600">
                              Mandarin: “您现在有稳定的住处吗？” (Pinyin: Nín xiànzài yǒu wěndìng de zhùchù ma?)
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
            <div className="flex flex-wrap gap-2">
              <div>
                {(() => {
                  const today = todayPacificDateString();
                  const alreadyHasMeal =
                    pendingMealGuests.has(guest.id) ||
                    mealRecords.some(
                      (record) =>
                        record.guestId === guest.id &&
                        pacificDateStringFrom(record.date) === today,
                    );
                  const isPendingMeal = pendingMealGuests.has(guest.id);

                  return (
                    <div className="flex flex-wrap gap-2">
                      <div className="space-x-1 relative">
                        {[1, 2].map((count) => {
                          const isDisabled =
                            isBanned || alreadyHasMeal || isPendingMeal;

                          return (
                            <button
                              key={count}
                              onClick={() =>
                                handleMealSelection(guest.id, count)
                              }
                              disabled={isDisabled}
                              className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                                isBanned
                                  ? "bg-red-100 text-red-500 cursor-not-allowed"
                                  : alreadyHasMeal
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-50"
                                    : isPendingMeal
                                      ? "bg-green-200 text-green-700 cursor-wait animate-pulse"
                                      : "bg-green-100 hover:bg-green-200 text-green-800 active:bg-green-300 hover:shadow-sm active:scale-95"
                              }`}
                              title={
                                isBanned
                                  ? banTooltip
                                  : alreadyHasMeal
                                    ? "Guest already received meals today"
                                    : `Give ${count} meal${count > 1 ? "s" : ""}`
                              }
                            >
                              <SpringIcon>
                                <Utensils size={16} />
                              </SpringIcon>
                              {count} Meal{count > 1 ? "s" : ""}
                            </button>
                          );
                        })}
                      </div>

                      {alreadyHasMeal && !isBanned && (
                        <>
                          <div className="space-x-1 relative">
                            {[1, 2].map((count) => (
                              <button
                                key={`extra-${count}`}
                                onClick={() =>
                                  handleAddExtraMeals(guest.id, count)
                                }
                                disabled={isBanned}
                                className="px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-green-100 hover:bg-green-200 active:bg-green-300 text-green-800 hover:shadow-sm active:scale-95"
                                title={
                                  isBanned
                                    ? banTooltip
                                    : `Add ${count} extra meal${count > 1 ? "s" : ""}`
                                }
                              >
                                <SpringIcon>
                                  <PlusCircle size={16} />
                                </SpringIcon>
                                {count} Extra
                              </button>
                            ))}
                          </div>

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
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
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
                  disabled={isBanned || pendingActions.has(`haircut-${guest.id}`)}
                  className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                    isBanned
                      ? "bg-red-100 text-red-500 cursor-not-allowed"
                      : pendingActions.has(`haircut-${guest.id}`)
                          ? "bg-pink-200 text-pink-600 cursor-wait animate-pulse"
                          : "bg-pink-100 hover:bg-pink-200 active:bg-pink-300 text-pink-800 hover:shadow-sm active:scale-95"
                  }`}
                  title={isBanned ? banTooltip : "Log haircut for today"}
                >
                  <Scissors size={16} />
                  <span className="hidden sm:inline">
                    {pendingActions.has(`haircut-${guest.id}`)
                      ? "Saving..."
                      : "Haircut"}
                  </span>
                </button>

                {(() => {
                  const today = todayPacificDateString();
                  const haircutAction = actionHistory.find(
                    (action) =>
                      action.type === "HAIRCUT_LOGGED" &&
                      action.data?.guestId === guest.id &&
                      pacificDateStringFrom(new Date(action.timestamp)) ===
                        today,
                  );

                  if (!haircutAction) return null;

                  return (
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
                  );
                })()}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
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
                  className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                    isBanned
                      ? "bg-red-100 text-red-500 cursor-not-allowed"
                      : "bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 hover:shadow-sm active:scale-95"
                  }`}
                  title={isBanned ? banTooltip : "Log holiday service for today"}
                >
                  <Gift size={16} />
                  <span className="hidden sm:inline">Holiday</span>
                </button>

                {(() => {
                  const today = todayPacificDateString();
                  const holidayAction = actionHistory.find(
                    (action) =>
                      action.type === "HOLIDAY_LOGGED" &&
                      action.data?.guestId === guest.id &&
                      pacificDateStringFrom(new Date(action.timestamp)) ===
                        today,
                  );

                  if (!holidayAction) return null;

                  return (
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
                  );
                })()}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => {
                    if (isBanned) {
                      haptics.error();
                      if (banTooltip) toast.error(banTooltip);
                      return;
                    }
                    if (!guest.bicycleDescription?.trim()) {
                      haptics.warning();
                      toast.error(
                        "Please add a bicycle description to this guest's profile before logging repairs.",
                      );
                      return;
                    }
                    haptics.buttonPress();
                    setBicyclePickerGuest(guest);
                  }}
                  className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                    isBanned
                      ? "bg-red-100 text-red-500 cursor-not-allowed"
                      : !guest.bicycleDescription?.trim()
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : "bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-800 hover:shadow-sm active:scale-95"
                  }`}
                  title={
                    isBanned
                      ? banTooltip
                      : !guest.bicycleDescription?.trim()
                      ? "Add bicycle description to guest profile first"
                      : "Log bicycle repair for today"
                  }
                  disabled={isBanned || !guest.bicycleDescription?.trim()}
                >
                  <Bike size={16} />
                  <span className="hidden sm:inline">Bicycle</span>
                </button>

                {(() => {
                  const today = todayPacificDateString();
                  const bicycleAction = actionHistory.find(
                    (action) =>
                      action.type === "BICYCLE_LOGGED" &&
                      action.data?.guestId === guest.id &&
                      pacificDateStringFrom(new Date(action.timestamp)) ===
                        today,
                  );

                  if (!bicycleAction) return null;

                  return (
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
                  );
                })()}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {(() => {
                  const hasShowerToday = guestsWithShowerToday.has(String(guest.id));
                  const isDisabled = isBanned || hasShowerToday;
                  const tooltipText = isBanned 
                    ? banTooltip 
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
                      className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                        isBanned
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
                  const isDisabled = isBanned || hasLaundryToday;
                  const tooltipText = isBanned 
                    ? banTooltip 
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
                      className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                        isBanned
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
        )}
      </Animated.div>
    );
  };

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
              placeholder="Search by name or initials (e.g., 'John Smith' or 'JS')..."
              aria-label="Search guests by name"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedGuestIndex(-1);
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  shouldShowCreateOption &&
                  !showCreateForm
                ) {
                  e.preventDefault();
                  handleShowCreateForm();
                } else if (e.key === "ArrowDown" && filteredGuests.length > 0) {
                  e.preventDefault();
                  setSelectedGuestIndex((prev) =>
                    prev < filteredGuests.length - 1 ? prev + 1 : 0,
                  );
                } else if (e.key === "ArrowUp" && filteredGuests.length > 0) {
                  e.preventDefault();
                  setSelectedGuestIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredGuests.length - 1,
                  );
                } else if (
                  e.key === "Enter" &&
                  selectedGuestIndex >= 0 &&
                  filteredGuests[selectedGuestIndex]
                ) {
                  e.preventDefault();
                  toggleExpanded(filteredGuests[selectedGuestIndex].id);
                } else if (e.key === "Escape") {
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
        
        {/* Keyboard shortcuts hint - more compact */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2">
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">Ctrl+K</kbd>
          <span>Focus</span>
          <span className="text-gray-300">•</span>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">↑↓</kbd>
          <span>Navigate</span>
          <span className="text-gray-300">•</span>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-gray-600 font-mono">Enter</kbd>
          <span>Select/Create</span>
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
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-full">
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
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 touch-manipulation ${
                        sortConfig.key === "firstName"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300"
                      }`}
                      title="Sort by first name"
                    >
                      First Name {sortConfig.key === "firstName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                    </button>
                    <button
                      onClick={() => handleSort("lastName")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 touch-manipulation ${
                        sortConfig.key === "lastName"
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
                    itemSize={VIRTUAL_ITEM_SIZE}
                    overscanCount={6}
                    width="100%"
                    ref={listRef}
                  >
                    {({ index, style }) =>
                      renderGuestCard(sortedGuests[index], index, {
                        style,
                      })
                    }
                  </List>
                </div>
              ) : (
                sortedGuests.map((guest, i) => {
                  const lastService = latestServiceByGuest.get(
                    String(guest.id),
                  );
                  const ServiceIcon = lastService?.icon;
                  const formattedDate = lastService
                    ? dateTimeFormatter.format(lastService.date)
                    : "";
                  const fullDateTooltip = lastService
                    ? lastService.date.toLocaleString()
                    : "";
                  const relativeLabel = lastService
                    ? formatRelativeTime(lastService.date)
                    : "";
                  const todayServices =
                    todayServicesByGuest.get(guest.id) || [];
                  const isBanned = Boolean(guest.isBanned);
                  const bannedUntilDate =
                    isBanned &&
                    guest.bannedUntil &&
                    !Number.isNaN(new Date(guest.bannedUntil).getTime())
                      ? new Date(guest.bannedUntil)
                      : null;
                  const banSummaryLabel = bannedUntilDate
                    ? dateTimeFormatter.format(bannedUntilDate)
                    : null;
                  const banTooltip = isBanned
                    ? `${guest.preferredName || guest.name || "Guest"} is banned${banSummaryLabel ? ` until ${banSummaryLabel}` : "."}${
                        guest.banReason ? ` Reason: ${guest.banReason}` : ""
                      }`
                    : "";
                  const isBanEditorOpen = banEditor.guestId === guest.id;
                  const banFormMinValue = isBanEditorOpen
                    ? formatDateTimeLocal(new Date(Date.now() + 5 * 60 * 1000))
                    : null;

                  return (
                    <Animated.div
                      ref={(el) => {
                        if (el) guestCardRefs.current[guest.id] = el;
                      }}
                      style={trail[i]}
                      key={`guest-${guest.id}-${searchTerm}`}
                      className={`group relative border rounded-xl hover:shadow-lg transition-all duration-300 bg-white overflow-hidden ${
                        selectedGuestIndex === i
                          ? "ring-3 ring-blue-500 border-blue-400 shadow-xl scale-[1.02] bg-blue-50/50"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {/* Keyboard navigation indicator - left accent bar */}
                      {selectedGuestIndex === i && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-l-lg" />
                      )}

                      {/* Subtle gradient overlay on hover */}
                      <div className="absolute inset-0 bg-transparent group-hover:bg-transparent transition-all duration-300 pointer-events-none" />
                      
                      <div
                        className="relative p-4 cursor-pointer flex justify-between items-center"
                        onClick={() => toggleExpanded(guest.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="absolute inset-0 bg-blue-400/20 rounded-xl blur group-hover:bg-blue-400/30 transition-colors" />
                            <div className="relative bg-gradient-to-br from-blue-100 to-blue-50 p-2.5 rounded-xl border border-blue-100">
                              <User size={22} className="text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold text-gray-900 flex-1">
                                {guest.preferredName ? (
                                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <span className="text-lg font-bold text-gray-900 group-hover:text-blue-900 transition-colors">
                                      {guest.preferredName}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      ({guest.name})
                                    </span>
                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wide">
                                      Preferred
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-lg font-bold text-gray-900 group-hover:text-blue-900 transition-colors">{guest.name}</span>
                                )}
                              </h3>
                              <div className="flex gap-1 ml-2 items-center">
                                {(() => {
                                  const isNewGuest =
                                    guest.createdAt &&
                                    pacificDateStringFrom(
                                      new Date(guest.createdAt),
                                    ) === todayPacificDateString();

                                  return isNewGuest ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm animate-pulse uppercase tracking-wider">
                                      ✨ New
                                    </span>
                                  ) : null;
                                })()}
                                {todayServices.length > 0 && (
                                  <>
                                    <div className="flex items-center gap-1">
                                      {todayServices.map((service, idx) => {
                                        const Icon = service.icon;
                                        const timeLabel =
                                          service.serviceType === "Shower"
                                            ? formatShowerSlotLabel(service.record?.time)
                                            : service.serviceType === "Laundry"
                                              ? formatLaundryRangeLabel(service.record?.time)
                                              : null;

                                        return (
                                          <div
                                            key={idx}
                                            className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 transition-all duration-200 hover:scale-110 hover:shadow-md hover:-translate-y-0.5"
                                            title={timeLabel ? `${service.serviceType}: ${timeLabel}` : `${service.serviceType} today`}
                                          >
                                            <Icon
                                              size={14}
                                              className={service.iconClass}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {/* Compact inline time labels (visible when guest card not expanded) */}
                                    <div className="ml-2 hidden sm:flex items-center text-xs text-gray-500">
                                      {(() => {
                                        const labels = todayServices.slice(0, 2).map((service) => {
                                          if (service.serviceType === "Shower") {
                                            return `Shower: ${formatShowerSlotLabel(service.record?.time) || "No slot"}`;
                                          }
                                          if (service.serviceType === "Laundry") {
                                            return `Laundry: ${formatLaundryRangeLabel(service.record?.time)}`;
                                          }
                                          return service.serviceType;
                                        });
                                        return labels.join(" • ");
                                      })()}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            {guest.preferredName && (
                              <p className="text-xs text-gray-400 mt-1 italic">
                                Use their preferred name when greeting
                              </p>
                            )}
                              {/* Show explicit times for booked services so check-in users can tell guests their slot */}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {(() => {
                                  const services = todayServices || [];
                                  const shower = services.find((s) => s.serviceType === "Shower");
                                  const laundry = services.find((s) => s.serviceType === "Laundry");
                                  return (
                                    <>
                                      {shower ? (
                                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                                          <ShowerHead size={14} className="text-emerald-600" />
                                          <span>Shower:</span>
                                          <span className="font-medium text-gray-900">{formatShowerSlotLabel(shower.record?.time) || "No slot"}</span>
                                        </span>
                                      ) : null}
                                      {laundry ? (
                                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">
                                          <WashingMachine size={14} className="text-indigo-700" />
                                          <span>Laundry:</span>
                                          <span className="font-medium text-gray-900">{formatLaundryRangeLabel(laundry.record?.time)}</span>
                                        </span>
                                      ) : null}
                                    </>
                                  );
                                })()}
                              </div>
                            {/* Waiver badges for shower and laundry */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(() => {
                                const servicesThatNeedWaivers = [];
                                
                                // Check if guest has shower records
                                const guestShowerRecords = showerRecords.filter(
                                  (r) => r.guestId === guest.id
                                );
                                const hasShower = guestShowerRecords.length > 0;
                                
                                // Check if guest has laundry records
                                const guestLaundryRecords = laundryRecords.filter(
                                  (r) => r.guestId === guest.id
                                );
                                const hasLaundry = guestLaundryRecords.length > 0;
                                
                                // Shower and laundry share a common waiver - only show one badge if either is used
                                if (hasShower || hasLaundry) {
                                  servicesThatNeedWaivers.push('shower');
                                }
                                
                                return servicesThatNeedWaivers.map((service) => (
                                  <WaiverBadge
                                    key={`waiver-${guest.id}-${service}`}
                                    guestId={guest.id}
                                    serviceType={service}
                                    onDismissed={() => {
                                      toast.success(`${service} waiver acknowledged`);
                                    }}
                                  />
                                ));
                              })()}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                                <Home size={12} className="text-gray-400" />
                                {guest.housingStatus}
                              </span>
                              {guest.location && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                                  <MapPin size={12} className="text-gray-400" />
                                  {guest.location}
                                </span>
                              )}
                            </div>
                            {lastService && ServiceIcon && (
                              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1.5 text-gray-700 font-medium bg-white px-2 py-1 rounded-lg border border-gray-100">
                                  <ServiceIcon
                                    size={14}
                                    className={`${lastService.iconClass || "text-blue-500"}`}
                                  />
                                  <span>{lastService.summary}</span>
                                </span>
                                {formattedDate && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span title={fullDateTooltip}>
                                      {formattedDate}
                                    </span>
                                  </>
                                )}
                                {relativeLabel && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-gray-400">
                                      {relativeLabel}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                            expandedGuest === guest.id 
                              ? "bg-blue-100 rotate-180" 
                              : "bg-gray-100 group-hover:bg-blue-50"
                          }`}>
                            <ChevronDown 
                              size={18} 
                              className={`transition-colors ${
                                expandedGuest === guest.id 
                                  ? "text-blue-600" 
                                  : "text-gray-400 group-hover:text-blue-500"
                              }`} 
                            />
                          </div>
                        </div>
                      </div>
                      {expandedGuest === guest.id && (
                        <div className="border-t border-gray-100 p-4 bg-gradient-to-b from-gray-50 to-white">
                          <div className="flex justify-end gap-2 mb-3">
                            {editingGuestId === guest.id ? (
                              <>
                                <button
                                  onClick={saveEditedGuest}
                                  className="px-4 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors touch-manipulation shadow-sm"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="px-4 py-3 min-h-[44px] border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors touch-manipulation"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditingGuest(guest)}
                                  className="px-4 py-3 min-h-[44px] border border-gray-300 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors touch-manipulation"
                                >
                                  Edit
                                </button>
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
                                      Guest is banned
                                      {banSummaryLabel ? ` until ${banSummaryLabel}` : "."}
                                    </p>
                                    {guest.banReason && (
                                      <p className="mt-1 text-sm text-red-700">
                                        Reason: {guest.banReason}
                                      </p>
                                    )}
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
                                <CalendarClock
                                  size={16}
                                  className="text-gray-500"
                                />
                                <span>{guest.birthdate}</span>
                              </div>
                            )}
                          </div>
                          {guest.preferredName &&
                            editingGuestId !== guest.id && (
                              <div className="flex flex-wrap items-center gap-2 text-sm text-blue-700 mb-4">
                                <User size={16} className="text-blue-500" />
                                <span className="font-medium">Preferred:</span>
                                <span className="text-blue-900 font-semibold">
                                  {guest.preferredName}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-600">
                                  Legal: {guest.name}
                                </span>
                              </div>
                            )}
                          {guest.bicycleDescription &&
                            editingGuestId !== guest.id && (
                              <div className="mb-4 flex items-start gap-2 text-sm text-sky-700">
                                <Bike
                                  size={16}
                                  className="text-sky-500 mt-0.5"
                                />
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
                          {editingGuestId === guest.id && (
                            <div className="mb-4 bg-white p-4 rounded border space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                    First Name*
                                  </label>
                                  <input
                                    type="text"
                                    name="firstName"
                                    value={editFormData.firstName}
                                    onChange={handleEditChange}
                                    onBlur={handleEditNameBlur}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                    Last Name*
                                  </label>
                                  <input
                                    type="text"
                                    name="lastName"
                                    value={editFormData.lastName}
                                    onChange={handleEditChange}
                                    onBlur={handleEditNameBlur}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                    Preferred Name
                                  </label>
                                  <input
                                    type="text"
                                    name="preferredName"
                                    value={editFormData.preferredName}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                    Housing Status
                                  </label>
                                  <select
                                    name="housingStatus"
                                    value={editFormData.housingStatus}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                    Age Group*
                                  </label>
                                  <select
                                    name="age"
                                    value={editFormData.age}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                    Gender*
                                  </label>
                                  <select
                                    name="gender"
                                    value={editFormData.gender}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
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
                                    buttonClassName="w-full px-3 py-2 border rounded text-left"
                                    searchable
                                    displayValue={editFormData.location}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                    Notes
                                  </label>
                                  <textarea
                                    name="notes"
                                    value={editFormData.notes}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows="3"
                                    placeholder="Notes (optional)"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                    Bicycle Description
                                  </label>
                                  <textarea
                                    name="bicycleDescription"
                                    value={editFormData.bicycleDescription}
                                    onChange={handleEditChange}
                                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    rows="3"
                                    placeholder="Bike make, color, or other identifiers"
                                  />
                                  <p className="mt-1 text-[11px] text-gray-500">
                                    Use this to confirm the guest is using the
                                    same bicycle when scheduling repairs.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          {guest.notes && editingGuestId !== guest.id && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium mb-1">
                                Notes:
                              </h4>
                              <p className="text-sm bg-white p-2 rounded border">
                                {guest.notes}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <div>
                              {(() => {
                                const today = todayPacificDateString();
                                const alreadyHasMeal =
                                  pendingMealGuests.has(guest.id) ||
                                  mealRecords.some(
                                    (record) =>
                                      record.guestId === guest.id &&
                                      pacificDateStringFrom(record.date) ===
                                        today,
                                  );
                                const isPendingMeal = pendingMealGuests.has(
                                  guest.id,
                                );

                                return (
                                  <div className="flex flex-wrap gap-2">
                                    <div className="space-x-1 relative">
                                      {[1, 2].map((count) => {
                                        const isDisabled =
                                          isBanned ||
                                          alreadyHasMeal ||
                                          isPendingMeal;

                                        return (
                                          <button
                                            key={count}
                                            onClick={() =>
                                              handleMealSelection(
                                                guest.id,
                                                count,
                                              )
                                            }
                                            disabled={isDisabled}
                                            className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                                              isBanned
                                                ? "bg-red-100 text-red-500 cursor-not-allowed"
                                                : alreadyHasMeal
                                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-50"
                                                    : isPendingMeal
                                                        ? "bg-green-200 text-green-700 cursor-wait animate-pulse"
                                                        : "bg-green-100 hover:bg-green-200 text-green-800 active:bg-green-300 hover:shadow-sm active:scale-95"
                                            }`}
                                            title={
                                              isBanned
                                                ? banTooltip
                                                : alreadyHasMeal
                                                    ? "Guest already received meals today"
                                                    : `Give ${count} meal${count > 1 ? "s" : ""}`
                                            }
                                          >
                                            <SpringIcon>
                                              <Utensils size={16} />
                                            </SpringIcon>
                                            {count} Meal{count > 1 ? "s" : ""}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {alreadyHasMeal && !isBanned && (
                                      <>
                                        <div className="space-x-1 relative">
                                          {[1, 2].map((count) => (
                                            <button
                                              key={`extra-${count}`}
                                              onClick={() =>
                                                handleAddExtraMeals(
                                                  guest.id,
                                                  count,
                                                )
                                              }
                                              disabled={isBanned}
                                              className="px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-green-100 hover:bg-green-200 active:bg-green-300 text-green-800 hover:shadow-sm active:scale-95"
                                              title={
                                                isBanned
                                                  ? banTooltip
                                                  : `Add ${count} extra meal${count > 1 ? "s" : ""}`
                                              }
                                            >
                                              <SpringIcon>
                                                <PlusCircle size={16} />
                                              </SpringIcon>
                                              {count} Extra
                                            </button>
                                          ))}
                                        </div>

                                        {(() => {
                                          // Find the most recent meal action for this guest today
                                          const today =
                                            todayPacificDateString();
                                          const guestMealAction =
                                            actionHistory.find(
                                              (action) =>
                                                action.type === "MEAL_ADDED" &&
                                                action.data?.guestId ===
                                                  guest.id &&
                                                pacificDateStringFrom(
                                                  new Date(action.timestamp),
                                                ) === today,
                                            );

                                          if (!guestMealAction) return null;

                                          return (
                                            <button
                                              onClick={async () => {
                                                haptics.undo();
                                                const success =
                                                  await undoAction(
                                                    guestMealAction.id,
                                                  );
                                                if (success) {
                                                  haptics.success();
                                                  toast.success(
                                                    "Check-in undone successfully",
                                                  );
                                                  setPendingMealGuests(
                                                    (prev) => {
                                                      const next = new Set(
                                                        prev,
                                                      );
                                                      next.delete(guest.id);
                                                      return next;
                                                    },
                                                  );
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
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
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
                                  setPendingActions((prev) =>
                                    new Set(prev).add(actionKey),
                                  );
                                  try {
                                    const rec = await addHaircutRecord(
                                      guest.id,
                                    );
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
                                disabled={
                                  isBanned ||
                                  pendingActions.has(`haircut-${guest.id}`)
                                }
                                className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                                  isBanned
                                    ? "bg-red-100 text-red-500 cursor-not-allowed"
                                    : pendingActions.has(`haircut-${guest.id}`)
                                        ? "bg-pink-200 text-pink-600 cursor-wait animate-pulse"
                                        : "bg-pink-100 hover:bg-pink-200 active:bg-pink-300 text-pink-800 hover:shadow-sm active:scale-95"
                                }`}
                                title={
                                  isBanned
                                    ? banTooltip
                                    : "Log haircut for today"
                                }
                              >
                                <Scissors size={16} />
                                <span className="hidden sm:inline">
                                  {pendingActions.has(`haircut-${guest.id}`)
                                    ? "Saving..."
                                    : "Haircut"}
                                </span>
                              </button>

                              {(() => {
                                const today = todayPacificDateString();
                                const haircutAction = actionHistory.find(
                                  (action) =>
                                    action.type === "HAIRCUT_LOGGED" &&
                                    action.data?.guestId === guest.id &&
                                    pacificDateStringFrom(
                                      new Date(action.timestamp),
                                    ) === today,
                                );

                                if (!haircutAction) return null;

                                return (
                                  <button
                                    onClick={async () => {
                                      haptics.undo();
                                      const success = await undoAction(
                                        haircutAction.id,
                                      );
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
                                );
                              })()}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
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
                                className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                                  isBanned
                                    ? "bg-red-100 text-red-500 cursor-not-allowed"
                                    : "bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 hover:shadow-sm active:scale-95"
                                }`}
                                title={
                                  isBanned
                                    ? banTooltip
                                    : "Log holiday service for today"
                                }
                              >
                                <Gift size={16} />
                                <span className="hidden sm:inline">
                                  Holiday
                                </span>
                              </button>

                              {(() => {
                                const today = todayPacificDateString();
                                const holidayAction = actionHistory.find(
                                  (action) =>
                                    action.type === "HOLIDAY_LOGGED" &&
                                    action.data?.guestId === guest.id &&
                                    pacificDateStringFrom(
                                      new Date(action.timestamp),
                                    ) === today,
                                );

                                if (!holidayAction) return null;

                                return (
                                  <button
                                    onClick={async () => {
                                      haptics.undo();
                                      const success = await undoAction(
                                        holidayAction.id,
                                      );
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
                                );
                              })()}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                              <button
                                onClick={() => {
                                  if (isBanned) {
                                    haptics.error();
                                    if (banTooltip) toast.error(banTooltip);
                                    return;
                                  }
                                  if (!guest.bicycleDescription?.trim()) {
                                    haptics.warning();
                                    toast.error(
                                      "Please add a bicycle description to this guest's profile before logging repairs.",
                                    );
                                    return;
                                  }
                                  haptics.buttonPress();
                                  setBicyclePickerGuest(guest);
                                }}
                                className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                                  isBanned
                                    ? "bg-red-100 text-red-500 cursor-not-allowed"
                                    : !guest.bicycleDescription?.trim()
                                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                        : "bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-800 hover:shadow-sm active:scale-95"
                                }`}
                                title={
                                  isBanned
                                    ? banTooltip
                                    : !guest.bicycleDescription?.trim()
                                      ? "Add bicycle description to guest profile first"
                                      : "Log bicycle repair for today"
                                }
                                disabled={
                                  isBanned || !guest.bicycleDescription?.trim()
                                }
                              >
                                <Bike size={16} />
                                <span className="hidden sm:inline">
                                  Bicycle
                                </span>
                              </button>

                              {(() => {
                                const today = todayPacificDateString();
                                const bicycleAction = actionHistory.find(
                                  (action) =>
                                    action.type === "BICYCLE_LOGGED" &&
                                    action.data?.guestId === guest.id &&
                                    pacificDateStringFrom(
                                      new Date(action.timestamp),
                                    ) === today,
                                );

                                if (!bicycleAction) return null;

                                return (
                                  <button
                                    onClick={async () => {
                                      haptics.undo();
                                      const success = await undoAction(
                                        bicycleAction.id,
                                      );
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
                                );
                              })()}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                              {(() => {
                                const hasShowerToday = guestsWithShowerToday.has(String(guest.id));
                                const isDisabled = isBanned || hasShowerToday;
                                const tooltipText = isBanned 
                                  ? banTooltip 
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
                                    className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                                      isBanned
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
                                    pacificDateStringFrom(
                                      new Date(action.timestamp),
                                    ) === today,
                                );

                                if (!showerAction) return null;

                                return (
                                  <button
                                    onClick={async () => {
                                      haptics.undo();
                                      const success = await undoAction(
                                        showerAction.id,
                                      );
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
                                const isDisabled = isBanned || hasLaundryToday;
                                const tooltipText = isBanned 
                                  ? banTooltip 
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
                                    className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                                      isBanned
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
                                    pacificDateStringFrom(
                                      new Date(action.timestamp),
                                    ) === today,
                                );

                                if (!laundryAction) return null;

                                return (
                                  <button
                                    onClick={async () => {
                                      haptics.undo();
                                      const success = await undoAction(
                                        laundryAction.id,
                                      );
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
                      )}
                    </Animated.div>
                  );
                })
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
