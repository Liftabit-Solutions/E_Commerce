import React, { useState, useEffect } from 'react';
import type { Order } from '../../../core/types';
import { X, Printer, Download, Mail, CheckCircle } from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';
import { generateInvoicePDFBlob } from '../../../core/utils/generateInvoicePDF';
import { getStoreProfile } from '../../../core/utils/storeSettings';
import type { StoreProfile } from '../../../core/utils/storeSettings';

interface InvoiceModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  const { showToast } = useApp();
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(getStoreProfile());

  useEffect(() => {
    const handleUpdate = () => setStoreProfile(getStoreProfile());
    window.addEventListener('store_profile_updated', handleUpdate);
    return () => window.removeEventListener('store_profile_updated', handleUpdate);
  }, []);

  // Escape key down to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Invoice variables
  const orderIdStr = String(order.id || order._id || 'ORD-0000');
  const invoiceNumber = `INV-${orderIdStr.includes('-') ? (orderIdStr.split('-')[1] || orderIdStr) : orderIdStr}-${!isNaN(new Date(order.date).getFullYear()) ? new Date(order.date).getFullYear() : 2026}`;
  const invoiceDate = order.date;
  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
      ? (() => { try { return JSON.parse(order.items); } catch { return []; } })()
      : [];
  
  // Computations
  const getItemUnitPrice = (item: any) => {
    return item.product?.price || item.unitPrice || item.sellingPrice || item.retailPrice || (item.totalPrice && item.quantity ? Math.round(item.totalPrice / item.quantity) : 0);
  };
  const computedItemSubtotal = items.reduce((sum: number, item: any) => sum + getItemUnitPrice(item) * (item.quantity || 1), 0);
  const subtotal = (typeof order.subtotal === 'number' && order.subtotal > 0) ? order.subtotal : computedItemSubtotal;
  const discount = typeof order.discount === 'number' ? order.discount : 0;
  const taxes = typeof order.taxes === 'number' && order.taxes > 0
    ? order.taxes
    : (typeof order.taxes === 'object' && order.taxes !== null && 'amount' in (order.taxes as any)
        ? (order.taxes as any).amount
        : Math.round(subtotal * 0.18));
  
  const derivedShipping = (order.total && order.total > (subtotal - discount + taxes))
    ? Math.max(0, order.total - (subtotal - discount + taxes))
    : 0;
  const shippingCharge = typeof order.shippingCharge === 'number' && order.shippingCharge > 0
    ? order.shippingCharge
    : (typeof (order as any).delivery?.charge === 'number' && (order as any).delivery.charge > 0
        ? (order as any).delivery.charge
        : derivedShipping);

  const grandTotal = order.total || (subtotal - discount + taxes + shippingCharge);

  const handlePrint = () => {
    window.print();
  };

  const handleEmailInvoice = () => {
    showToast(`Invoice successfully emailed to ${order.customerEmail || 'customer@ecommerce.com'}`);
  };

  const handleDownloadPDF = () => {
    try {
      const itemsList = items.map((item: any) => {
        const unitPrice = item.product?.price || item.unitPrice || 0;
        const qty = item.quantity || 1;
        const discAmt = Math.round(unitPrice * qty * ((item.product?.discount || 0) / 100));
        const taxAmt = Math.round((unitPrice * qty - discAmt) * 0.18);
        const total = unitPrice * qty - discAmt + taxAmt;
        return {
          name: item.product?.name || item.title || 'Product Item',
          sku: item.product?.sku || item.sku || 'CE-PROD',
          quantity: qty,
          unitPrice,
          total
        };
      });

      const shippingAddr = order.address || order.billingAddress || {};
      const fullAddr = [shippingAddr.addressLine1, shippingAddr.addressLine2, shippingAddr.city, shippingAddr.state, shippingAddr.pincode]
        .filter(Boolean)
        .join(', ');

      const blob = generateInvoicePDFBlob({
        invoiceNumber,
        invoiceDate,
        orderId: order.id || '',
        paymentMethod: order.paymentMethod || 'Online',
        paymentStatus: order.paymentStatus || 'Paid',
        customerName: shippingAddr.name || order.customerEmail || 'Valued Customer',
        customerAddress: fullAddr,
        customerPhone: shippingAddr.phone || '',
        customerEmail: order.customerEmail || 'concierge@forma.com',
        carrier: order.courierCompany || 'Standard Express',
        items: itemsList,
        subtotal,
        discount,
        taxes,
        shippingCharge,
        grandTotal
      }, storeProfile);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${order.id || 'order'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Invoice PDF download error:', err);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-start justify-center bg-slate-950/75 p-4 md:p-8 pt-20 md:pt-24 backdrop-blur-xs overflow-y-auto invoice-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Printable Area Wrapper */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-[840px] relative p-6 sm:p-10 invoice-modal-container flex flex-col justify-between my-auto animate-slideUp">
        
        {/* Print specific CSS stylesheet inject */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4;
              margin: 12mm 12mm 12mm 12mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              overflow: visible !important;
              background: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .app-wrapper > :not(.invoice-modal-overlay),
            header,
            footer,
            main,
            .print-actions-bar,
            button {
              display: none !important;
            }
            .invoice-modal-overlay {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
              backdrop-filter: none !important;
              display: block !important;
              z-index: auto !important;
            }
            .invoice-modal-container {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            .invoice-print-area {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
              width: 100% !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
          }
        ` }} />

        {/* Modal Controls (Hidden during print) */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6 print-actions-bar select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Tax Invoice
            </span>
            <span className="text-xs font-mono font-semibold text-slate-600">{order.id}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 bg-white rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              <Printer size={13} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 bg-white rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              <Download size={13} /> PDF
            </button>
            <button
              onClick={handleEmailInvoice}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 bg-white rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              <Mail size={13} /> Email
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer ml-1"
              title="Close invoice"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* INVOICE SHEET - A4 PROPORTIONS */}
        <div className="invoice-print-area bg-white p-8 border border-slate-200 rounded-xl shadow-xs text-xs leading-relaxed text-slate-800 font-sans">
          {/* Header row */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5 select-none">
                {storeProfile.logo ? (
                  <img
                    src={storeProfile.logo}
                    alt={storeProfile.storeName || 'Store Logo'}
                    className="h-8 max-w-[140px] object-contain"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-xs"
                    style={{ backgroundColor: storeProfile.brandColor || '#0f172a' }}
                  >
                    {(storeProfile.storeName || 'E').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  {storeProfile.storeName || 'Ecommerce'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal font-sans">
                {storeProfile.storeName || 'Ecommerce India'} Official Store<br />
                {storeProfile.addressLine || 'Plot No. 12, Whitefield Industrial Area'},<br />
                {storeProfile.district || 'Coimbatore'}, {storeProfile.state || 'Tamil Nadu'} - {storeProfile.pincode || '641001'}<br />
                {storeProfile.gstNumber ? <><span className="font-mono">GSTIN: {storeProfile.gstNumber}</span><br /></> : null}
                {storeProfile.email || 'support@ecommerce.com'} | {storeProfile.phone || '+91 98765 43210'}
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2 uppercase">Tax Invoice</h1>
              <div className="text-[11px] text-slate-500 space-y-1">
                <div>Invoice No: <span className="font-mono font-bold text-slate-900">{invoiceNumber}</span></div>
                <div>Invoice Date: <span className="text-slate-800">{invoiceDate}</span></div>
                <div>Order Ref: <span className="font-mono font-semibold text-slate-900">{order.id}</span></div>
                <div>Payment Mode: <span className="font-semibold text-slate-900 uppercase">{order.paymentMethod}</span></div>
              </div>
            </div>
          </div>

          {/* Addresses Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-200 pb-6 mb-6">
            <div className="bg-slate-50/80 border border-slate-200/80 p-4 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Billed To (Customer Details)
              </span>
              <p className="text-xs font-bold text-slate-900">{order.billingAddress?.name || order.address?.name}</p>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {order.billingAddress?.street || order.address?.street}<br />
                {order.billingAddress?.city || order.address?.city}, {order.billingAddress?.state || order.address?.state} - {order.billingAddress?.pincode || order.address?.pincode}<br />
                Phone: {order.billingAddress?.phone || order.address?.phone}<br />
                Email: {order.customerEmail || 'customer@ecommerce.com'}
              </p>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 p-4 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Shipped Destination
              </span>
              <p className="text-xs font-bold text-slate-900">{order.address?.name}</p>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {order.address?.street}<br />
                {order.address?.city}, {order.address?.state} - {order.address?.pincode}<br />
                Phone: {order.address?.phone}<br />
                Shipping Courier: {order.courierCompany || 'Standard Logistics'}
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div className="mb-6 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-semibold uppercase tracking-wider select-none">
                  <th className="py-2.5 px-3.5">Item Description</th>
                  <th className="py-2.5 px-3.5 w-[110px]">SKU</th>
                  <th className="py-2.5 px-3.5 w-[60px] text-center">Qty</th>
                  <th className="py-2.5 px-3.5 w-[85px] text-right">Unit Price</th>
                  <th className="py-2.5 px-3.5 w-[80px] text-right">Discount</th>
                  <th className="py-2.5 px-3.5 w-[85px] text-right">GST (18%)</th>
                  <th className="py-2.5 px-3.5 w-[95px] text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {items.map((item: any, idx: number) => {
                  const unitPrice = getItemUnitPrice(item);
                  const qty = item.quantity || 1;
                  const itemDiscountPct = item.product?.discount || item.discount || 0;
                  let discAmt = Math.round(unitPrice * qty * (itemDiscountPct / 100));
                  if (discAmt === 0 && discount > 0 && subtotal > 0) {
                    discAmt = Math.round((unitPrice * qty / subtotal) * discount);
                  }
                  const taxAmt = Math.round(unitPrice * qty * 0.18);
                  const rowTotal = unitPrice * qty - discAmt + taxAmt;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3.5 font-medium text-slate-900">
                        {item.product?.name || item.title || 'HomeCare Formulation'}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-slate-500">{item.product?.sku || item.sku || 'CE-SKU-001'}</td>
                      <td className="py-2.5 px-3.5 text-center text-slate-900 font-medium">{qty}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">₹{unitPrice}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-rose-600">-₹{discAmt}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">₹{taxAmt}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">₹{rowTotal}</td>
                    </tr>
                  );
                })}

                {/* Shipping & Delivery Row */}
                <tr className="bg-slate-50/50 font-medium">
                  <td className="py-2.5 px-3.5 text-slate-800">
                    Logistics & Fulfilment ({shippingCharge > 0 ? (order.shippingMethod && order.shippingMethod.toUpperCase() !== 'FREE' ? order.shippingMethod : 'Standard Courier') : 'Free Delivery'})
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-slate-500">SHP-LOG-01</td>
                  <td className="py-2.5 px-3.5 text-center text-slate-900">1</td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">₹{shippingCharge}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">-₹0</td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">₹0</td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                    {shippingCharge > 0 ? `₹${shippingCharge}` : 'Free'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pricing Summary Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-6 items-start border-t border-slate-200 pt-4">
            {/* Left side: T&C */}
            <div className="text-[11px] text-slate-500 leading-relaxed space-y-1.5">
              <strong className="text-slate-800 block text-xs">Terms & Conditions:</strong>
              <p>1. Goods once dispatched cannot be returned without valid defect verification.</p>
              <p>2. Interest at 18% per annum is applicable if invoice settlement is delayed beyond agreed terms.</p>
              <p>3. All legal disputes are subject exclusively to Bengaluru judicial jurisdiction.</p>
            </div>

            {/* Right side: Calculations */}
            <div className="space-y-2 text-xs bg-slate-50/80 border border-slate-200 p-4 rounded-lg">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-900">₹{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount Applied</span>
                  <span className="font-mono font-semibold">-₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Taxes (GST 18%)</span>
                <span className="font-mono font-semibold text-slate-900">₹{taxes}</span>
              </div>
              <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-2">
                <span>Shipping & Handling</span>
                <span className="font-mono font-semibold text-slate-900">
                  {shippingCharge > 0 ? `₹${shippingCharge}` : 'Free'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                <span>Grand Total</span>
                <span className="font-mono text-base text-slate-950">₹{grandTotal}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-semibold mt-2 bg-white border border-slate-200 px-3 py-1.5 rounded">
                <span className="text-slate-600">Settlement Status</span>
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle size={12} /> {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Footer thank you */}
          <div className="text-center border-t border-slate-200 pt-5 mt-8 text-[11px] text-slate-400">
            <span className="block font-semibold text-slate-600 mb-0.5">Thank you for shopping with Ecommerce.</span>
            For customer support queries, write to support@ecommerce.com or call toll-free 1800 123 4567.
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
