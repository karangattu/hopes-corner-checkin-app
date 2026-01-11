import React, { memo } from "react";
import {
    User,
    Check,
    Utensils,
    ShowerHead,
    WashingMachine,
    UserCheck,
    ChevronUp,
    ChevronDown,
    Plus,
    AlertTriangle,
    Link,
    AlertCircle,
    Home,
    MapPin,
    Loader2,
} from "lucide-react";
import { animated as Animated } from "@react-spring/web";
import { WaiverBadge } from "./ui/WaiverBadge";
import haptics from "../utils/haptics";
import toast from "react-hot-toast";

const GuestListRow = memo(({ index, style, data }) => {
    const {
        guests, // Sorted guests array
        // Maps & Sets
        latestServiceByGuest,
        todayServicesByGuest,
        guestsWithShowerToday,
        guestsWithLaundryToday,
        pendingMealGuests,
        recentlyLoggedMeals,
        // Arrays for lookups
        mealRecords,
        extraMealRecords,
        showerRecords,
        laundryRecords,
        // State
        selectedGuestIndex,
        expandedGuest,
        // Handlers
        toggleExpanded,
        setSelectedGuestIndex,
        storeGuestCardRef, // Slightly different, we'll need to adapt ref handling
        handleMealSelection,
        setShowerPickerGuest,
        setLaundryPickerGuest,
        setSearchTerm,
        setExpandedGuest,
        setMobileServiceSheet,
        // Utils passed down
        dateTimeFormatter,
        formatRelativeTime,
        getLinkedGuests,
        getWarningsForGuest,
        isActiveGuest,
        getLastMealLabel,
        formatShowerSlotLabel,
        formatLaundryRangeLabel,
        formatDateTimeLocal: _unused1,
        todayPacificDateString,
        pacificDateStringFrom,
        searchInputRef, // Ref object
        // Animation
        trail,
        shouldVirtualize,
    } = data;

    const guest = guests[index];
    if (!guest) return null;

    const { compact = false, adaptive = false } = data;

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

    const hasProgramSpecificBans = guest.bannedFromMeals || guest.bannedFromShower || guest.bannedFromLaundry || guest.bannedFromBicycle;
    const isBannedFromMeals = isBanned && (!hasProgramSpecificBans || guest.bannedFromMeals);
    const isBannedFromShower = isBanned && (!hasProgramSpecificBans || guest.bannedFromShower);
    const isBannedFromLaundry = isBanned && (!hasProgramSpecificBans || guest.bannedFromLaundry);

    const ITEM_VERTICAL_GAP = 16;
    const VIRTUAL_ITEM_SIZE = 208 + ITEM_VERTICAL_GAP; // Default approximated
    const DEFAULT_ITEM_HEIGHT = 208;

    let animationStyle = shouldVirtualize ? {} : (trail && trail[index]) || {};

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

    const refCallback = (el) => {
        if (storeGuestCardRef) storeGuestCardRef(el, guest.id);
    };

    const onKeyDown = (event) => {
        if (event.currentTarget !== event.target) return;

        const key = event.key;
        if (key === "Enter") {
            event.preventDefault();
            toggleExpanded(guest.id);
            return;
        }
        if (key === "r" || key === "R") {
            event.preventDefault();
            if (data.resetCardFocus) data.resetCardFocus();
            return;
        }
        if ((key === "ArrowDown" || key === "ArrowUp") && guests.length) {
            event.preventDefault();
            const nextIndex =
                key === "ArrowDown"
                    ? index + 1 < guests.length
                        ? index + 1
                        : 0
                    : index > 0
                        ? index - 1
                        : guests.length - 1;
            setSelectedGuestIndex(nextIndex);
            if (data.focusGuestCard) data.focusGuestCard(guests[nextIndex].id);
            return;
        }
        const mealKey =
            key === "1" || key === "Numpad1"
                ? 1
                : key === "2" || key === "Numpad2"
                    ? 2
                    : null;
        if (mealKey) {
            event.preventDefault();
            handleMealSelection(guest.id, mealKey);
        }
    };

    const containerClass = `border ${compact ? "rounded-lg" : adaptive ? "rounded-lg" : "rounded-xl"} transition-all duration-300 bg-white hover:bg-white overflow-hidden ${isSelected
        ? `ring-4 ring-blue-500/30 border-blue-400 shadow-2xl focus-glow bg-blue-50/50 ${compact || adaptive ? "" : "scale-[1.02]"} z-10`
        : `shadow-sm hover:shadow-xl hover:border-blue-200 ${compact || adaptive ? "" : "hover:-translate-y-0.5"}`
        } ${expandedGuest === guest.id && !isSelected ? "ring-2 ring-emerald-400/20 border-emerald-300 bg-white shadow-lg" : ""} ${isBanned ? "border-red-200 bg-red-50/30" : ""}`;

    return (
        <Animated.div
            ref={refCallback}
            tabIndex={-1} // Make focusable
            style={animationStyle}
            className={containerClass}
            onFocus={() => setSelectedGuestIndex(index)}
            onKeyDown={onKeyDown}
            // data-index added for debugging/testing
            data-index={index}
        >
            {/* Keyboard navigation indicator - left accent bar */}
            {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-l-lg" />
            )}

            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-transparent group-hover:bg-transparent transition-all duration-300 pointer-events-none" />

            <div
                className={`${compact ? "px-3 py-2" : adaptive ? "px-4 py-3" : "p-4"} cursor-pointer flex flex-row items-center justify-between gap-2 sm:gap-3 group`}
                onClick={() => toggleExpanded(guest.id)}
            >
                {/* Avatar Section */}
                <div className={`flex items-center ${compact ? "gap-2" : "gap-3"} flex-1 min-w-0`}>
                    <div className={`bg-blue-50 ${compact ? "p-2 rounded-lg" : "p-3 rounded-xl"} border border-blue-100 shadow-sm group-hover:scale-110 transition-transform`}>
                        <User size={compact ? 18 : 24} className="text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Name and Badges */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold text-gray-900 flex items-baseline gap-2 ${compact ? "text-sm" : ""}`}>
                                    <span className={`${compact ? "text-sm" : "text-lg"} font-bold text-gray-900`}>
                                        {guest.preferredName || guest.name}
                                    </span>
                                    {guest.preferredName && guest.name !== guest.preferredName && (
                                        <span className={`${compact ? "text-[10px]" : "text-xs"} font-medium text-gray-400 truncate hidden sm:inline`}>
                                            {guest.name}
                                        </span>
                                    )}
                                </h3>
                            </div>

                            {/* Status Badges */}
                            <div className="flex gap-1.5 ml-2 items-center shrink-0">
                                {(() => {
                                    const isNewGuest =
                                        guest.createdAt &&
                                        pacificDateStringFrom(new Date(guest.createdAt)) ===
                                        todayPacificDateString();

                                    return isNewGuest ? (
                                        <span className={`${compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2.5 py-1"} font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200 shadow-sm animate-pulse`}>
                                            ✨ NEW
                                        </span>
                                    ) : null;
                                })()}

                                {/* Linked guests badge */}
                                {(() => {
                                    const linkedCount = getLinkedGuests(guest.id).length;
                                    return linkedCount > 0 ? (
                                        <span className={`inline-flex items-center gap-1 ${compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2.5 py-1"} font-bold text-indigo-700 bg-indigo-50 rounded-full border border-indigo-200 shadow-sm`} title={`${linkedCount} linked guest${linkedCount > 1 ? 's' : ''}`}>
                                            <Link size={compact ? 8 : 10} strokeWidth={2.5} />
                                            {linkedCount}
                                        </span>
                                    ) : null;
                                })()}

                                {/* Warning badge */}
                                {(() => {
                                    const warnings = getWarningsForGuest(guest.id) || [];
                                    const count = warnings.length;
                                    if (count === 0) return null;
                                    const latest = warnings[0];
                                    return (
                                        <span className={`inline-flex items-center gap-1 ${compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2.5 py-1"} font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200 shadow-sm`} title={latest.message}>
                                            <AlertTriangle size={compact ? 8 : 10} className="text-amber-700" />
                                            {count}
                                        </span>
                                    );
                                })()}

                                {/* Recent guest badge */}
                                {(() => {
                                    const isRecent = isActiveGuest(guest.id, mealRecords);
                                    if (!isRecent) return null;
                                    const lastMealLabel = getLastMealLabel(guest.id, mealRecords);
                                    return (
                                        <span className={`inline-flex items-center gap-1 ${compact ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2.5 py-1"} font-bold text-green-700 bg-green-50 rounded-full border border-green-200 shadow-sm`} title={`Last meal: ${lastMealLabel}`}>
                                            <Utensils size={compact ? 8 : 10} className="text-green-700" />
                                            <span className="hidden sm:inline">RECENT</span>
                                        </span>
                                    );
                                })()}

                                {todayServices.length > 0 && (
                                    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"} ml-2`}>
                                        {todayServices.map((service, idx) => {
                                            const Icon = service.icon;
                                            const timeLabel =
                                                service.serviceType === "Shower"
                                                    ? formatShowerSlotLabel(service.record?.time)
                                                    : service.serviceType === "Laundry"
                                                        ? formatLaundryRangeLabel(service.record?.time)
                                                        : null;

                                            if (
                                                service.serviceType === "Shower" ||
                                                service.serviceType === "Laundry"
                                            ) {
                                                // Text label for Shower/Laundry
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center gap-1 ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"} rounded-full bg-gray-50 border border-gray-100 font-bold text-gray-600 shadow-sm`}
                                                    >
                                                        <Icon size={compact ? 10 : 12} className={service.iconClass} />
                                                        <span>
                                                            {service.serviceType}: {timeLabel || "Done"}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            // Icon bubble for other services
                                            const timeStr = new Date(
                                                service.record.date,
                                            ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            });
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center justify-center ${compact ? "w-6 h-6" : "w-8 h-8"} rounded-full bg-white border border-gray-100 shadow-sm transition-all hover:scale-125 hover:z-10 hover:shadow-md`}
                                                    title={`${service.serviceType}${timeLabel ? ` (${timeLabel})` : ""} at ${timeStr} today`}
                                                >
                                                    <Icon size={compact ? 12 : 15} className={service.iconClass} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Waiver badges */}
                        {!compact && (
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
                        )}

                        {/* Demographics row */}
                        <div className={`flex items-center flex-wrap gap-2 ${compact ? "mt-1" : "mt-2.5"} ${compact ? "text-[10px]" : "text-xs"} text-gray-600 font-medium`}>
                            <div className={`flex items-center gap-1 ${compact ? "px-1.5 py-0.5" : "px-2.5 py-1"} bg-blue-50/60 rounded-md border border-blue-100/50`}>
                                <Home size={compact ? 10 : 13} className="text-blue-500" />
                                <span className="text-gray-700">{guest.housingStatus}</span>
                            </div>
                            {guest.location && (
                                <div className={`flex items-center gap-1 ${compact ? "px-1.5 py-0.5" : "px-2.5 py-1"} bg-amber-50/60 rounded-md border border-amber-100/50`}>
                                    <MapPin size={compact ? 10 : 13} className="text-amber-600" />
                                    <span className="text-gray-700">{guest.location}</span>
                                </div>
                            )}
                            {guest.gender && (
                                <span className={`${compact ? "px-1.5 py-0.5" : "px-2 py-0.5"} bg-purple-50/60 text-purple-700 rounded-md border border-purple-100/50`}>
                                    {guest.gender.charAt(0)}
                                </span>
                            )}
                            {guest.age && (
                                <span className={`${compact ? "px-1.5 py-0.5" : "px-2 py-0.5"} bg-teal-50/60 text-teal-700 rounded-md border border-teal-100/50`}>
                                    {guest.age}
                                </span>
                            )}
                        </div>

                        {/* Last service info */}
                        {!compact && lastService && ServiceIcon && (
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50/50 text-blue-700 rounded-md border border-blue-100/50 font-semibold uppercase tracking-wider text-[10px]">
                                    <ServiceIcon
                                        size={12}
                                        className={`${lastService.iconClass || "text-blue-500"}`}
                                        strokeWidth={2.5}
                                    />
                                    <span>{lastService.summary}</span>
                                </span>
                                {formattedDate && (
                                    <span className="text-gray-400 flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                        <span title={fullDateTooltip}>{formattedDate}</span>
                                    </span>
                                )}
                                {relativeLabel && (
                                    <span className="text-blue-500 flex items-center gap-1 font-semibold">
                                        <span className="w-1 h-1 rounded-full bg-blue-300" />
                                        <span>{relativeLabel}</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions Section */}
                <div className={`flex items-center flex-shrink-0 ${compact ? "gap-1" : "gap-2"}`}>
                    {/* Mobile Quick Add */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            haptics.buttonPress();
                            setMobileServiceSheet({ isOpen: true, guest });
                        }}
                        className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 active:scale-95 transition-transform"
                        title="Quick Add Services"
                    >
                        <Plus size={22} strokeWidth={2.5} />
                    </button>

                    <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                        {/* Meal Buttons */}
                        {!isBannedFromMeals && (
                            <div className={`flex items-center ${compact ? "gap-0.5 p-0.5" : "gap-1 p-1"} bg-gray-50/50 ${compact ? "rounded-lg" : "rounded-xl"} border border-gray-100 shadow-inner`}>
                                {(() => {
                                    const today = todayPacificDateString();
                                    const todayMealRecord = mealRecords.find(
                                        (record) =>
                                            record.guestId === guest.id &&
                                            pacificDateStringFrom(record.date) === today
                                    );

                                    const guestExtraMeals = extraMealRecords.filter(
                                        (record) =>
                                            record.guestId === guest.id &&
                                            pacificDateStringFrom(record.date) === today
                                    );
                                    const extraMealsCount = guestExtraMeals.reduce((sum, r) => sum + (r.count || 1), 0);

                                    const alreadyHasMeal = !!todayMealRecord;
                                    const baseCount = todayMealRecord?.count || 0;
                                    const totalDisplayedCount = baseCount + extraMealsCount;

                                    if (alreadyHasMeal) {
                                        const tooltip = extraMealsCount > 0
                                            ? `Received ${baseCount} regular meal${baseCount > 1 ? "s" : ""} and ${extraMealsCount} extra meal${extraMealsCount !== 1 ? "s" : ""} today`
                                            : `Already received ${baseCount} meal${baseCount > 1 ? "s" : ""} today`;
                                        const showSuccessAnimation = recentlyLoggedMeals.has(guest.id);

                                        return (
                                            <div
                                                data-testid="meal-status-indicator"
                                                className={`flex items-center justify-center gap-1 ${compact ? "h-7 px-2 text-[10px]" : "h-10 px-3 text-xs"} rounded-lg font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default ${showSuccessAnimation ? "animate-success-pulse opacity-100" : "opacity-60"}`}
                                                title={tooltip}
                                            >
                                                <Check
                                                    size={compact ? 12 : 14}
                                                    className="text-emerald-600"
                                                />
                                                <span>{totalDisplayedCount} Meal{totalDisplayedCount > 1 ? "s" : ""}</span>
                                            </div>
                                        );
                                    }

                                    const isPending = pendingMealGuests.has(guest.id);
                                    return [1, 2].map((count) => (
                                        <button
                                            key={count}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMealSelection(guest.id, count);
                                            }}
                                            disabled={isPending}
                                            aria-busy={isPending}
                                            className={`flex items-center justify-center gap-1 ${compact ? "h-7 px-2 text-[10px]" : "h-10 px-3 text-xs"} rounded-lg font-bold transition-all shadow-sm group/btn bg-white border-gray-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                                            title={isPending ? "Logging meal..." : `Quick log ${count} meal${count > 1 ? "s" : ""}`}
                                        >
                                            {isPending ? (
                                                <Loader2
                                                    size={compact ? 12 : 14}
                                                    className="animate-spin-fast text-emerald-600"
                                                />
                                            ) : (
                                                <Utensils
                                                    size={compact ? 12 : 14}
                                                    className="group-hover/btn:scale-110 transition-transform"
                                                />
                                            )}
                                            <span>{count}</span>
                                        </button>
                                    ));
                                })()}
                            </div>
                        )}

                        {/* Shower/Laundry Quick Actions */}
                        {(!isBannedFromShower || !isBannedFromLaundry) && (
                            <div className={`flex items-center ${compact ? "gap-0.5 p-0.5" : "gap-1 p-1"} bg-gray-50/50 ${compact ? "rounded-lg" : "rounded-xl"} border border-gray-100 shadow-inner`}>
                                {!isBannedFromShower && (() => {
                                    const hasShowerToday = guestsWithShowerToday.has(String(guest.id));
                                    if (hasShowerToday) {
                                        return (
                                            <div
                                                className={`flex items-center justify-center gap-1 ${compact ? "h-7 px-2 text-[10px]" : "h-10 px-3 text-xs"} rounded-lg font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default opacity-60`}
                                                title="Shower already booked today"
                                            >
                                                <Check size={compact ? 12 : 14} />
                                                <span className="hidden lg:inline">Shower</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                haptics.buttonPress();
                                                setShowerPickerGuest(guest);
                                            }}
                                            className={`flex items-center justify-center gap-1 ${compact ? "h-7 px-2 text-[10px]" : "h-10 px-3 text-xs"} rounded-lg font-bold transition-all shadow-sm group/btn bg-white border-gray-200 text-sky-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-95`}
                                            title="Book Shower"
                                        >
                                            <ShowerHead size={compact ? 12 : 14} className="group-hover/btn:scale-110 transition-transform" />
                                            <span className="hidden lg:inline">Shower</span>
                                        </button>
                                    );
                                })()}

                                {!isBannedFromLaundry && (() => {
                                    const hasLaundryToday = guestsWithLaundryToday.has(String(guest.id));
                                    if (hasLaundryToday) {
                                        return (
                                            <div
                                                className={`flex items-center justify-center gap-1 ${compact ? "h-7 px-2 text-[10px]" : "h-10 px-3 text-xs"} rounded-lg font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default opacity-60 ml-1`}
                                                title="Laundry already booked today"
                                            >
                                                <Check size={compact ? 12 : 14} />
                                                <span className="hidden lg:inline">Laundry</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                haptics.buttonPress();
                                                setLaundryPickerGuest(guest);
                                            }}
                                            className={`flex items-center justify-center gap-1 ${compact ? "h-7 px-2 text-[10px]" : "h-10 px-3 text-xs"} rounded-lg font-bold transition-all shadow-sm group/btn ml-1 bg-white border-gray-200 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95`}
                                            title="Book Laundry"
                                        >
                                            <WashingMachine size={compact ? 12 : 14} className="group-hover/btn:scale-110 transition-transform" />
                                            <span className="hidden lg:inline">Laundry</span>
                                        </button>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Complete Check-in Button */}
                        {(() => {
                            const today = todayPacificDateString();
                            const todayMealRecord = mealRecords.find(
                                (record) =>
                                    record.guestId === guest.id &&
                                    pacificDateStringFrom(record.date) === today
                            );
                            const hasMealToday = !!todayMealRecord;
                            const mealCount = todayMealRecord?.count || 0;
                            const guestExtraMeals = extraMealRecords.filter(
                                (record) =>
                                    record.guestId === guest.id &&
                                    pacificDateStringFrom(record.date) === today
                            );
                            const extraMealsCount = guestExtraMeals.reduce((sum, r) => sum + (r.count || 1), 0);
                            const totalMeals = mealCount + extraMealsCount;
                            const hasShowerToday = guestsWithShowerToday.has(String(guest.id));
                            const hasLaundryToday = guestsWithLaundryToday.has(String(guest.id));

                            if (hasMealToday || hasShowerToday || hasLaundryToday) {
                                const servicesParts = [];
                                if (totalMeals > 0) servicesParts.push(`${totalMeals} meal${totalMeals > 1 ? "s" : ""}`);
                                if (hasShowerToday) servicesParts.push("shower");
                                if (hasLaundryToday) servicesParts.push("laundry");
                                const servicesSummary = servicesParts.join(" + ");

                                return (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            haptics.buttonPress();
                                            setSearchTerm("");
                                            setExpandedGuest(null);
                                            if (searchInputRef?.current) {
                                                searchInputRef.current.focus();
                                                if (typeof searchInputRef.current.scrollIntoView === 'function') {
                                                    searchInputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                                                }
                                            }
                                            toast.success(`${servicesSummary} \u2713`);
                                        }}
                                        className={`flex items-center justify-center ${compact ? "h-8 px-3" : "h-10 px-3"} rounded-lg font-bold transition-all shadow-sm bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-800 hover:shadow-sm active:scale-95 ml-2`}
                                        title="Complete check-in and search for next guest"
                                    >
                                        <UserCheck size={compact ? 16 : 20} />
                                    </button>
                                );
                            }
                            return null;
                        })()}

                    </div>

                    <div className={`${compact ? "p-1.5 rounded-lg" : "p-2 rounded-xl"} bg-gray-50 border border-gray-100 text-gray-400 group-hover:text-blue-500 transition-colors`}>
                        {expandedGuest === guest.id ? (
                            <ChevronUp size={compact ? 16 : 20} strokeWidth={2.5} />
                        ) : (
                            <ChevronDown size={compact ? 16 : 20} strokeWidth={2.5} />
                        )}
                    </div>

                </div>
            </div>

            {expandedGuest === guest.id && (
                <div className="border-t border-emerald-200 p-4 bg-white">
                    {data.renderExpandedContent ? data.renderExpandedContent(guest) : (
                        <div className="p-4 text-center text-gray-400 italic">
                            Details view not fully migrated. Click 'Edit Guest' to manage.
                        </div>
                    )}
                </div>
            )}
        </Animated.div>
    );
});

GuestListRow.displayName = "GuestListRow";
export default GuestListRow;
