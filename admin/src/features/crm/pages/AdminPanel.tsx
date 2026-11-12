import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../core/context/AppContext';
import {
  LayoutDashboard,
  ShoppingBag,
  MessageSquare,
  PlusCircle,
  Image as ImageIcon,
  Users,
  LogOut,
  Loader2,
  FileText,
  Inbox,
  X,
  Search,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Tags
} from 'lucide-react';

import Navigation from '../../webpage/components/Navigation';
import DashboardOverview from '../components/DashboardOverview';
import ProductsCatalog from '../components/ProductsCatalog';
import AddProductForm from '../components/AddProductForm';
import BannersManagement from '../components/BannersManagement';
import OrdersRegistry from '../components/OrdersRegistry';
import LeadsCRM from '../components/LeadsCRM';
import ReviewsModeration from '../components/ReviewsModeration';
import CustomersRegistry from '../components/CustomersRegistry';
import StoreProfileComponent from '../components/StoreProfile';
import CategoriesManagement from '../components/CategoriesManagement';

export type TabName = 'dashboard' | 'orders' | 'products' | 'categories' | 'customers' | 'add' | 'banners' | 'leads' | 'reviews' | 'store-profile';

const AdminPanel: React.FC = () => {
  const { logoutUser, orders, leads, reviews, products, setSearchQuery } = useApp();

  const [activeTab, setActiveTab] = useState<TabName>(() => {
    const saved = sessionStorage.getItem('ce_admin_tab');
    if (saved === 'users') return 'customers';
    return (saved as TabName) || 'dashboard';
  });
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      setIsMobileSidebarOpen(false);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  // Command Palette States
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const paletteInputRef = useRef<HTMLInputElement>(null);

  // Preserve scroll position
  useEffect(() => {
    sessionStorage.setItem('ce_admin_tab', activeTab);
    const mainWorkspace = document.getElementById('crm-workspace-main');
    if (mainWorkspace) {
      mainWorkspace.scrollTop = 0;
    }
  }, [activeTab]);

  // Keybindings listener for Command Palette (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input when command palette opens
  useEffect(() => {
    if (isPaletteOpen) {
      setPaletteSearch('');
      setTimeout(() => {
        paletteInputRef.current?.focus();
      }, 50);
    }
  }, [isPaletteOpen]);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };

  // Badge counts
  const pendingReviewsCount = (reviews || []).filter((r) => !r.approved).length;
  const newLeadsCount = (leads || []).filter((l) => l.status === 'New').length;
  const newOrdersCount = (orders || []).filter((o) => o.status === 'Pending').length;

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onTabChange={handleTabChange} />;
      case 'orders':
        return <OrdersRegistry />;
      case 'products':
        return <ProductsCatalog onTabChange={handleTabChange} />;
      case 'categories':
        return <CategoriesManagement onTabChange={handleTabChange} />;
      case 'customers':
        return <CustomersRegistry />;
      case 'leads':
        return <LeadsCRM />;
      case 'reviews':
        return <ReviewsModeration />;
      case 'banners':
        return <BannersManagement />;
      case 'add':
        return <AddProductForm onTabChange={handleTabChange} />;
      case 'store-profile':
        return <StoreProfileComponent />;
      default:
        return <DashboardOverview onTabChange={handleTabChange} />;
    }
  };

  // Command palette search matching logic
  const query = paletteSearch.toLowerCase().trim();

  const matchedProducts = query
    ? (products || []).filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.cat.toLowerCase().includes(query)
      ).slice(0, 3)
    : [];

  const matchedOrders = query
    ? (orders || []).filter(
        (o) =>
          o.id.toLowerCase().includes(query) ||
          (o.customerEmail && o.customerEmail.toLowerCase().includes(query)) ||
          o.status.toLowerCase().includes(query)
      ).slice(0, 3)
    : [];

  const matchedCustomers = query
    ? (orders || [])
        .filter(
          (o) =>
            (o.address?.name && o.address.name.toLowerCase().includes(query)) ||
            (o.customerEmail && o.customerEmail.toLowerCase().includes(query)) ||
            (o.address?.phone && o.address.phone.includes(query))
        )
        .slice(0, 3)
    : [];

  const matchedLeads = query
    ? (leads || []).filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.email.toLowerCase().includes(query) ||
          (l.service && l.service.toLowerCase().includes(query))
      ).slice(0, 3)
    : [];

  const hasMatches =
    matchedProducts.length > 0 ||
    matchedOrders.length > 0 ||
    matchedCustomers.length > 0 ||
    matchedLeads.length > 0;

  const handlePaletteSelect = (tab: TabName, searchVal: string) => {
    setSearchQuery(searchVal);
    setActiveTab(tab);
    setIsPaletteOpen(false);
  };

  interface NavItem {
    id: TabName;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }
  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { id: 'orders', label: 'Orders', icon: <FileText size={16} />, badge: newOrdersCount },
        { id: 'products', label: 'Products', icon: <ShoppingBag size={16} /> },
        { id: 'categories', label: 'Categories', icon: <Tags size={16} /> },
        { id: 'customers', label: 'Customers', icon: <Users size={16} /> },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'leads', label: 'Inquiries', icon: <Inbox size={16} />, badge: newLeadsCount },
        { id: 'reviews', label: 'Reviews', icon: <MessageSquare size={16} />, badge: pendingReviewsCount },
        { id: 'banners', label: 'Banners', icon: <ImageIcon size={16} /> },
        { id: 'add', label: 'Add Product', icon: <PlusCircle size={16} /> },
        { id: 'store-profile', label: 'Store & Delivery', icon: <Building2 size={16} /> }
      ]
    }
  ];

  return (
    <div className="w-full h-full flex flex-row overflow-hidden bg-slate-50">
      
      {/* Mobile Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[240] lg:hidden no-print animate-fadeIn"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidenav - Fixed on desktop, 245px expanded, 72px collapsed */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 select-none transition-all duration-200 z-[250] lg:z-10 no-print flex flex-col bg-slate-950 py-4 border-r border-slate-800 shrink-0 h-full overflow-y-auto overflow-x-hidden scrollbar-none ${
          isMobileSidebarOpen
            ? 'translate-x-0 w-[245px]'
            : `-translate-x-full lg:translate-x-0 ${isSidebarCollapsed ? 'lg:w-[72px] px-2' : 'lg:w-[245px]'}`
        }`}
      >
        {/* Sidebar Header: Logo, Name, and ADMIN PANEL label */}
        <div className={`flex items-center mb-5 ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 select-none">
                <div className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs shrink-0">
                  E
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-sm font-bold text-white tracking-tight">
                    Ecommerce
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
                    ADMIN PANEL
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="hidden lg:flex text-slate-400 hover:text-white p-1.5 cursor-pointer items-center justify-center hover:bg-slate-900 rounded-md transition-colors"
                onClick={() => setIsSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={17} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-9 h-9 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs cursor-pointer group hover:bg-indigo-500 transition-colors relative overflow-hidden"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <span className="group-hover:opacity-0 transition-opacity absolute font-bold text-white">
                E
              </span>
              <PanelLeftOpen size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />
            </button>
          )}
          <button 
            type="button"
            className="lg:hidden text-slate-400 hover:text-white p-1.5 cursor-pointer rounded-md hover:bg-slate-900" 
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className={`flex flex-col gap-4 flex-1 ${isSidebarCollapsed ? 'px-0' : 'px-2.5'} overflow-x-hidden`}>
          {navSections.map((sec) => (
            <div key={sec.title} className="flex flex-col gap-1">
              {!isSidebarCollapsed && (
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1 select-none">
                  {sec.title}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {sec.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-md text-xs font-medium transition-colors w-full text-left relative cursor-pointer min-h-[40px] overflow-hidden group ${
                        isSidebarCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                      }`}
                      onClick={() => handleTabChange(item.id)}
                    >
                      <span className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        {item.icon}
                      </span>
                      {!isSidebarCollapsed && (
                        <span className="truncate pr-6">{item.label}</span>
                      )}
                      {!isSidebarCollapsed && !!item.badge && item.badge > 0 && (
                        <span className={`absolute right-3 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                          isActive 
                            ? 'bg-white text-indigo-700' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {isSidebarCollapsed && !!item.badge && item.badge > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className={`pt-3 mt-3 border-t border-slate-800 flex flex-col gap-1 ${isSidebarCollapsed ? 'items-center px-1' : 'px-2.5'}`}>
          <button 
            type="button"
            disabled={isLoggingOut}
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-md transition-colors cursor-pointer w-full min-h-[38px] border-none outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
              isSidebarCollapsed ? 'justify-center px-0' : ''
            }`}
            onClick={handleLogout}
            title={isSidebarCollapsed ? (isLoggingOut ? 'Signing out...' : 'Log Out') : undefined}
          >
            {isLoggingOut ? (
              <Loader2 size={15} className="animate-spin text-rose-400 shrink-0" />
            ) : (
              <LogOut size={15} className="shrink-0" />
            )}
            {!isSidebarCollapsed && <span>{isLoggingOut ? 'Signing out...' : 'Log Out'}</span>}
          </button>
        </div>
      </aside>

      {/* Right Column: Top Navigation Bar + Main CRM Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full min-w-0">
        <Navigation activeTab={activeTab} onMenuClick={() => setIsMobileSidebarOpen(true)} />

        <main 
          id="crm-workspace-main"
          className={`flex-1 h-full overflow-y-auto w-full bg-slate-50/70 ${
            activeTab === 'add' ? 'p-0' : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
          {/* Tab Module Content (Clean Direct View) */}
          {renderActiveTabContent()}
        </main>
      </div>

      {/* Global Command Palette Overlay Dialog */}
      {isPaletteOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[300] flex items-start justify-center pt-[12vh] px-4 no-print animate-fadeIn select-none">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsPaletteOpen(false)}
          />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-[640px] flex flex-col overflow-hidden max-h-[75vh] relative z-10 animate-scaleIn">
            
            {/* Search Input field */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50">
              <Search size={18} className="text-slate-500" />
              <input
                ref={paletteInputRef}
                type="text"
                placeholder="Search products, orders, customers, or inquiries..."
                className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-950 placeholder:text-slate-500"
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-950 cursor-pointer border border-slate-300 rounded-md px-2 py-1 bg-white"
              >
                Esc
              </button>
            </div>

            {/* Results Content */}
            <div className="overflow-y-auto p-4 flex-1">
              {!query ? (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 mb-3 uppercase tracking-wider">Quick Navigation</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'dashboard', label: 'Sales Overview', tab: 'dashboard' as TabName },
                      { id: 'orders', label: 'Orders', tab: 'orders' as TabName },
                      { id: 'products', label: 'Products', tab: 'products' as TabName },
                      { id: 'customers', label: 'Customers', tab: 'customers' as TabName }
                    ].map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(n.tab);
                          setIsPaletteOpen(false);
                        }}
                        className="flex items-center justify-between p-3.5 rounded-md border border-slate-200 hover:border-slate-950 hover:bg-slate-50 text-left text-xs font-bold text-slate-950 cursor-pointer transition-all min-h-[44px]"
                      >
                        <span>{n.label}</span>
                        <ArrowRight size={14} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : !hasMatches ? (
                <div className="text-center py-12 text-sm text-slate-500 font-medium">
                  No matching records found for &ldquo;{paletteSearch}&rdquo;
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Products */}
                  {matchedProducts.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Products</h4>
                      <div className="flex flex-col gap-1.5">
                        {matchedProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handlePaletteSelect('products', p.sku)}
                            className="flex justify-between items-center p-3 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left text-xs text-slate-950 cursor-pointer transition-all"
                          >
                            <div>
                              <span className="font-bold block">{p.name}</span>
                              <span className="text-slate-500 text-[11px] font-mono">SKU: {p.sku} | Category: {p.cat}</span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-950 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                              View Product
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Orders */}
                  {matchedOrders.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Orders</h4>
                      <div className="flex flex-col gap-1.5">
                        {matchedOrders.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => handlePaletteSelect('orders', o.id)}
                            className="flex justify-between items-center p-3 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left text-xs text-slate-950 cursor-pointer transition-all"
                          >
                            <div>
                              <span className="font-bold font-mono block">{o.id}</span>
                              <span className="text-slate-500 text-[11px]">{o.customerEmail} | Status: {o.status}</span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-950 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                              View Order
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customers */}
                  {matchedCustomers.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Customers</h4>
                      <div className="flex flex-col gap-1.5">
                        {matchedCustomers.map((c, i) => (
                          <button
                            key={c.id || i}
                            type="button"
                            onClick={() => handlePaletteSelect('customers', c.customerEmail || c.address?.name || '')}
                            className="flex justify-between items-center p-3 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left text-xs text-slate-950 cursor-pointer transition-all"
                          >
                            <div>
                              <span className="font-bold block">{c.address?.name || 'Customer'}</span>
                              <span className="text-slate-500 text-[11px]">{c.customerEmail} {c.address?.phone ? `• ${c.address.phone}` : ''}</span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-950 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                              View Customer
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inquiries / Leads */}
                  {matchedLeads.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Inquiries</h4>
                      <div className="flex flex-col gap-1.5">
                        {matchedLeads.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => handlePaletteSelect('leads', l.name)}
                            className="flex justify-between items-center p-3 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left text-xs text-slate-950 cursor-pointer transition-all"
                          >
                            <div>
                              <span className="font-bold block">{l.name}</span>
                              <span className="text-slate-500 text-[11px]">{l.email} | Service: {l.service}</span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-950 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                              View Inquiry
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
              <span>Press <kbd className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">Ctrl+K</kbd> to toggle</span>
              <span>Admin Panel</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
