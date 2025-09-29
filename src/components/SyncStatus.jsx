import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CloudOff, WifiOff, RefreshCw } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { useOnlineStatus } from "../context/FirestoreSync";

const DISMISS_KEY = "sync-banner-dismissals-v1";

const SyncStatus = () => {
  const { supabaseEnabled } = useAppContext();
  const isOnline = useOnlineStatus();

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("Unable to read sync banner state", error);
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
    } catch (error) {
      console.warn("Unable to persist sync banner state", error);
    }
  }, [dismissed]);

  useEffect(() => {
    if (supabaseEnabled) {
      setDismissed((prev) => {
        if (!prev?.supabaseDisabled) return prev;
        const next = { ...prev };
        delete next.supabaseDisabled;
        return next;
      });
    }
  }, [supabaseEnabled]);

  useEffect(() => {
    if (isOnline) {
      setDismissed((prev) => {
        if (!prev?.offline) return prev;
        const next = { ...prev };
        delete next.offline;
        return next;
      });
    }
  }, [isOnline]);

  const alerts = useMemo(() => {
    const items = [];

    if (!supabaseEnabled) {
      items.push({
        key: "supabaseDisabled",
        tone: "warning",
        title: "Cloud sync is paused",
        message:
          "Supabase sync is currently disabled. Data is stored locally on this device until the secure proxy is configured.",
        icon: CloudOff,
        cta: {
          label: "View hardening guide",
          href: "https://github.com/karangattu/hopes-corner-checkin-app/blob/main/README.md#secure-supabase-access",
        },
      });
    }

    if (!isOnline) {
      items.push({
        key: "offline",
        tone: "danger",
        title: "Working offline",
        message:
          "You're offline. Keep checking guests in—changes will be queued until the connection returns.",
        icon: WifiOff,
      });
    }

    return items;
  }, [isOnline, supabaseEnabled]);

  const activeAlert = alerts.find((alert) => !dismissed?.[alert.key]);

  if (!activeAlert) return null;

  const { key, icon: Icon, tone, title, message, cta } = activeAlert;

  const toneClasses =
    tone === "danger"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <div
      className={`border ${toneClasses} rounded-xl px-4 py-3 sm:px-6 sm:py-4 shadow-sm flex flex-col gap-3`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div
            className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${tone === "danger" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}
          >
            <Icon size={18} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold sm:text-base">
              {title}
              {!isOnline && tone !== "danger" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                  <WifiOff size={12} /> Offline
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-current/90">{message}</p>
            {cta ? (
              <a
                className="inline-flex items-center gap-1 text-sm font-medium underline hover:text-current"
                href={cta.href}
                target="_blank"
                rel="noreferrer"
              >
                <AlertTriangle size={14} /> {cta.label}
              </a>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setDismissed((prev) => ({
              ...prev,
              [key]: true,
            }))
          }
          className="ml-auto inline-flex items-center gap-2 rounded-md border border-current/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-current transition hover:bg-white/40"
        >
          <RefreshCw size={12} /> Dismiss
        </button>
      </div>
    </div>
  );
};

export default SyncStatus;
