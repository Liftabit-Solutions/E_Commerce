import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../core/context/AppContext';
import { 
  Search, 
  LogOut, 
  ShoppingCart, 
  LayoutDashboard, 
  Menu, 
  X, 
  Loader2, 
  User, 
  ChevronDown,
  Package
} from 'lucide-react';
import { getStoreProfile } from '../../../utils/storeSettings';
import type { StoreProfile } from '../../../utils/storeSettings';

const Navigation: React.FC = () => {
  const {
    curUser,
    curPage,
    setCurPage,
    setCurFilter,
    setSearchQuery,
    logoutUser,
    cart,
    hideNavbar
  } = useApp();

  if (hideNavbar) return null;

  const [inputVal, setInputVal] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(getStoreProfile());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setStoreProfile(getStoreProfile());
    };
    window.addEventListener('store_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('store_profile_updated', handleProfileUpdate);
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousPageRef = useRef<string | null>(null);

  const handleSearchClick = () => {
    if (isSearchOpen) {
      handleCloseSearch();
    } else {
      if (curPage !== 'products') {
        previousPageRef.current = curPage;
      }
      setIsSearchOpen(true);
      setCurFilter('All');
      setCurPage('products');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setInputVal('');
    setSearchQuery('');
    if (previousPageRef.current) {
      setCurPage(previousPageRef.current);
      previousPageRef.current = null;
    }
  };

  // Close search and modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSearchOpen) handleCloseSearch();
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        if (isUserDropdownOpen) setIsUserDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isMobileMenuOpen, isUserDropdownOpen]);

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
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserDropdownOpen(false);
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserDropdownOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setCurFilter('All');
    setSearchQuery(inputVal.trim());
    setCurPage('products');
  };

  const handleLogoClick = () => {
    setInputVal('');
    setSearchQuery('');
    setCurFilter('All');
    setCurPage('home');
    setIsSearchOpen(false);
    previousPageRef.current = null;
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavClick = (page: string, anchorId?: string) => {
    if (page === 'products') {
      setCurFilter('All');
    }
    setCurPage(page);
    setIsSearchOpen(false);
    setInputVal('');
    setSearchQuery('');
    previousPageRef.current = null;
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
    if (anchorId) {
      setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  return (
    <header className="sticky top-0 z-[200] w-full bg-[#f7f6f2] border-b border-[#dfdfd8] select-none">
      {/* Main High-Navbar */}
      <nav className="bg-[#f7f6f2]">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-3 sm:px-6 lg:px-8 h-[56px] sm:h-[60px] lg:h-[68px] relative">
          
          {/* Left: Mobile (Hamburger only) | Desktop (Brand Logo) */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2.5 shrink-0 z-10">
            {/* Hamburger Menu Trigger (Responsive only) */}
            <button
              className="lg:hidden p-1.5 sm:p-2 text-[#262824] hover:text-black transition-colors cursor-pointer shrink-0"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            {/* Desktop Brand Logo (Left aligned) */}
            <div
              className="hidden lg:flex cursor-pointer select-none items-center gap-2 sm:gap-2.5 group shrink-0"
              onClick={handleLogoClick}
              title={storeProfile.storeName || 'Store'}
            >
              {storeProfile.logo ? (
                <img
                  src={storeProfile.logo}
                  alt={storeProfile.storeName || 'Store'}
                  className="w-8 h-8 sm:w-8.5 sm:h-8.5 object-contain rounded-[2px]"
                />
              ) : (
                <div
                  className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-[2px] text-white flex items-center justify-center font-bold text-sm tracking-widest shrink-0 shadow-xs"
                  style={{ backgroundColor: storeProfile.brandColor || '#262824' }}
                >
                  {(storeProfile.storeName || 'F').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-heading text-lg sm:text-xl font-bold text-[#262824] tracking-tight">
                {storeProfile.storeName || 'FORMA'}
              </span>
            </div>
          </div>

          {/* Center (Responsive: Brand Logo Centered) */}
          <div
            className="lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none flex items-center gap-1.5 sm:gap-2 group z-10"
            onClick={handleLogoClick}
            title={storeProfile.storeName || 'Store'}
          >
            {storeProfile.logo ? (
              <img
                src={storeProfile.logo}
                alt={storeProfile.storeName || 'Store'}
                className="w-7 h-7 sm:w-7.5 sm:h-7.5 object-contain rounded-[2px]"
              />
            ) : (
              <div
                className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-[2px] text-white flex items-center justify-center font-bold text-xs sm:text-sm tracking-widest shrink-0 shadow-xs"
                style={{ backgroundColor: storeProfile.brandColor || '#262824' }}
              >
                {(storeProfile.storeName || 'F').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-heading text-base sm:text-lg font-bold text-[#262824] tracking-tight">
              {storeProfile.storeName || 'FORMA'}
            </span>
          </div>

          {/* Center (Desktop: Center-aligned Navlinks) */}
          <div className="hidden lg:flex items-center justify-center gap-5 xl:gap-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
            <button 
              type="button"
              onClick={() => handleNavClick('home')}
              className="text-xs uppercase tracking-wider font-medium text-[#777971] hover:text-[#262824] transition-colors cursor-pointer py-1"
            >
              Home
            </button>
            <button 
              type="button"
              onClick={() => handleNavClick('products')}
              className="text-xs uppercase tracking-wider font-medium text-[#777971] hover:text-[#262824] transition-colors cursor-pointer py-1"
            >
              Catalog
            </button>
            <button 
              type="button"
              onClick={() => { setCurFilter('Featured'); setCurPage('products'); }}
              className="text-xs uppercase tracking-wider font-medium text-[#777971] hover:text-[#262824] transition-colors cursor-pointer py-1"
            >
              Featured
            </button>
            <button 
              type="button"
              onClick={() => handleNavClick('home', 'brand-story')}
              className="text-xs uppercase tracking-wider font-medium text-[#777971] hover:text-[#262824] transition-colors cursor-pointer py-1"
            >
              Editorial
            </button>
            <button 
              type="button"
              onClick={() => handleNavClick('home', 'reviews')}
              className="text-xs uppercase tracking-wider font-medium text-[#777971] hover:text-[#262824] transition-colors cursor-pointer py-1"
            >
              Reviews
            </button>
          </div>

          {/* Right: Nav Action Icons (Responsive: Cart + Profile | Desktop: Search + Orders + Cart + Admin + Profile) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 z-10">
            
            {/* Desktop Search bare icon (Switch to Close X when search is open) */}
            <button
              type="button"
              onClick={handleSearchClick}
              className={`hidden lg:flex p-2 transition-colors cursor-pointer shrink-0 ${isSearchOpen ? 'text-[#262824]' : 'text-[#777971] hover:text-[#262824]'}`}
              title={isSearchOpen ? "Close Search" : "Search Products"}
              aria-label={isSearchOpen ? "Close Search" : "Search"}
            >
              {isSearchOpen ? <X size={18} /> : <Search size={18} />}
            </button>

            {/* Orders bare icon (Desktop only, responsive navigates via hamburger menu) */}
            <button
              type="button"
              className="hidden lg:flex p-2 text-[#777971] hover:text-[#262824] transition-colors cursor-pointer shrink-0"
              onClick={() => handleNavClick('orders')}
              title="My Orders & Tracking"
              aria-label="My Orders"
            >
              <Package size={18} />
            </button>

            {/* Cart bare icon (Always visible on mobile & desktop) */}
            <button
              type="button"
              className="p-1.5 sm:p-2 text-[#777971] hover:text-[#262824] transition-colors cursor-pointer relative shrink-0"
              onClick={() => handleNavClick('checkout')}
              title="Shopping Bag"
              aria-label="Shopping Bag"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingCart size={18} />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#262824] text-[#f7f6f2] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </div>
            </button>

            {/* Admin Dashboard bare icon (Desktop only) */}
            {curUser?.isAdmin && (
              <button
                type="button"
                className="hidden lg:flex p-2 text-[#777d62] hover:text-[#262824] transition-colors cursor-pointer shrink-0"
                onClick={() => { window.location.href = 'http://localhost:5174/admin'; }}
                title="Admin Dashboard"
                aria-label="Admin Dashboard"
              >
                <LayoutDashboard size={18} />
              </button>
            )}

            {/* Profile: In responsive, user avatar / icon alone; on desktop, displays name + dropdown */}
            {curUser ? (
              <div className="relative shrink-0 ml-0.5 sm:ml-1" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="h-8 sm:h-8.5 lg:h-10 px-1.5 sm:px-2 lg:px-3 rounded-[2px] border border-[#dfdfd8] bg-white hover:bg-[#eeede7] text-[#262824] text-xs font-medium inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer select-none shrink-0"
                  aria-expanded={isUserDropdownOpen}
                  aria-haspopup="true"
                  title="Account Menu"
                >
                  <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6 rounded-[2px] bg-[#262824] text-[#f7f6f2] flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                    {curUser.avatar || curUser.photoURL ? (
                      <img
                        src={curUser.avatar || curUser.photoURL}
                        alt="Profile DP"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getUserInitials(curUser.name || 'User')
                    )}
                  </div>
                  <span className="hidden lg:inline truncate max-w-[110px] text-xs font-semibold text-[#262824]">
                    {curUser.name?.split(' ')[0] || 'Profile'}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`hidden lg:inline text-[#777971] transition-transform duration-150 ${isUserDropdownOpen ? 'rotate-180 text-[#262824]' : ''}`}
                  />
                </button>

                {/* Dropdown Menu with Backdrop */}
                {isUserDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#dfdfd8] rounded-[2px] shadow-lg py-1.5 z-50 animate-scaleIn">
                      <div className="px-4 py-3 border-b border-[#dfdfd8]">
                        <p className="text-xs font-semibold text-[#262824] truncate">{curUser.name}</p>
                        <p className="text-[11px] text-[#777971] truncate">{curUser.email}</p>
                      </div>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#262824] hover:bg-[#eeede7] flex items-center gap-2.5 cursor-pointer transition-colors"
                        onClick={() => { handleNavClick('profile'); }}
                      >
                        <User size={14} className="text-[#777971]" /> My Profile
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#262824] hover:bg-[#eeede7] flex items-center gap-2.5 cursor-pointer transition-colors"
                        onClick={() => { handleNavClick('orders'); }}
                      >
                        <Package size={14} className="text-[#777971]" /> My Orders &amp; Returns
                      </button>
                      {curUser.isAdmin && (
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#777d62] hover:bg-[#eeede7] flex items-center gap-2.5 cursor-pointer transition-colors"
                          onClick={() => { setIsUserDropdownOpen(false); window.location.href = 'http://localhost:5174/admin'; }}
                        >
                          <LayoutDashboard size={14} /> Admin Console
                        </button>
                      )}
                      <div className="border-t border-[#dfdfd8] my-1" />
                      <button
                        type="button"
                        disabled={isLoggingOut}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#a83d3b] hover:bg-[#f9eded] flex items-center gap-2.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleLogout}
                      >
                        {isLoggingOut ? (
                          <Loader2 size={14} className="animate-spin text-[#a83d3b] shrink-0" />
                        ) : (
                          <LogOut size={14} className="shrink-0" />
                        )}
                        <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Profile: In responsive, icon alone in button; on desktop, icon + "Sign In" text */
              <button
                type="button"
                className="h-8 sm:h-8.5 lg:h-10 px-2 sm:px-2.5 lg:px-3 ml-0.5 sm:ml-1 rounded-[2px] border border-[#dfdfd8] bg-white hover:bg-[#eeede7] text-[#262824] text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none shrink-0"
                onClick={() => setCurPage('login')}
                title="Sign In"
                aria-label="Sign In"
              >
                <User size={15} />
                <span className="hidden lg:inline text-xs font-semibold tracking-wide">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Responsive Below-the-Nav Search Bar (Always handy on mobile/tablet) */}
        <div className="lg:hidden border-t border-[#dfdfd8] bg-[#f7f6f2] px-3 sm:px-6 py-2">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center h-9 border border-[#dfdfd8] focus-within:border-[#262824] bg-white rounded-[2px] px-3 shadow-2xs transition-colors"
          >
            <Search size={14} className="text-[#777971] shrink-0 mr-2" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setSearchQuery(e.target.value);
                if (curPage !== 'products') {
                  setCurFilter('All');
                  setCurPage('products');
                }
              }}
              onFocus={() => {
                if (curPage !== 'products') {
                  setCurFilter('All');
                  setCurPage('products');
                }
              }}
              placeholder="Search products..."
              className="w-full text-xs text-[#262824] placeholder:text-[#777971] bg-transparent outline-none"
            />
            {inputVal ? (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  setSearchQuery('');
                }}
                className="p-1 text-[#777971] hover:text-[#262824] cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            ) : null}
          </form>
        </div>

        {/* Desktop Expandable Search Bar Strip */}
        {isSearchOpen && (
          <div className="hidden lg:block border-t border-[#dfdfd8] bg-[#f7f6f2] px-3 sm:px-6 lg:px-8 py-3 animate-slideDown shadow-2xs">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
              <form
                onSubmit={handleSearchSubmit}
                className="flex-1 max-w-2xl mx-auto flex items-center h-10 border border-[#262824] bg-white rounded-[2px] px-3.5 shadow-2xs"
              >
                <Search size={16} className="text-[#777971] shrink-0 mr-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Search products by name, category, or keyword..."
                  className="w-full text-xs sm:text-sm text-[#262824] placeholder:text-[#777971] bg-transparent outline-none"
                />
                {inputVal ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInputVal('');
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 text-[#777971] hover:text-[#262824] cursor-pointer mr-1"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </form>
              <button
                type="button"
                onClick={handleCloseSearch}
                className="text-xs uppercase tracking-wider font-semibold text-[#777971] hover:text-[#262824] px-2.5 py-2 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Close search and return"
              >
                <X size={15} />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Side Panel Drawer Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-[#262824]/50 backdrop-blur-2xs z-[250] animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Side Panel Drawer */}
        <div
          className={`lg:hidden fixed top-0 bottom-0 left-0 w-[290px] sm:w-[320px] max-w-[85vw] bg-[#f7f6f2] z-[260] shadow-2xl border-r border-[#dfdfd8] flex flex-col justify-between transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-[#dfdfd8] flex items-center justify-between">
            <div
              className="cursor-pointer select-none flex items-center gap-2 group"
              onClick={() => { handleLogoClick(); setIsMobileMenuOpen(false); }}
            >
              <div className="w-7 h-7 rounded-[2px] bg-[#262824] text-[#f7f6f2] flex items-center justify-center font-bold text-xs tracking-widest shrink-0">
                F
              </div>
              <span className="font-heading text-lg font-bold text-[#262824] tracking-tight">
                FORMA
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 text-[#777971] hover:text-[#262824] transition-colors cursor-pointer rounded-[2px]"
              aria-label="Close menu"
            >
              <X size={19} />
            </button>
          </div>

          {/* Drawer Navlinks List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1 select-none">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#777971] px-3 pb-2">
              Navigation
            </div>
            <button
              type="button"
              className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#262824] transition-colors flex items-center justify-between"
              onClick={() => handleNavClick('home')}
            >
              <span>Home</span>
            </button>
            <button
              type="button"
              className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#262824] transition-colors flex items-center justify-between"
              onClick={() => handleNavClick('products')}
            >
              <span>Catalog</span>
            </button>
            <button
              type="button"
              className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#262824] transition-colors flex items-center justify-between"
              onClick={() => { setCurFilter('Featured'); handleNavClick('products'); }}
            >
              <span>Featured</span>
            </button>
            <button
              type="button"
              className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#262824] transition-colors flex items-center justify-between"
              onClick={() => handleNavClick('home', 'brand-story')}
            >
              <span>Editorial</span>
            </button>
            <button
              type="button"
              className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#262824] transition-colors flex items-center justify-between"
              onClick={() => handleNavClick('home', 'reviews')}
            >
              <span>Reviews</span>
            </button>

            <div className="border-t border-[#dfdfd8] my-3 pt-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#777971] px-3 pb-2">
                Account &amp; Orders
              </div>
              <button
                type="button"
                className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#262824] transition-colors flex items-center gap-2.5"
                onClick={() => handleNavClick('orders')}
              >
                <Package size={15} className="text-[#777971]" />
                <span>My Orders &amp; Tracking</span>
              </button>
              <button
                type="button"
                className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#262824] transition-colors flex items-center gap-2.5"
                onClick={() => handleNavClick('checkout')}
              >
                <ShoppingCart size={15} className="text-[#777971]" />
                <span>Shopping Bag ({cartItemsCount})</span>
              </button>
              {curUser ? (
                <button
                  type="button"
                  className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#262824] transition-colors flex items-center gap-2.5"
                  onClick={() => handleNavClick('profile')}
                >
                  <User size={15} className="text-[#777971]" />
                  <span>My Profile ({curUser.name?.split(' ')[0]})</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#262824] transition-colors flex items-center gap-2.5"
                  onClick={() => { setIsMobileMenuOpen(false); setCurPage('login'); }}
                >
                  <User size={15} className="text-[#777971]" />
                  <span>Sign In</span>
                </button>
              )}
              {curUser?.isAdmin && (
                <button
                  type="button"
                  className="w-full text-left py-2.5 px-3 rounded-[2px] hover:bg-[#eeede7] text-xs uppercase tracking-wider font-semibold text-[#777d62] transition-colors flex items-center gap-2.5"
                  onClick={() => { setIsMobileMenuOpen(false); window.location.href = 'http://localhost:5174/admin'; }}
                >
                  <LayoutDashboard size={15} />
                  <span>Admin Console</span>
                </button>
              )}
            </div>
          </div>

          {/* Drawer Footer */}
          {curUser && (
            <div className="p-4 border-t border-[#dfdfd8] bg-[#eeede7]/50">
              <button
                type="button"
                disabled={isLoggingOut}
                className="w-full py-2 px-3 text-xs font-semibold text-[#a83d3b] hover:bg-[#f9eded] rounded-[2px] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                onClick={handleLogout}
              >
                {isLoggingOut ? (
                  <Loader2 size={14} className="animate-spin text-[#a83d3b]" />
                ) : (
                  <LogOut size={14} />
                )}
                <span>Sign Out ({curUser.email})</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navigation;
