import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { SyncProvider } from "./context/SyncContext";
import { RealtimeProvider } from "./context/RealtimeProvider";
import { useAuth } from "./context/useAuth";
import { useAppContext } from "./context/useAppContext";
import MainLayout from "./layouts/MainLayout";
import CheckIn from "./pages/guest/CheckIn";
import ShowerBooking from "./components/ShowerBooking";
import LaundryBooking from "./components/LaundryBooking";
import BicycleRepairBooking from "./components/BicycleRepairBooking";
import Login from "./pages/Login";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import SyncStatusIndicator from "./components/SyncStatusIndicator";
import { InitializationLoader } from "./components/InitializationLoader";
import { EXECUTE_FUNCTIONS } from "./utils/offlineOperations";
import { useState, useEffect, lazy, Suspense } from "react";
import { useStoreInitialization } from "./hooks/useStoreInitialization";
import "./utils/performanceDiagnostics"; // Load performance diagnostics in dev mode

// Lazy load heavy pages for faster initial load
const Services = lazy(() => import("./pages/guest/Services"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));

// Fallback loading component
const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4" />
      <p className="text-emerald-700 font-medium">Loading page...</p>
    </div>
  </div>
);

const AppContent = () => {
  const {
    activeTab,
    showerPickerGuest,
    laundryPickerGuest,
    bicyclePickerGuest,
  } = useAppContext();
  const { user, authLoading } = useAuth();
  const { isInitialized: storesInitialized } = useStoreInitialization();
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          return;
        }
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
      if (e.key === "Escape" && showKeyboardHelp) {
        setShowKeyboardHelp(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showKeyboardHelp]);

  // Show loading state while checking authentication and initializing stores
  if (authLoading || !storesInitialized) {
    return <InitializationLoader />;
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case "check-in":
        return <CheckIn />;
      case "services":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Services />
          </Suspense>
        );
      case "admin":
        return (
          <Suspense fallback={<PageLoadingFallback />}>
            <Dashboard />
          </Suspense>
        );
      default:
        return <CheckIn />;
    }
  };

  return (
    <MainLayout>
      {renderPage()}

      {showerPickerGuest && <ShowerBooking />}
      {laundryPickerGuest && <LaundryBooking />}
      {bicyclePickerGuest && <BicycleRepairBooking />}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
      <PWAInstallPrompt />
      <SyncStatusIndicator />
    </MainLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <SyncProvider executeFunctions={EXECUTE_FUNCTIONS}>
          <RealtimeProvider>
            <AppContent />
          </RealtimeProvider>
        </SyncProvider>
      </AppProvider>
    </AuthProvider>
  );
}
