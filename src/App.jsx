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
import { Settings } from "lucide-react";
import Login from "./pages/Login";

const SettingsPage = () => {
  const { settings, updateSettings } = useAppContext();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings /> Settings
      </h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">General</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Site name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => updateSettings({ siteName: e.target.value })}
                className="border rounded px-3 py-2 w-full"
                placeholder="Organization / Site name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Interface density</label>
              <select
                value={settings.uiDensity || 'comfortable'}
                onChange={(e) => updateSettings({ uiDensity: e.target.value })}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Max on-site laundry slots per day</label>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.maxOnsiteLaundrySlots}
                onChange={(e) => updateSettings({ maxOnsiteLaundrySlots: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                className="border rounded px-3 py-2 w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="enable-offsite"
                type="checkbox"
                checked={settings.enableOffsiteLaundry}
                onChange={(e) => updateSettings({ enableOffsiteLaundry: e.target.checked })}
              />
              <label htmlFor="enable-offsite" className="text-sm">Enable off-site laundry workflow</label>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                id="show-charts"
                type="checkbox"
                checked={settings.showCharts !== false}
                onChange={(e) => updateSettings({ showCharts: e.target.checked })}
              />
              <label htmlFor="show-charts" className="text-sm">Show animated charts</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default report range (days)</label>
              <input
                type="number"
                min={7}
                max={90}
                value={settings.defaultReportDays || 7}
                onChange={(e) => updateSettings({ defaultReportDays: Math.max(7, Math.min(90, Number(e.target.value) || 7)) })}
                className="border rounded px-3 py-2 w-32"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Donations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                id="donation-autofill"
                type="checkbox"
                checked={settings.donationAutofill !== false}
                onChange={(e) => updateSettings({ donationAutofill: e.target.checked })}
              />
              <label htmlFor="donation-autofill" className="text-sm">Enable donor autofill from recent items</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default donation type</label>
              <select
                value={settings.defaultDonationType || 'Protein'}
                onChange={(e) => updateSettings({ defaultDonationType: e.target.value })}
                className="border rounded px-3 py-2 w-full max-w-xs"
              >
                <option>Protein</option>
                <option>Carbs</option>
                <option>Vegetables</option>
                <option>Fruit</option>
              </select>
            </div>
          </div>
        </section>

        <div className="text-xs text-gray-500">Settings are saved locally in this browser.</div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { activeTab, showerPickerGuest, laundryPickerGuest } = useAppContext();
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }
  
  const renderPage = () => {
  switch (activeTab) {
      case 'check-in':
        return <CheckIn />;
      case 'services':
        return <Services />;
      case 'admin':
        return <Dashboard />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <CheckIn />;
    }
  };
  
  return (
    <MainLayout>
      {renderPage()}
      
      {showerPickerGuest && <ShowerBooking />}
      {laundryPickerGuest && <LaundryBooking />}
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
