import React, { useEffect, useState } from 'react';
import type { Order } from '../../core/types';
import { X, Printer, Download, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../core/context/AppContext';
import axios from 'axios';
// @ts-ignore
import { auth } from '../../../firebase';
import { generateInvoicePDFBlob } from '../../utils/generateInvoicePDF';
import { getStoreProfile } from '../../utils/storeSettings';
import type { StoreProfile } from '../../utils/storeSettings';

const InvoiceModal: React.FC = () => {
  const { invoiceOrder, setInvoiceOrder, showToast, curUser } = useApp();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(getStoreProfile());

  useEffect(() => {
    const handleUpdate = () => setStoreProfile(getStoreProfile());
    window.addEventListener('store_profile_updated', handleUpdate);
    return () => window.removeEventListener('store_profile_updated', handleUpdate);
  }, []);

  // Escape key down to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInvoiceOrder(null);
      }
    };
    if (invoiceOrder) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [invoiceOrder, setInvoiceOrder]);

  if (!invoiceOrder) return null;
  const order: Order = invoiceOrder;
  const onClose = () => setInvoiceOrder(null);

  const recipientEmail = (curUser?.email || order.customerEmail || (order as any).customer?.email || 'customer@ecommerce.com').toLowerCase();

  // Invoice variables
  const orderIdStr = String(order.id || (order as any)._id || '');
  const invoiceNumber = `INV-${orderIdStr.includes('-') ? orderIdStr.split('-')[1] : orderIdStr.slice(-6)}-${new Date(order.date || Date.now()).getFullYear() || 2026}`;
  const invoiceDate = order.date || new Date().toISOString().split('T')[0];
  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
      ? (() => { try { return JSON.parse(order.items); } catch { return []; } })()
      : [];
  
  // Computations
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.product?.price || item.sellingPrice || item.unitPrice || 0) * (item.quantity || 1), 0);
  const taxes = order.taxes || Math.round(subtotal * 0.18);
  const discount = order.discount || 0;
  const grandTotal = order.total || (subtotal + taxes - discount);

  const handlePrint = () => {
    window.print();
  };

  const handleEmailInvoice = async () => {
    setIsSendingEmail(true);
    try {
      if (!auth.currentUser) {
        try {
          await auth.authStateReady();
        } catch {}
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        try {
          token = await firebaseUser.getIdToken();
        } catch {}
      }

      const backendUrl = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');
      const response = await axios.post(
        `${backendUrl}/orders/send-invoice-email`,
        { 
          orderId: (order as any)._id || (order as any).orderNumber || order.id,
          recipientEmail: recipientEmail
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        showToast(response.data.message || `Tax invoice emailed to ${recipientEmail}`);
      } else {
        showToast(response.data?.message || `Could not deliver invoice email.`);
      }
    } catch (err: any) {
      console.error('Backend send invoice email error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to send invoice email.';
      showToast(errMsg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Download trigger - automatically generates & downloads PDF file without print toast
  const handleDownloadPDF = () => {
    try {
      const itemsList = items.map((item: any) => {
        const unitPrice = item.product?.price || item.sellingPrice || item.unitPrice || 0;
        const qty = item.quantity || 1;
        const discAmt = Math.round(unitPrice * qty * ((item.product?.discount || 0) / 100));
        const taxAmt = Math.round((unitPrice * qty - discAmt) * 0.18);
        const total = unitPrice * qty - discAmt + taxAmt;
        return {
          name: item.product?.name || item.title || 'Product Item',
          sku: item.product?.sku || item.sku || 'FRM-001',
          quantity: qty,
          unitPrice,
          total
        };
      });

      const shippingAddr = order.billingAddress || order.address || {};
      const fullAddr = [shippingAddr.street, shippingAddr.addressLine1, shippingAddr.city, shippingAddr.state, shippingAddr.pincode]
        .filter(Boolean)
        .join(', ');

      const blob = generateInvoicePDFBlob({
        invoiceNumber,
        invoiceDate,
        orderId: order.id || '',
        paymentMethod: order.paymentMethod || 'Online',
        paymentStatus: order.paymentStatus || 'Paid',
        customerName: shippingAddr.name || curUser?.name || 'Valued Customer',
        customerAddress: fullAddr,
        customerPhone: shippingAddr.phone || curUser?.phoneNumber || '',
        customerEmail: recipientEmail,
        carrier: order.courierCompany || 'Standard Express',
        items: itemsList,
        subtotal,
        discount,
        taxes,
        shippingCharge: 0,
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
      className="fixed inset-0 z-[99999] flex items-start justify-center bg-[#262824]/60 p-3 sm:p-6 pt-4 md:pt-12 backdrop-blur-xs overflow-y-auto invoice-modal-overlay select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Printable Area Wrapper */}
      <div className="bg-white rounded-[2px] border border-[#dfdfd8] shadow-2xl w-full max-w-[840px] relative p-6 sm:p-8 invoice-modal-container flex flex-col justify-between my-auto animate-fadeIn text-[#262824]">
        
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
        <div className="flex justify-between items-center border-b border-[#dfdfd8] pb-3 mb-6 print-actions-bar select-none">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#262824] bg-[#eeede7] px-2.5 py-0.5 rounded-[2px] border border-[#dfdfd8]">Invoice Preview</span>
            <span className="text-xs font-mono font-bold text-[#262824]">{order.id}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-[#dfdfd8] hover:border-[#262824] text-[#262824] bg-white rounded-[2px] cursor-pointer"
            >
              <Printer size={13} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-[#dfdfd8] hover:border-[#262824] text-[#262824] bg-white rounded-[2px] cursor-pointer"
            >
              <Download size={13} /> PDF
            </button>
            <button
              onClick={handleEmailInvoice}
              disabled={isSendingEmail}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-[#dfdfd8] hover:border-[#262824] text-[#262824] bg-white rounded-[2px] cursor-pointer disabled:opacity-50"
            >
              {isSendingEmail ? (
                <Loader2 size={13} className="animate-spin text-[#262824]" />
              ) : (
                <Mail size={13} />
              )}
              <span>{isSendingEmail ? 'Sending...' : 'Email'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-[2px] border border-[#dfdfd8] flex items-center justify-center text-[#777971] hover:text-[#262824] hover:bg-[#eeede7] cursor-pointer transition-colors"
              title="Close invoice"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* INVOICE SHEET - A4 FORMAT */}
        <div className="invoice-print-area bg-white p-6 sm:p-8 border border-[#dfdfd8] rounded-[2px] text-xs leading-relaxed text-[#262824]">
          {/* Header row */}
          <div className="flex justify-between items-start border-b border-[#dfdfd8] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2 select-none">
                {storeProfile.logo ? (
                  <img
                    src={storeProfile.logo}
                    alt={storeProfile.storeName || 'Store Logo'}
                    className="h-8 max-w-[140px] object-contain"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-[2px] text-white flex items-center justify-center font-bold text-xs shrink-0"
                    style={{ backgroundColor: storeProfile.brandColor || '#262824' }}
                  >
                    {(storeProfile.storeName || 'F').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-display font-black text-xl text-[#262824] tracking-tight">
                  {storeProfile.storeName || 'FORMA'}
                </span>
              </div>
              <p className="text-[11px] text-[#777971] leading-normal">
                {storeProfile.storeName || 'FORMA Studio'} Official Store<br />
                {storeProfile.addressLine || 'Plot No. 12, Industrial Area'},<br />
                {storeProfile.district || 'Coimbatore'}, {storeProfile.state || 'Tamil Nadu'} - {storeProfile.pincode || '641001'}<br />
                {storeProfile.gstNumber ? <>GSTIN: <span className="font-mono">{storeProfile.gstNumber}</span><br /></> : null}
                {storeProfile.email || 'concierge@forma.com'} | {storeProfile.phone || '+91 98765 43210'}
              </p>
            </div>
            <div className="text-right">
              <h1 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-[#262824] mb-2">Tax Invoice</h1>
              <div className="text-xs text-[#777971] flex flex-col gap-0.5">
                <div>Invoice No: <span className="font-mono font-bold text-[#262824]">{invoiceNumber}</span></div>
                <div>Date: <span className="text-[#262824]">{invoiceDate}</span></div>
                <div>Order Ref: <span className="font-mono font-bold text-[#262824]">{order.id}</span></div>
                <div>Payment Mode: <span className="text-[#262824] font-bold uppercase">{order.paymentMethod || 'COD'}</span></div>
              </div>
            </div>
          </div>

          {/* Addresses Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-[#dfdfd8] pb-6 mb-6">
            <div className="bg-[#eeede7]/50 border border-[#dfdfd8] p-4 rounded-[2px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971] block mb-1.5">Billed to:</span>
              <p className="text-xs font-bold text-[#262824]">{order.billingAddress?.name || order.address?.name || 'Valued Customer'}</p>
              <p className="text-[11px] text-[#777971] mt-1 leading-normal">
                {order.billingAddress?.street || order.address?.street || order.address?.addressLine1 || ''}<br />
                {order.billingAddress?.city || order.address?.city || ''}, {order.billingAddress?.state || order.address?.state || ''} - {order.billingAddress?.pincode || order.address?.pincode || ''}<br />
                Phone: {order.billingAddress?.phone || order.address?.phone || ''}<br />
                Email: {recipientEmail}
              </p>
            </div>

            <div className="bg-[#eeede7]/50 border border-[#dfdfd8] p-4 rounded-[2px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971] block mb-1.5">Shipped to:</span>
              <p className="text-xs font-bold text-[#262824]">{order.address?.name || 'Valued Customer'}</p>
              <p className="text-[11px] text-[#777971] mt-1 leading-normal">
                {order.address?.street || order.address?.addressLine1 || ''}<br />
                {order.address?.city || ''}, {order.address?.state || ''} - {order.address?.pincode || ''}<br />
                Phone: {order.address?.phone || ''}<br />
                Carrier: {order.courierCompany || 'Standard Express'}
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#eeede7] border-y border-[#dfdfd8] text-[10px] text-[#777971] font-bold uppercase tracking-wider select-none">
                  <th className="py-2.5 px-3">Item details</th>
                  <th className="py-2.5 px-3 w-[100px]">SKU</th>
                  <th className="py-2.5 px-3 w-[60px] text-center">Qty</th>
                  <th className="py-2.5 px-3 w-[90px] text-right">Unit price</th>
                  <th className="py-2.5 px-3 w-[80px] text-right">Discount</th>
                  <th className="py-2.5 px-3 w-[80px] text-right">Taxes</th>
                  <th className="py-2.5 px-3 w-[90px] text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfdfd8] text-xs">
                {items.map((item: any, idx: number) => {
                  const unitPrice = item.product?.price || 0;
                  const qty = item.quantity || 1;
                  const discAmt = Math.round(unitPrice * qty * ((item.product?.discount || 0) / 100));
                  const taxAmt = Math.round((unitPrice * qty - discAmt) * 0.18);
                  const rowTotal = unitPrice * qty - discAmt + taxAmt;

                  return (
                    <tr key={idx} className="hover:bg-[#eeede7]/20">
                      <td className="py-2.5 px-3 font-bold text-[#262824]">
                        {item.product?.name || 'Product Item'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#777971] text-[11px]">{item.product?.sku || 'FRM-001'}</td>
                      <td className="py-2.5 px-3 text-center text-[#262824]">{qty}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#777971]">₹{unitPrice}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#8e2a2a]">-₹{discAmt}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#777971]">₹{taxAmt}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#262824]">₹{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-6 items-start border-t border-[#dfdfd8] pt-4">
            {/* Left side: T&C */}
            <div className="text-[11px] text-[#777971] leading-normal flex flex-col gap-2">
              <div>
                <strong className="text-[#262824] block mb-1 uppercase tracking-wider text-[10px]">Terms &amp; conditions:</strong>
                1. 7-day hassle-free returns on eligible items in original unboxing condition.<br />
                2. Warranty coverage serviced directly through verified brand service partners.<br />
                3. All disputes subject to Bengaluru jurisdiction.
              </div>
            </div>

            {/* Right side: Maths details */}
            <div className="flex flex-col gap-2 text-xs bg-[#eeede7]/50 border border-[#dfdfd8] p-4 rounded-[2px]">
              <div className="flex justify-between text-[#777971]">
                <span>Subtotal:</span>
                <span className="font-mono text-[#262824] font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-[#8e2a2a]">
                <span>Discount:</span>
                <span className="font-mono font-bold">-₹{discount}</span>
              </div>
              <div className="flex justify-between text-[#777971]">
                <span>Taxes (GST 18%):</span>
                <span className="font-mono text-[#262824] font-bold">₹{taxes}</span>
              </div>
              <div className="flex justify-between text-[#777971] border-b border-[#dfdfd8] pb-2">
                <span>Shipping:</span>
                <span className="text-[#3d6547] font-bold">Free</span>
              </div>
              <div className="flex justify-between items-baseline text-sm font-bold text-[#262824] pt-1">
                <span className="font-display uppercase tracking-wider">Grand Total:</span>
                <span className="font-display text-base font-mono font-bold text-[#262824]">₹{grandTotal}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1 bg-white border border-[#dfdfd8] px-3 py-1.5 rounded-[2px]">
                <span className="text-[#777971]">Status:</span>
                <span className="text-[#3d6547] font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <CheckCircle size={11} /> {order.paymentStatus || 'Paid'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer thank you */}
          <div className="text-center border-t border-[#dfdfd8] pt-5 mt-8 text-xs text-[#777971]">
            <span className="block font-bold text-[#262824] mb-0.5">Thank you for your patronage.</span>
            For support or concierge assistance, email concierge@forma.com.
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
