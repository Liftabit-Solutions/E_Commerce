/**
 * Client-side standard PDF document generator for Tax Invoices.
 * Produces a pure ISO 32000-1 compatible PDF/1.4 binary blob without external dependencies.
 */

import { getStoreProfile } from './storeSettings';
import type { StoreProfile } from './storeSettings';

export interface PDFInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  orderId: string;
  paymentMethod?: string;
  paymentStatus?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  carrier?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  taxes?: number;
  shippingCharge?: number;
  grandTotal: number;
}

const escapePdfText = (str: string): string => {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
};

export const generateInvoicePDFBlob = (data: PDFInvoiceData, customStore?: StoreProfile): Blob => {
  const store = customStore || getStoreProfile();
  const storeNameUpper = (store.storeName || 'FORMA Studio').toUpperCase();
  const fullAddress = `${store.addressLine || 'Plot No. 12, Industrial Area'}, ${store.district || 'Coimbatore'}, ${store.state || 'Tamil Nadu'} - ${store.pincode || '641001'}`;
  const storeContact = `GSTIN: ${store.gstNumber || '33AAAAA0000A1Z5'} | ${store.email || 'concierge@forma.com'} | ${store.phone || '+91 98765 43210'}`;

  let stream = '';

  const text = (
    txt: string,
    x: number,
    y: number,
    font: 'F1' | 'F2',
    size: number,
    r: number,
    g: number,
    b: number
  ) => {
    stream += 'BT\n';
    stream += `${(r / 255).toFixed(2)} ${(g / 255).toFixed(2)} ${(b / 255).toFixed(2)} rg\n`;
    stream += `/${font} ${size} Tf\n`;
    stream += `1 0 0 1 ${x} ${y} Tm\n`;
    stream += `(${escapePdfText(txt)}) Tj\n`;
    stream += 'ET\n';
  };

  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fr?: number,
    fg?: number,
    fb?: number,
    sr?: number,
    sg?: number,
    sb?: number
  ) => {
    if (fr !== undefined && fg !== undefined && fb !== undefined) {
      stream += `${(fr / 255).toFixed(2)} ${(fg / 255).toFixed(2)} ${(fb / 255).toFixed(2)} rg\n`;
      stream += `${x} ${y} ${w} ${h} re f\n`;
    }
    if (sr !== undefined && sg !== undefined && sb !== undefined) {
      stream += `${(sr / 255).toFixed(2)} ${(sg / 255).toFixed(2)} ${(sb / 255).toFixed(2)} RG\n`;
      stream += '0.5 w\n';
      stream += `${x} ${y} ${w} ${h} re S\n`;
    }
  };

  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    r: number,
    g: number,
    b: number,
    lw: number = 0.5
  ) => {
    stream += `${(r / 255).toFixed(2)} ${(g / 255).toFixed(2)} ${(b / 255).toFixed(2)} RG\n`;
    stream += `${lw} w\n`;
    stream += `${x1} ${y1} m ${x2} ${y2} l S\n`;
  };

  // Header Brand Info
  text(storeNameUpper, 40, 792, 'F2', 20, 38, 40, 36);
  text(store.storeName ? `${store.storeName} Official Store` : 'FORMA Studio Private Limited', 40, 774, 'F1', 9, 119, 121, 113);
  text(fullAddress.slice(0, 75), 40, 762, 'F1', 9, 119, 121, 113);
  text(storeContact.slice(0, 80), 40, 750, 'F1', 9, 119, 121, 113);

  // Invoice Title & Meta (Right side)
  text('TAX INVOICE', 390, 792, 'F2', 18, 38, 40, 36);
  text(`Invoice No: ${data.invoiceNumber}`, 390, 774, 'F2', 9, 38, 40, 36);
  text(`Invoice Date: ${data.invoiceDate}`, 390, 762, 'F1', 9, 119, 121, 113);
  text(`Order Ref: ${data.orderId}`, 390, 750, 'F2', 9, 38, 40, 36);
  text(`Payment: ${data.paymentMethod || 'Online'} (${data.paymentStatus || 'Paid'})`, 390, 738, 'F1', 9, 119, 121, 113);

  line(40, 726, 555, 726, 223, 223, 216, 1);

  // Addresses row (Billed To & Shipped To)
  rect(40, 646, 245, 70, 248, 248, 246, 223, 223, 216);
  text('BILLED TO:', 50, 703, 'F2', 8, 119, 121, 113);
  text((data.customerName || 'Valued Customer').slice(0, 35), 50, 691, 'F2', 9, 38, 40, 36);
  text((data.customerAddress || 'Address not specified').slice(0, 48), 50, 679, 'F1', 8, 119, 121, 113);
  text(`Phone: ${data.customerPhone || 'N/A'}`, 50, 667, 'F1', 8, 119, 121, 113);
  text(`Email: ${data.customerEmail || 'customer@ecommerce.com'}`.slice(0, 42), 50, 655, 'F1', 8, 119, 121, 113);

  rect(310, 646, 245, 70, 248, 248, 246, 223, 223, 216);
  text('SHIPPED TO:', 320, 703, 'F2', 8, 119, 121, 113);
  text((data.customerName || 'Valued Customer').slice(0, 35), 320, 691, 'F2', 9, 38, 40, 36);
  text((data.customerAddress || 'Address not specified').slice(0, 48), 320, 679, 'F1', 8, 119, 121, 113);
  text(`Phone: ${data.customerPhone || 'N/A'}`, 320, 667, 'F1', 8, 119, 121, 113);
  text(`Carrier: ${data.carrier || 'Standard Express'}`, 320, 655, 'F1', 8, 119, 121, 113);

  // Table header
  rect(40, 616, 515, 20, 238, 237, 231);
  text('ITEM DETAILS', 50, 623, 'F2', 8, 119, 121, 113);
  text('SKU', 260, 623, 'F2', 8, 119, 121, 113);
  text('QTY', 340, 623, 'F2', 8, 119, 121, 113);
  text('UNIT PRICE', 390, 623, 'F2', 8, 119, 121, 113);
  text('TOTAL', 490, 623, 'F2', 8, 119, 121, 113);

  // Rows
  let curY = 596;
  const items = data.items.length > 0 ? data.items : [{ name: 'Order Item', sku: 'FRM-001', quantity: 1, unitPrice: data.grandTotal, total: data.grandTotal }];
  items.slice(0, 10).forEach((item) => {
    text((item.name || 'Product Item').slice(0, 34), 50, curY, 'F2', 9, 38, 40, 36);
    text(item.sku || 'FRM-001', 260, curY, 'F1', 8, 119, 121, 113);
    text(String(item.quantity || 1), 346, curY, 'F1', 9, 38, 40, 36);
    text(`INR ${item.unitPrice || 0}`, 390, curY, 'F1', 9, 119, 121, 113);
    text(`INR ${item.total || 0}`, 490, curY, 'F2', 9, 38, 40, 36);
    curY -= 12;
    line(40, curY, 555, curY, 240, 240, 235, 0.5);
    curY -= 14;
  });

  line(40, curY, 555, curY, 223, 223, 216, 1);
  curY -= 16;

  // Terms & Conditions (Left)
  text('TERMS & CONDITIONS:', 40, curY, 'F2', 8, 38, 40, 36);
  text('1. 7-day hassle-free returns on eligible items in original condition.', 40, curY - 12, 'F1', 7.5, 119, 121, 113);
  text('2. Warranty coverage serviced directly through verified partners.', 40, curY - 22, 'F1', 7.5, 119, 121, 113);
  text('3. All disputes subject to Bengaluru judicial jurisdiction only.', 40, curY - 32, 'F1', 7.5, 119, 121, 113);

  // Totals Breakdown Box (Right)
  rect(360, curY - 78, 195, 88, 248, 248, 246, 223, 223, 216);
  text('Subtotal:', 375, curY - 10, 'F1', 8.5, 119, 121, 113);
  text(`INR ${data.subtotal}`, 480, curY - 10, 'F2', 8.5, 38, 40, 36);

  if (data.discount && data.discount > 0) {
    text('Discount:', 375, curY - 22, 'F1', 8.5, 142, 42, 42);
    text(`-INR ${data.discount}`, 480, curY - 22, 'F2', 8.5, 142, 42, 42);
  }

  text('Taxes (GST 18%):', 375, curY - 34, 'F1', 8.5, 119, 121, 113);
  text(`INR ${data.taxes || 0}`, 480, curY - 34, 'F2', 8.5, 38, 40, 36);

  text('Shipping & Delivery:', 375, curY - 46, 'F1', 8.5, 119, 121, 113);
  text(data.shippingCharge && data.shippingCharge > 0 ? `INR ${data.shippingCharge}` : 'FREE', 480, curY - 46, 'F2', 8.5, 16, 185, 129);

  line(370, curY - 52, 545, curY - 52, 223, 223, 216, 0.5);

  text('GRAND TOTAL:', 375, curY - 67, 'F2', 10, 38, 40, 36);
  text(`INR ${data.grandTotal}`, 480, curY - 67, 'F2', 11, 4, 120, 87);

  // Bottom Footer
  text(`Thank you for choosing ${store.storeName || 'FORMA Studio'}! support: ${store.email || 'concierge@forma.com'}`, 40, 48, 'F1', 8, 150, 150, 150);

  // Build standard PDF binary text
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  const addObj = (str: string) => {
    offsets.push(body.length);
    body += str + '\n';
  };

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj');
  addObj(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`);
  addObj('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  addObj('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  const startxref = body.length;
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `${xref}trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;

  return new Blob([body], { type: 'application/pdf' });
};

