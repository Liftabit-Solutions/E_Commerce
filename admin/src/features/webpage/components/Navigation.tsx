import React, { useState } from 'react';
import { useApp } from '../../../core/context/AppContext';
import { 
  ShieldCheck, 
  LogOut, 
  Loader2, 
  Menu,
  ChevronDown, 
  SlidersHorizontal
} from 'lucide-react';

interface NavigationProps {
  onMenuClick?: () => void;
  activeTab?: string;
}

const TAB_TITLES: Record<string, { title: string; category: string }> = {
  dashboard: { title: 'Dashboard', category: 'Sales Overview' },
  orders: { title: 'Orders', category: 'Store' },
  products: { title: 'Products', category: 'Store' },
  categories: { title: 'Categories', category: 'Store' },
  customers: { title: 'Customers', category: 'Store' },
  leads: { title: 'Inquiries', category: 'Management' },
  reviews: { title: 'Reviews', category: 'Management' },
  banners: { title: 'Banners', category: 'Management' },
  add: { title: 'Add Product', category: 'Store' },
  'store-profile': { title: 'Store Profile & Location', category: 'Settings' },
};

const Navigation: React.FC<NavigationProps> = ({ onMenuClick, activeTab = 'dashboard' }) => {
  const {
    curUser,
    isAuthLoading,
    openAuthModal,
    logoutUser,
    orders
  } = useApp();

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
      setIsUserDropdownOpen(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const pendingOrdersCount = (orders || []).filter(o => o.status === 'Pending').length;

  const triggerCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  const currentTabInfo = TAB_TITLES[activeTab] || { title: 'Dashboard', category: 'Store' };

  return (
    <header className="sticky top-0 z-[100] w-full bg-white text-slate-900 border-b border-slate-200 select-none no-print shrink-0">
      <div className="w-full flex items-center justify-between px-4 sm:px-6 h-16 gap-4">
        
        {/* Left: Mobile Menu Toggle & Page Title */}
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Page Title Alone (No Breadcrumbs) */}
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            {currentTabInfo.title}
          </h1>
        </div>

        {/* Right: Actions + User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Pending Orders Counter Alert Pill */}
          {pendingOrdersCount > 0 && (
            <div 
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
              title={`${pendingOrdersCount} orders waiting for processing`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="hidden sm:inline font-bold font-mono">{pendingOrdersCount}</span>
              <span>Pending</span>
            </div>
          )}

          {/* User Profile Dropdown */}
          {isAuthLoading ? (
            <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
            </div>
          ) : curUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer select-none border border-transparent hover:border-slate-200 min-h-[38px]"
              >
                <div className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden shadow-xs">
                  {curUser.avatar ? (
                    <img src={curUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    getUserInitials(curUser.name || 'Admin')
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none pr-1">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                    {curUser.name?.split(' ')[0] || 'Admin'}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">
                    {curUser.isAdmin ? 'Admin' : 'Store'}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {isUserDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 text-slate-700 animate-scaleIn">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 rounded-t-lg">
                      <p className="text-xs font-bold text-slate-900 truncate">{curUser.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{curUser.email}</p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <ShieldCheck size={11} className="text-indigo-600" />
                        {curUser.isAdmin ? 'Admin' : 'Staff'}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 flex items-center gap-2.5 cursor-pointer transition-colors"
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          triggerCommandPalette();
                        }}
                      >
                        <SlidersHorizontal size={14} className="text-slate-400" />
                        <span>Command Palette (⌘K)</span>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleLogout}
                    >
                      {isLoggingOut ? (
                        <Loader2 size={14} className="animate-spin text-rose-600 shrink-0" />
                      ) : (
                        <LogOut size={14} className="shrink-0" />
                      )}
                      <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary text-xs font-semibold px-4 min-h-[38px] rounded-md"
              onClick={() => openAuthModal('login')}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navigation;