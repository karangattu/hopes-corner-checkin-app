import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/useAppContext";
import { useAuth } from "../context/useAuth";
import { ClipboardList, BarChart3, UserPlus, HelpCircle } from "lucide-react";
import { SpringIcon } from "../utils/animations";
import SyncStatus from "../components/SyncStatus";
import AppVersion from "../components/AppVersion";
import TutorialModal from "../components/TutorialModal";

const MainLayout = ({ children }) => {
  const { activeTab, setActiveTab, settings } = useAppContext();
  const { user, logout } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);

  const navItemsAll = [
    { id: "check-in", label: "Check In", icon: UserPlus },
    { id: "services", label: "Services", icon: ClipboardList },
    { id: "admin", label: "Admin Dashboard", icon: BarChart3 },
  ];
  const role = user?.role || "checkin";
  const roleLabel = (() => {
    if (role === "board") return "Board - read-only";
    if (role === "admin") return "Admin";
    if (role === "staff") return "Staff";
    if (role === "checkin") return "Check-in";
    return role;
  })();
  const headerRoleDisplay = roleLabel.includes("(") ? roleLabel : `(${roleLabel})`;
  const navItems = navItemsAll.filter((item) => {
    if (role === "admin") return true;
    if (role === "board") return item.id === "admin";
    if (role === "staff") return item.id !== "admin";
    if (role === "checkin") return item.id === "check-in";
    return false;
  });

  // Set initial tab based on user role (board users only see admin dashboard)
  useEffect(() => {
    if (role === "board" && activeTab !== "admin") {
      setActiveTab("admin");
    }
  }, [role, activeTab, setActiveTab]);

  const [isTouch, setIsTouch] = useState(false);
  const [bottomFixedHeight, setBottomFixedHeight] = useState(120);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    setIsTouch(mediaQuery.matches);
    const handle = (e) => setIsTouch(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handle);
      return () => mediaQuery.removeEventListener("change", handle);
    }
    mediaQuery.addListener(handle);
    return () => mediaQuery.removeListener(handle);
  }, []);

  useEffect(() => {
    const updateBottomHeight = () => {
      try {
        const els = Array.from(document.querySelectorAll("[data-fixed-bottom]"));
        const total = els.reduce((sum, el) => sum + (el?.getBoundingClientRect()?.height || 0), 0);
        setBottomFixedHeight(total || 120);
      } catch {
        setBottomFixedHeight(120);
      }
    };

    updateBottomHeight();
    window.addEventListener("resize", updateBottomHeight);
    let observer;
    try {
      observer = new MutationObserver(updateBottomHeight);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    } catch {
      // ignore if MutationObserver isn't available
    }
    return () => {
      window.removeEventListener("resize", updateBottomHeight);
      if (observer) observer.disconnect();
    };
  }, []);

  const mobileContentPadding = isTouch
    ? { paddingBottom: `calc(${bottomFixedHeight}px + env(safe-area-inset-bottom, 0px))` }
    : { paddingBottom: "max(env(safe-area-inset-bottom), 120px)" };

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col">
      <header className="bg-green-950 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-12 md:h-16">
            <div className="flex items-center gap-3">
              <a href="/" className="inline-flex items-center p-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200">
                <img src="/hope-corner-logo-v2.svg" alt="Hope's Corner logo" className="h-8 md:h-10 w-auto" />
              </a>
              <div>
                <h1 className="text-lg md:text-xl font-bold leading-tight">
                  {settings?.siteName || "Hope's Corner"}
                </h1>
                <p className="text-emerald-100 text-[10px] md:text-xs hidden sm:block">
                  Guest Check-In System
                </p>
              </div>
            </div>

            <div className="md:hidden" />

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setShowTutorial(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-emerald-100 hover:text-white hover:bg-emerald-700 text-sm transition-colors"
                aria-label="Open help tutorial"
              >
                <HelpCircle size={16} />
                <span>Need help?</span>
              </button>
              <span className="text-emerald-100 text-sm">
                {user?.name} {headerRoleDisplay}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-sm"
              >
                Logout
              </button>
            </div>

            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  type="button"
                  aria-current={activeTab === item.id ? "page" : undefined}
                  className={`relative flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 ${
                    activeTab === item.id
                      ? "border-white/70 bg-white text-emerald-900 shadow-sm"
                      : "border-transparent text-emerald-100 hover:border-white/40 hover:bg-emerald-800/60 hover:text-white"
                  }`}
                >
                  <SpringIcon>
                    <item.icon size={18} aria-hidden="true" />
                  </SpringIcon>
                  <span className="hidden lg:block">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main
        className="container mx-auto flex-1 px-4 pt-4 pb-[7.5rem] md:pb-8 md:px-6 min-h-[calc(100vh-4rem)]"
        style={mobileContentPadding}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <SyncStatus />
          {children}
          
          {/* Data sync notice */}
          <p className="text-xs text-gray-400 text-center mt-4">
            Data syncs automatically with Supabase. If multiple users are using the app,
            reload the page to see the latest changes from other sessions.
          </p>
        </div>
      </main>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
        data-fixed-bottom
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 18px)" }}
      >
        {/** Dynamic columns based on nav item count */}
        <div
          className={`grid gap-1 px-2 pt-3 ${navItems.length === 1 ? "grid-cols-1" : navItems.length === 2 ? "grid-cols-2" : navItems.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                type="button"
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center rounded-lg border py-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                  active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow"
                    : "border-transparent text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/70"
                }`}
              >
                <SpringIcon
                  className={`mb-1 rounded-lg p-2 ${active ? "bg-emerald-100" : "bg-gray-100"}`}
                >
                  <Icon size={18} aria-hidden="true" />
                </SpringIcon>
                <span className="text-[11px] leading-none">
                  {item.label.replace(" Dashboard", "")}
                </span>
              </button>
            );
          })}
        </div>
        <div className="px-2 pb-3 space-y-2">
          <div className="flex justify-center items-center gap-3">
            <AppVersion />
            <button
              onClick={() => setShowTutorial(true)}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
              aria-label="Open help tutorial"
            >
              <HelpCircle size={14} />
              <span>Need help?</span>
            </button>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            Logout
          </button>
        </div>
      </nav>

      <footer className="hidden md:block bg-white border-t border-emerald-200 py-6">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-emerald-700 text-sm">
            Hope's Corner Guest Check-In System
          </p>
          <p className="text-emerald-400 text-xs">
            &copy; {new Date().getFullYear()} - Building community one meal and
            shower at a time
          </p>
          <AppVersion />
        </div>
      </footer>

      <TutorialModal 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)} 
      />
    </div>
  );
};

export default MainLayout;
