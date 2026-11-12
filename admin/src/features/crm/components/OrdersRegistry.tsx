import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useApp } from '../../../core/context/AppContext';
import type { Order } from '../../../core/types';
// @ts-ignore
import { auth } from '../../../../firebase';
import { getSocket } from '../../../core/socket/socket';
import { SOCKET_EVENTS } from '../../../core/socket/socketEvents';
import {
  Search,
  FileDown,
  Printer,
  Truck,
  Calendar,
  IndianRupee,
  CheckSquare,
  ArrowLeft,
  Package,
  Clock,
  User,
  CreditCard
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
import { calculateDeliveryFee } from '../../../core/utils/storeSettings';

const RunningTruckParcel: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'sm' }) => (
  <div className={`relative overflow-hidden flex items-center justify-center mx-auto ${size === 'sm' ? 'w-20 h-4 mb-0.5' : 'w-28 h-8'}`}>
    <style>{`
      @keyframes truckParcelRunVanish {
        0% { transform: translateX(-24px); opacity: 0; }
        25% { opacity: 1; }
        75% { opacity: 1; }
        100% { transform: translateX(24px); opacity: 0; }
      }
    `}</style>
    <div 
      className="relative flex items-center text-primary"
      style={{ animation: 'truckParcelRunVanish 0.85s linear infinite' }}
    >
      <div className="relative flex items-center">
        <Truck size={size === 'sm' ? 14 : 24} className="text-primary stroke-[2.2]" />
        <div className={size === 'sm' ? "absolute -top-[2px] left-[2px] w-[6px] h-[5px] bg-amber-500 rounded-[1px] border border-amber-700 shadow-xs" : "absolute -top-[4px] left-[3px] w-[10px] h-[8px] bg-amber-500 rounded-[1px] border border-amber-700 shadow-xs"} />
      </div>
    </div>
  </div>
);

const STORAGE_ORDERS_KEY = 'ce_admin_orders_registry_cache';

const OrdersRegistry: React.FC = () => {
  const {
    orders,
    products,
    updateOrderStatus,
    updateOrderDetails,
    addOrderTimelineEvent,
    showToast,
    setInvoiceOrder
  } = useApp();

  const getProductImgs = useCallback((item: any): string[] => {
    if (!item) return [];
    const prod = item.product || item;
    let imgs: string[] = [];

    if (Array.isArray(prod.imgs)) {
      prod.imgs.forEach((img: any) => { if (typeof img === 'string' && img) imgs.push(img); });
    }
    if (Array.isArray(prod.images)) {
      prod.images.forEach((imgObj: any) => {
        if (typeof imgObj === 'string' && imgObj) imgs.push(imgObj);
        else if (imgObj?.url) imgs.push(imgObj.url);
        else if (imgObj?.secure_url) imgs.push(imgObj.secure_url);
      });
    }
    if (prod.img) imgs.push(prod.img);
    if (prod.image) imgs.push(prod.image);
    if (item.image) imgs.push(item.image);
    if (item.img) imgs.push(item.img);

    imgs = Array.from(new Set(imgs)).filter(Boolean);

    if (imgs.length === 0 && products && Array.isArray(products)) {
      const prodName = prod.name || item.title || item.name || '';
      const prodSku = prod.sku || item.sku || '';
      const prodId = prod.id || prod._id || item.productId || item.id || '';

      const catalogMatch = products.find(p =>
        (prodId && (String(p.id) === String(prodId) || String(p._id) === String(prodId))) ||
        (prodSku && p.sku && p.sku.toLowerCase() === prodSku.toLowerCase()) ||
        (prodName && p.name && p.name.toLowerCase() === prodName.toLowerCase())
      );

      if (catalogMatch) {
        if (Array.isArray(catalogMatch.imgs) && catalogMatch.imgs.length > 0) {
          imgs.push(...catalogMatch.imgs);
        }
        if (Array.isArray(catalogMatch.images) && catalogMatch.images.length > 0) {
          catalogMatch.images.forEach((imgObj: any) => {
            if (typeof imgObj === 'string' && imgObj) imgs.push(imgObj);
            else if (imgObj?.url) imgs.push(imgObj.url);
          });
        }
      }
    }

    return Array.from(new Set(imgs)).filter(Boolean);
  }, [products]);

  // Instant SWR cache initialization for low network & fast load
  const [apiOrders, setApiOrders] = useState<Order[] | null>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_ORDERS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Orders cache load note:', e);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_ORDERS_KEY);
      return !cached;
    } catch {
      return true;
    }
  });

  const isMountedRef = useRef<boolean>(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadOrders = useCallback(async (silent: boolean = false) => {
    if (!silent && !localStorage.getItem(STORAGE_ORDERS_KEY)) {
      setIsLoading(true);
    }
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
      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      const response = await axios.get(`${backendUrl}/auth/admin/orders`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { limit: 1000 },
        withCredentials: true,
        timeout: 10000
      });

      if (response.data && response.data.success && Array.isArray(response.data.orders)) {
        const fetchedOrders: Order[] = response.data.orders.map((o: any) => ({
          id: o.id || o.orderNumber || o._id,
          _id: o._id,
          createdAt: o.createdAt || o._id,
          date: o.date ? new Date(o.date).toLocaleDateString('en-IN') : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')),
          total: o.total || o.grandTotal || 0,
          customerEmail: o.customerEmail || o.customer?.email || '',
          paymentStatus: o.paymentStatus || o.payment?.status || 'Pending',
          status: o.status || 'Pending',
          address: {
            name: o.address?.name || o.shippingAddress?.fullName || 'Customer',
            phone: o.address?.phone || o.shippingAddress?.phoneNumber || o.shippingAddress?.phone || o.customer?.phoneNumber || 'N/A',
            city: o.address?.city || o.shippingAddress?.city || 'N/A',
            street: o.address?.street || o.shippingAddress?.addressLine1 || 'N/A',
            state: o.address?.state || o.shippingAddress?.state || 'N/A',
            pincode: (o.address?.pincode && o.address.pincode !== 'N/A') ? o.address.pincode : (o.shippingAddress?.postalCode || o.shippingAddress?.pincode || o.billingAddress?.pincode || o.billingAddress?.postalCode || o.billingAddressRaw?.postalCode || o.customer?.address?.postalCode || o.customer?.addresses?.[0]?.postalCode || 'N/A')
          },
          billingAddress: (o.billingAddress || o.billingAddressRaw) ? {
            name: o.billingAddress?.name || o.billingAddress?.fullName || o.billingAddressRaw?.fullName || o.address?.name || o.shippingAddress?.fullName || 'Customer',
            street: o.billingAddress?.street || o.billingAddress?.addressLine1 || o.billingAddressRaw?.addressLine1 || o.address?.street || o.shippingAddress?.addressLine1 || 'N/A',
            city: o.billingAddress?.city || o.billingAddressRaw?.city || o.address?.city || o.shippingAddress?.city || 'N/A',
            state: o.billingAddress?.state || o.billingAddressRaw?.state || o.address?.state || o.shippingAddress?.state || 'N/A',
            pincode: (o.billingAddress?.pincode && o.billingAddress.pincode !== 'N/A') ? o.billingAddress.pincode : (o.billingAddress?.postalCode || o.billingAddressRaw?.postalCode || o.address?.pincode || o.shippingAddress?.postalCode || o.shippingAddress?.pincode || o.customer?.address?.postalCode || o.customer?.addresses?.[0]?.postalCode || 'N/A')
          } : undefined,
          paymentMethod: o.paymentMethod || o.payment?.method || 'COD',
          shippingMethod: o.shippingMethod || o.delivery?.title || 'Standard Delivery',
          subtotal: typeof o.subtotal === 'number' && o.subtotal > 0 ? o.subtotal : undefined,
          shippingCharge: typeof o.shippingCharge === 'number' ? o.shippingCharge : (o.delivery?.charge || o.shippingFee || 0),
          taxes: typeof o.taxes === 'number' ? o.taxes : (o.tax?.amount || o.taxes?.amount || 0),
          discount: o.discount || 0,
          courierCompany: o.courierCompany || o.shipping?.courier || '',
          trackingId: o.trackingId || o.shipping?.trackingId || '',
          trackingUrl: o.trackingUrl || o.shipping?.trackingUrl || '',
          estimatedDelivery: o.estimatedDelivery || o.shipping?.estimatedDelivery || '',
          adminNotes: o.adminNotes || '',
          items: (o.items || []).map((item: any, idx: number) => {
            const priceVal = item.product?.price || item.unitPrice || item.sellingPrice || item.retailPrice || (item.totalPrice && item.quantity ? Math.round(item.totalPrice / item.quantity) : 0);
            const resolvedImgs = getProductImgs(item);
            return {
              product: {
                id: item.product?.id || item.product?._id || idx + 1,
                name: item.product?.name || item.title || 'Product',
                sku: item.product?.sku || item.sku || 'N/A',
                price: priceVal,
                imgs: resolvedImgs,
                img: resolvedImgs[0] || '',
                image: resolvedImgs[0] || ''
              },
              image: item.image || resolvedImgs[0] || '',
              unitPrice: priceVal,
              sellingPrice: item.sellingPrice || priceVal,
              retailPrice: item.retailPrice || priceVal,
              quantity: item.quantity || 1
            };
          })
        }));

        if (isMountedRef.current) {
          setApiOrders(fetchedOrders);
          try {
            localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(fetchedOrders));
          } catch (e) {
            console.warn('Orders cache write note:', e);
          }
        }
      }
    } catch (err) {
      console.warn('Orders Registry API note (using cache/context fallback):', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadOrders(Boolean(apiOrders && apiOrders.length > 0));

    const debouncedLoad = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          loadOrders(true);
        }
      }, 300);
    };

    const socket = getSocket();
    socket.on(SOCKET_EVENTS.ORDER_CREATED, debouncedLoad);
    socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, debouncedLoad);
    socket.on(SOCKET_EVENTS.ORDER_CANCELLED, debouncedLoad);

    const unsubAuth = auth.onAuthStateChanged((user: any) => {
      if (user && isMountedRef.current) {
        debouncedLoad();
      }
    });

    const handleFocusSync = () => {
      if (isMountedRef.current && document.visibilityState === 'visible') {
        loadOrders(true);
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      socket.off(SOCKET_EVENTS.ORDER_CREATED, debouncedLoad);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, debouncedLoad);
      socket.off(SOCKET_EVENTS.ORDER_CANCELLED, debouncedLoad);
      unsubAuth();
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, [loadOrders]);

  const activeOrders = apiOrders !== null ? apiOrders : orders;

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, _id: string | undefined, newStatus: any) => {
    setUpdatingOrderId(orderId);
    try {
      // Optimistically update local state for instant feedback
      setApiOrders((prev) =>
        prev
          ? prev.map((o) => (o.id === orderId || o._id === _id ? { ...o, status: newStatus } : o))
          : null
      );
      await updateOrderStatus(orderId, newStatus, _id);
      // Automatically re-fetch API silently to sync latest data without table loading overlay
      await loadOrders(true);
      // Show notification toast ONLY AFTER whole loading completes!
      showToast(`Order #${orderId} status updated to ${newStatus}`);
    } catch (err) {
      console.warn('Status change error:', err);
      showToast(`Failed to update status for order #${orderId}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  // Sorting - Newest orders first by default
  const [sortField, setSortField] = useState<keyof Order>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Order for details drawer
  const [detailedOrder, setDetailedOrder] = useState<Order | null>(null);

  // Escape key down to close detailed order drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailedOrder(null);
      }
    };
    if (detailedOrder) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [detailedOrder]);

  // Sorting handler
  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Filter Orders
  const filteredOrders = activeOrders.filter((o) => {
    const custName = o.address?.name || 'Customer';
    const email = o.customerEmail || '';
    const phone = o.address?.phone || '';
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchesPayment = paymentFilter === 'All' || o.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Precise timestamp extractor so newest orders are ALWAYS first at the top
  const getOrderTimestamp = (o: any): number => {
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

  // Sorted list with newest orders first by default
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortField === 'date') {
      const timeA = getOrderTimestamp(a);
      const timeB = getOrderTimestamp(b);
      if (timeA !== timeB) {
        return sortAsc ? timeA - timeB : timeB - timeA;
      }
      const idA = String(a._id || a.id);
      const idB = String(b._id || b.id);
      return sortAsc ? idA.localeCompare(idB) : idB.localeCompare(idA);
    }

    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  // Paginated list
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);

  // CSV Export
  const handleCSVExport = () => {
    const flatOrders = sortedOrders.map((o) => ({
      orderId: o.id,
      customerName: o.address?.name || 'Customer',
      customerEmail: o.customerEmail || 'customer@ecommerce.com',
      phone: o.address?.phone || 'N/A',
      date: o.date,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      orderStatus: o.status,
      shippingMethod: o.shippingMethod,
      trackingId: o.trackingId || '',
      courierCompany: o.courierCompany || '',
      totalAmount: o.total
    }));

    if (flatOrders.length === 0) {
      showToast('No orders available to export.');
      return;
    }

    const headers = Object.keys(flatOrders[0]).join(',');
    const rows = flatOrders.map((item) =>
      Object.values(item)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CE_orders_registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drawer forms staging states
  const [courier, setCourier] = useState('');
  const [trackNum, setTrackNum] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [estDelivery, setEstDelivery] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const openDetailsDrawer = (order: Order) => {
    setDetailedOrder(order);
    setCourier(order.courierCompany || '');
    setTrackNum(order.trackingId || '');
    setTrackUrl(order.trackingUrl || '');
    setEstDelivery(order.estimatedDelivery || '');
    setAdminNotes(order.adminNotes || '');
  };

  const handleUpdateShipping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedOrder) return;

    updateOrderDetails(detailedOrder.id, {
      courierCompany: courier.trim(),
      trackingId: trackNum.trim(),
      trackingUrl: trackUrl.trim(),
      estimatedDelivery: estDelivery,
      adminNotes: adminNotes.trim()
    });

    addOrderTimelineEvent(
      detailedOrder.id,
      detailedOrder.status,
      `Shipping details updated: ${courier || 'N/A'} - ${trackNum || 'N/A'}`
    );

    // Refresh state in drawer
    const refreshed = {
      ...detailedOrder,
      courierCompany: courier.trim(),
      trackingId: trackNum.trim(),
      trackingUrl: trackUrl.trim(),
      estimatedDelivery: estDelivery,
      adminNotes: adminNotes.trim()
    };
    setDetailedOrder(refreshed);
    showToast('Shipping tracking updated successfully.');
  };

  const handleTimelineEventAdd = (notesText: string) => {
    if (!detailedOrder || !notesText.trim()) return;
    addOrderTimelineEvent(detailedOrder.id, detailedOrder.status, notesText.trim());
    
    // Refresh timeline list
    const updatedTimeline = detailedOrder.timeline ? [...detailedOrder.timeline] : [];
    updatedTimeline.push({
      status: detailedOrder.status,
      date: new Date().toLocaleString('en-IN'),
      notes: notesText.trim()
    });
    setDetailedOrder({ ...detailedOrder, timeline: updatedTimeline });
  };

  const [customEventNote, setCustomEventNote] = useState('');

  // RENDER DEDICATED FULL-PAGE ORDER DETAILS VIEW WHEN AN ORDER IS SELECTED
  if (detailedOrder) {
    const items = Array.isArray(detailedOrder.items)
      ? detailedOrder.items
      : typeof detailedOrder.items === 'string'
        ? (() => { try { return JSON.parse(detailedOrder.items); } catch { return []; } })()
        : [];

    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setDetailedOrder(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[38px]"
            >
              <ArrowLeft size={14} /> Back to Orders Registry
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">/</span>
              <span className="font-mono font-bold text-slate-900">{detailedOrder.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setInvoiceOrder(detailedOrder)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[38px]"
            >
              <Printer size={14} /> View &amp; Print Tax Invoice
            </button>
          </div>
        </div>

        {/* Order Header Summary Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 font-display">
                Order #{detailedOrder.id}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                detailedOrder.status === 'Delivered'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : detailedOrder.status === 'Cancelled'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : (detailedOrder.status === 'Shipped' || (detailedOrder.status as any) === 'Dispatched')
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {detailedOrder.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Placed on {detailedOrder.date} • Payment Method: {detailedOrder.paymentMethod} ({detailedOrder.paymentStatus})
            </p>
          </div>

          {/* Quick status updater dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Update Status:</span>
            <select
              value={detailedOrder.status}
              disabled={updatingOrderId === detailedOrder.id}
              onChange={(e) => handleStatusChange(detailedOrder.id, detailedOrder._id, e.target.value)}
              className="border border-slate-200 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none cursor-pointer focus:border-slate-400 min-h-[38px] shadow-xs"
            >
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Processing">Processing</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN (8 cols): ORDERED ITEMS, FULFILLMENT & TIMELINE ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Ordered Products Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">Ordered Items ({items.length})</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">List of items and purchased quantities</p>
                </div>
                <span className="text-xs font-mono text-slate-500">Ref: {detailedOrder.id}</span>
              </div>

              <div className="w-full overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead>Item Details</TableHead>
                      <TableHead className="w-[110px]">SKU</TableHead>
                      <TableHead className="text-center w-[70px]">Qty</TableHead>
                      <TableHead className="text-right w-[100px]">Unit Price</TableHead>
                      <TableHead className="text-right w-[110px] pr-5">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any, idx: number) => {
                      const prod = item.product || item || {};
                      const unitPrice = prod.price || item.unitPrice || (item.totalPrice && item.quantity ? Math.round(item.totalPrice / item.quantity) : 0);
                      const qty = item.quantity || 1;
                      const lineTotal = item.totalPrice || (unitPrice * qty);

                      return (
                        <TableRow
                          key={idx}
                          className="h-[56px] hover:bg-slate-50/70 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {prod.imgs && prod.imgs.length > 0 ? (
                                  <img src={prod.imgs[0]} alt="" className="w-full h-full object-cover" />
                                ) : prod.img || item.img ? (
                                  <img src={prod.img || item.img} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={18} className="text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-xs text-slate-900 block truncate">{prod.name || item.title || 'Product'}</span>
                                <span className="text-[11px] text-slate-500">{prod.cat || 'General'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{prod.sku || item.sku || 'CE-SKU'}</TableCell>
                          <TableCell className="text-center font-semibold text-xs text-slate-900">{qty}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-slate-700">₹{unitPrice.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-xs text-slate-900 pr-5">₹{lineTotal.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Shipping & Delivery Fulfillment Form Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">Fulfillment &amp; Tracking</h3>
                  <p className="text-xs text-slate-500">Assign courier logistics and dispatch tracking identifiers</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 border border-slate-200">
                    {detailedOrder.shippingMethod || 'Standard Delivery'}
                  </span>
                  {detailedOrder.address?.city && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {calculateDeliveryFee(detailedOrder.address?.city, detailedOrder.address?.state).label}
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleUpdateShipping} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Courier Partner</label>
                  <select
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 outline-none bg-white text-slate-900 min-h-[38px] cursor-pointer"
                  >
                    <option value="">Select Courier Partner</option>
                    <option value="Delhivery">Delhivery Logistics</option>
                    <option value="Blue Dart">Blue Dart Express</option>
                    <option value="DTDC">DTDC Courier</option>
                    <option value="Shadowfax">Shadowfax Prime</option>
                    <option value="Standard Courier">Standard In-House Fleet</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Tracking Number (AWB)</label>
                  <input
                    type="text"
                    placeholder="e.g. DEL-982347102"
                    value={trackNum}
                    onChange={(e) => setTrackNum(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 outline-none font-mono bg-white text-slate-900 min-h-[38px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Tracking URL</label>
                  <input
                    type="text"
                    placeholder="https://track.courier.in/..."
                    value={trackUrl}
                    onChange={(e) => setTrackUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 outline-none font-mono bg-white text-slate-900 min-h-[38px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={estDelivery}
                    onChange={(e) => setEstDelivery(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 outline-none bg-white text-slate-900 min-h-[38px]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="font-semibold text-slate-700">Internal Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Packed in reinforced eco box. Customer requested doorstep call."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 outline-none bg-white text-slate-900 resize-none text-xs"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-semibold text-xs shadow-xs min-h-[38px] cursor-pointer"
                  >
                    Save Logistics &amp; Update Order
                  </button>
                </div>
              </form>
            </div>

            {/* Order Timeline & Audit Trail Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock size={16} className="text-slate-500" />
                <h4 className="font-semibold text-slate-900">Order Timeline</h4>
              </div>

              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {detailedOrder.timeline && detailedOrder.timeline.length > 0 ? (
                  detailedOrder.timeline.map((event: any, idx: number) => (
                    <div key={idx} className="relative pl-5 border-l-2 border-slate-200 pb-3 last:border-none last:pb-0">
                      <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-indigo-600" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 capitalize">{event.status}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{event.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{event.notes}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs italic">No timeline entries logged.</p>
                )}
              </div>

              {/* Add Custom Timeline Note */}
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Add operational note..."
                  value={customEventNote}
                  onChange={(e) => setCustomEventNote(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-md border border-slate-200 text-xs outline-none focus:border-indigo-600 bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customEventNote.trim()) {
                      handleTimelineEventAdd(customEventNote);
                      setCustomEventNote('');
                    }
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  Post Note
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN (4 cols): CUSTOMER & FINANCIALS ── */}
          <div className="lg:col-span-4 space-y-6">
            {/* Customer Information & Address Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <User size={16} className="text-indigo-600" />
                <h4 className="font-semibold text-slate-900">Customer &amp; Shipping</h4>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Recipient</span>
                <span className="font-semibold text-slate-900 text-sm block mt-0.5">{detailedOrder.address?.name || 'Customer'}</span>
              </div>

              <div className="space-y-1 text-slate-600">
                <p>{detailedOrder.address?.street || detailedOrder.address?.addressLine1}</p>
                <p>{detailedOrder.address?.city}, {detailedOrder.address?.state} - {detailedOrder.address?.pincode}</p>
                <p className="font-mono text-slate-700 pt-1">Phone: {detailedOrder.address?.phone || 'N/A'}</p>
                <p className="font-mono text-slate-700">Email: {detailedOrder.customerEmail || 'customer@ecommerce.com'}</p>
              </div>
            </div>

            {/* Financial Breakdown Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CreditCard size={16} className="text-slate-500" />
                <h4 className="font-semibold text-slate-900">Financial Breakdown</h4>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal</span>
                  <span className="font-mono font-medium text-slate-900">₹{detailedOrder.subtotal || detailedOrder.total}</span>
                </div>
                {detailedOrder.discount && detailedOrder.discount > 0 ? (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span className="font-mono font-medium">-₹{detailedOrder.discount}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-slate-600">
                  <span>Taxes (GST 18%)</span>
                  <span className="font-mono font-medium text-slate-900">₹{detailedOrder.taxes || Math.round((detailedOrder.subtotal || detailedOrder.total) * 0.18)}</span>
                </div>
                <div className="flex justify-between text-slate-600 border-b border-slate-100 pb-2">
                  <div className="flex flex-col">
                    <span>Shipping &amp; Delivery</span>
                    {detailedOrder.address?.city && (
                      <span className="text-[10px] text-slate-400">
                        {calculateDeliveryFee(detailedOrder.address?.city, detailedOrder.address?.state).label}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-medium text-slate-900">
                    {detailedOrder.shippingCharge && detailedOrder.shippingCharge > 0 ? `₹${detailedOrder.shippingCharge}` : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-semibold text-slate-900 text-sm">Grand Total</span>
                  <span className="font-mono font-bold text-slate-950 text-xl">₹{detailedOrder.total}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2.5 rounded-md mt-2">
                  <span className="text-slate-600 font-medium">Payment:</span>
                  <Badge variant={detailedOrder.paymentStatus === 'Paid' ? 'success' : 'warning'} size="sm">
                    {detailedOrder.paymentStatus} ({detailedOrder.paymentMethod})
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 font-medium">Store Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-display">
            Orders
          </h1>
        </div>
        <button
          onClick={handleCSVExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors min-h-[38px] cursor-pointer"
        >
          <FileDown size={14} className="text-indigo-600" />
          <span>Export Orders CSV</span>
        </button>
      </div>

      {/* Stats Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Calendar size={16} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block leading-tight">Total Orders</span>
            <span className="text-xl font-black text-slate-950 leading-none mt-1 block font-mono">{activeOrders.length}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <Truck size={16} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block leading-tight">Pending Orders</span>
            <span className="text-xl font-black text-slate-950 leading-none mt-1 block font-mono">
              {activeOrders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'Refunded').length}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckSquare size={16} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block leading-tight">Delivered Orders</span>
            <span className="text-xl font-black text-slate-950 leading-none mt-1 block font-mono">
              {activeOrders.filter((o) => o.status === 'Delivered').length}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <IndianRupee size={16} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block leading-tight">Pending Payment</span>
            <span className="text-xl font-black text-slate-950 leading-none mt-1 block font-mono">
              {activeOrders.filter((o) => o.paymentStatus === 'Pending' || (o.paymentMethod === 'COD' && o.paymentStatus !== 'Paid')).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search orders by ID, customer name, phone, email..."
            className="w-full border border-slate-200 rounded-md bg-slate-50/50 hover:bg-white pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white placeholder:text-slate-400 min-h-[38px] text-slate-900 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs outline-none cursor-pointer focus:border-indigo-600 text-slate-700 font-medium min-h-[38px] shadow-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Packed">Packed</option>
            <option value="Ready for Dispatch">Ready for dispatch</option>
            <option value="Shipped">Shipped</option>
            <option value="Out for Delivery">Out for delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Returned">Returned</option>
            <option value="Refunded">Refunded</option>
          </select>
 
          {/* Payment dropdown */}
          <select
            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs outline-none cursor-pointer focus:border-indigo-600 text-slate-700 font-medium min-h-[38px] shadow-xs"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="All">All payments</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending / Unpaid</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="w-[85px] whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('id')}>
                  Order {sortField === 'id' ? (sortAsc ? '▲' : '▼') : ''}
                </TableHead>
                <TableHead className="whitespace-nowrap">Customer</TableHead>
                <TableHead className="w-[100px] whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('date')}>
                  Date {sortField === 'date' ? (sortAsc ? '▲' : '▼') : ''}
                </TableHead>
                <TableHead className="w-[95px] text-right whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('total')}>
                  Amount {sortField === 'total' ? (sortAsc ? '▲' : '▼') : ''}
                </TableHead>
                <TableHead className="w-[90px] text-center whitespace-nowrap">Payment</TableHead>
                <TableHead className="w-[130px] text-center whitespace-nowrap">Status</TableHead>
                <TableHead className="w-[110px] whitespace-nowrap">Delivery</TableHead>
                <TableHead className="w-[100px] text-right whitespace-nowrap pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 select-none">
                      <RunningTruckParcel size="md" />
                      <p className="text-xs font-semibold text-slate-500 tracking-wide">Loading orders...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentItems.length > 0 ? (
                currentItems.map((o) => {
                  const initials = (o.address?.name || o.customerEmail || 'C')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <TableRow key={o.id} className="h-[56px] hover:bg-slate-50/70 transition-colors">
                      {/* ID */}
                      <TableCell className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {o.id}
                      </TableCell>

                      {/* Customer */}
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar size="sm">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-slate-900 truncate">
                              {o.address?.name || 'Customer'}
                            </span>
                            <span className="text-slate-500 text-[11px] truncate leading-tight">
                              {o.customerEmail}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{o.date}</TableCell>

                      {/* Total */}
                      <TableCell className="text-right font-mono font-medium text-xs text-slate-950 whitespace-nowrap">
                        ₹{o.total.toLocaleString('en-IN')}
                      </TableCell>

                      {/* Payment status */}
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          variant={
                            o.paymentStatus === 'Paid'
                              ? 'success'
                              : o.paymentStatus === 'Pending'
                              ? 'warning'
                              : 'destructive-light'
                          }
                          size="sm"
                        >
                          {o.paymentStatus}
                        </Badge>
                      </TableCell>

                      {/* Order status dropdown */}
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center justify-center">
                          {Boolean(updatingOrderId && (updatingOrderId === o.id || updatingOrderId === o._id)) ? (
                            <RunningTruckParcel size="sm" />
                          ) : null}
                          <select
                            disabled={Boolean(updatingOrderId && (updatingOrderId === o.id || updatingOrderId === o._id))}
                            className={`border rounded-md px-2 py-1 text-xs font-medium outline-none cursor-pointer shadow-xs transition-colors w-full max-w-[125px] ${
                              o.status === 'Delivered'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : o.status === 'Cancelled' || o.status === 'Returned' || o.status === 'Refunded'
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, o._id, e.target.value as any)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Packed">Packed</option>
                            <option value="Ready for Dispatch">Ready</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Out for Delivery">Out for delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Returned">Returned</option>
                            <option value="Refunded">Refunded</option>
                          </select>
                        </div>
                      </TableCell>

                      {/* Delivery & Tracking */}
                      <TableCell className="whitespace-nowrap">
                        <span className="font-medium text-slate-800 block text-xs truncate max-w-[110px]">{o.shippingMethod || 'Standard'}</span>
                        {o.trackingId ? (
                          <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[110px]" title={o.trackingId}>
                            {o.trackingId}
                          </span>
                        ) : null}
                      </TableCell>

                      {/* Combined Actions: Invoice & Details */}
                      <TableCell className="text-right whitespace-nowrap pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInvoiceOrder(o)}
                            className="p-1.5 border border-slate-200 rounded-md bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs cursor-pointer min-h-[30px] min-w-[30px] inline-flex items-center justify-center transition-colors"
                            title="Invoice"
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            onClick={() => openDetailsDrawer(o)}
                            className="text-xs font-semibold px-2.5 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 rounded-md shadow-xs transition-colors cursor-pointer min-h-[30px]"
                          >
                            Details
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-slate-500 text-xs">
                    <span>No orders found matching the filter criteria.</span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Row */}
        {filteredOrders.length > 0 && (
          <div className="bg-slate-50/50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
            <span className="text-slate-500">
              Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} orders
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <button
                onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1.5 border rounded-md cursor-pointer shadow-xs transition-colors ${
                    currentPage === i + 1
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersRegistry;
