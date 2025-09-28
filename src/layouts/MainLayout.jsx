import React from 'react';
import { useAppContext } from '../context/useAppContext';
import { useAuth } from '../context/useAuth';
import { 
  HomeIcon, 
  ClipboardList, 
  BarChart3,
  UserPlus, 
  Menu,
  X
} from 'lucide-react';
import { SpringIcon } from '../utils/animations';
import SyncStatus from '../components/SyncStatus';

const MainLayout = ({ children }) => {
  const { activeTab, setActiveTab, settings, firestoreEnabled, firestoreConnection } = useAppContext();
  const { user, logout } = useAuth();

  const navItemsAll = [
    { id: 'check-in', label: 'Check In', icon: UserPlus },
    { id: 'services', label: 'Services', icon: ClipboardList },
    { id: 'admin', label: 'Admin Dashboard', icon: BarChart3 },
  ];
  const role = user?.role || 'checkin';
  const navItems = navItemsAll.filter(item => {
    if (role === 'admin') return true;
  if (role === 'staff') return item.id !== 'admin';
    if (role === 'checkin') return item.id === 'check-in';
    return false;
  });

  return (
  <div className="min-h-screen bg-emerald-50 flex flex-col">
  <header className="bg-green-950 text-white shadow-lg">
        <div className="container mx-auto px-4">
      <div className="flex justify-between items-center h-12 md:h-16">
            <div className="flex items-center gap-3">
              <SpringIcon className="bg-emerald-700 p-2 rounded-lg">
                <HomeIcon size={24} />
              </SpringIcon>
              <div>
  <h1 className="text-lg md:text-xl font-bold leading-tight">{settings?.siteName || "Hope's Corner"}</h1>
        <p className="text-emerald-100 text-[10px] md:text-xs hidden sm:block">Guest Check-In System</p>
              </div>
            </div>
            
      <div className="md:hidden" />

            <div className="hidden md:flex items-center gap-3">
              <SyncStatus 
                isFirestoreEnabled={firestoreEnabled}
                hasFirestoreConnection={firestoreConnection}
              />
              <span className="text-emerald-100 text-sm">{user?.name} ({role})</span>
              <button onClick={logout} className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-sm">Logout</button>
            </div>
            
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-emerald-700 text-white'
                      : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'
                  }`}
                >
                  <SpringIcon>
                    <item.icon size={18} />
                  </SpringIcon>
                  <span className="hidden lg:block">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
        </div>
      </header>

  <main className="container mx-auto flex-1 px-4 pt-4 pb-[7.5rem] md:pb-8 md:px-6 min-h-[calc(100vh-4rem)]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 120px)' }}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 18px)' }}>
    {/** Dynamic columns based on nav item count */}
  <div className={`grid gap-1 px-2 pt-3 ${navItems.length === 1 ? 'grid-cols-1' : navItems.length === 2 ? 'grid-cols-2' : navItems.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-medium ${
      active ? 'text-emerald-600' : 'text-gray-700'
                }`}
              >
  <SpringIcon className={`p-2 rounded-lg mb-1 ${active ? 'bg-emerald-50' : 'bg-gray-100'}`}>
      <Icon size={18} />
                </SpringIcon>
                <span className="text-[11px] leading-none">{item.label.replace(' Dashboard','')}</span>
              </button>
            );
          })}
        </div>
  <div className="px-2 pb-3">
      <button onClick={logout} className="w-full text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs py-2 rounded-lg">Logout</button>
        </div>
      </nav>

    <footer className="hidden md:block bg-white border-t border-emerald-200 py-6">
        <div className="container mx-auto px-4 text-center">
      <p className="text-emerald-700 text-sm">
            Hope's Corner Guest Check-In System
          </p>
      <p className="text-emerald-400 text-xs mt-1">
            &copy; {new Date().getFullYear()} - Building community one meal and shower at a time
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
