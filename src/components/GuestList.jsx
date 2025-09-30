import React, { useState, useMemo, useRef, useEffect } from "react";
import { todayPacificDateString, pacificDateStringFrom } from "../utils/date";
import { animated as Animated } from "@react-spring/web";
import { useStagger, SpringIcon } from "../utils/animations";
import toast from "react-hot-toast";
import haptics from "../utils/haptics";
import {
  User,
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
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { HOUSING_STATUSES, AGE_GROUPS, GENDERS } from "../context/constants";
import Selectize from "./Selectize";

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

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGuest, setExpandedGuest] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGuestIndex, setSelectedGuestIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
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
    "Antioch",
    "Berkeley",
    "Concord",
    "Daly City",
    "Fremont",
    "Hayward",
    "Livermore",
    "Mountain View",
    "Palo Alto",
    "Oakland",
    "Redwood City",
    "Richmond",
    "San Francisco",
    "San Jose",
    "San Leandro",
    "San Mateo",
    "Santa Clara",
    "Santa Rosa",
    "Sunnyvale",
    "Vallejo",
    "Walnut Creek",
  ];

  const guestsList = useMemo(() => guests || [], [guests]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Detect when initial load is complete
  useEffect(() => {
    if (guests && guests.length >= 0) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [guests]);

  const searchInputRef = useRef(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const filteredGuests = useMemo(() => {
    const queryRaw = searchTerm.trim();
    if (!queryRaw) {
      return [];
    }

    const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, " ");
    const query = normalize(queryRaw);
    const qTokens = query.split(" ").filter(Boolean);

    const scored = guestsList
      .map((g) => {
        const firstName = normalize(g.firstName || "");
        const lastName = normalize(g.lastName || "");
        const fullName =
          normalize(`${g.firstName || ""} ${g.lastName || ""}`.trim()) ||
          normalize(g.name || "");
        const preferredName = normalize(g.preferredName || "");

        let rank = 99;
        let label = g.preferredName || g.name || fullName || "Unknown";

        const updateRank = (candidateRank, candidateLabel) => {
          if (candidateRank < rank) {
            rank = candidateRank;
            if (candidateLabel) {
              label = candidateLabel;
            }
          }
        };

        if (preferredName) {
          if (preferredName === query) {
            updateRank(-1, g.preferredName);
          }
          if (qTokens.length === 1) {
            const token = qTokens[0];
            if (token) {
              if (preferredName === token) updateRank(0, g.preferredName);
              else if (preferredName.startsWith(token))
                updateRank(1, g.preferredName);
              else if (token.length >= 3 && preferredName.includes(token))
                updateRank(2, g.preferredName);
            }
          } else if (qTokens.length >= 2) {
            const joined = qTokens.join(" ");
            if (joined && preferredName.includes(joined)) {
              updateRank(2, g.preferredName);
            }
          }
        }

        if (firstName && lastName && qTokens.length >= 2) {
          const [firstQuery, lastQuery] = qTokens;
          if (firstQuery && lastQuery) {
            if (firstName === firstQuery && lastName === lastQuery) {
              updateRank(0, g.name || fullName);
            } else if (
              firstName.startsWith(firstQuery) &&
              lastName.startsWith(lastQuery)
            ) {
              updateRank(1, g.name || fullName);
            } else if (
              firstQuery.length >= 3 &&
              lastQuery.length >= 3 &&
              firstName.includes(firstQuery) &&
              lastName.includes(lastQuery)
            ) {
              updateRank(2, g.name || fullName);
            }
          }
        } else if (qTokens.length >= 1) {
          const singleQuery = qTokens[0];
          if (singleQuery) {
            if (firstName === singleQuery || lastName === singleQuery) {
              updateRank(0, g.name || fullName);
            } else if (
              firstName.startsWith(singleQuery) ||
              lastName.startsWith(singleQuery)
            ) {
              updateRank(1, g.name || fullName);
            } else if (
              singleQuery.length >= 3 &&
              (firstName.includes(singleQuery) ||
                lastName.includes(singleQuery))
            ) {
              updateRank(2, g.name || fullName);
            }
          }
        }

        if ((!firstName || !lastName) && fullName) {
          if (fullName === query) updateRank(1, g.name || fullName);
          else if (fullName.startsWith(query))
            updateRank(2, g.name || fullName);
          else if (query.length >= 3 && fullName.includes(query))
            updateRank(3, g.name || fullName);
        }

        return { guest: g, rank, name: label };
      })
      .filter((item) => item.rank < 99)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.name.localeCompare(b.name);
      });

    return scored.map((s) => s.guest);
  }, [guestsList, searchTerm]);

  const trail = useStagger((filteredGuests || []).length, true);

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

  const [pendingMealGuests, setPendingMealGuests] = useState(new Set());
  const [pendingActions, setPendingActions] = useState(new Set());

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
    setCreateFormData((prev) => ({ ...prev, [name]: value }));

    // Inline validation
    const error = validateField(name, value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleNameBlur = (e) => {
    const { name, value } = e.target;
    if ((name === "firstName" || name === "lastName") && value.trim()) {
      setCreateFormData((prev) => ({
        ...prev,
        [name]: toTitleCase(value.trim()),
      }));
    }

    // Check for potential duplicates when both names are available
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

  const handleShowCreateForm = () => {
    const searchParts = searchTerm.trim().split(/\s+/);
    const firstName = searchParts[0] || "";
    const lastName = searchParts.slice(1).join(" ") || "";

    setCreateFormData((prev) => ({
      ...prev,
      firstName: firstName,
      lastName: lastName,
      preferredName: firstName,
    }));
    setShowCreateForm(true);
    setCreateError("");
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
    setEditFormData((prev) => ({ ...prev, [name]: value }));
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

  const saveEditedGuest = () => {
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
    updateGuest(editingGuestId, updates);
    toast.success("Guest updated");
    setEditingGuestId(null);
  };

  const cancelEditing = () => setEditingGuestId(null);

  const deleteGuest = (guest) => {
    const confirmed = window.confirm(
      `Delete ${guest.name}? This cannot be undone.`,
    );
    if (!confirmed) return;
    removeGuest(guest.id);
    toast.success("Guest deleted");
    if (expandedGuest === guest.id) setExpandedGuest(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, initials (e.g., 'John', 'Smith', 'JS')... (Ctrl+K)"
            aria-label="Search guests by name"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedGuestIndex(-1); // Reset selection when search changes
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
            className="w-full pl-12 pr-14 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
          {searchTerm && filteredGuests.length > 0 && (
            <div className="absolute left-12 bottom-[-24px] text-xs text-gray-500 font-medium">
              {filteredGuests.length} {filteredGuests.length === 1 ? 'guest' : 'guests'} found
            </div>
          )}
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                searchInputRef.current && searchInputRef.current.focus();
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
              title="Clear"
            >
              <SpringIcon>
                <Eraser size={18} />
              </SpringIcon>
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2">
          <strong>Tips:</strong> Use Ctrl+K to focus search • Enter first name
          and at least the first letter of the last name to create new guest •
          Use ↑↓ arrows to navigate results
        </div>
      </div>

      {shouldShowCreateOption && !showCreateForm && (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <UserPlus size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                No guest found for "{searchTerm}"
              </h3>
              <p className="text-blue-700 mb-4">
                Would you like to create a new guest with this name?
              </p>
              <button
                onClick={handleShowCreateForm}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={18} /> Create New Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div
          className="bg-white border-2 border-blue-200 rounded-xl p-6"
          role="dialog"
          aria-labelledby="create-guest-title"
          aria-describedby="create-guest-description"
        >
          <div className="flex justify-between items-center mb-6">
            <h3
              id="create-guest-title"
              className="text-lg font-semibold flex items-center gap-2"
            >
              <UserPlus size={20} className="text-blue-600" /> Create New Guest
            </h3>
            <button
              onClick={handleCancelCreate}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close create guest form"
            >
              <X size={20} />
            </button>
          </div>
          {createError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              <span className="text-red-800">{createError}</span>
            </div>
          )}
          {duplicateWarning && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-600" />
              <span className="text-amber-800">{duplicateWarning}</span>
            </div>
          )}
          <form onSubmit={handleCreateGuest} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name*
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={createFormData.firstName}
                  onChange={handleCreateFormChange}
                  onBlur={handleNameBlur}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    fieldErrors.firstName
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                  placeholder="Enter first name"
                  required
                  disabled={isCreating}
                />
                {fieldErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name*
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={createFormData.lastName}
                  onChange={handleCreateFormChange}
                  onBlur={handleNameBlur}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    fieldErrors.lastName
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  }`}
                  placeholder="Enter last name"
                  required
                  disabled={isCreating}
                />
                {fieldErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Name
                </label>
                <input
                  type="text"
                  name="preferredName"
                  value={createFormData.preferredName}
                  onChange={handleCreateFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What should we call them?"
                  disabled={isCreating}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Shown with the legal name for staff awareness.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Housing Status
                </label>
                <select
                  name="housingStatus"
                  value={createFormData.housingStatus}
                  onChange={handleCreateFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isCreating}
                >
                  {HOUSING_STATUSES.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Age Group*
                </label>
                <select
                  name="age"
                  value={createFormData.age}
                  onChange={handleCreateFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isCreating}
                  required
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender*
                </label>
                <select
                  name="gender"
                  value={createFormData.gender}
                  onChange={handleCreateFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isCreating}
                  required
                >
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin size={18} className="text-gray-400" />
                </div>
                <Selectize
                  options={[
                    ...BAY_AREA_CITIES.map((c) => ({ value: c, label: c })),
                    {
                      value: "Outside SF Bay Area",
                      label: "Outside SF Bay Area",
                    },
                  ]}
                  value={createFormData.location}
                  onChange={(val) =>
                    setCreateFormData((prev) => ({ ...prev, location: val }))
                  }
                  placeholder="Select location"
                  size="sm"
                  className="w-full"
                  buttonClassName="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-left"
                  searchable
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={createFormData.notes}
                onChange={handleCreateFormChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="3"
                placeholder="Any additional information (optional)"
                disabled={isCreating}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bicycle Description
              </label>
              <textarea
                name="bicycleDescription"
                value={createFormData.bicycleDescription}
                onChange={handleCreateFormChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="2"
                placeholder="Bike make, color, or unique markers (optional)"
                disabled={isCreating}
              />
              <p className="mt-1 text-xs text-gray-500">
                Helps confirm it’s the same bicycle when logging repairs.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={18} /> {isCreating ? "Creating..." : "Create Guest"}
              </button>
              <button
                type="button"
                onClick={handleCancelCreate}
                disabled={isCreating}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!showCreateForm && (
        <>
          {searchTerm.trim().length === 0 ? (
            <div className="space-y-4">
              {isInitialLoad ? (
                <div className="space-y-3">
                  <div className="animate-pulse flex space-x-4 p-4 bg-white rounded-lg border">
                    <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="animate-pulse flex space-x-4 p-4 bg-white rounded-lg border">
                    <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                  <div className="animate-pulse flex space-x-4 p-4 bg-white rounded-lg border">
                    <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/5"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                  For privacy, start typing to search for a guest. No names are
                  shown until you search.
                </div>
              )}
            </div>
          ) : filteredGuests.length === 0 && !shouldShowCreateOption ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Search size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No guests found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search terms or create a new guest
              </p>
            </div>
          ) : (
            <div
              className="space-y-4"
              key={`search-results-${searchTerm}-${filteredGuests.length}`}
            >
              {searchTerm && filteredGuests.length > 0 && (
                <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg flex items-center justify-between">
                  <span>
                    Found {filteredGuests.length} guest
                    {filteredGuests.length !== 1 ? "s" : ""} matching "
                    {searchTerm}"
                  </span>
                  <span className="text-xs text-gray-500">
                    Use ↑↓ arrows to navigate, Enter to expand
                  </span>
                </div>
              )}
              {filteredGuests.map((guest, i) => {
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

                return (
                  <Animated.div
                    style={trail[i]}
                    key={`guest-${guest.id}-${searchTerm}`}
                    className={`border rounded-lg hover:shadow-md transition-all bg-white overflow-hidden ${
                      selectedGuestIndex === i
                        ? "ring-2 ring-blue-500 border-blue-300 shadow-md"
                        : ""
                    }`}
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
                                const isNewGuest = guest.createdAt && 
                                  pacificDateStringFrom(new Date(guest.createdAt)) === todayPacificDateString();
                                
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
                                        <Icon
                                          size={12}
                                          className={service.iconClass}
                                        />
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                          {guest.preferredName && (
                            <p className="text-xs text-gray-500 mt-1">
                              Use their preferred name when greeting; legal name
                              is shown in parentheses.
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
                      <div className="border-t p-4 bg-gray-50">
                        <div className="flex justify-end gap-2 mb-3">
                          {editingGuestId === guest.id ? (
                            <>
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
                        {guest.preferredName && editingGuestId !== guest.id && (
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
                                      value: "Outside SF Bay Area",
                                      label: "Outside SF Bay Area",
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
                                    pacificDateStringFrom(record.date) ===
                                      today,
                                );

                              return (
                                <div className="flex flex-wrap gap-2">
                                  <div className="space-x-1 relative">
                                    {[1, 2, 3].map((count) => (
                                      <button
                                        key={count}
                                        onClick={() =>
                                          handleMealSelection(guest.id, count)
                                        }
                                        disabled={alreadyHasMeal || pendingMealGuests.has(guest.id)}
                                        className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                                          alreadyHasMeal
                                            ? "bg-gray-200 text-gray-500 cursor-not-allowed opacity-50"
                                            : pendingMealGuests.has(guest.id)
                                            ? "bg-green-200 text-green-700 cursor-wait animate-pulse"
                                            : "bg-green-100 hover:bg-green-200 text-green-800 active:bg-green-300 hover:shadow-sm active:scale-95"
                                        }`}
                                        title={
                                          alreadyHasMeal
                                            ? "Guest already received meals today"
                                            : `Give ${count} meal${count > 1 ? "s" : ""}`
                                        }
                                      >
                                        <SpringIcon>
                                          <Utensils size={16} />
                                        </SpringIcon>
                                        {count} Meal{count > 1 ? "s" : ""}
                                      </button>
                                    ))}
                                  </div>

                                  {alreadyHasMeal && (
                                    <>
                                      <div className="space-x-1 relative">
                                        {[1, 2, 3].map((count) => (
                                          <button
                                            key={`extra-${count}`}
                                            onClick={() =>
                                              handleAddExtraMeals(guest.id, count)
                                            }
                                            className="px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-green-100 hover:bg-green-200 active:bg-green-300 text-green-800 hover:shadow-sm active:scale-95"
                                            title={`Add ${count} extra meal${count > 1 ? "s" : ""}`}
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
                                        const today = todayPacificDateString();
                                        const guestMealAction = actionHistory.find(
                                          (action) =>
                                            action.type === "MEAL_ADDED" &&
                                            action.data?.guestId === guest.id &&
                                            pacificDateStringFrom(new Date(action.timestamp)) === today
                                        );
                                        
                                        if (!guestMealAction) return null;
                                        
                                        return (
                                          <button
                                            onClick={async () => {
                                              haptics.undo();
                                              const success = await undoAction(guestMealAction.id);
                                              if (success) {
                                                haptics.success();
                                                toast.success("Check-in undone successfully");
                                                setPendingMealGuests((prev) => {
                                                  const next = new Set(prev);
                                                  next.delete(guest.id);
                                                  return next;
                                                });
                                              } else {
                                                haptics.error();
                                              }
                                            }}
                                            className="px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation bg-orange-100 hover:bg-orange-200 active:bg-orange-300 text-orange-800 hover:shadow-sm active:scale-95 hover:rotate-12"
                                            title="Undo today's check-in"
                                          >
                                            <SpringIcon>
                                              <RotateCcw size={16} />
                                            </SpringIcon>
                                            <span className="hidden sm:inline">Undo Check-In</span>
                                            <span className="sm:hidden">Undo</span>
                                          </button>
                                        );
                                      })()}
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 items-center">
                            <button
                              onClick={async () => {
                                const actionKey = `haircut-${guest.id}`;
                                if (pendingActions.has(actionKey)) return;

                                haptics.buttonPress();
                                setPendingActions((prev) =>
                                  new Set(prev).add(actionKey),
                                );
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
                              disabled={pendingActions.has(`haircut-${guest.id}`)}
                              className={`px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation ${
                                pendingActions.has(`haircut-${guest.id}`)
                                  ? "bg-pink-200 text-pink-600 cursor-wait animate-pulse"
                                  : "bg-pink-100 hover:bg-pink-200 active:bg-pink-300 text-pink-800 hover:shadow-sm active:scale-95"
                              }`}
                              title="Log haircut for today"
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
                                  pacificDateStringFrom(new Date(action.timestamp)) === today
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
                                haptics.buttonPress();
                                const rec = addHolidayRecord(guest.id);
                                if (rec) {
                                  haptics.success();
                                  toast.success("Holiday logged");
                                }
                              }}
                              className="bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-800 px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation hover:shadow-sm active:scale-95"
                              title="Log holiday service for today"
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
                                  pacificDateStringFrom(new Date(action.timestamp)) === today
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
                                !guest.bicycleDescription?.trim()
                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                  : "bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-800 hover:shadow-sm active:scale-95"
                              }`}
                              title={
                                !guest.bicycleDescription?.trim()
                                  ? "Add bicycle description to guest profile first"
                                  : "Log bicycle repair for today"
                              }
                              disabled={!guest.bicycleDescription?.trim()}
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
                                  pacificDateStringFrom(new Date(action.timestamp)) === today
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
                            <button
                              onClick={() => {
                                haptics.buttonPress();
                                setShowerPickerGuest(guest);
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation hover:shadow-sm active:scale-95"
                            >
                              <SpringIcon>
                                <ShowerHead size={16} />
                              </SpringIcon>
                              <span className="hidden sm:inline">Book </span>
                              Shower
                            </button>
                            
                            {(() => {
                              const today = todayPacificDateString();
                              const showerAction = actionHistory.find(
                                (action) =>
                                  action.type === "SHOWER_BOOKED" &&
                                  action.data?.guestId === guest.id &&
                                  pacificDateStringFrom(new Date(action.timestamp)) === today
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
                            <button
                              onClick={() => {
                                haptics.buttonPress();
                                setLaundryPickerGuest(guest);
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 px-4 py-3 min-h-[44px] rounded-md text-sm font-medium inline-flex items-center gap-1 transition-all duration-200 touch-manipulation hover:shadow-sm active:scale-95"
                            >
                              <SpringIcon>
                                <WashingMachine size={16} />
                              </SpringIcon>
                              <span className="hidden sm:inline">Book </span>
                              Laundry
                            </button>
                            
                            {(() => {
                              const today = todayPacificDateString();
                              const laundryAction = actionHistory.find(
                                (action) =>
                                  action.type === "LAUNDRY_BOOKED" &&
                                  action.data?.guestId === guest.id &&
                                  pacificDateStringFrom(new Date(action.timestamp)) === today
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
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GuestList;
