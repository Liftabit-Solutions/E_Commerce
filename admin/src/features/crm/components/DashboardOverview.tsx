import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useApp } from '../../../core/context/AppContext';
// @ts-ignore
import { auth } from '../../../../firebase';
import { getSocket } from '../../../core/socket/socket';
import { SOCKET_EVENTS } from '../../../core/socket/socketEvents';
import { 
  IndianRupee, 
  ShoppingBag, 
  Inbox, 
  MessageSquare, 
  AlertTriangle,
  PlusCircle,
  FileDown,
  UserPlus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Badge } from '@/components/reui/badge';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DashboardOverviewProps {
  onTabChange: (tab: 'dashboard' | 'products' | 'orders' | 'reviews' | 'add' | 'banners' | 'leads' | 'customers') => void;
}

const STORAGE_CACHE_KEY = 'ce_admin_dashboard_cache';
const SVG_WIDTH = 720;
const SVG_HEIGHT = 220;
const CHART_PADDING = { top: 20, right: 20, bottom: 35, left: 50 };
const GRAPH_WIDTH = SVG_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
const GRAPH_HEIGHT = SVG_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onTabChange }) => {
  const { orders, products, leads, reviews } = useApp();

  // Instant SWR cache initialization for low network & fast load
  const [apiDashboardData, setApiDashboardData] = useState<any>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(() => {
    try {
      const socket = getSocket();
      return socket?.connected || false;
    } catch {
      return false;
    }
  });

  // Chart Timeframe Filter State
  const [revenueTimeframe, setRevenueTimeframe] = useState<'7d' | '30d' | 'all'>('7d');
  const [hoveredRevenuePoint, setHoveredRevenuePoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<string | null>(null);
  const [recentTab, setRecentTab] = useState<'orders' | 'leads' | 'customers'>('orders');

  const isMountedRef = useRef<boolean>(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchDashboard = async () => {
      try {
        let token = '';
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        } else {
          await auth.authStateReady();
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
          }
        }
        if (!token) return;

        const backendUrl = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');
        const response = await axios.get(`${backendUrl}/auth/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
          timeout: 10000
        });

        if (isMountedRef.current && response.data && response.data.success) {
          setApiDashboardData(response.data);
          try {
            localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(response.data));
          } catch (e) {
            console.warn('Cache write note:', e);
          }
        }
      } catch (err) {
        console.warn('Admin dashboard API note (using cache/context fallback):', err);
      }
    };

    // Debounced fetch to avoid multi-trigger lag when rapid events occur
    const debouncedFetch = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          fetchDashboard();
        }
      }, 300);
    };

    // Initial fetch on mount
    fetchDashboard();

    // Background interval sync every 30 seconds for resiliency in poor networks
    const intervalId = setInterval(() => {
      if (isMountedRef.current && document.visibilityState === 'visible') {
        fetchDashboard();
      }
    }, 30000);

    const socket = getSocket();

    const handleConnect = () => {
      if (isMountedRef.current) {
        setIsSocketConnected(true);
        debouncedFetch();
      }
    };

    const handleDisconnect = () => {
      if (isMountedRef.current) {
        setIsSocketConnected(false);
      }
    };

    const handleSyncEvent = () => {
      if (isMountedRef.current) {
        debouncedFetch();
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const unsubscribeAuth = auth.onAuthStateChanged((user: any) => {
      if (user && isMountedRef.current) {
        debouncedFetch();
      }
    });

    // Subscribe to all entity update events
    const socketEventsList = Array.from(new Set([
      SOCKET_EVENTS.ORDER_CREATED,
      SOCKET_EVENTS.ORDER_STATUS_UPDATED,
      SOCKET_EVENTS.ORDER_CANCELLED,
      SOCKET_EVENTS.PRODUCT_CREATED,
      SOCKET_EVENTS.PRODUCT_UPDATED,
      SOCKET_EVENTS.PRODUCT_DELETED,
      SOCKET_EVENTS.INVENTORY_UPDATED,
      SOCKET_EVENTS.REVIEW_CREATED,
      SOCKET_EVENTS.REVIEW_STATUS_UPDATED,
      SOCKET_EVENTS.REVIEW_UPDATED,
      SOCKET_EVENTS.REVIEW_DELETED,
      SOCKET_EVENTS.LEAD_CREATED,
      SOCKET_EVENTS.LEAD_UPDATED,
      SOCKET_EVENTS.LEAD_ACTIVITY_ADDED,
      SOCKET_EVENTS.LEAD_TASK_UPDATED,
      SOCKET_EVENTS.LEAD_REMINDER_ADDED,
      SOCKET_EVENTS.USER_UPDATED,
      SOCKET_EVENTS.BANNERS_UPDATED,
      'order:created',
      'order:statusUpdated',
      'order:cancelled',
      'product:created',
      'product:updated',
      'product:deleted',
      'inventory:updated',
      'review:created',
      'review:statusUpdated',
      'review:updated',
      'review:deleted',
      'lead:created',
      'lead:updated',
      'lead:activityAdded',
      'lead:taskUpdated',
      'lead:reminderAdded',
      'user:updated',
      'banners:updated'
    ].filter(Boolean)));

    socketEventsList.forEach((evt) => {
      socket.on(evt, handleSyncEvent);
    });

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      clearInterval(intervalId);
      unsubscribeAuth();
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);

      socketEventsList.forEach((evt) => {
        if (evt) socket.off(evt, handleSyncEvent);
      });
    };
  }, []);

  const stats = apiDashboardData?.stats;

  // Helper to parse order timestamps safely
  const parseOrderTime = (o: any): number => {
    if (o?.createdAt) {
      const t = new Date(o.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (o?._id && typeof o._id === 'string' && o._id.length >= 8) {
      const hex = o._id.substring(0, 8);
      const ts = parseInt(hex, 16);
      if (!isNaN(ts) && ts > 0) return ts * 1000;
    }
    if (o?.date) {
      const parts = String(o.date).split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d.getTime();
      }
      const t = new Date(o.date).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    return 0;
  };

  // Metrics calculations
  const totalRevenue = stats ? stats.grossRevenue : orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = stats ? stats.totalOrders : orders.length;

  // Gross revenue growth calculation from backend stats or context fallback
  const rawGrowth = stats?.grossRevenueGrowth !== undefined ? stats.grossRevenueGrowth : (() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    const currRev = orders
      .filter((o) => {
        const t = parseOrderTime(o);
        return t > 0 && t >= now - sevenDays && o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'Refunded';
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const prevRev = orders
      .filter((o) => {
        const t = parseOrderTime(o);
        return t > 0 && t >= now - fourteenDays && t < now - sevenDays && o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'Refunded';
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);

    if (prevRev > 0) {
      return Number((((currRev - prevRev) / prevRev) * 100).toFixed(1));
    }
    return currRev > 0 ? 100.0 : 0.0;
  })();

  const isGrowthPositive = rawGrowth >= 0;
  const growthText = `${isGrowthPositive ? '+' : ''}${Number(rawGrowth).toFixed(1)}%`;

  // Workflow statuses in Order
  const pendingOrders = stats ? stats.pendingOrders : orders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'Refunded'
  ).length;

  const deliveredOrders = stats ? stats.deliveredOrders : orders.filter((o) => o.status === 'Delivered').length;
  const totalProducts = stats ? stats.totalProducts : products.length;
  const totalLeads = stats ? stats.activeLeads : leads.length;
  const totalReviews = stats ? stats.totalReviews : reviews.length;
  const pendingReviews = stats ? stats.pendingReviews : reviews.filter((r) => !r.approved).length;

  // Low stock products alert (stock <= 5)
  const lowStockProducts = products.filter((p) => p.stock <= 5);
  const lowStockCount = stats ? stats.lowStockAlerts : lowStockProducts.length;

  // Helper: Export to CSV
  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((item) =>
      Object.values(item)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derived recent lists from API or fallback to context state
  const recentOrdersList = apiDashboardData?.recentOrders?.length
    ? apiDashboardData.recentOrders.map((o: any) => ({
        id: o.orderNumber || o._id,
        name: o.customer ? `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim() : (o.billingAddress?.fullName || 'Customer'),
        date: new Date(o.createdAt).toLocaleDateString('en-IN'),
        total: o.grandTotal || 0,
        status: o.status || 'Pending'
      }))
    : orders.slice(0, 5).map((o) => ({
        id: o.id,
        name: o.address?.name || 'Customer',
        date: o.date,
        total: o.total,
        status: o.status
      }));

  const recentLeadsList = apiDashboardData?.recentLeads?.length
    ? apiDashboardData.recentLeads.map((l: any) => ({
        id: l._id,
        subject: l.subject || 'Inquiry',
        name: l.fullName || l.name || 'Lead',
        email: l.email || '',
        service: l.service || 'General',
        status: l.status || 'New'
      }))
    : leads.slice(0, 5);

  const recentCustomersList = apiDashboardData?.recentCustomers?.length
    ? apiDashboardData.recentCustomers.map((c: any) => ({
        name: c.customer ? `${c.customer.firstName || ''} ${c.customer.lastName || ''}`.trim() : (c.billingAddress?.fullName || 'Customer'),
        email: c.customer?.email || 'No email',
        city: c.shippingAddress?.city || c.billingAddress?.city || 'India'
      }))
    : orders.slice(0, 4).map((o) => ({
        name: o.address?.name || 'Customer',
        email: o.customerEmail || 'No email',
        city: o.address?.city || 'India'
      }));

  // ──────────────────────────────────────────────────────────────────────────
  // INTERACTIVE REVENUE AREA CHART DATA GENERATION
  // ──────────────────────────────────────────────────────────────────────────
  const revenueChartData = useMemo(() => {
    const daysCount = revenueTimeframe === '7d' ? 7 : revenueTimeframe === '30d' ? 30 : 60;
    const now = new Date();
    const dataPoints: { date: string; label: string; revenue: number; ordersCount: number }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const dayOrders = orders.filter((o) => {
        const ot = parseOrderTime(o);
        return ot >= d.getTime() && ot < nextD.getTime() && o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'Refunded';
      });

      const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      dataPoints.push({
        date: d.toISOString().split('T')[0],
        label,
        revenue: dayRevenue,
        ordersCount: dayOrders.length
      });
    }

    const maxRev = Math.max(...dataPoints.map((p) => p.revenue), 1000);
    const totalPeriodRevenue = dataPoints.reduce((acc, p) => acc + p.revenue, 0);
    const avgDailyRevenue = Math.round(totalPeriodRevenue / dataPoints.length);

    return { points: dataPoints, maxRev, totalPeriodRevenue, avgDailyRevenue };
  }, [orders, revenueTimeframe]);

  const chartCoords = useMemo(() => {
    const pts = revenueChartData.points;
    if (pts.length === 0) return { path: '', area: '', coords: [] };

    const coords = pts.map((pt, idx) => {
      const x = CHART_PADDING.left + (idx / Math.max(pts.length - 1, 1)) * GRAPH_WIDTH;
      const y = CHART_PADDING.top + GRAPH_HEIGHT - (pt.revenue / revenueChartData.maxRev) * GRAPH_HEIGHT;
      return { x, y, label: pt.label, value: pt.revenue, count: pt.ordersCount };
    });

    if (coords.length === 1) {
      return {
        path: `M ${coords[0].x} ${coords[0].y}`,
        area: `M ${coords[0].x} ${coords[0].y} L ${coords[0].x} ${CHART_PADDING.top + GRAPH_HEIGHT} Z`,
        coords
      };
    }

    // Monotone cubic spline interpolation for ultra-smooth area curve
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 < coords.length ? i + 2 : coords.length - 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const first = coords[0];
    const last = coords[coords.length - 1];
    const area = `${path} L ${last.x} ${CHART_PADDING.top + GRAPH_HEIGHT} L ${first.x} ${CHART_PADDING.top + GRAPH_HEIGHT} Z`;

    return { path, area, coords };
  }, [revenueChartData]);

  // ──────────────────────────────────────────────────────────────────────────
  // ORDER STATUS DISTRIBUTION DONUT DATA
  // ──────────────────────────────────────────────────────────────────────────
  const statusDistribution = useMemo(() => {
    let delivered = 0;
    let inTransit = 0;
    let pending = 0;
    let cancelled = 0;

    orders.forEach((o) => {
      if (o.status === 'Delivered') delivered++;
      else if (['Shipped', 'Out for Delivery', 'Confirmed', 'Packed', 'Ready for Dispatch'].includes(o.status)) inTransit++;
      else if (['Pending'].includes(o.status)) pending++;
      else if (['Cancelled', 'Returned', 'Refunded', 'Return Requested'].includes(o.status)) cancelled++;
      else pending++;
    });

    const total = orders.length || 1;
    return [
      { key: 'Delivered', label: 'Delivered', count: delivered, percent: Math.round((delivered / total) * 100), color: '#10B981' },
      { key: 'In Transit', label: 'In Transit', count: inTransit, percent: Math.round((inTransit / total) * 100), color: '#3B82F6' },
      { key: 'Pending', label: 'Pending Processing', count: pending, percent: Math.round((pending / total) * 100), color: '#F59E0B' },
      { key: 'Cancelled', label: 'Cancelled / Returned', count: cancelled, percent: Math.round((cancelled / total) * 100), color: '#EF4444' }
    ];
  }, [orders]);

  // Donut circumference metrics
  const donutRadius = 58;
  const donutCircumference = 2 * Math.PI * donutRadius;

  // ──────────────────────────────────────────────────────────────────────────
  // TOP PRODUCTS RANKING DERIVATION
  // ──────────────────────────────────────────────────────────────────────────
  const topProductsList = useMemo(() => {
    const productSalesMap: Record<string, { product: any; unitsSold: number; revenue: number }> = {};

    orders.forEach((o) => {
      const items = Array.isArray(o.items)
        ? o.items
        : typeof o.items === 'string'
        ? (() => { try { return JSON.parse(o.items); } catch { return []; } })()
        : [];

      items.forEach((it: any) => {
        const p = it.product || it;
        const pid = p.id || p._id || p.sku || 'misc';
        const qty = it.quantity || 1;
        const price = p.price || it.price || 0;

        if (!productSalesMap[pid]) {
          productSalesMap[pid] = { product: p, unitsSold: 0, revenue: 0 };
        }
        productSalesMap[pid].unitsSold += qty;
        productSalesMap[pid].revenue += qty * price;
      });
    });

    const list = Object.values(productSalesMap).sort((a, b) => b.unitsSold - a.unitsSold);

    if (list.length > 0) return list.slice(0, 4);

    return products.slice(0, 4).map((p) => ({
      product: p,
      unitsSold: Math.max(1, 10 - Math.min(p.stock, 8)),
      revenue: (p.price || 299) * Math.max(1, 10 - Math.min(p.stock, 8))
    }));
  }, [orders, products]);

  return (
    <div className="space-y-7 animate-fadeIn">
      
      {/* ── Executive Header Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Commerce Command Center</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span className="text-xs text-slate-500 font-medium">Store metrics and activity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-display">
            Sales Overview
          </h1>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white shadow-2xs text-xs font-mono text-slate-600">
            <span className="relative flex h-2 w-2">
              {isSocketConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSocketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-slate-500 font-sans text-xs">Live Sync:</span>
            <span className={`font-semibold ${isSocketConnected ? 'text-emerald-700' : 'text-amber-600'}`}>
              {isSocketConnected ? 'Active' : 'Connecting...'}
            </span>
          </div>

          <button
            onClick={() => onTabChange('add')}
            className="btn-primary text-xs font-bold px-4 py-2 rounded-md flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* ── Low Stock Urgency Alert Banner (Only when critical items detected) ── */}
      {lowStockCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-md bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Low Stock Alert — {lowStockCount} Product{lowStockCount > 1 ? 's' : ''} Need Restocking
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Items with 5 or fewer units left in inventory.
              </p>
            </div>
          </div>
          <button
            onClick={() => onTabChange('products')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-amber-950 bg-white hover:bg-amber-100/50 border border-amber-300 rounded-md shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <span>Review Stock</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ── 6 Modern KPI Analytics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* 1. Total Sales */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-indigo-300 transition-all group flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <IndianRupee size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-display font-mono">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                isGrowthPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
              }`}>
                {isGrowthPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {growthText}
              </span>
              <span className="text-slate-400 text-[11px] font-normal">vs. prev 7d</span>
            </div>
          </div>
        </div>

        {/* 2. Total Orders */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all group flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShoppingBag size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-display font-mono">
              {totalOrders}
            </h3>
            <div className="flex items-center justify-between text-xs mt-2 pt-1.5 border-t border-slate-100">
              <span className="text-slate-500 text-[11px]">{deliveredOrders} delivered</span>
              <span className="text-amber-700 font-bold text-[11px] bg-amber-50 px-1.5 py-0.5 rounded">
                {pendingOrders} active
              </span>
            </div>
          </div>
        </div>

        {/* 3. Total Products */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-violet-300 transition-all group flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Products</span>
            <div className="w-8 h-8 rounded-md bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
              <Package size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-display font-mono">
              {totalProducts}
            </h3>
            <div className="flex items-center justify-between text-xs mt-2 pt-1.5 border-t border-slate-100">
              <span className="text-slate-500 text-[11px]">{products.filter(p => p.stock > 0).length} in stock</span>
              <button onClick={() => onTabChange('products')} className="text-indigo-600 hover:underline text-[11px] font-bold cursor-pointer">
                Browse
              </button>
            </div>
          </div>
        </div>

        {/* 4. Total Inquiries */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-emerald-300 transition-all group flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inquiries</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Inbox size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-display font-mono">
              {totalLeads}
            </h3>
            <div className="flex items-center justify-between text-xs mt-2 pt-1.5 border-t border-slate-100">
              <span className="text-slate-500 text-[11px] truncate">Store inquiries</span>
              <button onClick={() => onTabChange('leads')} className="text-emerald-700 hover:underline text-[11px] font-bold cursor-pointer">
                View
              </button>
            </div>
          </div>
        </div>

        {/* 5. Low Stock */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-rose-300 transition-all group flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Low Stock</span>
            <div className={`w-8 h-8 rounded-md flex items-center justify-center border ${
              lowStockCount > 0 
                ? 'bg-rose-50 border-rose-200 text-rose-600' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className={`text-xl sm:text-2xl font-black tracking-tight font-display font-mono ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-950'}`}>
              {lowStockCount}
            </h3>
            <div className="flex items-center justify-between text-xs mt-2 pt-1.5 border-t border-slate-100">
              <span className={`text-[11px] font-medium ${lowStockCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                {lowStockCount > 0 ? 'Needs refill' : 'All optimal'}
              </span>
              <button onClick={() => onTabChange('products')} className="text-slate-700 hover:underline text-[11px] font-bold cursor-pointer">
                View
              </button>
            </div>
          </div>
        </div>

        {/* 6. Customer Reviews */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-amber-300 transition-all group flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reviews</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <MessageSquare size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-display font-mono">
              {totalReviews}
            </h3>
            <div className="flex items-center justify-between text-xs mt-2 pt-1.5 border-t border-slate-100">
              <span className="text-slate-500 text-[11px]">{pendingReviews} unapproved</span>
              <button onClick={() => onTabChange('reviews')} className="text-amber-700 hover:underline text-[11px] font-bold cursor-pointer">
                Review
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Interactive Charts & Visualizations Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Revenue Trend Interactive Area Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 font-display">Sales Trend</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sales over selected time period
              </p>
            </div>

            {/* Timeframe Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md self-start sm:self-auto">
              {(['7d', '30d', 'all'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setRevenueTimeframe(tf)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    revenueTimeframe === tf
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tf === '7d' ? 'Past 7 Days' : tf === '30d' ? 'Past 30 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3 border-b border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Period Total:</span>
              <span className="font-bold font-mono text-slate-900 text-sm">
                ₹{revenueChartData.totalPeriodRevenue.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Daily Average:</span>
              <span className="font-bold font-mono text-slate-900 text-sm">
                ₹{revenueChartData.avgDailyRevenue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="hidden sm:block">
              <span className="text-slate-400 block text-[11px]">Peak Single Day:</span>
              <span className="font-bold font-mono text-indigo-600 text-sm">
                ₹{revenueChartData.maxRev.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* SVG Interactive Chart Viewport */}
          <div className="relative w-full pt-4 overflow-hidden select-none">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-auto overflow-visible"
              onMouseLeave={() => setHoveredRevenuePoint(null)}
            >
              <defs>
                <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.28" />
                  <stop offset="60%" stopColor="#6366F1" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = CHART_PADDING.top + GRAPH_HEIGHT * (1 - pct);
                const val = Math.round(revenueChartData.maxRev * pct);
                return (
                  <g key={i}>
                    <line
                      x1={CHART_PADDING.left}
                      y1={y}
                      x2={CHART_PADDING.left + GRAPH_WIDTH}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeDasharray={pct > 0 && pct < 1 ? '4 4' : undefined}
                      strokeWidth="1"
                    />
                    <text
                      x={CHART_PADDING.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94A3B8"
                      fontFamily="sans-serif"
                      fontWeight="600"
                    >
                      {val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
                    </text>
                  </g>
                );
              })}

              {/* Area Polygon */}
              <path d={chartCoords.area} fill="url(#revenueAreaGradient)" />

              {/* Stroke Curve Line */}
              <path
                d={chartCoords.path}
                fill="none"
                stroke="#4F46E5"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Data Point Guides & Hotspots */}
              {chartCoords.coords.map((pt, idx) => {
                const isHovered = hoveredRevenuePoint?.label === pt.label;
                return (
                  <g key={idx}>
                    {/* Hover vertical guide line */}
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1={CHART_PADDING.top}
                        x2={pt.x}
                        y2={CHART_PADDING.top + GRAPH_HEIGHT}
                        stroke="#6366F1"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Point Circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 3}
                      fill={isHovered ? '#4F46E5' : '#FFFFFF'}
                      stroke="#4F46E5"
                      strokeWidth={isHovered ? 2.5 : 2}
                      className="transition-all duration-150"
                    />

                    {/* Hotspot transparent target */}
                    <rect
                      x={pt.x - 14}
                      y={CHART_PADDING.top}
                      width={28}
                      height={GRAPH_HEIGHT}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredRevenuePoint(pt)}
                    />

                    {/* X-Axis Dates (show sparse labels to prevent overlap) */}
                    {(revenueTimeframe === '7d' || idx % (revenueTimeframe === '30d' ? 5 : 8) === 0 || idx === chartCoords.coords.length - 1) && (
                      <text
                        x={pt.x}
                        y={CHART_PADDING.top + GRAPH_HEIGHT + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748B"
                        fontWeight="600"
                        fontFamily="sans-serif"
                      >
                        {pt.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredRevenuePoint && (
              <div 
                className="absolute z-20 pointer-events-none bg-slate-950 text-white rounded-xl px-3 py-2 text-xs shadow-xl border border-slate-800 animate-fadeIn"
                style={{
                  left: `${(hoveredRevenuePoint.x / SVG_WIDTH) * 100}%`,
                  top: `${Math.max(10, (hoveredRevenuePoint.y / SVG_HEIGHT) * 100 - 30)}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="font-semibold text-slate-300 text-[10px]">{hoveredRevenuePoint.label}</div>
                <div className="font-bold text-indigo-300 text-sm font-mono mt-0.5">
                  ₹{hoveredRevenuePoint.value.toLocaleString('en-IN')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Status Distribution Donut Chart (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart size={18} className="text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 font-display">Order Status</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Orders by status
            </p>
          </div>

          {/* SVG Donut Visualizer */}
          <div className="relative py-6 flex items-center justify-center">
            <svg width="170" height="170" viewBox="0 0 170 170" className="transform -rotate-90 select-none">
              {/* Background ring */}
              <circle
                cx="85"
                cy="85"
                r={donutRadius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="16"
              />

              {/* Segment rings */}
              {statusDistribution.reduce(
                (acc, seg) => {
                  const strokeDasharray = `${(seg.percent / 100) * donutCircumference} ${donutCircumference}`;
                  const strokeDashoffset = -acc.accumulatedOffset;
                  acc.elements.push(
                    <circle
                      key={seg.key}
                      cx="85"
                      cy="85"
                      r={donutRadius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={hoveredDonutSegment === seg.key ? "20" : "16"}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredDonutSegment(seg.key)}
                      onMouseLeave={() => setHoveredDonutSegment(null)}
                    />
                  );
                  acc.accumulatedOffset += (seg.percent / 100) * donutCircumference;
                  return acc;
                },
                { elements: [] as React.ReactNode[], accumulatedOffset: 0 }
              ).elements}
            </svg>

            {/* Center Total Count Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-black text-slate-950 font-display font-mono">
                {totalOrders}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Orders
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            {statusDistribution.map((seg) => (
              <div
                key={seg.key}
                onMouseEnter={() => setHoveredDonutSegment(seg.key)}
                onMouseLeave={() => setHoveredDonutSegment(null)}
                className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                  hoveredDonutSegment === seg.key ? 'bg-slate-50 font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-slate-700">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-950">{seg.count}</span>
                  <span className="text-slate-400 text-[11px]">({seg.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Split Grid: Recent Orders/Leads (Left) & Top Products + Quick Ops (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Recent Activity Interactive Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-950 font-display">Recent Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">Recent orders, inquiries, and customer activity</p>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRecentTab('orders')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  recentTab === 'orders' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Orders ({recentOrdersList.length})
              </button>
              <button
                type="button"
                onClick={() => setRecentTab('leads')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  recentTab === 'leads' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Inquiries ({recentLeadsList.length})
              </button>
              <button
                type="button"
                onClick={() => setRecentTab('customers')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  recentTab === 'customers' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Customers ({recentCustomersList.length})
              </button>
            </div>
          </div>

          {/* Tab 1: Orders List */}
          {recentTab === 'orders' && (
            <div>
              {recentOrdersList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrdersList.map((order: any, idx: number) => {
                      const isDelivered = order.status === 'Delivered';
                      const isCancelled = order.status === 'Cancelled' || order.status === 'Returned' || order.status === 'Refunded';
                      const statusVariant = isDelivered
                        ? ('success' as const)
                        : isCancelled
                        ? ('destructive-light' as const)
                        : ('warning' as const);

                      const customerName = order.name || 'Customer';
                      const initials = customerName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <TableRow key={order.id || idx}>
                          <TableCell className="font-mono text-xs font-semibold text-slate-900">{order.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                <AvatarFallback>{initials || 'CU'}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900">
                                  {customerName}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {order.date}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant} size="sm">
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium font-mono text-slate-950">
                            ₹{Number(order.total || 0).toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-10 text-center text-xs text-slate-500 font-medium">
                  No orders recorded yet. Storefront transactions will appear here live.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Leads & Inquiries List */}
          {recentTab === 'leads' && (
            <div>
              {recentLeadsList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inquiry</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLeadsList.map((lead: any, idx: number) => {
                      const isWon = lead.status === 'Won';
                      const isNew = lead.status === 'New';
                      const statusVariant = isWon ? ('success' as const) : isNew ? ('destructive-light' as const) : ('warning' as const);
                      const leadName = lead.name || 'Prospect';
                      const initials = leadName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

                      return (
                        <TableRow key={lead.id || idx}>
                          <TableCell className="font-medium text-sm text-slate-900 max-w-[180px] truncate">
                            {lead.subject}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                <AvatarFallback>{initials || 'PR'}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 truncate">
                                  {leadName}
                                </span>
                                <span className="text-muted-foreground text-xs truncate">
                                  {lead.email || 'No email'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
                              {lead.service}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={statusVariant} size="sm">
                              {lead.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-10 text-center text-xs text-slate-500 font-medium">
                  No incoming inquiries logged.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Recent Customers List */}
          {recentTab === 'customers' && (
            <div>
              {recentCustomersList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCustomersList.map((cust: any, idx: number) => {
                      const name = cust.name || 'Customer';
                      const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'C';
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar size="sm">
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900">
                                  {name}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  Buyer Account
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {cust.email || 'No email provided'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                              {cust.city || 'India'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-10 text-center text-xs text-slate-500 font-medium">
                  No buyer profiles recorded yet.
                </div>
              )}
            </div>
          )}

          {/* Card Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Real-time synchronized data</span>
            <button 
              onClick={() => onTabChange(recentTab === 'leads' ? 'leads' : recentTab === 'customers' ? 'customers' : 'orders')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{recentTab === 'leads' ? 'View Inquiries' : recentTab === 'customers' ? 'View Customers' : 'View Orders'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Right Column: Top Products & Quick Actions (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Top Products Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-display">Top Products</h3>
                <p className="text-[11px] text-slate-500">Best selling items by sales volume</p>
              </div>
              <button
                onClick={() => onTabChange('products')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
              >
                Products <ArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-3">
              {topProductsList.map((item, idx) => {
                const prod = item.product;
                const thumb = prod.imgs?.[0] || prod.img || prod.images?.[0]?.url || prod.images?.[0];
                return (
                  <div key={prod.id || idx} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {thumb ? (
                          <img src={thumb} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={16} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">{prod.name || 'Product'}</span>
                        <span className="text-[10px] text-slate-500 block">
                          Stock: <strong className={prod.stock <= 5 ? 'text-rose-600 font-bold' : 'text-slate-700'}>{prod.stock} left</strong> • ₹{(prod.price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold font-mono text-indigo-600 block">
                        {item.unitsSold} sold
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        ₹{(item.revenue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Shortcuts & Data Export */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-950 font-display mb-1">Quick Actions</h3>
            <p className="text-[11px] text-slate-500 mb-4 pb-3 border-b border-slate-100">Common store actions and data exports</p>

            <div className="space-y-2">
              <button 
                onClick={() => onTabChange('add')}
                className="w-full flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                    <PlusCircle size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-indigo-600">Add Product</span>
                    <span className="text-[10px] text-slate-500 block">Create and publish an item with pricing & stock</span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button 
                onClick={() => onTabChange('customers')}
                className="w-full flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                    <UserPlus size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-600">View Customers</span>
                    <span className="text-[10px] text-slate-500 block">See customer profiles and order histories</span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button 
                onClick={() => exportCSV(products, 'products_catalog.csv')}
                className="w-full flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <FileDown size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Export Products CSV</span>
                    <span className="text-[10px] text-slate-500 block">Download product list with stock and prices</span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button 
                onClick={() => exportCSV(leads, 'inquiries.csv')}
                className="w-full flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <FileDown size={14} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Export Inquiries CSV</span>
                    <span className="text-[10px] text-slate-500 block">Download customer inquiries log</span>
                  </div>
                </div>
                <ArrowRight size={13} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default DashboardOverview;