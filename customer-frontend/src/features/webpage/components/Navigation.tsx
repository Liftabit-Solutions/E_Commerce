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
  Package,
  Sparkles
} from 'lucide-react';

const Navigation: React.FC = () => {
  const {
    curUser,
    isAuthLoading,
    setCurPage,
    setCurFilter,
    setSearchQuery,
    logoutUser,
    cart,
    isCartLoading,
    hideNavbar
  } = useApp();

  if (hideNavbar) return null;

  const [inputVal, setInputVal] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
  };

  const handleLogoClick = () => {
    setInputVal('');
    setSearchQuery('');
    setCurFilter('All');
    setCurPage('home');
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
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
    if (anchorId) {
      setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  return (
    <header className="sticky top-0 z-[200] w-full bg-white border-b border-slate-200/80 shadow-xs">
      {/* Top Utility Announcement Bar */}
      <div className="bg-slate-950 text-white flex items-center overflow-hidden h-[30px] border-b border-slate-900 select-none">
        <div className="flex whitespace-nowrap animate-tickerLoop">
          <span className="inline-flex items-center gap-2 px-8 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            <Sparkles size={11} className="text-amber-400" /> Free shipping across India on orders above ₹499 <span className="text-slate-600">•</span>
          </span>
          <span className="inline-flex items-center gap-2 px-8 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            100% Genuine &amp; Verified Quality Essentials <span className="text-slate-600">•</span>
          </span>
          <span className="inline-flex items-center gap-2 px-8 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            Easy 7-Day Doorstep Returns &amp; Replacement <span className="text-slate-600">•</span>
          </span>
          <span className="inline-flex items-center gap-2 px-8 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            256-Bit SSL Encrypted Checkout <span className="text-slate-600">•</span>
          </span>
          {/* Loop duplicates */}
          <span className="inline-flex items-center gap-2 px-8 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            <Sparkles size={11} className="text-amber-400" /> Free shipping across India on orders above ₹499 <span className="text-slate-600">•</span>
          </span>
          <span className="inline-flex items-center gap-2 px-8 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            100% Genuine &amp; Verified Quality Essentials <span className="text-slate-600">•</span>
          </span>
          <span className="inline-flex items-center gap-2 px-8 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            Easy 7-Day Doorstep Returns &amp; Replacement <span className="text-slate-600">•</span>
          </span>
          <span className="inline-flex items-center gap-2 px-8 font-mono text-[10px] uppercase tracking-widest text-slate-300">
            256-Bit SSL Encrypted Checkout <span className="text-slate-600">•</span>
          </span>
        </div>
      </div>

      {/* Main High-Navbar */}
      <nav className="bg-white">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between px-2.5 sm:px-6 lg:px-8 h-[64px] sm:h-[68px] gap-1.5 sm:gap-6">
          
          {/* Left: Mobile Menu Trigger + Brand Identity */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-700 hover:text-slate-950 transition-colors cursor-pointer rounded-xl hover:bg-slate-100 shrink-0"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>

            {/* Brand Logo */}
            <div
              className="cursor-pointer select-none flex items-center gap-1.5 sm:gap-2.5 group shrink-0"
              onClick={handleLogoClick}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-sm group-hover:bg-black transition-colors shrink-0">
                E
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-base xs:text-lg sm:text-2xl font-black text-slate-950 tracking-tight hidden xs:inline sm:inline">
                  Ecommerce
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5 hidden sm:block">
                  Storefront
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search Input Bar */}
          <div className="hidden md:flex flex-1 max-w-[580px] mx-2">
            <form
              className="flex items-center border border-slate-200 rounded-full overflow-hidden bg-slate-50/80 focus-within:bg-white focus-within:border-slate-950 focus-within:ring-2 focus-within:ring-slate-950/10 transition-all h-11 w-full shadow-2xs"
              onSubmit={handleSearchSubmit}
            >
              <input
                className="border-none outline-none px-4.5 text-xs sm:text-sm text-slate-900 flex-1 bg-transparent placeholder:text-slate-400 font-medium"
                type="text"
                placeholder="Search products, categories, or essentials..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => setInputVal('')}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 cursor-pointer mr-1"
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
              <button
                className="px-5 h-full flex items-center justify-center bg-slate-950 text-white hover:bg-slate-800 cursor-pointer transition-colors shrink-0"
                type="submit"
                aria-label="Search"
              >
                <Search size={16} />
              </button>
            </form>
          </div>

          {/* Right: Nav Actions with Icons (My Orders, Cart, Profile/Sign In) - Unified Style & Height */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            
            {/* Orders Button */}
            <button
              type="button"
              className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 hover:text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] shrink-0"
              onClick={() => handleNavClick('orders')}
              title="My Orders & Returns"
            >
              <Package size={16} className="text-slate-700 shrink-0" />
              <span className="hidden sm:inline">Orders</span>
            </button>

            {/* Shopping Cart Button */}
            <button
              type="button"
              className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 hover:text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] relative shrink-0"
              onClick={() => handleNavClick('checkout')}
              title="Shopping Cart"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingCart size={16} className="text-slate-700 shrink-0" />
                {isCartLoading ? (
                  <span className="absolute -top-2 -right-2.5 bg-emerald-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    <Loader2 size={8} className="animate-spin" />
                  </span>
                ) : cartItemsCount > 0 ? (
                  <span className="absolute -top-2.5 -right-2.5 bg-slate-950 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {cartItemsCount}
                  </span>
                ) : null}
              </div>
              <span className="hidden sm:inline">Cart</span>
            </button>

            {/* Admin Dashboard shortcut if admin */}
            {curUser?.isAdmin && (
              <button
                type="button"
                className="hidden lg:inline-flex h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 hover:text-slate-950 text-xs font-bold items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
                onClick={() => { window.location.href = 'http://localhost:5174/admin'; }}
                title="Admin Dashboard"
              >
                <LayoutDashboard size={15} className="text-indigo-600" />
                <span>Admin</span>
              </button>
            )}

            {/* Account / User Section */}
            {isAuthLoading ? (
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : curUser ? (
              <div className="relative shrink-0" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="h-9 sm:h-10 px-2 sm:px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 hover:text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98] select-none shrink-0"
                  aria-expanded={isUserDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                    {curUser.avatar ? (
                      <img src={curUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      getUserInitials(curUser.name || 'User')
                    )}
                  </div>
                  <span className="truncate max-w-[85px] hidden sm:inline">
                    {curUser.name?.split(' ')[0] || 'Profile'}
                  </span>
                  <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${isUserDropdownOpen ? 'rotate-180 text-slate-900' : ''}`} />
                </button>

                {/* Dropdown Menu with Backdrop */}
                {isUserDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-scaleIn">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-950 truncate">{curUser.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{curUser.email}</p>
                      </div>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-950 flex items-center gap-2.5 cursor-pointer transition-colors"
                        onClick={() => { handleNavClick('profile'); }}
                      >
                        <User size={15} /> My Profile
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-slate-950 flex items-center gap-2.5 cursor-pointer transition-colors"
                        onClick={() => { handleNavClick('orders'); }}
                      >
                        <Package size={15} /> My Orders &amp; Returns
                      </button>
                      {curUser.isAdmin && (
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                          onClick={() => { setIsUserDropdownOpen(false); window.location.href = 'http://localhost:5174/admin'; }}
                        >
                          <LayoutDashboard size={15} /> Admin Console
                        </button>
                      )}
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        disabled={isLoggingOut}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleLogout}
                      >
                        {isLoggingOut ? (
                          <Loader2 size={15} className="animate-spin text-rose-600 shrink-0" />
                        ) : (
                          <LogOut size={15} className="shrink-0" />
                        )}
                        <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="h-10 px-2.5 sm:px-4 rounded-xl border border-slate-950 bg-slate-950 hover:bg-black text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                onClick={() => setCurPage('login')}
              >
                <User size={15} className="shrink-0" />
                <span className="hidden xs:inline sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search & Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white shadow-xl absolute top-full left-0 right-0 w-full animate-slideDown z-50">
            <div className="p-4 flex flex-col gap-3">
              {/* Search Form */}
              <form
                className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white h-11 w-full"
                onSubmit={handleSearchSubmit}
              >
                <input
                  className="border-none outline-none px-3.5 text-xs text-slate-900 flex-1 bg-transparent"
                  type="text"
                  placeholder="Search products..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                />
                <button className="px-4 h-full flex items-center justify-center bg-slate-950 text-white" type="submit">
                  <Search size={16} />
                </button>
              </form>

              {/* Navigation Items */}
              <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 text-xs">
                <button
                  className="text-left py-2.5 px-3 rounded-lg font-bold text-slate-900 hover:bg-slate-100"
                  onClick={() => handleNavClick('home')}
                >
                  Home
                </button>
                <button
                  className="text-left py-2.5 px-3 rounded-lg font-bold text-slate-900 hover:bg-slate-100"
                  onClick={() => handleNavClick('products')}
                >
                  All Products
                </button>
                <button
                  className="text-left py-2.5 px-3 rounded-lg font-bold text-slate-900 hover:bg-slate-100 flex items-center gap-2"
                  onClick={() => handleNavClick('orders')}
                >
                  <Package size={15} /> My Orders &amp; Tracking
                </button>
                {curUser && (
                  <button
                    className="text-left py-2.5 px-3 rounded-lg font-bold text-slate-900 hover:bg-slate-100 flex items-center gap-2"
                    onClick={() => handleNavClick('profile')}
                  >
                    <User size={15} /> My Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navigation;
