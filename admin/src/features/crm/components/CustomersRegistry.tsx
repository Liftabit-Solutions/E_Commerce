import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../../core/context/AppContext';
import type { Order } from '../../../core/types';
import {
  Search,
  Users,
  ShoppingBag,
  Repeat,
  IndianRupee,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Printer,
  ArrowUpDown,
  ArrowLeft,
  Package
} from 'lucide-react';
import { Badge } from '@/components/reui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface DerivedCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  orders: Order[];
}

interface CustomersRegistryProps {
  onViewOrder?: (orderId: string) => void;
}

const CustomersRegistry: React.FC<CustomersRegistryProps> = ({ onViewOrder }) => {
  const { orders, products, setInvoiceOrder } = useApp();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'repeat' | 'single'>('all');
  const [sortField, setSortField] = useState<'lastOrder' | 'totalSpent' | 'totalOrders' | 'name'>('lastOrder');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination for Customers List
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected customer for full-page view
  const [selectedCustomer, setSelectedCustomer] = useState<DerivedCustomer | null>(null);

  // Pagination for Customer Orders inside Details
  const [customerOrderPage, setCustomerOrderPage] = useState(1);
  const customerOrdersPerPage = 6;

  // Group orders into derived customers
  const customersList = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const map = new Map<string, DerivedCustomer>();

    orders.forEach((order) => {
      const email = (order.customerEmail || '').trim().toLowerCase();
      const phone = (order.address?.phone || '').replace(/\D/g, '');
      const name = (order.address?.name || 'Customer').trim();

      // Strongest identifier: normalized email, then phone, then order ID fallback
      const key = email || (phone ? `phone_${phone}` : `order_${order.id}`);

      const orderTotal = Number(order.total || 0);
      const orderDate = order.date || '';

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.totalOrders += 1;
        existing.totalSpent += orderTotal;
        existing.orders.push(order);

        // Update to more recent order info
        if (orderDate && (!existing.lastOrderDate || new Date(orderDate) > new Date(existing.lastOrderDate))) {
          existing.lastOrderDate = orderDate;
        }

        // Fill in missing details
        if ((!existing.name || existing.name === 'Customer') && name && name !== 'Customer') {
          existing.name = name;
        }
        if (!existing.phone && order.address?.phone) {
          existing.phone = order.address.phone;
        }
        if (!existing.email && order.customerEmail) {
          existing.email = order.customerEmail;
        }
        if (!existing.address && order.address) {
          existing.address = {
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            pincode: order.address.pincode,
          };
        }
      } else {
        map.set(key, {
          id: key,
          name: name || 'Customer',
          email: order.customerEmail || '',
          phone: order.address?.phone || '',
          address: order.address
            ? {
                addressLine1: order.address.addressLine1,
                addressLine2: order.address.addressLine2,
                city: order.address.city,
                state: order.address.state,
                pincode: order.address.pincode,
              }
            : undefined,
          totalOrders: 1,
          totalSpent: orderTotal,
          lastOrderDate: orderDate,
          orders: [order],
        });
      }
    });

    return Array.from(map.values());
  }, [orders]);

  // Summary Metrics
  const totalCustomers = customersList.length;
  const totalOrders = orders.length;
  const repeatCustomersCount = customersList.filter((c) => c.totalOrders > 1).length;
  const totalSpending = customersList.reduce((acc, c) => acc + c.totalSpent, 0);

  // Helper to resolve product image from catalog or order item
  const getItemImage = useCallback((item: any): string => {
    if (!item) return '';
    const prod = item.product || item;
    if (Array.isArray(prod.imgs) && prod.imgs[0]) return prod.imgs[0];
    if (Array.isArray(prod.images) && prod.images[0]) {
      const first = prod.images[0];
      return typeof first === 'string' ? first : (first?.url || (first as any)?.secure_url || '');
    }
    if (prod.image) return prod.image;
    if (prod.img) return prod.img;
    if (item.image) return item.image;
    if (item.img) return item.img;

    // Search catalog fallback
    if (products && Array.isArray(products)) {
      const prodName = prod.name || item.title || item.name || '';
      const prodSku = prod.sku || item.sku || '';
      const prodId = prod.id || prod._id || item.productId || item.id || '';

      const match = products.find(p =>
        (prodId && (String(p.id) === String(prodId) || String(p._id) === String(prodId))) ||
        (prodSku && p.sku && p.sku.toLowerCase() === prodSku.toLowerCase()) ||
        (prodName && p.name && p.name.toLowerCase() === prodName.toLowerCase())
      );
      if (match) {
        if (Array.isArray(match.imgs) && match.imgs[0]) return match.imgs[0];
        if (Array.isArray(match.images) && match.images[0]) {
          const first = match.images[0];
          return typeof first === 'string' ? first : (first?.url || (first as any)?.secure_url || '');
        }
      }
    }
    return '';
  }, [products]);

  // Helper to parse order items safely
  const parseOrderItems = (order: Order): any[] => {
    if (Array.isArray(order.items)) return order.items;
    if (typeof order.items === 'string') {
      try {
        return JSON.parse(order.items);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    let result = [...customersList];

    // Search query (name, email, phone)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }

    // Activity filter
    if (activityFilter === 'repeat') {
      result = result.filter((c) => c.totalOrders > 1);
    } else if (activityFilter === 'single') {
      result = result.filter((c) => c.totalOrders === 1);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'lastOrder') {
        comparison = new Date(b.lastOrderDate || 0).getTime() - new Date(a.lastOrderDate || 0).getTime();
      } else if (sortField === 'totalSpent') {
        comparison = b.totalSpent - a.totalSpent;
      } else if (sortField === 'totalOrders') {
        comparison = b.totalOrders - a.totalOrders;
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return sortAsc ? -comparison : comparison;
    });

    return result;
  }, [customersList, searchQuery, activityFilter, sortField, sortAsc]);

  // Pagination calculation for main table
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const handleSortToggle = (field: 'lastOrder' | 'totalSpent' | 'totalOrders' | 'name') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FULL PAGE VIEW: CUSTOMER PROFILE & ORDERS IN TABLE FORMAT
  // ═══════════════════════════════════════════════════════════════════════
  if (selectedCustomer) {
    // Sort customer orders by date descending
    const sortedOrders = [...selectedCustomer.orders].sort((a, b) => {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });

    const averageOrderValue = selectedCustomer.totalOrders > 0
      ? Math.round(selectedCustomer.totalSpent / selectedCustomer.totalOrders)
      : 0;

    const initials = (selectedCustomer.name || 'CU')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Customer order pagination calculations
    const totalCustomerOrderPages = Math.ceil(sortedOrders.length / customerOrdersPerPage) || 1;
    const customerOrderStartIndex = (customerOrderPage - 1) * customerOrdersPerPage;
    const paginatedOrders = sortedOrders.slice(
      customerOrderStartIndex,
      customerOrderStartIndex + customerOrdersPerPage
    );

    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[38px]"
            >
              <ArrowLeft size={14} /> Back to Customers
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">/</span>
              <span className="text-slate-500">Customers</span>
              <span className="text-slate-400">/</span>
              <span className="font-semibold text-slate-900">{selectedCustomer.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={selectedCustomer.totalOrders > 1 ? 'success' : 'secondary'}
              size="md"
            >
              {selectedCustomer.totalOrders > 1 ? 'Repeat Customer' : 'New Customer'}
            </Badge>
          </div>
        </div>

        {/* Customer Profile Summary Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                <AvatarFallback className="text-base font-bold bg-indigo-50 text-indigo-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                    {selectedCustomer.name}
                  </h1>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    ID: {selectedCustomer.id.slice(0, 16)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Customer profile compiled from store transactions
                </p>
              </div>
            </div>
          </div>

          {/* Quick Contact & Address Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-500 shrink-0">
                <Mail size={15} />
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 text-[11px] block uppercase font-semibold">Email Address</span>
                <span className="font-mono text-slate-900 font-medium truncate block">
                  {selectedCustomer.email || 'No email provided'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-500 shrink-0">
                <Phone size={15} />
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 text-[11px] block uppercase font-semibold">Phone Number</span>
                <span className="font-mono text-slate-900 font-medium truncate block">
                  {selectedCustomer.phone || 'No phone provided'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-500 shrink-0">
                <MapPin size={15} />
              </div>
              <div className="min-w-0">
                <span className="text-slate-400 text-[11px] block uppercase font-semibold">Primary Address</span>
                <span className="text-slate-700 block leading-relaxed">
                  {selectedCustomer.address ? (
                    <>
                      {selectedCustomer.address.addressLine1 && <span>{selectedCustomer.address.addressLine1}, </span>}
                      {selectedCustomer.address.addressLine2 && <span>{selectedCustomer.address.addressLine2}, </span>}
                      {[selectedCustomer.address.city, selectedCustomer.address.state, selectedCustomer.address.pincode]
                        .filter(Boolean)
                        .join(', ')}
                    </>
                  ) : (
                    'No delivery address recorded'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Analytics Metrics for Customer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Orders
              </span>
              <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
              {selectedCustomer.totalOrders}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Confirmed lifetime purchases</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Lifetime Spend
              </span>
              <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <IndianRupee size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
              ₹{selectedCustomer.totalSpent.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Gross transactional revenue</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Average Order Value
              </span>
              <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <Repeat size={16} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
              ₹{averageOrderValue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Spend per checkout average</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Last Activity
              </span>
              <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <Calendar size={16} />
              </div>
            </div>
            <div className="mt-2 text-base font-semibold text-slate-900 truncate">
              {selectedCustomer.lastOrderDate || '—'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Most recent order placed</p>
          </div>
        </div>

        {/* ── ORDER DETAILS TABLE FORMAT (Clean SaaS Data Table) ── */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Order History &amp; Purchased Items ({sortedOrders.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete structured order records and item breakdowns for this customer
              </p>
            </div>
          </div>

          <div className="w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="w-[120px]">Order ID</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Purchased Items</TableHead>
                  <TableHead className="w-[110px] text-center">Payment</TableHead>
                  <TableHead className="w-[120px] text-center">Status</TableHead>
                  <TableHead className="w-[110px] text-right">Amount</TableHead>
                  <TableHead className="w-[90px] text-right pr-4">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map((ord) => {
                    const items = parseOrderItems(ord);
                    const isDelivered = ord.status === 'Delivered';
                    const isCancelled = ord.status === 'Cancelled' || ord.status === 'Returned' || ord.status === 'Refunded';

                    return (
                      <TableRow key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Order ID */}
                        <TableCell className="align-top py-3.5">
                          <div className="flex flex-col">
                            {onViewOrder ? (
                              <button
                                type="button"
                                onClick={() => onViewOrder(ord.id)}
                                className="font-mono font-bold text-xs text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer text-left"
                                title="Open Order in Registry"
                              >
                                #{ord.id}
                              </button>
                            ) : (
                              <span className="font-mono font-bold text-xs text-slate-900">
                                #{ord.id}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {ord.shippingMethod || ord.paymentMethod || 'Online'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="align-top py-3.5 text-xs text-slate-600 whitespace-nowrap">
                          {ord.date}
                        </TableCell>

                        {/* Purchased Products */}
                        <TableCell className="align-top py-3.5">
                          <div className="flex flex-col gap-2">
                            {items && items.length > 0 ? (
                              items.map((item: any, iIdx: number) => {
                                const prod = item.product || item || {};
                                const prodName = prod.name || item.title || item.name || 'Product Item';
                                const prodSku = prod.sku || item.sku || 'CE-SKU';
                                const qty = item.quantity || 1;
                                const unitPrice = prod.price || item.unitPrice || (item.totalPrice && item.quantity ? Math.round(item.totalPrice / item.quantity) : 0);
                                const lineTotal = item.totalPrice || (unitPrice * qty);
                                const imgSrc = getItemImage(item);

                                return (
                                  <div key={iIdx} className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                      {imgSrc ? (
                                        <img
                                          src={imgSrc}
                                          alt={prodName}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <Package size={14} className="text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-slate-900 truncate max-w-[200px] sm:max-w-[340px]">
                                          {prodName}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                          ×{qty}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                        <span className="font-mono text-slate-400">{prodSku}</span>
                                        <span>•</span>
                                        <span className="font-mono">₹{unitPrice.toLocaleString('en-IN')}</span>
                                        <span>•</span>
                                        <span className="font-mono font-medium text-slate-700">₹{lineTotal.toLocaleString('en-IN')}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-xs text-slate-400 italic">No item records</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Payment */}
                        <TableCell className="align-top py-3.5 text-center">
                          <Badge
                            variant={ord.paymentStatus === 'Paid' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {ord.paymentStatus || 'Pending'}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="align-top py-3.5 text-center">
                          <Badge
                            variant={
                              isDelivered
                                ? 'success'
                                : isCancelled
                                ? 'destructive-light'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {ord.status}
                          </Badge>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="align-top py-3.5 text-right font-mono font-bold text-xs text-slate-900">
                          ₹{Number(ord.total || 0).toLocaleString('en-IN')}
                        </TableCell>

                        {/* Invoice Action */}
                        <TableCell className="align-top py-3.5 text-right pr-4">
                          <button
                            type="button"
                            onClick={() => setInvoiceOrder(ord)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[30px]"
                            title="Print Tax Invoice"
                          >
                            <Printer size={13} />
                            <span>Invoice</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No order details found for this customer.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Customer Orders Table Pagination Bar */}
          {sortedOrders.length > 0 && (
            <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
              <span className="text-slate-500">
                Showing {customerOrderStartIndex + 1} to {Math.min(customerOrderStartIndex + customerOrdersPerPage, sortedOrders.length)} of {sortedOrders.length} orders
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  type="button"
                  onClick={() => setCustomerOrderPage((p) => Math.max(1, p - 1))}
                  disabled={customerOrderPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                >
                  Previous
                </button>
                {Array.from({ length: totalCustomerOrderPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCustomerOrderPage(i + 1)}
                    className={`w-7 h-7 flex items-center justify-center rounded-md border text-xs font-semibold cursor-pointer ${
                      customerOrderPage === i + 1
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomerOrderPage((p) => Math.min(totalCustomerOrderPages, p + 1))}
                  disabled={customerOrderPage === totalCustomerOrderPages}
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
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN CUSTOMERS REGISTRY TABLE VIEW (NO HORIZONTAL SCROLL & ALWAYS-VISIBLE PAGINATION)
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Page Heading & Simple Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Customers
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Customer profiles, purchase histories, and lifetime transactions from your store.
        </p>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customers */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {totalCustomers.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Unique store buyers</p>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {totalOrders.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Orders from all buyers</p>
        </div>

        {/* Card 3: Repeat Customers */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Repeat Customers
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Repeat size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {repeatCustomersCount.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalCustomers > 0 ? `${Math.round((repeatCustomersCount / totalCustomers) * 100)}% of buyers` : '0% of buyers'}
          </p>
        </div>

        {/* Card 4: Total Customer Spending */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Customer Spending
            </span>
            <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            ₹{totalSpending.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Combined order spend</p>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors min-h-[38px]"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Activity filter */}
          <select
            value={activityFilter}
            onChange={(e) => {
              setActivityFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 outline-none hover:border-slate-300 cursor-pointer shadow-xs min-h-[38px]"
          >
            <option value="all">All Customers</option>
            <option value="repeat">Repeat Customers (&gt; 1 order)</option>
            <option value="single">Single Order</option>
          </select>

          {/* Sort dropdown */}
          <select
            value={sortField}
            onChange={(e) => {
              setSortField(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 outline-none hover:border-slate-300 cursor-pointer shadow-xs min-h-[38px]"
          >
            <option value="lastOrder">Sort: Recent Order</option>
            <option value="totalSpent">Sort: Total Spending</option>
            <option value="totalOrders">Sort: Total Orders</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Customers Table Container — Designed to fit page without horizontal scroll */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead
                  className="cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSortToggle('name')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="w-[140px]">Phone</TableHead>
                <TableHead
                  className="w-[100px] text-center cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSortToggle('totalOrders')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Orders</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[120px] text-right cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSortToggle('totalSpent')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Spent</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </TableHead>
                <TableHead
                  className="w-[120px] cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSortToggle('lastOrder')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Last Order</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="w-[90px] text-center">Type</TableHead>
                <TableHead className="w-[90px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCustomers.length > 0 ? (
                currentCustomers.map((cust) => {
                  const initials = (cust.name || 'CU')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <TableRow key={cust.id} className="h-[56px] hover:bg-slate-50/70 transition-colors">
                      {/* Customer Info (Avatar + Name + Email) */}
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar size="sm">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-xs text-slate-900 truncate">
                              {cust.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono truncate">
                              {cust.email || 'No email provided'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="text-xs text-slate-600 font-mono">
                        {cust.phone || '—'}
                      </TableCell>

                      {/* Total Orders */}
                      <TableCell className="text-center">
                        <Badge
                          variant={cust.totalOrders > 1 ? 'success' : 'secondary'}
                          size="sm"
                        >
                          {cust.totalOrders} {cust.totalOrders === 1 ? 'order' : 'orders'}
                        </Badge>
                      </TableCell>

                      {/* Total Spent */}
                      <TableCell className="text-right font-mono font-medium text-xs text-slate-900 whitespace-nowrap">
                        ₹{cust.totalSpent.toLocaleString('en-IN')}
                      </TableCell>

                      {/* Last Order Date */}
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {cust.lastOrderDate || '—'}
                      </TableCell>

                      {/* Status / Customer Type */}
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          variant={cust.totalOrders > 1 ? 'success' : 'secondary'}
                          size="sm"
                        >
                          {cust.totalOrders > 1 ? 'Repeat' : 'New'}
                        </Badge>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right whitespace-nowrap pr-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setCustomerOrderPage(1);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <span>Details</span>
                          <ChevronRight size={13} className="text-slate-400" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-slate-500 text-xs">
                    No customers found matching the search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Toolbar — Always visible when customers exist */}
        {filteredCustomers.length > 0 && (
          <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
            <span className="text-slate-500">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md border text-xs font-semibold cursor-pointer ${
                    currentPage === i + 1
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
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

export default CustomersRegistry;
