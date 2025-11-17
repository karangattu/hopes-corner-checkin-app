import { useEffect, useMemo, useState } from "react";
import { ShowerHead, WashingMachine, Gift, Plus, X } from "lucide-react";

const BASE_ACTIONS = {
  shower: {
    id: "shower",
    label: "Shower Booking",
    shortLabel: "Shower",
    icon: ShowerHead,
    shortcut: "Shift+S",
    mobileLabel: "Add shower booking",
  },
  laundry: {
    id: "laundry",
    label: "Laundry Load",
    shortLabel: "Laundry",
    icon: WashingMachine,
    shortcut: "Shift+L",
    mobileLabel: "Add laundry booking",
  },
  donation: {
    id: "donation",
    label: "Donation Entry",
    shortLabel: "Donate",
    icon: Gift,
    shortcut: "Shift+D",
    mobileLabel: "Add donation",
  },
};

const ACTION_ORDER_BY_ROLE = {
  admin: ["shower", "laundry", "donation"],
  checkin: ["laundry", "shower", "donation"],
  staff: ["shower", "donation", "laundry"],
  volunteer: ["shower", "laundry", "donation"],
  default: ["shower", "laundry", "donation"],
};

const MODIFIER_KEYS = new Set([
  "shift",
  "alt",
  "option",
  "meta",
  "cmd",
  "command",
  "ctrl",
  "control",
]);

const formatShortcut = (shortcut) =>
  shortcut
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .map((part) => {
      switch (part) {
        case "shift":
          return "⇧";
        case "meta":
        case "cmd":
        case "command":
          return "⌘";
        case "ctrl":
        case "control":
          return "Ctrl";
        case "alt":
        case "option":
          return "⌥";
        default:
          return part.length === 1 ? part.toUpperCase() : part;
      }
    })
    .join(" + ");

const parseShortcut = (shortcut) => {
  const trimmed = shortcut
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const modifiers = {
    shift: trimmed.includes("shift"),
    alt: trimmed.includes("alt") || trimmed.includes("option"),
    meta:
      trimmed.includes("meta") ||
      trimmed.includes("cmd") ||
      trimmed.includes("command"),
    ctrl: trimmed.includes("ctrl") || trimmed.includes("control"),
  };

  const key = trimmed
    .slice()
    .reverse()
    .find((part) => !MODIFIER_KEYS.has(part));

  return { key, modifiers };
};

const matchesShortcut = (event, shortcut) => {
  if (!shortcut) return false;
  const { key, modifiers } = parseShortcut(shortcut);
  if (!key) return false;

  if ((event.key || "").toLowerCase() !== key) return false;

  if (event.shiftKey !== modifiers.shift) return false;
  if (event.altKey !== modifiers.alt) return false;
  if (event.metaKey !== modifiers.meta) return false;
  if (event.ctrlKey !== modifiers.ctrl) return false;

  // Prevent triggering when extra modifiers are present.
  if (!modifiers.meta && event.metaKey) return false;
  if (!modifiers.ctrl && event.ctrlKey) return false;
  if (!modifiers.shift && event.shiftKey) return false;
  if (!modifiers.alt && event.altKey) return false;

  return true;
};

const useDeviceProfile = (override) => {
  const [isTouch, setIsTouch] = useState(() => {
    if (override === "touch") return true;
    if (override === "pointer") return false;
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(pointer: coarse)").matches;
  });

  useEffect(() => {
    if (override === "touch") {
      setIsTouch(true);
      return undefined;
    }
    if (override === "pointer") {
      setIsTouch(false);
      return undefined;
    }
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const handleChange = (event) => setIsTouch(event.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [override]);

  return isTouch;
};

const buildActions = ({
  role,
  onShowerClick,
  onLaundryClick,
  onDonationClick,
  extraActions,
}) => {
  const createAction = (id, handler) => {
    if (!handler) return null;
    const config = BASE_ACTIONS[id];
    if (!config) return null;
    return {
      ...config,
      onPress: handler,
    };
  };

  const base = [
    createAction("shower", onShowerClick),
    createAction("laundry", onLaundryClick),
    createAction("donation", onDonationClick),
  ].filter(Boolean);

  const overrides = Array.isArray(extraActions)
    ? extraActions.filter(Boolean)
    : [];

  const order = ACTION_ORDER_BY_ROLE[role] || ACTION_ORDER_BY_ROLE.default;

  const orderedBase = base.sort((a, b) => {
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);
    return (
      (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
      (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
    );
  });

  return [...orderedBase, ...overrides];
};

const StickyQuickActions = ({
  isVisible = true,
  onShowerClick,
  onLaundryClick,
  onDonationClick,
  onClose,
  className = "",
  role = "staff",
  device,
  shortcutsEnabled = true,
  extraActions,
}) => {
  const isTouch = useDeviceProfile(device);

  const actions = useMemo(
    () =>
      buildActions({
        role,
        onShowerClick,
        onLaundryClick,
        onDonationClick,
        extraActions,
      }),
    [role, onShowerClick, onLaundryClick, onDonationClick, extraActions],
  );

  useEffect(() => {
    if (isTouch || !shortcutsEnabled) return undefined;
    const handler = (event) => {
      const actionable = actions.find(
        (action) => action.shortcut && matchesShortcut(event, action.shortcut),
      );
      if (!actionable) return;
      event.preventDefault();
      actionable.onPress?.();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions, isTouch, shortcutsEnabled]);

  if (!isVisible) return null;

  const handlePress = (action) => {
    if (!action?.onPress) return;
    action.onPress();
  };

  if (isTouch) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg md:hidden ${className}`}
        data-fixed-bottom
        role="toolbar"
        aria-label="Quick actions"
      >
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"
          aria-hidden="true"
        ></div>

        <div className="flex items-center justify-between px-4 py-3 pb-safe">
          <div className="flex flex-1 items-center gap-3">
            <span className="mr-1 text-sm font-semibold text-gray-700">
              Quick Add
            </span>
            {actions.map((action) => {
              const Icon = action.icon ?? Plus;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handlePress(action)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 transition-all touch-manipulation hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={action.mobileLabel || action.label}
                >
                  <Icon size={18} />
                  <span className="hidden xs:inline">{action.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-3 rounded-full p-2 text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 touch-manipulation"
              aria-label="Close quick actions"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="pb-safe" aria-hidden="true"></div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 hidden flex-col items-end gap-2 md:flex ${className}`}
      role="toolbar"
      aria-label="Quick actions"
    >
      {actions.map((action) => {
        const Icon = action.icon ?? Plus;
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => handlePress(action)}
            className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`${action.label}${action.shortcut ? ` (${formatShortcut(action.shortcut)})` : ""}`}
            aria-keyshortcuts={action.shortcut || undefined}
            data-shortcut={action.shortcut || undefined}
            title={
              action.shortcut
                ? `${action.label} (${formatShortcut(action.shortcut)})`
                : action.label
            }
          >
            <Icon size={16} />
            <span>{action.label}</span>
            {action.shortcut && (
              <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-gray-500">
                {formatShortcut(action.shortcut)}
              </kbd>
            )}
          </button>
        );
      })}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
          aria-label="Hide quick actions"
        >
          <X size={14} />
          Hide
        </button>
      )}
    </div>
  );
};

export default StickyQuickActions;
