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
  CreditCard
} from 'lucide-react';
import type { Order } from '../../../core/types';
import { useApp } from '../../../core/context/AppContext';
import { getSocket } from '../../../core/socket/socket';
import { SOCKET_EVENTS } from '../../../core/socket/socketEvents';

/* ─── Status Design System ─── */
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.FC<any>; label: string }> = {
  Pending: { color: 'text-[#8c571e]', bg: 'bg-[#fbf4ec]', border: 'border-[#e0c29f]', icon: Clock, label: 'Order Placed' },
  Confirmed: { color: 'text-[#262824]', bg: 'bg-[#eeede7]', border: 'border-[#dfdfd8]', icon: CheckSquare, label: 'Confirmed' },
  Packed: { color: 'text-[#262824]', bg: 'bg-[#eeede7]', border: 'border-[#dfdfd8]', icon: Package, label: 'Packed' },
  'Ready for Dispatch': { color: 'text-[#262824]', bg: 'bg-[#eeede7]', border: 'border-[#dfdfd8]', icon: Package, label: 'Ready for Dispatch' },
  Shipped: { color: 'text-[#262824]', bg: 'bg-[#eeede7]', border: 'border-[#dfdfd8]', icon: Truck, label: 'Shipped' },
  'Out for Delivery': { color: 'text-[#262824]', bg: 'bg-[#eeede7]', border: 'border-[#dfdfd8]', icon: MapPin, label: 'Out for Delivery' },
  Delivered: { color: 'text-[#3d6547]', bg: 'bg-[#edf3ee]', border: 'border-[#a8c6b0]', icon: CheckCircle, label: 'Delivered' },
  Cancelled: { color: 'text-[#8e2a2a]', bg: 'bg-[#f9eded]', border: 'border-[#d9a5a5]', icon: XCircle, label: 'Cancelled' },
  'Return Requested': { color: 'text-[#8c571e]', bg: 'bg-[#fbf4ec]', border: 'border-[#e0c29f]', icon: RotateCcw, label: 'Return Requested' },
  Returned: { color: 'text-[#777971]', bg: 'bg-[#f7f6f2]', border: 'border-[#dfdfd8]', icon: RotateCcw, label: 'Returned' },
  Refunded: { color: 'text-[#3d6547]', bg: 'bg-[#edf3ee]', border: 'border-[#a8c6b0]', icon: RotateCcw, label: 'Refund Completed' }
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status] || { color: 'text-[#262824]', bg: 'bg-[#f7f6f2]', border: 'border-[#dfdfd8]', icon: Package, label: status };

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
    setSelectedProductId,
    products
  } = useApp();

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const handleSelectOrder = (order: Order | null) => {
    setActiveOrder(order);
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



  // Handle re-ordering
  const handleReorder = (order: Order) => {
    const rawItems = Array.isArray(order.items)
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

    if (rawItems.length === 0) return;

    let addedCount = 0;
    const outOfStockItems: string[] = [];

    rawItems.forEach((item: any) => {
      const prod = item.product || item;
      const latestProd = products.find(
        (p: any) => p._id === prod._id || p.sku === prod.sku || p.id === prod.id || p.name === prod.name
      ) || prod;

      if ((latestProd.stock ?? 0) <= 0) {
        outOfStockItems.push(latestProd.name || 'Product');
      } else {
        const qtyToAdd = Math.min(item.quantity || 1, latestProd.stock);
        addToCart(latestProd, qtyToAdd);
        addedCount++;
      }
    });

    if (addedCount === 0) {
      showToast(
        `Cannot reorder: ${outOfStockItems.join(', ')} is currently out of stock.`
      );
      return;
    }

    if (outOfStockItems.length > 0) {
      showToast(
        `Added available items. Note: ${outOfStockItems.join(', ')} is currently out of stock.`
      );
    } else {
      showToast('Items re-added to cart! Redirecting to checkout...');
    }

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
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#262824]/60 backdrop-blur-xs select-none"
        onClick={() => {
          if (cancellationStatus !== 'processing') setCancellingOrder(null);
        }}
      >
        <div
          className="bg-white rounded-[2px] shadow-2xl max-w-[480px] w-full border border-[#dfdfd8] p-6 sm:p-7 animate-scaleIn relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-4 border-b border-[#dfdfd8]">
            <h3 className="font-display text-base font-bold text-[#262824] uppercase tracking-wider">Request Cancellation</h3>
            <button
              onClick={() => setCancellingOrder(null)}
              className="w-8 h-8 rounded-[2px] flex items-center justify-center text-[#777971] hover:text-[#262824] hover:bg-[#eeede7] cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {cancellationStatus === 'idle' && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-[#777971] leading-relaxed">
                Please tell us why you wish to cancel <span className="font-bold text-[#262824]">Order #{cancellingOrder.id}</span>.
              </p>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#777971] block mb-1.5">Reason for cancellation</label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] px-3.5 py-2.5 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
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
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#777971] block mb-1.5">Additional details</label>
                  <textarea
                    rows={3}
                    value={cancellationOtherText}
                    onChange={(e) => setCancellationOtherText(e.target.value)}
                    placeholder="Please explain the reason..."
                    className="w-full bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] p-3 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="btn-secondary flex-1 text-xs font-bold min-h-[42px]"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancellation}
                  disabled={!cancellationReason}
                  className="flex-1 text-xs font-bold min-h-[42px] bg-[#8e2a2a] hover:bg-[#722020] text-white rounded-[2px] disabled:opacity-50 transition-colors"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          )}

          {cancellationStatus === 'processing' && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={28} className="animate-spin text-[#262824] mx-auto" />
              <p className="text-xs font-bold text-[#262824]">Processing cancellation...</p>
            </div>
          )}

          {cancellationStatus === 'success' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-[2px] bg-[#edf3ee] border border-[#a8c6b0] flex items-center justify-center mx-auto text-[#3d6547]">
                <CheckCircle size={22} />
              </div>
              <h4 className="font-display text-base font-bold text-[#262824]">Order Cancelled</h4>
              <p className="text-xs text-[#777971] max-w-xs mx-auto leading-relaxed">
                Your order has been cancelled and any paid balance will be refunded within 3-5 business days.
              </p>
              <button
                onClick={() => {
                  setCancellingOrder(null);
                  setCancellationStatus('idle');
                }}
                className="btn-primary text-xs font-bold px-6 min-h-[42px] mt-2"
              >
                Close
              </button>
            </div>
          )}

          {cancellationStatus === 'error' && (
            <div className="py-8 text-center space-y-3">
              <AlertTriangle size={28} className="text-[#8e2a2a] mx-auto" />
              <h4 className="font-display text-base font-bold text-[#262824]">Cancellation Failed</h4>
              <p className="text-xs text-[#777971]">{cancellationErrorMessage}</p>
              <button
                onClick={() => setCancellationStatus('idle')}
                className="btn-secondary text-xs font-bold px-5 min-h-[42px] mt-2"
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
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#262824]/60 backdrop-blur-xs select-none"
        onClick={() => {
          if (returnStatus !== 'processing') setReturningOrder(null);
        }}
      >
        <div
          className="bg-white rounded-[2px] shadow-2xl max-w-[480px] w-full border border-[#dfdfd8] p-6 sm:p-7 animate-scaleIn relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-4 border-b border-[#dfdfd8]">
            <div className="flex items-center gap-2">
              <Undo size={16} className="text-[#262824]" />
              <h3 className="font-display text-base font-bold text-[#262824] uppercase tracking-wider">Return or Replace</h3>
            </div>
            <button
              onClick={() => setReturningOrder(null)}
              className="w-8 h-8 rounded-[2px] flex items-center justify-center text-[#777971] hover:text-[#262824] hover:bg-[#eeede7] cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {returnStatus === 'idle' && returnStep === 'reason' && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-[#777971] leading-relaxed">
                Select a verified return reason for <span className="font-bold text-[#262824]">Order #{returningOrder.id}</span>:
              </p>

              <div>
                <label className="text-[11px] uppercase tracking-wider font-bold text-[#777971] block mb-1.5">Reason for return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] px-3.5 py-2.5 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
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
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#777971] block mb-1.5">Please specify</label>
                  <textarea
                    rows={3}
                    value={returnOtherText}
                    onChange={(e) => setReturnOtherText(e.target.value)}
                    placeholder="Provide additional details..."
                    className="w-full bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] p-3 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                  />
                </div>
              )}

              <div className="p-3 bg-[#eeede7] border border-[#dfdfd8] rounded-[2px] text-xs text-[#777971] flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-[#262824] shrink-0 mt-0.5" />
                <span className="leading-relaxed">Courier will inspect the item at doorstep pickup. Refund is initiated immediately upon handover.</span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setReturningOrder(null)}
                  className="btn-secondary flex-1 text-xs font-bold min-h-[42px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToConfirmReturn}
                  disabled={!returnReason || (returnReason === 'Other' && !returnOtherText.trim())}
                  className="btn-primary flex-1 text-xs font-bold min-h-[42px] disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {returnStatus === 'idle' && returnStep === 'confirm' && (
            <div className="mt-4 space-y-4 animate-fadeIn">
              <div className="p-4 bg-[#fbf4ec] border border-[#e0c29f] rounded-[2px] text-center space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8c571e]">Confirm Return Request</h4>
                <p className="text-xs text-[#8c571e]">
                  Reason: <span className="font-bold">{returnReason === 'Other' ? returnOtherText : returnReason}</span>
                </p>
              </div>

              <p className="text-xs text-[#777971] leading-relaxed">
                Our logistics courier will arrive at your registered address within 48 hours for item pickup.
              </p>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setReturnStep('reason')}
                  className="btn-secondary flex-1 text-xs font-bold min-h-[42px]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReturn}
                  className="btn-primary flex-1 text-xs font-bold min-h-[42px]"
                >
                  Confirm Return
                </button>
              </div>
            </div>
          )}

          {returnStatus === 'processing' && (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={28} className="animate-spin text-[#262824] mx-auto" />
              <p className="text-xs font-bold text-[#262824]">Scheduling return pickup...</p>
            </div>
          )}

          {returnStatus === 'success' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-[2px] bg-[#edf3ee] border border-[#a8c6b0] flex items-center justify-center mx-auto text-[#3d6547]">
                <CheckCircle size={22} />
              </div>
              <h4 className="font-display text-base font-bold text-[#262824]">Return Scheduled</h4>
              <p className="text-xs text-[#777971] max-w-xs mx-auto leading-relaxed">
                Your return request has been confirmed. A courier representative will contact you for doorstep pickup.
              </p>
              <button
                onClick={() => {
                  setReturningOrder(null);
                  setReturnStatus('idle');
                }}
                className="btn-primary text-xs font-bold px-6 min-h-[42px] mt-2"
              >
                Done
              </button>
            </div>
          )}

          {returnStatus === 'error' && (
            <div className="py-8 text-center space-y-3">
              <AlertTriangle size={28} className="text-[#8e2a2a] mx-auto" />
              <h4 className="font-display text-base font-bold text-[#262824]">Return Request Failed</h4>
              <p className="text-xs text-[#777971]">{returnErrorMessage || 'Unable to process return request.'}</p>
              <button
                onClick={() => setReturnStatus('idle')}
                className="btn-secondary text-xs font-bold px-5 min-h-[42px] mt-2"
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
      <div className="w-full min-h-screen bg-[#f7f6f2] pb-24 text-[#262824]">
        {/* Cancel & Return Modals */}
        {renderCancelModal()}
        {renderReturnModal()}

        {/* ── Details Header & Breadcrumb ── */}
        <div className="bg-white border-b border-[#dfdfd8] py-6">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-xs text-[#777971] mb-3 select-none" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => setCurPage('home')}
                className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer"
              >
                Home
              </button>
              <ChevronRight size={12} className="text-[#dfdfd8]" />
              <button
                type="button"
                onClick={() => handleSelectOrder(null)}
                className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer"
              >
                Returns &amp; Orders
              </button>
              <ChevronRight size={12} className="text-[#dfdfd8]" />
              <span className="text-[#262824] font-mono font-bold">{activeOrder.id}</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#262824]">Order Details</h1>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[11px] font-bold border uppercase tracking-wider ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                    <StatusIcon size={13} />
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-[#777971] mt-1">
                  Ordered on <span className="font-bold text-[#262824]">{activeOrder.date}</span> • Order Reference <span className="font-mono font-bold text-[#262824]">{activeOrder.id}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setInvoiceOrder(activeOrder)}
                  className="btn-secondary text-xs font-bold min-h-[42px] px-4 flex items-center gap-2 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectOrder(null)}
                  className="btn-primary text-xs font-bold min-h-[42px] px-5 flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>All Orders</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Order Details Layout ── */}
        <div className="max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6 flex flex-col">
              
              {/* 1. Dispatch & Delivery Stepper Card */}
              {isCancelled ? (
                <div className="bg-[#f9eded] border border-[#d9a5a5] rounded-[2px] p-6 sm:p-7 select-none">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[2px] bg-[#eed2d2] flex items-center justify-center text-[#8e2a2a] shrink-0">
                      <X size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-[#8e2a2a]">Order Has Been Cancelled</h3>
                      <p className="text-xs text-[#8e2a2a] mt-1 leading-relaxed">
                        This order was cancelled. No packaging, dispatch, or delivery steps will be processed. Any paid balance will be refunded to your source account.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 sm:p-7 select-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-[#dfdfd8] mb-6">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#262824]">
                        {isReturnState ? 'Return & Refund Status' : activeOrder.status === 'Delivered' ? 'Delivered' : 'Dispatch & Delivery Progress'}
                      </h3>
                      <p className="text-xs text-[#777971] mt-1">
                        Carrier: <span className="font-bold text-[#262824]">{activeOrder.courierCompany || 'Delhivery Express'}</span> • Tracking AWB: <span className="font-mono font-bold text-[#262824]">{activeOrder.trackingId || 'DEL-92841029'}</span>
                      </p>
                    </div>
                    {activeOrder.status === 'Delivered' && (
                      <span className="text-xs font-bold text-[#3d6547] bg-[#edf3ee] border border-[#a8c6b0] px-3 py-1 rounded-[2px] self-start sm:self-auto">
                        Package Delivered
                      </span>
                    )}
                  </div>

                  {/* Visual Horizontal Stepper */}
                  <div className="relative select-none pt-2 pb-1">
                    {/* Background & Progress Line connecting Circle Centers */}
                    <div className="absolute top-[24px] left-[10%] right-[10%] -translate-y-1/2 h-[2px] bg-[#dfdfd8] z-0 rounded-full pointer-events-none">
                      <div
                        className="h-full bg-[#262824] transition-all duration-500 rounded-full"
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
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                                isCurrent
                                  ? 'bg-[#262824] text-white ring-2 ring-[#262824]/20 font-mono'
                                  : isDone
                                  ? 'bg-[#262824] text-white'
                                  : 'bg-white border border-[#dfdfd8] text-[#777971] font-mono'
                              }`}
                            >
                              {isDone ? (
                                <Check size={12} strokeWidth={2.5} className="shrink-0 text-white" />
                              ) : (
                                <span>{sIdx + 1}</span>
                              )}
                            </div>
                            <span className={`text-[9px] sm:text-xs mt-2 leading-tight break-words px-0.5 max-w-[64px] sm:max-w-[90px] ${isCurrent ? 'font-bold text-[#262824]' : isDone ? 'text-[#262824]' : 'text-[#777971]'}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Return Policy Notice if Delivered */}
                  {activeOrder.status === 'Delivered' && (
                    <div className="mt-6 pt-5 border-t border-[#dfdfd8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-[#777971]">
                        <ShieldCheck size={16} className="text-[#3d6547] shrink-0" />
                        <span>
                          {getReturnPolicyStatus(activeOrder)?.text || '7-day hassle-free return window applicable'}
                        </span>
                      </div>
                      {isReturnEligible(activeOrder) && (
                        <button
                          type="button"
                          onClick={() => handleOpenReturnModal(activeOrder)}
                          className="text-xs font-bold text-[#8c571e] hover:underline cursor-pointer min-h-[42px] flex items-center"
                        >
                          Initiate Return or Replacement
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Items in Order Breakdown Card */}
              <div className="bg-white border border-[#dfdfd8] rounded-[2px] overflow-hidden">
                <div className="p-5 border-b border-[#dfdfd8] flex items-center justify-between select-none">
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#262824] uppercase tracking-wider">
                      Items in this Order ({items.length})
                    </h3>
                    <p className="text-[11px] text-[#777971] mt-0.5">Products included in this shipment</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReorder(activeOrder)}
                    className="text-xs font-bold text-[#262824] hover:text-black flex items-center gap-1.5 cursor-pointer min-h-[38px] px-2.5 rounded-[2px] hover:bg-[#eeede7] transition-colors"
                  >
                    <RotateCcw size={14} /> <span>Buy all again</span>
                  </button>
                </div>

                <div className="divide-y divide-[#dfdfd8]">
                  {items.map((it: any, idx: number) => {
                    const prod = it.product || it || {};
                    const unitPrice = prod.price || it.price || 0;
                    return (
                      <div
                        key={idx}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[2px] bg-[#eeede7] border border-[#dfdfd8] p-2 flex items-center justify-center shrink-0">
                            {prod.imgs && prod.imgs.length > 0 ? (
                              <img src={prod.imgs[0]} alt={prod.name} className="w-full h-full object-contain mix-blend-multiply" />
                            ) : prod.img ? (
                              <img src={prod.img} alt={prod.name} className="w-full h-full object-contain mix-blend-multiply" />
                            ) : (
                              <Package size={24} className="text-[#777971]" />
                            )}
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-[#777971] uppercase tracking-wider block">
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
                              className="font-display text-sm font-bold text-[#262824] hover:underline cursor-pointer leading-snug line-clamp-2"
                            >
                              {prod.name || 'Order Item'}
                            </h4>
                            <div className="flex items-center gap-2.5 text-xs text-[#777971] flex-wrap">
                              <span>Qty: <strong className="text-[#262824] font-bold">{it.quantity || 1}</strong></span>
                              <span>•</span>
                              <span>Unit Price: <strong className="text-[#262824] font-bold font-mono">₹{unitPrice.toLocaleString('en-IN')}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end justify-between items-center gap-2.5 shrink-0 select-none pt-2 sm:pt-0 border-t sm:border-t-0 border-[#dfdfd8]" onClick={(e) => e.stopPropagation()}>
                          <span className="text-base font-bold text-[#262824] font-mono">
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
                <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 flex flex-col justify-between h-full space-y-4 select-none">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#777971] pb-3 border-b border-[#dfdfd8] mb-3">
                      <MapPin size={14} className="text-[#262824]" />
                      <span>Delivery Address</span>
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-[#262824]">
                        {activeOrder.address?.name || curUser?.name || 'Valued Customer'}
                      </h4>
                      <p className="text-xs text-[#777971] leading-relaxed mt-1.5">
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
                  <div className="pt-3 border-t border-[#dfdfd8]">
                    <p className="text-xs text-[#777971] font-mono">
                      Phone: {activeOrder.address?.phone || curUser?.phoneNumber || curUser?.phone || 'Not provided'}
                    </p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 flex flex-col justify-between h-full space-y-4 select-none">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#777971] pb-3 border-b border-[#dfdfd8] mb-3">
                      <CreditCard size={14} className="text-[#262824]" />
                      <span>Payment Method</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-[#262824]">{activeOrder.paymentMethod || 'Online Payment'}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider bg-[#edf3ee] text-[#3d6547] border border-[#a8c6b0]">
                          Paid
                        </span>
                      </div>
                      <p className="text-xs text-[#777971] leading-relaxed">
                        Payment verified and processed securely.
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#dfdfd8]">
                    <p className="text-xs text-[#777971]">
                      Billing Status: <span className="font-bold text-[#262824]">Verified &amp; Cleared</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Price & Order Summary */}
              <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 space-y-3 select-none">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#777971] pb-2 border-b border-[#dfdfd8]">
                  Order Summary
                </h4>
                <div className="space-y-2.5 text-xs divide-y divide-[#dfdfd8]">
                  <div className="flex justify-between pt-1">
                    <span className="text-[#777971]">Items Subtotal</span>
                    <span className="font-bold text-[#262824] font-mono">₹{activeOrder.total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-[#777971]">Shipping &amp; Packaging</span>
                    <span className="font-bold text-[#3d6547]">FREE</span>
                  </div>
                  {activeOrder.discount ? (
                    <div className="flex justify-between pt-2">
                      <span className="text-[#777971]">Promo Discount</span>
                      <span className="font-bold text-[#3d6547] font-mono">-₹{activeOrder.discount}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-baseline pt-3 text-sm font-bold text-[#262824]">
                    <span className="font-display uppercase tracking-wider">Grand Total</span>
                    <span className="font-display text-xl font-bold font-mono text-[#262824]">₹{activeOrder.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* 5. Milestone Activity Log */}
              <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 sm:p-7 select-none">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#262824] mb-5 pb-3 border-b border-[#dfdfd8]">
                  Milestone Activity Log
                </h3>
                <div className="space-y-4">
                  {getTimelineEvents(activeOrder).map((ev: any, evIdx: number, evArr: any[]) => {
                    const isLatest = evIdx === 0;
                    const isLast = evIdx === evArr.length - 1;
                    return (
                      <div key={evIdx} className="flex gap-3.5 text-xs">
                        <div className="flex flex-col items-center shrink-0 w-4 pt-1">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLatest ? 'bg-[#262824] ring-4 ring-[#eeede7]' : 'bg-[#dfdfd8]'}`} />
                          {!isLast && <div className="w-[1px] flex-1 bg-[#dfdfd8] my-1 min-h-[24px]" />}
                        </div>
                        <div className="pb-3 flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className={`font-bold ${isLatest ? 'text-[#262824] text-sm' : 'text-[#777971]'}`}>{ev.status}</span>
                            <span className="text-[11px] font-mono text-[#777971]">{ev.date}</span>
                          </div>
                          {ev.notes && <p className="text-[#777971] text-xs mt-1 leading-relaxed">{ev.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6. Order Actions Card */}
              <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 space-y-3 select-none">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#777971] pb-2 border-b border-[#dfdfd8]">
                  Order Actions
                </h4>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setInvoiceOrder(activeOrder)}
                    className="btn-secondary w-full text-xs font-bold min-h-[42px] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print Invoice</span>
                  </button>
                  {!isCancelled && ['Pending', 'Confirmed', 'Packed', 'Ready for Dispatch'].includes(activeOrder.status) && (
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(activeOrder)}
                      className="w-full min-h-[42px] rounded-[2px] border border-[#d9a5a5] bg-[#f9eded] hover:bg-[#eed2d2] text-[#8e2a2a] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                  {!isCancelled && activeOrder.status === 'Delivered' && isReturnEligible(activeOrder) && (
                    <button
                      type="button"
                      onClick={() => handleOpenReturnModal(activeOrder)}
                      className="w-full min-h-[42px] rounded-[2px] border border-[#e0c29f] bg-[#fbf4ec] hover:bg-[#f5e7d5] text-[#8c571e] text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                    >
                      Return or Replace Items
                    </button>
                  )}
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
    <div className="w-full min-h-screen bg-[#f7f6f2] pb-24 text-[#262824]">
      {/* Header Block */}
      <div className="bg-white border-b border-[#dfdfd8] py-6">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-xs text-[#777971] mb-3" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={() => setCurPage('home')}
              className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight size={12} className="text-[#dfdfd8]" />
            <span className="text-[#262824] font-bold">My Orders</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#262824]">
                My Orders
              </h1>
              <p className="text-xs sm:text-sm text-[#777971] mt-1">
                Track shipments, view complete order history, download invoices, and request returns.
              </p>
            </div>

            {/* Top Toolbar: Search + Filter + Sort in Header */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64 min-w-[200px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777971]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order ID or item..."
                  className="w-full bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] pl-9 pr-8 text-xs min-h-[40px] py-2 text-[#262824] focus:outline-none focus:border-[#262824] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777971] hover:text-[#262824] cursor-pointer w-6 h-6 flex items-center justify-center"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={statusTab}
                onChange={(e) => setStatusTab(e.target.value as any)}
                className="border border-[#dfdfd8] rounded-[2px] bg-[#f7f6f2] px-3 py-2 text-xs font-semibold text-[#262824] outline-none cursor-pointer min-h-[40px] focus:border-[#262824] transition-colors shrink-0"
                aria-label="Filter orders by status"
              >
                <option value="All">All Statuses ({totalOrdersCount})</option>
                <option value="Progress">In Transit ({inTransitCount})</option>
                <option value="Delivered">Delivered ({deliveredCount})</option>
                <option value="Returns">Returns &amp; Refunds ({returnsCount})</option>
                <option value="Cancelled">Cancelled ({cancelledCount})</option>
              </select>

              {/* Sort Order Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-[#dfdfd8] rounded-[2px] bg-[#f7f6f2] px-3 py-2 text-xs font-semibold text-[#262824] outline-none cursor-pointer min-h-[40px] focus:border-[#262824] transition-colors shrink-0"
                aria-label="Sort orders"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>

              {/* Date Filter Dropdown */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="border border-[#dfdfd8] rounded-[2px] bg-[#f7f6f2] px-3 py-2 text-xs font-semibold text-[#262824] outline-none cursor-pointer min-h-[40px] focus:border-[#262824] transition-colors shrink-0"
                aria-label="Filter orders by date"
              >
                <option value="all">All Time</option>
                <option value="30days">Past 30 Days</option>
                <option value="6months">Past 6 Months</option>
                <option value="2026">Year 2026</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Active Filter Indicators */}
        {(statusTab !== 'All' || dateFilter !== 'all' || searchQuery) && (
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#777971]">
            <span className="font-semibold text-[#262824]">Active Filters:</span>
            {statusTab !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-[#262824] font-medium text-[11px]">
                Status: {statusTab === 'Progress' ? 'In Transit' : statusTab}
                <button type="button" onClick={() => setStatusTab('All')} className="hover:text-black cursor-pointer">
                  <X size={11} />
                </button>
              </span>
            )}
            {dateFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-[#262824] font-medium text-[11px]">
                Time: {dateFilter === '30days' ? 'Past 30 Days' : dateFilter === '6months' ? 'Past 6 Months' : 'Year 2026'}
                <button type="button" onClick={() => setDateFilter('all')} className="hover:text-black cursor-pointer">
                  <X size={11} />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-[#262824] font-medium text-[11px]">
                Query: "{searchQuery}"
                <button type="button" onClick={() => setSearchQuery('')} className="hover:text-black cursor-pointer">
                  <X size={11} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setStatusTab('All');
                setDateFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] underline text-[#777971] hover:text-[#262824] cursor-pointer ml-1 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Orders Listing Area */}
        {!orders || orders.length === 0 ? (
          /* Empty State: No Orders */
          <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-16 text-center max-w-[480px] mx-auto shadow-none">
            <div className="w-14 h-14 rounded-[2px] bg-[#eeede7] flex items-center justify-center mx-auto mb-4 text-[#777971]">
              <ShoppingBag size={24} />
            </div>
            <h3 className="font-display text-lg font-bold text-[#262824] mb-1.5">No orders found</h3>
            <p className="text-xs sm:text-sm text-[#777971] leading-relaxed mb-6 max-w-xs mx-auto">
              You have not placed any orders yet. Discover our premium collection in the store catalog.
            </p>
            <button
              type="button"
              onClick={() => setCurPage('products')}
              className="btn-primary text-xs font-bold min-h-[42px] px-6 cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        ) : processedOrders.length === 0 ? (
          /* Empty State: No matching filter results */
          <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-12 text-center max-w-[480px] mx-auto shadow-none">
            <AlertTriangle size={24} className="text-[#777971] mx-auto mb-3" />
            <h3 className="font-display text-base font-bold text-[#262824] mb-1">No matching results</h3>
            <p className="text-xs text-[#777971] mb-5">
              No orders matched your active search query or filter selection.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusTab('All');
                setDateFilter('all');
              }}
              className="btn-secondary text-xs font-bold min-h-[42px] px-5 cursor-pointer"
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
                  className="bg-white border border-[#dfdfd8] rounded-[2px] overflow-hidden hover:border-[#777971] transition-all duration-200"
                >
                  {/* Tier 1: Executive Card Header Bar */}
                  <div className="bg-[#eeede7] border-b border-[#dfdfd8] px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971] block mb-0.5">
                          Order Placed
                        </span>
                        <span className="font-bold text-[#262824]">{order.date}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971] block mb-0.5">
                          Total Paid
                        </span>
                        <span className="font-bold text-[#262824] font-mono text-sm">₹{order.total.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971] block mb-0.5">
                          Ship To
                        </span>
                        <span className="font-bold text-[#262824] truncate max-w-[150px] block">
                          {order.address?.name || curUser?.name || 'Customer'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#777971] font-bold text-xs">{order.id}</span>
                      <span className="text-[#dfdfd8]">•</span>
                      <button
                        type="button"
                        onClick={() => handleSelectOrder(order)}
                        className="font-bold text-[#262824] hover:underline cursor-pointer min-h-[40px] inline-flex items-center"
                      >
                        Order Details
                      </button>
                      <span className="text-[#dfdfd8]">•</span>
                      <button
                        type="button"
                        onClick={() => setInvoiceOrder(order)}
                        className="font-bold text-[#262824] hover:underline cursor-pointer min-h-[40px] inline-flex items-center"
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
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                            <StatusIcon size={12} />
                            {cfg.label}
                          </span>
                          {isDelivered && (
                            <span className="text-xs text-[#777971]">
                              Package handed directly to customer
                            </span>
                          )}
                          {!isDelivered && !isCancelled && !isReturnState && (
                            <span className="text-xs text-[#777971]">
                              Carrier: {order.courierCompany || 'Delhivery Express'} • Expected soon
                            </span>
                          )}
                        </div>

                        {/* Items Presentation */}
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-20 rounded-[2px] bg-[#eeede7] border border-[#dfdfd8] p-2 flex items-center justify-center shrink-0 relative">
                            {primaryItem?.product?.imgs?.length > 0 ? (
                              <img
                                src={primaryItem.product.imgs[0]}
                                alt={primaryItem.product.name}
                                className="w-full h-full object-contain mix-blend-multiply"
                              />
                            ) : (
                              <Package size={22} className="text-[#777971]" />
                            )}
                            {items.length > 1 && (
                              <span className="absolute bottom-1 right-1 bg-[#262824] text-white text-[9px] font-mono font-bold px-1 py-0.5 rounded-[2px]">
                                +{items.length - 1}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#777971] uppercase tracking-wider">
                              {primaryItem?.product?.cat || 'General Essential'}
                            </span>
                            <h3
                              onClick={() => handleSelectOrder(order)}
                              className="font-display text-sm font-bold text-[#262824] hover:underline cursor-pointer line-clamp-1 leading-snug"
                            >
                              {primaryItem?.product?.name || 'Order Item'}
                            </h3>
                            <p className="text-xs text-[#777971]">
                              Total items: <strong className="text-[#262824] font-bold">{totalQuantity}</strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex flex-row lg:flex-col gap-2.5 shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSelectOrder(order)}
                          className="btn-primary text-xs font-bold min-h-[40px] px-5 flex items-center justify-center cursor-pointer"
                        >
                          View Order Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(order)}
                          className="btn-secondary text-xs font-bold min-h-[40px] px-5 flex items-center justify-center cursor-pointer"
                        >
                          Buy it again
                        </button>
                        {!isCancelled && isDelivered && isReturnEligible(order) && (
                          <button
                            type="button"
                            onClick={() => handleOpenReturnModal(order)}
                            className="text-xs font-bold text-[#8c571e] hover:underline py-1.5 px-2 text-center cursor-pointer min-h-[38px] flex items-center justify-center"
                          >
                            Return or replace items
                          </button>
                        )}
                        {!isCancelled && ['Pending', 'Confirmed', 'Packed', 'Ready for Dispatch'].includes(order.status) && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(order)}
                            className="text-xs font-bold text-[#8e2a2a] hover:underline py-1.5 px-2 text-center cursor-pointer min-h-[38px] flex items-center justify-center"
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
