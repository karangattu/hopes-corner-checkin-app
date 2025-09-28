import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
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

const AppContent = () => {
  const {
    activeTab,
    showerPickerGuest,
    laundryPickerGuest,
    bicyclePickerGuest,
  } = useAppContext();
  const { user } = useAuth();

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
    </MainLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
