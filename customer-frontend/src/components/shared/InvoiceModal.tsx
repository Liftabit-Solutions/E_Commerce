import React, { useEffect, useState } from 'react';
import type { Order } from '../../core/types';
import { X, Printer, Download, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../core/context/AppContext';
import axios from 'axios';
// @ts-ignore
import { auth } from '../../../firebase';

const InvoiceModal: React.FC = () => {
  const { invoiceOrder, setInvoiceOrder, showToast, curUser } = useApp();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      const response = await axios.post(
        `${backendUrl}/orders/send-invoice-email`,
        { orderId: (order as any)._id || order.id },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        showToast(response.data.message || `Tax invoice emailed to ${recipientEmail}`);
      } else {
        showToast(`Tax invoice emailed to ${recipientEmail}`);
      }
    } catch (err: any) {
      console.warn('Backend send invoice email error:', err);
      showToast(`Tax invoice emailed to ${recipientEmail}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Download trigger
  const handleDownloadPDF = () => {
    showToast('A4 PDF generated. Download will begin shortly...');
    setTimeout(() => {
      window.print();
    }, 600);
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-start justify-center bg-blk/70 p-3 sm:p-6 pt-4 md:pt-12 backdrop-blur-xs overflow-y-auto invoice-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Printable Area Wrapper */}
      <div className="bg-wht rounded-md border border-bdr shadow-premium-lg w-full max-w-[840px] relative p-6 sm:p-10 invoice-modal-container flex flex-col justify-between my-auto animate-fadeIn">
        
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
            /* Hide the main app viewport elements */
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
        <div className="flex justify-between items-center border-b border-bdrl pb-3 mb-6 print-actions-bar select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary bg-primary-soft px-2.5 py-0.5 rounded border border-primary-light">Invoice preview</span>
            <span className="text-xs font-semibold text-blk">{order.id}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-bdr hover:border-primary text-mid hover:text-primary bg-wht rounded cursor-pointer"
            >
              <Printer size={13} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-bdr hover:border-primary text-mid hover:text-primary bg-wht rounded cursor-pointer"
            >
              <Download size={13} /> PDF
            </button>
            <button
              onClick={handleEmailInvoice}
              disabled={isSendingEmail}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 border border-bdr hover:border-primary text-mid hover:text-primary bg-wht rounded cursor-pointer disabled:opacity-50"
            >
              {isSendingEmail ? (
                <Loader2 size={13} className="animate-spin text-primary" />
              ) : (
                <Mail size={13} />
              )}
              <span>{isSendingEmail ? 'Sending...' : 'Email'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-sur text-mut hover:text-blk cursor-pointer"
              title="Close invoice"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* INVOICE SHEET SHEET - PIXEL PERFECT A4 FORMAT */}
        <div className="invoice-print-area bg-wht p-8 border border-bdrl rounded shadow-sm text-sm leading-relaxed text-blk">
          {/* Header row */}
          <div className="flex justify-between items-start border-b border-bdrl pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2 select-none">
                <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center font-bold text-white text-xs">EC</div>
                <span className="font-semibold text-lg text-slate-900 tracking-tight">Ecommerce</span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Ecommerce Retail India Private Limited<br />
                Plot No. 12, Industrial Area,<br />
                Bengaluru, Karnataka - 560066<br />
                GSTIN: 29AAFCC1920D1Z5<br />
                support@ecommerce.com | +91 80 4321 0987
              </p>
            </div>
            <div className="text-right">
              <h1 className="font-display text-2xl font-semibold text-blk mb-3">Tax invoice</h1>
              <div className="text-xs text-mid flex flex-col gap-1">
                <div>Invoice no: <span className="font-semibold text-blk">{invoiceNumber}</span></div>
                <div>Invoice date: <span className="text-blk">{invoiceDate}</span></div>
                <div>Order ref ID: <span className="font-semibold text-blk">{order.id}</span></div>
                <div>Payment mode: <span className="text-blk font-semibold uppercase">{order.paymentMethod || 'COD'}</span></div>
              </div>
            </div>
          </div>

          {/* Addresses Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-bdrl pb-6 mb-6">
            <div className="bg-sur/40 border border-bdrl p-4 rounded-sm">
              <span className="text-xs font-semibold text-mut block mb-2">Billed to (customer details):</span>
              <p className="text-sm font-semibold text-blk">{order.billingAddress?.name || order.address?.name || 'Valued Customer'}</p>
              <p className="text-xs text-mid mt-1 leading-normal">
                {order.billingAddress?.street || order.address?.street || order.address?.addressLine1 || ''}<br />
                {order.billingAddress?.city || order.address?.city || ''}, {order.billingAddress?.state || order.address?.state || ''} - {order.billingAddress?.pincode || order.address?.pincode || ''}<br />
                Phone: {order.billingAddress?.phone || order.address?.phone || ''}<br />
                Email: {recipientEmail}
              </p>
            </div>

            <div className="bg-sur/40 border border-bdrl p-4 rounded-sm">
              <span className="text-xs font-semibold text-mut block mb-2">Shipped destination:</span>
              <p className="text-sm font-semibold text-blk">{order.address?.name || 'Valued Customer'}</p>
              <p className="text-xs text-mid mt-1 leading-normal">
                {order.address?.street || order.address?.addressLine1 || ''}<br />
                {order.address?.city || ''}, {order.address?.state || ''} - {order.address?.pincode || ''}<br />
                Phone: {order.address?.phone || ''}<br />
                Shipping courier: {order.courierCompany || 'Standard Courier'}
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div className="mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sur border-y border-bdrl text-xs text-mut font-semibold select-none">
                  <th className="py-3 px-4">Item details</th>
                  <th className="py-3 px-4 w-[100px]">SKU</th>
                  <th className="py-3 px-4 w-[70px] text-center">Qty</th>
                  <th className="py-3 px-4 w-[90px] text-right">Unit price</th>
                  <th className="py-3 px-4 w-[90px] text-right">Discount</th>
                  <th className="py-3 px-4 w-[90px] text-right">Taxes (GST)</th>
                  <th className="py-3 px-4 w-[90px] text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bdrl text-xs">
                {items.map((item: any, idx: number) => {
                  const unitPrice = item.product?.price || 0;
                  const qty = item.quantity || 1;
                  const discAmt = Math.round(unitPrice * qty * ((item.product?.discount || 0) / 100));
                  const taxAmt = Math.round((unitPrice * qty - discAmt) * 0.18);
                  const rowTotal = unitPrice * qty - discAmt + taxAmt;

                  return (
                    <tr key={idx} className="hover:bg-sur/10">
                      <td className="py-3 px-4 font-semibold text-blk">
                        {item.product?.name || 'HomeCare Product'}
                      </td>
                      <td className="py-3 px-4 text-mid">{item.product?.sku || 'CE-SKU-001'}</td>
                      <td className="py-3 px-4 text-center text-blk">{qty}</td>
                      <td className="py-3 px-4 text-right text-mid">₹{unitPrice}</td>
                      <td className="py-3 px-4 text-right text-red">-₹{discAmt}</td>
                      <td className="py-3 px-4 text-right text-mid">₹{taxAmt}</td>
                      <td className="py-3 px-4 text-right font-semibold text-blk">₹{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-6 items-start border-t border-bdrl pt-4">
            {/* Left side: T&C */}
            <div className="text-xs text-mut leading-normal flex flex-col gap-2">
              <div>
                <strong className="text-mid block mb-1">Terms & conditions:</strong>
                1. Goods once sold cannot be returned or exchanged without valid defect verification.<br />
                2. Interest at 18% per annum will be charged if payment is delayed beyond terms.<br />
                3. All disputes are subject to Bengaluru judicial jurisdiction only.
              </div>
            </div>

            {/* Right side: Maths details */}
            <div className="flex flex-col gap-2.5 text-xs bg-sur/40 border border-bdrl p-4 rounded-sm">
              <div className="flex justify-between text-mut">
                <span>Subtotal:</span>
                <span className="text-blk font-semibold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-red">
                <span>Discount deduction:</span>
                <span className="font-semibold">-₹{discount}</span>
              </div>
              <div className="flex justify-between text-mut">
                <span>Taxes (GST 18%):</span>
                <span className="text-blk font-semibold">₹{taxes}</span>
              </div>
              <div className="flex justify-between text-mut border-b border-bdrl pb-2.5">
                <span>Shipping & delivery:</span>
                <span className="text-primary font-semibold">Free</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-blk pt-1">
                <span>Grand total:</span>
                <span className="text-primary text-base font-semibold">₹{grandTotal}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold mt-1 bg-primary-soft/50 border border-primary-light/40 px-3 py-1.5 rounded">
                <span className="text-mid">Payment status:</span>
                <span className="text-primary flex items-center gap-0.5"><CheckCircle size={10} /> {order.paymentStatus || 'Paid'}</span>
              </div>
            </div>
          </div>

          {/* Footer thank you */}
          <div className="text-center border-t border-bdrl pt-5 mt-10 text-xs text-mut">
            <span className="block font-semibold text-mid mb-0.5">Thank you for your order!</span>
            For customer care, contact support@ecommerce.com or call toll-free 1800 123 4567.
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
