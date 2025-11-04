import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { SyncProvider } from "./context/SyncContext";
import { useAuth } from "./context/useAuth";
import { useAppContext } from "./context/useAppContext";
import MainLayout from "./layouts/MainLayout";
import CheckIn from "./pages/guest/CheckIn";
import Services from "./pages/guest/Services";
import Dashboard from "./pages/admin/Dashboard";
import ShowerBooking from "./components/ShowerBooking";
import LaundryBooking from "./components/LaundryBooking";
import BicycleRepairBooking from "./components/BicycleRepairBooking";
import Login from "./pages/Login";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import SyncStatusIndicator from "./components/SyncStatusIndicator";
import { EXECUTE_FUNCTIONS } from "./utils/offlineOperations";
import { useState, useEffect } from "react";

const AppContent = () => {
  const {
    activeTab,
    showerPickerGuest,
    laundryPickerGuest,
    bicyclePickerGuest,
  } = useAppContext();
  const { user, authLoading } = useAuth();
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

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mb-4" />
          <p className="text-emerald-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case "check-in":
        return <CheckIn />;
      case "services":
        return <Services />;
      case "admin":
        return <Dashboard />;
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
          <AppContent />
        </SyncProvider>
      </AppProvider>
    </AuthProvider>
  );
}
