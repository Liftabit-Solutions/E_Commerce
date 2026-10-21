import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck,
  Printer,
  ArrowLeft,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  ShoppingBag,
  ChevronRight,
  CheckSquare,
  Search,
  X,
  AlertTriangle,
  Undo,
  Check,
  Loader2,
  ShieldCheck,
  CreditCard,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import type { Order } from '../../../core/types';
import { useApp } from '../../../core/context/AppContext';
import { getSocket } from '../../../core/socket/socket';
import { SOCKET_EVENTS } from '../../../core/socket/socketEvents';

/* ─── Status Design System ─── */
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.FC<any>; label: string }> = {
  Pending: { color: 'text-amber-900', bg: 'bg-amber-50', border: 'border-amber-300', icon: Clock, label: 'Order Placed' },
  Confirmed: { color: 'text-blue-900', bg: 'bg-blue-50', border: 'border-blue-300', icon: CheckSquare, label: 'Confirmed' },
  Packed: { color: 'text-blue-900', bg: 'bg-blue-50', border: 'border-blue-300', icon: Package, label: 'Packed' },
  'Ready for Dispatch': { color: 'text-indigo-900', bg: 'bg-indigo-50', border: 'border-indigo-300', icon: Package, label: 'Ready for Dispatch' },
  Shipped: { color: 'text-indigo-900', bg: 'bg-indigo-50', border: 'border-indigo-300', icon: Truck, label: 'Shipped' },
  'Out for Delivery': { color: 'text-violet-900', bg: 'bg-violet-50', border: 'border-violet-300', icon: MapPin, label: 'Out for Delivery' },
  Delivered: { color: 'text-emerald-900', bg: 'bg-emerald-50', border: 'border-emerald-300', icon: CheckCircle, label: 'Delivered' },
  Cancelled: { color: 'text-rose-900', bg: 'bg-rose-50', border: 'border-rose-300', icon: XCircle, label: 'Cancelled' },
  'Return Requested': { color: 'text-amber-900', bg: 'bg-amber-50', border: 'border-amber-300', icon: RotateCcw, label: 'Return Requested' },
  Returned: { color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-300', icon: RotateCcw, label: 'Returned' },
  Refunded: { color: 'text-emerald-900', bg: 'bg-emerald-50', border: 'border-emerald-300', icon: RotateCcw, label: 'Refund Completed' }
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] || { color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-300', icon: Package, label: status };

/* ─── Timeline Events Generator ─── */
const getTimelineEvents = (order: any) => {
  if (order.timeline && order.timeline.length > 0) {
    return [...order.timeline].reverse();
  }

  const orderDate = new Date(order.date || order.createdAt || Date.now());
  const events = [];

  events.push({
    status: 'Order Placed',
    date: orderDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    notes: 'Order confirmed and registered in ledger.'
  });

  if (['Confirmed', 'Packed', 'Ready for Dispatch', 'Shipped', 'Out for Delivery', 'Delivered', 'Returned', 'Refunded'].includes(order.status)) {
    const confirmDate = new Date(orderDate);
    confirmDate.setMinutes(orderDate.getMinutes() + 20);
    events.push({
      status: 'Order Confirmed',
      date: confirmDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: 'Payment verified and order accepted by fulfillment facility.'
    });
  }

  if (['Packed', 'Ready for Dispatch', 'Shipped', 'Out for Delivery', 'Delivered', 'Returned', 'Refunded'].includes(order.status)) {
    const packDate = new Date(orderDate);
    packDate.setHours(orderDate.getHours() + 8);
    events.push({
      status: 'Packed & Sealed',
      date: packDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: 'Items packed in protective sustainable casing.'
    });
  }

  if (['Ready for Dispatch', 'Shipped', 'Out for Delivery', 'Delivered', 'Returned', 'Refunded'].includes(order.status)) {
    const readyDate = new Date(orderDate);
    readyDate.setHours(orderDate.getHours() + 14);
    events.push({
      status: 'Dispatched to Carrier Hub',
      date: readyDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: 'Package handed over to carrier dispatch partner.'
    });
  }

  if (['Shipped', 'Out for Delivery', 'Delivered', 'Returned', 'Refunded'].includes(order.status)) {
    const shipDate = new Date(orderDate);
    shipDate.setDate(orderDate.getDate() + 1);
    events.push({
      status: 'In Transit',
      date: shipDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: `In transit via ${order.courierCompany || 'Delhivery Express'} (AWB: ${order.trackingId || 'DEL-92841029'}).`
    });
  }

  if (['Out for Delivery', 'Delivered', 'Returned', 'Refunded'].includes(order.status)) {
    const outDate = new Date(orderDate);
    outDate.setDate(orderDate.getDate() + 3);
    outDate.setHours(9, 30, 0);
    events.push({
      status: 'Out for Delivery',
      date: outDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: 'Delivery executive is en route to your shipping location.'
    });
  }

  if (['Delivered', 'Returned', 'Refunded'].includes(order.status)) {
    const delDate = new Date(orderDate);
    delDate.setDate(orderDate.getDate() + 3);
    delDate.setHours(14, 45, 0);
    events.push({
      status: 'Delivered',
      date: delDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: 'Package signed and successfully delivered.'
    });
  }

  if (order.status === 'Cancelled') {
    const cancelDate = new Date(orderDate);
    cancelDate.setHours(orderDate.getHours() + 1);
    events.push({
      status: 'Cancelled',
      date: cancelDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: 'Cancellation requested by customer. Any charged amount will be refunded.'
    });
  }

  if (['Return Requested', 'Returned', 'Refunded'].includes(order.status)) {
    const retDate = new Date(orderDate);
    retDate.setDate(orderDate.getDate() + 4);
    events.push({
      status: order.status === 'Refunded' ? 'Refund Completed' : order.status === 'Returned' ? 'Item Picked Up' : 'Return Requested',
      date: retDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: order.status === 'Refunded'
        ? 'Refund transferred to your original payment method.'
        : order.status === 'Returned'
        ? 'Item picked up by courier and verification confirmed.'
        : 'Return request submitted. Pickup scheduled within 48 business hours.'
    });
  }

  return events.reverse();
};

/* ─── Skeleton Loader Component ─── */
const SkeletonLoader = () => (
  <div className="flex flex-col gap-6 w-full animate-fadeIn">
    {[1, 2].map((i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex gap-6">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </div>
          <div className="h-3 w-28 bg-slate-200 rounded" />
        </div>
        <div className="p-6 flex gap-5 items-center">
          <div className="w-20 h-20 rounded-lg bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-3 w-36 bg-slate-100 rounded" />
          </div>
          <div className="w-32 h-9 bg-slate-200 rounded" />
        </div>
      </div>
    ))}
  </div>
);

/* ─── Main Returns & Orders Component ─── */
const Orders: React.FC = () => {
  const {
    orders,
    setCurPage,
    setInvoiceOrder,
    addToCart,
    showToast,
    cancelOrder,
    returnOrder,
    addOrderTimelineEvent,
    fetchMyOrders,
    curUser,
    setSelectedProductId
  } = useApp();

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [selectedImgIdx, setSelectedImgIdx] = useState<number>(0);
  const [isImgZoomed, setIsImgZoomed] = useState<boolean>(false);

  const handleSelectOrder = (order: Order | null) => {
    setActiveOrder(order);
    setSelectedItemIdx(0);
    setSelectedImgIdx(0);
    setIsImgZoomed(false);
    if (order) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Cancellation Modal States
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationOtherText, setCancellationOtherText] = useState('');
  const [cancellationStatus, setCancellationStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [cancellationErrorMessage, setCancellationErrorMessage] = useState('');

  // Return Modal States
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);
  const [returnStep, setReturnStep] = useState<'reason' | 'confirm'>('reason');
  const [returnReason, setReturnReason] = useState('');
  const [returnOtherText, setReturnOtherText] = useState('');
  const [returnStatus, setReturnStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [returnErrorMessage, setReturnErrorMessage] = useState('');

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'All' | 'Progress' | 'Delivered' | 'Returns' | 'Cancelled'>('All');
  const [dateFilter, setDateFilter] = useState<'30days' | '6months' | '2026' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (fetchMyOrders) {
      fetchMyOrders();
    }

    const socket = getSocket();
    const handleOrderSync = () => {
      if (fetchMyOrders) {
        fetchMyOrders();
      }
    };

    socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderSync);
    socket.on(SOCKET_EVENTS.ORDER_CREATED, handleOrderSync);
    socket.on(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderSync);
    socket.on(SOCKET_EVENTS.PRODUCT_UPDATED, handleOrderSync);
    socket.on(SOCKET_EVENTS.INVENTORY_UPDATED, handleOrderSync);

    const handleFocusSync = () => {
      if (document.visibilityState === 'visible' && fetchMyOrders) {
        fetchMyOrders();
      }
    };

    window.addEventListener('focus', handleFocusSync);
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderSync);
      socket.off(SOCKET_EVENTS.ORDER_CREATED, handleOrderSync);
      socket.off(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderSync);
      socket.off(SOCKET_EVENTS.PRODUCT_UPDATED, handleOrderSync);
      socket.off(SOCKET_EVENTS.INVENTORY_UPDATED, handleOrderSync);
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
  }, [fetchMyOrders]);

  // Keep activeOrder synced with latest state
  useEffect(() => {
    if (activeOrder && orders.length > 0) {
      const latest = orders.find(
        (o) => (activeOrder._id && o._id === activeOrder._id) || (activeOrder.id && o.id === activeOrder.id)
      );
      if (latest && (latest.status !== activeOrder.status || latest.trackingId !== activeOrder.trackingId)) {
        setActiveOrder(latest);
      }
    }
  }, [orders, activeOrder]);

  // Simulate short loading state on filter changes
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, [searchQuery, statusTab, dateFilter, sortBy]);

  // Handle re-ordering
  const handleReorder = (order: Order) => {
    const items = Array.isArray(order.items)
      ? order.items
      : typeof order.items === 'string'
      ? (() => {
          try {
            return JSON.parse(order.items);
          } catch {
            return [];
          }
        })()
      : [];

    if (items.length === 0) return;

    items.forEach((item: any) => {
      if (item.product) {
        addToCart(item.product, item.quantity);
      }
    });
    showToast('Items re-added to cart! Redirecting to checkout...');
    setCurPage('checkout');
    setActiveOrder(null);
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (order: Order) => {
    setCancellingOrder(order);
    setCancellationReason('');
    setCancellationOtherText('');
    setCancellationStatus('idle');
    setCancellationErrorMessage('');
  };

  // Confirm cancellation action
  const handleConfirmCancellation = async () => {
    if (!cancellingOrder) return;
    if (!cancellationReason) {
      showToast('Please choose a reason for cancellation.');
      return;
    }

    setCancellationStatus('processing');
    const finalReason = cancellationReason === 'Other' ? cancellationOtherText : cancellationReason;

    try {
      const orderIdToCancel = cancellingOrder._id || cancellingOrder.id;
      const res = await cancelOrder(orderIdToCancel, finalReason);

      if (res && res.success) {
        addOrderTimelineEvent(cancellingOrder.id, 'Cancelled', `Cancelled by customer. Reason: ${finalReason}`);

        if (activeOrder && (activeOrder.id === cancellingOrder.id || activeOrder._id === cancellingOrder._id)) {
          setActiveOrder((prev) => (prev ? { ...prev, status: 'Cancelled' } : null));
        }

        setCancellationStatus('success');
      } else {
        setCancellationStatus('error');
        setCancellationErrorMessage(res?.message || 'Unable to process cancellation request.');
      }
    } catch (err: any) {
      setCancellationStatus('error');
      setCancellationErrorMessage(err?.response?.data?.message || err?.message || 'Cancellation failed.');
    }
  };

  // Open Return Modal
  const handleOpenReturnModal = (order: Order) => {
    setReturningOrder(order);
    setReturnStep('reason');
    setReturnReason('');
    setReturnOtherText('');
    setReturnStatus('idle');
    setReturnErrorMessage('');
  };

  // Check if order is eligible for return (within 7 days of delivery)
  const isReturnEligible = (order: Order): boolean => {
    if (!order || order.status !== 'Delivered') return false;
    if ((order as any).isReturned || (order as any).status === 'Returned' || (order as any).status === 'Cancelled')
      return false;

    let deliveryTime: number | null = null;
    const o = order as any;

    if (o.shipping?.deliveredAt) {
      deliveryTime = new Date(o.shipping.deliveredAt).getTime();
    } else if (o.deliveredAt) {
      deliveryTime = new Date(o.deliveredAt).getTime();
    } else if (o.updatedAt && o.status === 'Delivered') {
      deliveryTime = new Date(o.updatedAt).getTime();
    } else if (o.createdAt) {
      deliveryTime = new Date(o.createdAt).getTime();
    } else if (o.date) {
      deliveryTime = new Date(o.date).getTime();
    }

    if (!deliveryTime || isNaN(deliveryTime)) return true;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - deliveryTime <= SEVEN_DAYS_MS;
  };

  // Compute return policy status
  const getReturnPolicyStatus = (order: Order) => {
    if (!order || order.status !== 'Delivered') return null;

    let deliveryTime: number | null = null;
    const o = order as any;

    if (o.shipping?.deliveredAt) {
      deliveryTime = new Date(o.shipping.deliveredAt).getTime();
    } else if (o.deliveredAt) {
      deliveryTime = new Date(o.deliveredAt).getTime();
    } else if (o.updatedAt && o.status === 'Delivered') {
      deliveryTime = new Date(o.updatedAt).getTime();
    } else if (o.createdAt) {
      deliveryTime = new Date(o.createdAt).getTime();
    } else if (o.date) {
      deliveryTime = new Date(o.date).getTime();
    }

    if (!deliveryTime || isNaN(deliveryTime)) {
      const fallbackEnd = new Date();
      fallbackEnd.setDate(fallbackEnd.getDate() + 7);
      const formattedEnd = fallbackEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return { isLive: true, daysLeft: 7, text: `Return window: 7 days left (${formattedEnd})`, formattedEnd };
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const policyEndTime = deliveryTime + SEVEN_DAYS_MS;
    const policyEndDate = new Date(policyEndTime);
    const formattedEnd = policyEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    const now = Date.now();
    const timeDiff = policyEndTime - now;
    const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (timeDiff > 0 && daysLeft > 0) {
      return {
        isLive: true,
        daysLeft,
        text: `Return window: ${daysLeft} day${daysLeft > 1 ? 's' : ''} left (until ${formattedEnd})`,
        formattedEnd
      };
    }

    return { isLive: false, daysLeft: 0, text: `Return window closed on ${formattedEnd}`, formattedEnd };
  };

  const handleProceedToConfirmReturn = () => {
    if (!returnReason) {
      showToast('Please choose a reason for returning the product.');
      return;
    }
    if (returnReason === 'Other' && !returnOtherText.trim()) {
      showToast('Please enter your custom return reason.');
      return;
    }
    setReturnStep('confirm');
  };

  const handleConfirmReturn = async () => {
    if (!returningOrder) return;
    setReturnStatus('processing');
    const finalReason = returnReason === 'Other' ? returnOtherText : returnReason;

    try {
      const orderIdToReturn = returningOrder._id || returningOrder.id;
      const res = await returnOrder(orderIdToReturn, finalReason);

      if (res && res.success) {
        addOrderTimelineEvent(returningOrder.id, 'Returned', `Return requested by customer. Reason: ${finalReason}`);

        if (activeOrder && (activeOrder.id === returningOrder.id || activeOrder._id === returningOrder._id)) {
          setActiveOrder((prev) => (prev ? { ...prev, status: 'Returned' } : null));
        }

        setReturnStatus('success');
      } else {
        setReturnStatus('error');
        setReturnErrorMessage(res?.message || 'Unable to process return request.');
      }
    } catch (err: any) {
      setReturnStatus('error');
      setReturnErrorMessage(err?.response?.data?.message || err?.message || 'Return failed.');
    }
  };

  // Date filtering logic
  const matchDate = (orderDateStr: string) => {
    if (dateFilter === 'all') return true;
    const orderDate = new Date(orderDateStr);
    if (isNaN(orderDate.getTime())) return true;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (dateFilter === '30days') return diffDays <= 30;
    if (dateFilter === '6months') return diffDays <= 180;
    if (dateFilter === '2026') return orderDate.getFullYear() === 2026;
    return true;
  };

  // Status mapping logic
  const matchStatus = (orderStatus: string, orderObj?: any) => {
    if (statusTab === 'All') return true;
    if (statusTab === 'Progress') {
      return ['Pending', 'Confirmed', 'Packed', 'Ready for Dispatch', 'Shipped', 'Out for Delivery'].includes(orderStatus);
    }
    if (statusTab === 'Delivered') {
      return orderStatus === 'Delivered';
    }
    if (statusTab === 'Returns') {
      return ['Return Requested', 'Returned', 'Refunded'].includes(orderStatus) || Boolean(orderObj?.isReturned);
    }
    if (statusTab === 'Cancelled') {
      return orderStatus === 'Cancelled';
    }
    return true;
  };

  // Search logic
  const matchSearch = (order: Order) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchId = (order.id || '').toLowerCase().includes(q);
    const items = Array.isArray(order.items)
      ? order.items
      : typeof order.items === 'string'
      ? (() => {
          try {
            return JSON.parse(order.items);
          } catch {
            return [];
          }
        })()
      : [];
    const matchProducts = items.some((i: any) => i?.product?.name?.toLowerCase().includes(q));
    return matchId || matchProducts;
  };

  const getOrderTime = (o: any) => {
    if (o.createdAt) {
      const t = new Date(o.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (o.date) {
      const t = new Date(o.date).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    return 0;
  };

  // Process list
  const processedOrders = (orders || [])
    .filter((o: any) => matchDate(o.createdAt || o.date) && matchStatus(o.status, o) && matchSearch(o))
    .sort((a: any, b: any) => {
      const timeA = getOrderTime(a);
      const timeB = getOrderTime(b);
      if (timeA !== timeB) {
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      }
      const idA = String(a.id || a._id || '');
      const idB = String(b.id || b._id || '');
      return sortBy === 'newest' ? idB.localeCompare(idA, undefined, { numeric: true }) : idA.localeCompare(idB, undefined, { numeric: true });
    });

  // Calculate count metrics for tab badges
  const totalOrdersCount = (orders || []).length;
  const inTransitCount = (orders || []).filter((o: any) =>
    ['Pending', 'Confirmed', 'Packed', 'Ready for Dispatch', 'Shipped', 'Out for Delivery'].includes(o.status)
  ).length;
  const deliveredCount = (orders || []).filter((o: any) => o.status === 'Delivered').length;
  const returnsCount = (orders || []).filter((o: any) =>
    ['Return Requested', 'Returned', 'Refunded'].includes(o.status) || Boolean(o.isReturned)
  ).length;
  const cancelledCount = (orders || []).filter((o: any) => o.status === 'Cancelled').length;

  /* ── Modal Renderers ── */
  const renderCancelModal = () => {
    if (!cancellingOrder) return null;
    return (
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none"
        onClick={() => {
          if (cancellationStatus !== 'processing') setCancellingOrder(null);
        }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full border border-slate-200 p-6 sm:p-7 animate-scaleIn relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-950">Request Cancellation</h3>
            <button
              onClick={() => setCancellingOrder(null)}
              className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-950 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {cancellationStatus === 'idle' && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Please tell us why you wish to cancel <span className="font-bold text-slate-950">Order #{cancellingOrder.id}</span>.
              </p>

              <div>
                <label className="form-label text-xs font-bold text-slate-900 block mb-1.5">Reason for cancellation</label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="select-field text-xs min-h-[44px]"
                >
                  <option value="">Select cancellation reason...</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Found a better price elsewhere">Found a better price elsewhere</option>
                  <option value="Delivery time is too long">Delivery time is too long</option>
                  <option value="Need to change shipping address">Need to change shipping address</option>
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>

              {cancellationReason === 'Other' && (
                <div>
                  <label className="form-label text-xs font-bold text-slate-900 block mb-1.5">Additional details</label>
                  <textarea
                    rows={3}
                    value={cancellationOtherText}
                    onChange={(e) => setCancellationOtherText(e.target.value)}
                    placeholder="Please explain the reason..."
                    className="textarea-field text-xs"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="btn-secondary flex-1 text-xs font-bold min-h-[44px]"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancellation}
                  disabled={!cancellationReason}
                  className="btn-primary flex-1 text-xs font-bold min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          )}

          {cancellationStatus === 'processing' && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-slate-950 mx-auto" />
              <p className="text-xs font-bold text-slate-900">Processing cancellation...</p>
            </div>
          )}

          {cancellationStatus === 'success' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-700">
                <CheckCircle size={26} />
              </div>
              <h4 className="text-base font-black text-slate-950">Order Cancelled</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Your order has been cancelled and any paid balance will be refunded within 3-5 business days.
              </p>
              <button
                onClick={() => {
                  setCancellingOrder(null);
                  setCancellationStatus('idle');
                }}
                className="btn-primary text-xs font-bold px-6 min-h-[44px] mt-2"
              >
                Close
              </button>
            </div>
          )}

          {cancellationStatus === 'error' && (
            <div className="py-8 text-center space-y-3">
              <AlertTriangle size={32} className="text-rose-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-950">Cancellation Failed</h4>
              <p className="text-xs text-slate-600">{cancellationErrorMessage}</p>
              <button
                onClick={() => setCancellationStatus('idle')}
                className="btn-secondary text-xs font-bold px-5 min-h-[44px] mt-2"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReturnModal = () => {
    if (!returningOrder) return null;
    return (
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm select-none"
        onClick={() => {
          if (returnStatus !== 'processing') setReturningOrder(null);
        }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full border border-slate-200 p-6 sm:p-7 animate-scaleIn relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Undo size={18} className="text-slate-900" />
              <h3 className="text-base font-bold text-slate-950">Return or Replace</h3>
            </div>
            <button
              onClick={() => setReturningOrder(null)}
              className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-950 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {returnStatus === 'idle' && returnStep === 'reason' && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Select a verified return reason for <span className="font-bold text-slate-950">Order #{returningOrder.id}</span>:
              </p>

              <div>
                <label className="form-label text-xs font-bold text-slate-900 block mb-1.5">Reason for return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="select-field text-xs min-h-[44px]"
                >
                  <option value="">Select reason...</option>
                  <option value="Defective or damaged product">Defective or damaged product</option>
                  <option value="Wrong item delivered">Wrong item delivered</option>
                  <option value="Quality not as expected">Quality not as expected</option>
                  <option value="Missing items or accessories">Missing items or accessories</option>
                  <option value="Product no longer needed">Product no longer needed</option>
                  <option value="Other">Other (custom reason)</option>
                </select>
              </div>

              {returnReason === 'Other' && (
                <div>
                  <label className="form-label text-xs font-bold text-slate-900 block mb-1.5">Please specify</label>
                  <textarea
                    rows={3}
                    value={returnOtherText}
                    onChange={(e) => setReturnOtherText(e.target.value)}
                    placeholder="Provide additional details..."
                    className="textarea-field text-xs"
                  />
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-slate-900 shrink-0 mt-0.5" />
                <span className="leading-relaxed">Courier will inspect the item at doorstep pickup. Refund is initiated immediately upon handover.</span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setReturningOrder(null)}
                  className="btn-secondary flex-1 text-xs font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToConfirmReturn}
                  disabled={!returnReason || (returnReason === 'Other' && !returnOtherText.trim())}
                  className="btn-primary flex-1 text-xs font-bold min-h-[44px] disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {returnStatus === 'idle' && returnStep === 'confirm' && (
            <div className="mt-4 space-y-4 animate-fadeIn">
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-center space-y-1">
                <h4 className="text-sm font-bold text-amber-950">Confirm Return Request</h4>
                <p className="text-xs text-amber-900 font-medium">
                  Reason: <span className="font-bold">{returnReason === 'Other' ? returnOtherText : returnReason}</span>
                </p>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                Our logistics courier will arrive at your registered address within 48 hours for item pickup.
              </p>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setReturnStep('reason')}
                  className="btn-secondary flex-1 text-xs font-bold min-h-[44px]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReturn}
                  className="btn-primary flex-1 text-xs font-bold min-h-[44px] bg-slate-950 text-white"
                >
                  Confirm Return
                </button>
              </div>
            </div>
          )}

          {returnStatus === 'processing' && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-slate-950 mx-auto" />
              <p className="text-xs font-bold text-slate-900">Scheduling return pickup...</p>
            </div>
          )}

          {returnStatus === 'success' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-700">
                <CheckCircle size={26} />
              </div>
              <h4 className="text-base font-black text-slate-950">Return Scheduled</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Your return request has been confirmed. A courier representative will contact you for doorstep pickup.
              </p>
              <button
                onClick={() => {
                  setReturningOrder(null);
                  setReturnStatus('idle');
                }}
                className="btn-primary text-xs font-bold px-6 min-h-[44px] mt-2"
              >
                Done
              </button>
            </div>
          )}

          {returnStatus === 'error' && (
            <div className="py-8 text-center space-y-3">
              <AlertTriangle size={32} className="text-rose-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-950">Return Request Failed</h4>
              <p className="text-xs text-slate-600">{returnErrorMessage || 'Unable to process return request.'}</p>
              <button
                onClick={() => setReturnStatus('idle')}
                className="btn-secondary text-xs font-bold px-5 min-h-[44px] mt-2"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ───────────────────────────────────────────────────────────────────
     VIEW: DEDICATED MODERN ORDER DETAILS PAGE VIEW
     ─────────────────────────────────────────────────────────────────── */
  if (activeOrder) {
    const items = Array.isArray(activeOrder.items)
      ? activeOrder.items
      : typeof activeOrder.items === 'string'
      ? (() => {
          try {
            return JSON.parse(activeOrder.items);
          } catch {
            return [];
          }
        })()
      : [];

    const selectedItem = items[selectedItemIdx] || items[0] || {};
    const selectedProd = selectedItem.product || selectedItem || {};
    const rawImgs: string[] = Array.isArray(selectedProd.imgs) && selectedProd.imgs.length > 0
      ? selectedProd.imgs
      : selectedProd.img
      ? [selectedProd.img]
      : [];
    const activeImg = rawImgs[selectedImgIdx] || rawImgs[0] || '';

    const isCancelled = activeOrder.status === 'Cancelled';
    const isReturnState = ['Return Requested', 'Returned', 'Refunded'].includes(activeOrder.status);
    const cfg = getStatusConfig(activeOrder.status);
    const StatusIcon = cfg.icon;

    // Delivery Stepper Calculation
    const stepperMilestones = [
      { key: 'placed', label: 'Order Placed' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'packed', label: 'Packed' },
      { key: 'shipped', label: 'Shipped' },
      { key: 'delivered', label: 'Delivered' }
    ];

    const getActiveStepperIdx = (status: string) => {
      switch (status) {
        case 'Pending':
          return 0;
        case 'Confirmed':
          return 1;
        case 'Packed':
        case 'Ready for Dispatch':
          return 2;
        case 'Shipped':
        case 'Out for Delivery':
          return 3;
        case 'Delivered':
        case 'Return Requested':
        case 'Returned':
        case 'Refunded':
          return 4;
        default:
          return 0;
      }
    };

    const currentStepIdx = getActiveStepperIdx(activeOrder.status);

    return (
      <div className="w-full min-h-screen bg-[#FAFBFD] pb-24">
        {/* Cancel & Return Modals */}
        {renderCancelModal()}
        {renderReturnModal()}

        {/* ── Details Header & Breadcrumb ── */}
        <div className="bg-white border-b border-slate-200 py-6">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-xs text-slate-600 mb-3 select-none" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => setCurPage('home')}
                className="text-slate-600 hover:text-slate-950 font-medium transition-colors cursor-pointer"
              >
                Home
              </button>
              <ChevronRight size={12} className="text-slate-400" />
              <button
                type="button"
                onClick={() => handleSelectOrder(null)}
                className="text-slate-600 hover:text-slate-950 font-medium transition-colors cursor-pointer"
              >
                Returns &amp; Orders
              </button>
              <ChevronRight size={12} className="text-slate-400" />
              <span className="text-slate-950 font-mono font-bold">{activeOrder.id}</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Order Details</h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    <StatusIcon size={14} />
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Ordered on <span className="font-bold text-slate-900">{activeOrder.date}</span> • Order Reference <span className="font-mono font-bold text-slate-950">{activeOrder.id}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setInvoiceOrder(activeOrder)}
                  className="btn-secondary text-xs font-bold min-h-[44px] px-4 flex items-center gap-2 shadow-2xs hover:bg-slate-100 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectOrder(null)}
                  className="btn-primary text-xs font-bold min-h-[44px] px-5 flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
                >
                  <ArrowLeft size={15} />
                  <span>All Orders</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Details 2-Column Split Layout ── */}
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ── LEFT COLUMN: STICKY PRODUCT GALLERY & VERTICAL THUMBNAIL RAIL (50% Width) ── */}
            <div className="lg:col-span-6 xl:col-span-6 lg:sticky lg:top-[90px] self-start space-y-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
                {/* Gallery Header Bar */}
                <div className="flex items-center justify-between gap-2 mb-4 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Product Visualizer
                    </span>
                    {rawImgs.length > 1 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                        {Math.min(selectedImgIdx + 1, rawImgs.length)} / {rawImgs.length}
                      </span>
                    )}
                  </div>
                  {rawImgs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsImgZoomed(!isImgZoomed)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-950 flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                      title={isImgZoomed ? "Reset view" : "Zoom view"}
                    >
                      {isImgZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                      <span className="text-[11px] font-bold">{isImgZoomed ? 'Reset' : 'Zoom'}</span>
                    </button>
                  )}
                </div>

                {/* Gallery Stage: Left-most Vertical Thumbnails + Right Full Hero View */}
                <div className="flex gap-3 sm:gap-4 items-start">
                  {/* Left-most Vertical Thumbnails Stacked One Below the Other */}
                  {(rawImgs.length > 1 || items.length > 1) && (
                    <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[380px] sm:max-h-[440px] scrollbar-thin pr-1.5 shrink-0 select-none">
                      {/* Product's multiple images */}
                      {rawImgs.map((imgUrl, imgIdx) => {
                        const isSelected = imgIdx === selectedImgIdx;
                        return (
                          <button
                            key={imgIdx}
                            type="button"
                            onClick={() => {
                              setSelectedImgIdx(imgIdx);
                              setIsImgZoomed(false);
                            }}
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 border p-1.5 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden group ${
                              isSelected
                                ? 'border-slate-950 ring-2 ring-slate-950/20 shadow-xs'
                                : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                            }`}
                            aria-label={`View image ${imgIdx + 1}`}
                          >
                            <img
                              src={imgUrl}
                              alt={`Thumbnail ${imgIdx + 1}`}
                              className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover:scale-105"
                            />
                          </button>
                        );
                      })}

                      {/* If multi-item order, also show thumbnails of other items */}
                      {items.length > 1 && (
                        <>
                          <div className="h-px bg-slate-200 my-1 w-full" />
                          {items.map((it: any, itIdx: number) => {
                            if (itIdx === selectedItemIdx) return null;
                            const itProd = it.product || it || {};
                            const itImg = itProd.imgs?.[0] || itProd.img || it.img;
                            return (
                              <button
                                key={`item-${itIdx}`}
                                type="button"
                                title={`Switch to ${itProd.name || `Item ${itIdx + 1}`}`}
                                onClick={() => {
                                  setSelectedItemIdx(itIdx);
                                  setSelectedImgIdx(0);
                                  setIsImgZoomed(false);
                                }}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 border border-dashed border-slate-300 hover:border-slate-950 p-1.5 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden group opacity-60 hover:opacity-100"
                              >
                                {itImg ? (
                                  <img
                                    src={itImg}
                                    alt={itProd.name}
                                    className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <Package size={18} className="text-slate-400" />
                                )}
                                <span className="absolute bottom-0.5 right-0.5 bg-slate-900 text-white text-[9px] font-bold px-1 rounded">
                                  #{itIdx + 1}
                                </span>
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}

                  {/* Main Full View Stage */}
                  <div className="flex-1 min-w-0">
                    <div className="aspect-square bg-slate-50/80 border border-slate-200 rounded-2xl flex items-center justify-center p-5 relative overflow-hidden group select-none">
                      {activeImg ? (
                        <img
                          src={activeImg}
                          alt={selectedProd.name || 'Product Image'}
                          className={`w-full h-full object-contain mix-blend-multiply transition-all duration-300 ${
                            isImgZoomed ? 'scale-135 cursor-zoom-out' : 'scale-100 group-hover:scale-105 cursor-zoom-in'
                          }`}
                          onClick={() => setIsImgZoomed(!isImgZoomed)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                          <Package size={44} strokeWidth={1.5} />
                          <span className="text-xs font-medium">No Image Available</span>
                        </div>
                      )}

                      {/* Category Badge */}
                      {selectedProd.cat && (
                        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-700 shadow-2xs">
                          {selectedProd.cat}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selected Item Information Strip */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5 select-none">
                      Selected Item Preview
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-950 leading-snug">
                      {selectedProd.name || 'Order Item'}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50/90 rounded-xl p-3 border border-slate-100 select-none">
                    <div className="text-xs text-slate-600">
                      <span>Qty: <strong className="text-slate-950 font-bold">{selectedItem.quantity || 1}</strong></span>
                      <span className="mx-2">•</span>
                      <span>Unit: <strong className="text-slate-950 font-bold font-price">₹{(selectedProd.price || selectedItem.price || 0).toLocaleString('en-IN')}</strong></span>
                    </div>
                    <span className="text-sm font-black font-price text-slate-950">
                      ₹{(((selectedItem.quantity || 1) * (selectedProd.price || selectedItem.price || 0))).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 select-none">
                    {selectedProd.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId(selectedProd.id);
                          setCurPage('product-detail');
                        }}
                        className="btn-secondary text-xs font-bold min-h-[42px] py-2 px-3 flex-1 flex items-center justify-center gap-1.5 shadow-2xs hover:bg-slate-100 cursor-pointer"
                      >
                        <span>Product Page</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(selectedProd, 1);
                        showToast(`${selectedProd.name || 'Item'} added to cart!`);
                      }}
                      className="btn-primary text-xs font-bold min-h-[42px] py-2 px-3 flex-1 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Buy Again</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: COMPLETE ORDER DETAILS (50% Width for Visual Balance) ── */}
            <div className="lg:col-span-6 xl:col-span-6 space-y-6 flex flex-col">
              
              {/* 1. Dispatch & Delivery Stepper Card */}
              {isCancelled ? (
                <div className="bg-rose-50 border border-rose-300 rounded-2xl p-6 sm:p-7 shadow-xs select-none">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                      <X size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-rose-950">Order Has Been Cancelled</h3>
                      <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                        This order was cancelled. No packaging, dispatch, or delivery steps will be processed. Any paid balance will be refunded to your source account.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs select-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100 mb-6">
                    <div>
                      <h3 className="text-base font-bold text-slate-950">
                        {isReturnState ? 'Return & Refund Status' : activeOrder.status === 'Delivered' ? 'Delivered' : 'Dispatch & Delivery Progress'}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        Carrier: <span className="font-bold text-slate-900">{activeOrder.courierCompany || 'Delhivery Express'}</span> • Tracking AWB: <span className="font-mono font-bold text-slate-950">{activeOrder.trackingId || 'DEL-92841029'}</span>
                      </p>
                    </div>
                    {activeOrder.status === 'Delivered' && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3.5 py-1 rounded-full self-start sm:self-auto">
                        Package Delivered
                      </span>
                    )}
                  </div>

                  {/* Visual Horizontal Stepper */}
                  <div className="relative select-none pt-2 pb-1">
                    {/* Background & Progress Line connecting Circle Centers (10% to 90%) */}
                    <div className="absolute top-[28px] left-[10%] right-[10%] -translate-y-1/2 h-[3px] bg-slate-200 z-0 rounded-full pointer-events-none">
                      <div
                        className="h-full bg-slate-950 transition-all duration-500 rounded-full"
                        style={{ width: `${(Math.min(currentStepIdx, 4) / 4) * 100}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-5 relative z-10">
                      {stepperMilestones.map((step, sIdx) => {
                        const isDone = sIdx <= currentStepIdx;
                        const isCurrent = sIdx === currentStepIdx;
                        return (
                          <div key={step.key} className="flex flex-col items-center text-center">
                            <div
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                                isCurrent
                                  ? 'bg-slate-950 text-white ring-2 sm:ring-4 ring-slate-200 scale-105 shadow-xs font-mono'
                                  : isDone
                                  ? 'bg-slate-950 text-white shadow-xs'
                                  : 'bg-white border-2 border-slate-300 text-slate-500 shadow-xs font-mono'
                              }`}
                            >
                              {isDone ? (
                                <Check size={14} strokeWidth={2.5} className="shrink-0 text-white" />
                              ) : (
                                <span>{sIdx + 1}</span>
                              )}
                            </div>
                            <span className={`text-[9px] sm:text-xs mt-2 leading-tight break-words px-0.5 max-w-[64px] sm:max-w-[90px] ${isCurrent ? 'font-bold text-slate-950' : isDone ? 'text-slate-800 font-semibold' : 'text-slate-500 font-medium'}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Return Policy Notice if Delivered */}
                  {activeOrder.status === 'Delivered' && (
                    <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                        <span>
                          {getReturnPolicyStatus(activeOrder)?.text || '7-day hassle-free return window applicable'}
                        </span>
                      </div>
                      {isReturnEligible(activeOrder) && (
                        <button
                          type="button"
                          onClick={() => handleOpenReturnModal(activeOrder)}
                          className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer min-h-[44px] flex items-center"
                        >
                          Initiate Return or Replacement
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Items in Order Breakdown Card */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between select-none">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">
                      Items in this Order ({items.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Click any item to inspect its photos and gallery on the left</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReorder(activeOrder)}
                    className="text-xs font-bold text-slate-800 hover:text-slate-950 flex items-center gap-1.5 cursor-pointer min-h-[38px] px-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <RotateCcw size={14} /> <span>Buy all again</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {items.map((it: any, idx: number) => {
                    const prod = it.product || it || {};
                    const unitPrice = prod.price || it.price || 0;
                    const isFocus = idx === selectedItemIdx;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedItemIdx(idx);
                          setSelectedImgIdx(0);
                          setIsImgZoomed(false);
                        }}
                        className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors cursor-pointer ${
                          isFocus ? 'bg-slate-50/80 ring-1 ring-inset ring-slate-950/10' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0">
                            {prod.imgs && prod.imgs.length > 0 ? (
                              <img src={prod.imgs[0]} alt={prod.name} className="w-full h-full object-contain mix-blend-multiply" />
                            ) : prod.img ? (
                              <img src={prod.img} alt={prod.name} className="w-full h-full object-contain mix-blend-multiply" />
                            ) : (
                              <Package size={26} className="text-slate-400" />
                            )}
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                              {prod.cat || 'Essential'}
                            </span>
                            <h4
                              onClick={(e) => {
                                e.stopPropagation();
                                if (prod.id) {
                                  setSelectedProductId(prod.id);
                                  setCurPage('product-detail');
                                }
                              }}
                              className="text-sm font-bold text-slate-950 hover:underline cursor-pointer leading-snug line-clamp-2"
                            >
                              {prod.name || 'Order Item'}
                            </h4>
                            <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
                              <span>Qty: <strong className="text-slate-950 font-bold">{it.quantity || 1}</strong></span>
                              <span>•</span>
                              <span>Unit Price: <strong className="text-slate-950 font-bold font-price">₹{unitPrice.toLocaleString('en-IN')}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end justify-between items-center gap-2.5 shrink-0 select-none pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <span className="text-base font-black text-slate-950 font-price">
                            ₹{((it.quantity || 1) * unitPrice).toLocaleString('en-IN')}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                addToCart(prod, 1);
                                showToast(`${prod.name || 'Item'} added to cart!`);
                              }}
                              className="btn-secondary text-xs font-bold min-h-[38px] px-3.5 cursor-pointer"
                            >
                              Buy again
                            </button>
                            {activeOrder.status === 'Delivered' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (prod.id) {
                                    setSelectedProductId(prod.id);
                                    setCurPage('product-detail');
                                  }
                                }}
                                className="btn-secondary text-xs font-bold min-h-[38px] px-3.5 cursor-pointer"
                              >
                                Review
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Delivery Address & Payment Method in a 2-Column Subgrid with Equal Height */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Shipping Address */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between h-full space-y-4 select-none">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 pb-3 border-b border-slate-100 mb-3">
                      <MapPin size={15} className="text-slate-900" />
                      <span>Delivery Address</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-950">
                        {activeOrder.address?.name || curUser?.name || 'Valued Customer'}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed mt-1.5">
                        {(() => {
                          const addr = activeOrder.address;
                          const parts = [];
                          if (addr?.addressLine1) parts.push(addr.addressLine1);
                          if (addr?.addressLine2) parts.push(addr.addressLine2);
                          if (addr?.city) parts.push(addr.city);
                          if (addr?.state) parts.push(addr.state);
                          let str = parts.join(', ');
                          if (addr?.pincode) str += str ? ` - ${addr.pincode}` : addr.pincode;
                          return str || 'Address on file';
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-600 font-mono font-semibold">
                      Phone: {activeOrder.address?.phone || curUser?.phoneNumber || curUser?.phone || 'Not provided'}
                    </p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between h-full space-y-4 select-none">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 pb-3 border-b border-slate-100 mb-3">
                      <CreditCard size={15} className="text-slate-900" />
                      <span>Payment Method</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-950">{activeOrder.paymentMethod || 'Online Payment'}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-300">
                          Paid
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Transaction processed via 256-bit secure gateway.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-600 font-medium">
                      Billing Status: <span className="font-bold text-slate-950">Verified &amp; Cleared</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Price & Order Summary */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 select-none">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-2 border-b border-slate-100">
                  Order Summary
                </h4>
                <div className="space-y-2.5 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600 font-medium">Items Subtotal</span>
                    <span className="font-bold text-slate-900 font-price">₹{activeOrder.total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-slate-600 font-medium">Shipping &amp; Packaging</span>
                    <span className="font-bold text-emerald-800">FREE</span>
                  </div>
                  {activeOrder.discount ? (
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-600 font-medium">Promo Discount</span>
                      <span className="font-bold text-emerald-800 font-price">-₹{activeOrder.discount}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-baseline pt-3 text-sm font-bold text-slate-950">
                    <span>Grand Total</span>
                    <span className="text-xl font-black font-price text-slate-950 tracking-tight">₹{activeOrder.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* 5. Milestone Activity Log */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs select-none">
                <h3 className="text-sm font-bold text-slate-950 mb-5 pb-3 border-b border-slate-100">
                  Milestone Activity Log
                </h3>
                <div className="space-y-4">
                  {getTimelineEvents(activeOrder).map((ev: any, evIdx: number, evArr: any[]) => {
                    const isLatest = evIdx === 0;
                    const isLast = evIdx === evArr.length - 1;
                    return (
                      <div key={evIdx} className="flex gap-3.5 text-xs">
                        <div className="flex flex-col items-center shrink-0 w-4 pt-1">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${isLatest ? 'bg-slate-950 ring-4 ring-slate-200' : 'bg-slate-400'}`} />
                          {!isLast && <div className="w-[2px] flex-1 bg-slate-200 my-1 min-h-[24px]" />}
                        </div>
                        <div className="pb-3 flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className={`font-bold ${isLatest ? 'text-slate-950 text-sm' : 'text-slate-800'}`}>{ev.status}</span>
                            <span className="text-[11px] font-semibold text-slate-500 font-mono">{ev.date}</span>
                          </div>
                          {ev.notes && <p className="text-slate-600 text-xs mt-1 leading-relaxed">{ev.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6. Order Actions Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 select-none">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-2 border-b border-slate-100">
                  Order Actions
                </h4>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setInvoiceOrder(activeOrder)}
                    className="btn-secondary w-full text-xs font-bold min-h-[44px] flex items-center justify-center gap-2 shadow-2xs hover:bg-slate-100 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>Print Invoice</span>
                  </button>
                  {!isCancelled && ['Pending', 'Confirmed', 'Packed', 'Ready for Dispatch'].includes(activeOrder.status) && (
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(activeOrder)}
                      className="w-full min-h-[44px] rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                    >
                      Cancel Order
                    </button>
                  )}
                  {!isCancelled && activeOrder.status === 'Delivered' && isReturnEligible(activeOrder) && (
                    <button
                      type="button"
                      onClick={() => handleOpenReturnModal(activeOrder)}
                      className="w-full min-h-[44px] rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                    >
                      Return or Replace Items
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ───────────────────────────────────────────────────────────────────
     VIEW: MAIN RETURNS & ORDERS LISTING VIEW
     ─────────────────────────────────────────────────────────────────── */
  return (
    <div className="w-full min-h-screen bg-[#FAFBFD] pb-24">
      {/* Header Block */}
      <div className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-slate-600 mb-3" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={() => setCurPage('home')}
              className="text-slate-600 hover:text-slate-950 font-medium transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-slate-950 font-bold">Returns &amp; Orders</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Returns &amp; Orders
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Manage your orders, track active shipments, review return policies, and download invoices.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurPage('products')}
              className="btn-secondary text-xs font-bold min-h-[44px] px-4 self-start sm:self-auto shadow-xs hover:bg-slate-100 cursor-pointer flex items-center"
            >
              Browse Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Controls Toolbar: Tabs + Search + Date Filter */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center select-none">
          {/* Status Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: 'All', label: 'All Orders', count: totalOrdersCount },
              { id: 'Progress', label: 'In Transit', count: inTransitCount },
              { id: 'Delivered', label: 'Delivered', count: deliveredCount },
              { id: 'Returns', label: 'Returns & Refunds', count: returnsCount },
              { id: 'Cancelled', label: 'Cancelled', count: cancelledCount }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id as any)}
                className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  statusTab === tab.id
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                      statusTab === tab.id ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search and Date Selectors */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-[320px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order ID or item..."
                className="input-field pl-10 pr-8 text-xs min-h-[44px] py-2 bg-slate-50 border-slate-200 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 cursor-pointer w-6 h-6 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="border border-slate-200 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none cursor-pointer min-h-[44px] shadow-2xs hover:border-slate-300 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              aria-label="Filter orders by date"
            >
              <option value="all">All Orders</option>
              <option value="30days">Past 30 Days</option>
              <option value="6months">Past 6 Months</option>
              <option value="2026">Year 2026</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-slate-200 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none cursor-pointer min-h-[44px] shadow-2xs hover:border-slate-300 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              aria-label="Sort orders"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Orders Listing Area */}
        {isLoading ? (
          <SkeletonLoader />
        ) : !orders || orders.length === 0 ? (
          /* Empty State: No Orders */
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center max-w-[480px] mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-500">
              <ShoppingBag size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-950 mb-1.5">No orders found</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 max-w-xs mx-auto">
              You have not placed any orders yet. Discover our premium collection in the store catalog.
            </p>
            <button
              type="button"
              onClick={() => setCurPage('products')}
              className="btn-primary text-xs font-bold min-h-[44px] px-6 cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        ) : processedOrders.length === 0 ? (
          /* Empty State: No matching filter results */
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-[480px] mx-auto shadow-xs">
            <AlertTriangle size={28} className="text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-950 mb-1">No matching results</h3>
            <p className="text-xs text-slate-600 mb-5">
              No orders matched your active search query or filter selection.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusTab('All');
                setDateFilter('all');
              }}
              className="btn-secondary text-xs font-bold min-h-[44px] px-5 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Orders Cards List */
          <div className="space-y-6">
            {processedOrders.map((order: any) => {
              const cfg = getStatusConfig(order.status);
              const StatusIcon = cfg.icon;

              const items = Array.isArray(order.items)
                ? order.items
                : typeof order.items === 'string'
                ? (() => {
                    try {
                      return JSON.parse(order.items);
                    } catch {
                      return [];
                    }
                  })()
                : [];

              const primaryItem = items[0];
              const totalQuantity = items.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
              const isCancelled = order.status === 'Cancelled';
              const isDelivered = order.status === 'Delivered';
              const isReturnState = ['Return Requested', 'Returned', 'Refunded'].includes(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-200"
                >
                  {/* Tier 1: Executive Card Header Bar */}
                  <div className="bg-slate-50/90 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-0.5">
                          Order Placed
                        </span>
                        <span className="font-bold text-slate-900">{order.date}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-0.5">
                          Total Paid
                        </span>
                        <span className="font-black text-slate-950 font-price text-sm">₹{order.total.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-0.5">
                          Ship To
                        </span>
                        <span className="font-bold text-slate-900 truncate max-w-[150px] block">
                          {order.address?.name || curUser?.name || 'Customer'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-700 font-bold text-xs">{order.id}</span>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => handleSelectOrder(order)}
                        className="font-bold text-slate-950 hover:underline cursor-pointer min-h-[44px] inline-flex items-center"
                      >
                        Order Details
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setInvoiceOrder(order)}
                        className="font-bold text-slate-950 hover:underline cursor-pointer min-h-[44px] inline-flex items-center"
                      >
                        Invoice
                      </button>
                    </div>
                  </div>

                  {/* Tier 2: Card Body */}
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left: Status Announcement & Product Items */}
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            <StatusIcon size={13} />
                            {cfg.label}
                          </span>
                          {isDelivered && (
                            <span className="text-xs font-semibold text-slate-700">
                              Package handed directly to customer
                            </span>
                          )}
                          {!isDelivered && !isCancelled && !isReturnState && (
                            <span className="text-xs font-semibold text-slate-700">
                              Carrier: {order.courierCompany || 'Delhivery Express'} • Expected soon
                            </span>
                          )}
                        </div>

                        {/* Items Presentation */}
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0 relative">
                            {primaryItem?.product?.imgs?.length > 0 ? (
                              <img
                                src={primaryItem.product.imgs[0]}
                                alt={primaryItem.product.name}
                                className="w-full h-full object-contain mix-blend-multiply"
                              />
                            ) : (
                              <Package size={26} className="text-slate-400" />
                            )}
                            {items.length > 1 && (
                              <span className="absolute bottom-1 right-1 bg-slate-950 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                +{items.length - 1}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              {primaryItem?.product?.cat || 'General Essential'}
                            </span>
                            <h3
                              onClick={() => handleSelectOrder(order)}
                              className="text-sm font-bold text-slate-950 hover:underline cursor-pointer line-clamp-1 leading-snug"
                            >
                              {primaryItem?.product?.name || 'Order Item'}
                            </h3>
                            <p className="text-xs text-slate-600">
                              Total items: <strong className="text-slate-950 font-bold">{totalQuantity}</strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex flex-row lg:flex-col gap-2.5 shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSelectOrder(order)}
                          className="btn-primary text-xs font-bold min-h-[44px] px-5 shadow-xs flex items-center justify-center cursor-pointer"
                        >
                          View Order Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(order)}
                          className="btn-secondary text-xs font-bold min-h-[44px] px-5 flex items-center justify-center shadow-xs hover:bg-slate-100 cursor-pointer"
                        >
                          Buy it again
                        </button>
                        {!isCancelled && isDelivered && isReturnEligible(order) && (
                          <button
                            type="button"
                            onClick={() => handleOpenReturnModal(order)}
                            className="text-xs font-bold text-amber-900 hover:text-amber-950 py-1.5 px-2 text-center underline cursor-pointer min-h-[40px] flex items-center justify-center"
                          >
                            Return or replace items
                          </button>
                        )}
                        {!isCancelled && ['Pending', 'Confirmed', 'Packed', 'Ready for Dispatch'].includes(order.status) && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(order)}
                            className="text-xs font-bold text-rose-800 hover:text-rose-900 py-1.5 px-2 text-center underline cursor-pointer min-h-[40px] flex items-center justify-center"
                          >
                            Cancel order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel & Return Modals */}
        {renderCancelModal()}
        {renderReturnModal()}
      </div>
    </div>
  );
};

export default Orders;
