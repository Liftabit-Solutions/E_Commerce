/**
 * Premium Brand-Personalized Responsive HTML Email Templates for FORMA Studio.
 * Designed for maximum client compatibility (Gmail, Apple Mail, Outlook, Mobile).
 */

import { getStoreProfile } from "./storeProfile.js";

const CURRENT_YEAR = new Date().getFullYear();

export let BRAND_NAME = "FORMA Studio";
export let BRAND_PRIMARY = "#10b981";
export let BRAND_PRIMARY_DARK = "#047857";
export let BRAND_DARK = "#18181b";

const updateBrandConstants = () => {
    const store = getStoreProfile();
    BRAND_NAME = store.storeName || "FORMA Studio";
    BRAND_PRIMARY = store.brandColor || "#10b981";
    BRAND_PRIMARY_DARK = store.brandColor || "#047857";
    BRAND_DARK = "#18181b";
    return { BRAND_NAME, BRAND_PRIMARY, BRAND_PRIMARY_DARK, BRAND_DARK, store };
};

/**
 * Master responsive layout wrapper for all branded emails
 */
export const renderBrandEmailLayout = ({ title, previewText, contentHtml, footerNote = "" }) => {
    const { store, brandName, brandPrimary } = (() => {
        const c = updateBrandConstants();
        return {
            store: c.store,
            brandName: c.BRAND_NAME,
            brandPrimary: c.BRAND_PRIMARY,
        };
    })();
    const brandEmail = store.email || "concierge@forma.com";
    const brandAddress = `${store.addressLine || 'Plot No. 12, Industrial Area'}, ${store.district || 'Coimbatore'}, ${store.state || 'Tamil Nadu'} - ${store.pincode || '641001'}`;
    const brandTagline = "Official Store & Verified Essentials";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || brandName}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .content-cell { padding: 20px 16px !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .text-center-mobile { text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f8fafc;">
  <!-- Preview Text (Hidden in email body) -->
  <div style="display: none; font-size: 1px; color: #f8fafc; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${previewText || title}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table class="email-container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- Branded Top Header -->
          <tr>
            <td style="background-color: #18181b; padding: 24px 32px; text-align: left; border-bottom: 3px solid ${brandPrimary};">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    ${store.logo ? `
                      <img src="${store.logo}" alt="${brandName}" style="max-height: 38px; max-width: 160px; object-fit: contain; vertical-align: middle;" />
                    ` : `
                      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #ffffff; text-transform: uppercase;">
                        ${brandName}<span style="color: ${brandPrimary};">.</span>
                      </h1>
                    `}
                    <p style="margin: 4px 0 0; font-size: 11px; letter-spacing: 0.5px; color: #94a3b8; text-transform: uppercase;">
                      ${brandTagline}
                    </p>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(255,255,255,0.1); border-radius: 9999px; font-size: 11px; font-weight: 600; color: #cbd5e1; letter-spacing: 0.5px;">
                      Official Notification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dynamic Email Content -->
          <tr>
            <td class="content-cell" style="padding: 32px; color: #334155; font-size: 14px; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Optional Custom Footer Note -->
          ${footerNote ? `
          <tr>
            <td style="padding: 0 32px 20px; font-size: 12px; color: #64748b; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
              ${footerNote}
            </td>
          </tr>` : ''}

          <!-- Branded Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #475569;">
                ${brandName} • Official Store
              </p>
              <p style="margin: 0 0 8px; font-size: 11px; color: #64748b;">
                ${brandAddress}
              </p>
              ${store.gstNumber ? `<p style="margin: 0 0 8px; font-size: 10px; color: #64748b; font-family: monospace;">GSTIN: ${store.gstNumber}</p>` : ''}
              <p style="margin: 0 0 12px; font-size: 11px; color: #64748b;">
                Need help? Contact our Concierge at <a href="mailto:${brandEmail}" style="color: ${brandPrimary}; text-decoration: underline; font-weight: 600;">${brandEmail}</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                © ${CURRENT_YEAR} ${brandName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * 1. Sign-in / Welcome Email Template
 */
export const getWelcomeEmailTemplate = ({ name, email }) => {
    updateBrandConstants();
    const greetingName = name || (email ? email.split('@')[0] : 'Valued Customer');
    
    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #ecfdf5; color: ${BRAND_PRIMARY}; font-size: 26px; font-weight: bold; margin-bottom: 12px;">
          ✦
        </div>
        <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #0f172a;">Welcome to ${BRAND_NAME}</h2>
        <p style="margin: 0; font-size: 14px; color: #64748b;">We are thrilled to welcome you to the FORMA community.</p>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; color: #334155;">Hello <strong>${greetingName}</strong>,</p>
        <p style="margin: 0 0 12px; font-size: 13px; color: #475569; line-height: 1.6;">
          Your account has been registered under <strong>${email || 'your email'}</strong>. You now have access to our curated collections of premium home essentials, bespoke orders, expedited delivery, and personal concierge support.
        </p>
        <div style="display: table; width: 100%; margin-top: 16px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
          <div style="display: table-row;">
            <div style="display: table-cell; padding-right: 12px; font-size: 12px; color: #64748b;">
              ✓ Handcrafted Quality
            </div>
            <div style="display: table-cell; padding-right: 12px; font-size: 12px; color: #64748b;">
              ✓ Fast Priority Shipping
            </div>
            <div style="display: table-cell; font-size: 12px; color: #64748b;">
              ✓ Instant Live Tracking
            </div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 28px 0 12px;">
        <a href="${process.env.FRONTEND_URL || 'https://forma.com'}" style="display: inline-block; background-color: ${BRAND_PRIMARY}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
          Explore New Arrivals
        </a>
      </div>
    `;

    return renderBrandEmailLayout({
        title: `Welcome to ${BRAND_NAME}`,
        previewText: `Welcome to ${BRAND_NAME}, ${greetingName}. Discover exceptional essentials.`,
        contentHtml: content,
        footerNote: "You are receiving this email because you signed up on FORMA Studio."
    });
};

/**
 * 2. Password Reset / OTP Verification Email Template
 */
export const getOtpEmailTemplate = ({ name, otp, purpose = "Password Reset" }) => {
    updateBrandConstants();
    const greetingName = name || "User";

    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; border-radius: 50%; background-color: #ecfdf5; color: ${BRAND_PRIMARY}; font-size: 24px; font-weight: bold; margin-bottom: 12px;">
          🔒
        </div>
        <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #0f172a;">${purpose} Code</h2>
        <p style="margin: 0; font-size: 13px; color: #64748b;">Use the one-time verification code below to proceed.</p>
      </div>

      <p style="margin: 0 0 16px; font-size: 14px; color: #334155;">Hello <strong>${greetingName}</strong>,</p>
      <p style="margin: 0 0 20px; font-size: 13px; color: #475569; line-height: 1.6;">
        We received a request to authorize a <strong>${purpose}</strong> for your account. Please enter the following 6-digit verification code:
      </p>

      <!-- OTP Display Box -->
      <div style="background-color: #f0fdf4; border: 2px dashed ${BRAND_PRIMARY}; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #065f46; display: inline-block;">
          ${otp}
        </span>
        <p style="margin: 10px 0 0; font-size: 11px; font-weight: 600; color: #047857; text-transform: uppercase; letter-spacing: 0.5px;">
          Expires in 10 minutes
        </p>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 20px 0 12px; font-size: 12px; color: #92400e;">
        <strong>Security Notice:</strong> Never share this OTP with anyone, including FORMA representatives. If you did not initiate this request, please safely ignore this email or reach out to our concierge immediately.
      </div>
    `;

    return renderBrandEmailLayout({
        title: `Your Security Code: ${otp} - ${BRAND_NAME}`,
        previewText: `Your one-time verification code is ${otp}. Valid for 10 minutes.`,
        contentHtml: content,
        footerNote: "This is an automated security email sent for account verification."
    });
};

/**
 * 3. Tax Invoice Email Template
 */
export const getInvoiceEmailTemplate = ({ order, user = {}, recipientEmail, itemsHtml, formattedDate, fullAddrStr }) => {
    const { store } = updateBrandConstants();
    const shippingAddr = order.shippingAddress || {};
    const customerDisplayName = shippingAddr.fullName || user.name || 'Valued Customer';
    const subtotal = order.subtotal || order.grandTotal;
    const shippingCharge = order.delivery?.charge ? `₹${order.delivery.charge}` : 'FREE';

    const content = `
      <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <span style="display: inline-block; background-color: #ecfdf5; color: ${BRAND_PRIMARY_DARK}; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                Official Tax Invoice
              </span>
              <h2 style="margin: 8px 0 2px; font-size: 20px; font-weight: 700; color: #0f172a;">Invoice #${order.orderNumber}</h2>
              <p style="margin: 0; font-size: 12px; color: #64748b;">Issued on ${formattedDate}</p>
            </td>
            <td align="right" style="vertical-align: top;">
              <span style="font-size: 12px; font-weight: 600; color: #475569;">Payment:</span><br/>
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${order.payment?.method || 'Online'}</span>
              <span style="display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background-color: #e2e8f0; color: #334155; margin-left: 4px;">
                ${order.payment?.status || 'Paid'}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Billed & Shipped To Box -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #475569;">
            <strong style="color: #0f172a; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Billed & Delivered To</strong><br/>
            <span style="font-size: 13px; font-weight: 600; color: #0f172a;">${customerDisplayName}</span><br/>
            ${fullAddrStr ? `<span>${fullAddrStr}</span><br/>` : ''}
            ${shippingAddr.phoneNumber || user.phoneNumber ? `<span>Phone: ${shippingAddr.phoneNumber || user.phoneNumber}</span><br/>` : ''}
            <span>Email: ${recipientEmail}</span>
          </td>
        </tr>
      </table>

      <!-- PDF Attachment Notice -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; color: #166534;">
        📎 <strong>Official PDF Attached:</strong> Your formal Tax Invoice document (<strong>Invoice_${order.orderNumber}.pdf</strong>) has been generated and attached to this email for your accounting records.
      </div>

      <!-- Items Table -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #334155; border-bottom: 1px solid #cbd5e1;">
            <th align="left" style="padding: 10px 12px; font-weight: 700;">Item</th>
            <th align="left" style="padding: 10px 12px; font-weight: 700;">SKU</th>
            <th align="center" style="padding: 10px 12px; font-weight: 700;">Qty</th>
            <th align="right" style="padding: 10px 12px; font-weight: 700;">Price</th>
            <th align="right" style="padding: 10px 12px; font-weight: 700;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals Table -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 13px;">
        <tr>
          <td align="right" style="padding: 4px 12px; color: #64748b;">Subtotal:</td>
          <td align="right" width="120" style="padding: 4px 12px; font-weight: 600; color: #0f172a;">₹${subtotal}</td>
        </tr>
        <tr>
          <td align="right" style="padding: 4px 12px; color: #64748b;">Delivery & Handling:</td>
          <td align="right" width="120" style="padding: 4px 12px; font-weight: 600; color: ${BRAND_PRIMARY};">${shippingCharge}</td>
        </tr>
        ${order.discount?.amount ? `
        <tr>
          <td align="right" style="padding: 4px 12px; color: #64748b;">Discount:</td>
          <td align="right" width="120" style="padding: 4px 12px; font-weight: 600; color: #ef4444;">-₹${order.discount.amount}</td>
        </tr>` : ''}
        <tr>
          <td align="right" style="padding: 10px 12px; font-size: 15px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0;">Grand Total:</td>
          <td align="right" width="120" style="padding: 10px 12px; font-size: 17px; font-weight: 800; color: ${BRAND_PRIMARY_DARK}; border-top: 1px solid #e2e8f0;">₹${order.grandTotal}</td>
        </tr>
      </table>
    `;

    return renderBrandEmailLayout({
        title: `Tax Invoice for Order #${order.orderNumber} - ${BRAND_NAME}`,
        previewText: `Your Tax Invoice for Order #${order.orderNumber} is ready. Total: ₹${order.grandTotal}.`,
        contentHtml: content,
        footerNote: `This invoice is issued by ${BRAND_NAME}.${store?.gstNumber ? ` GSTIN: ${store.gstNumber}.` : ''}`
    });
};

/**
 * 4. Product Delivery & Shipping Update Email Template
 */
export const getDeliveryUpdateEmailTemplate = ({ order, status, trackingCourier, trackingId, trackingUrl, estimatedDelivery }) => {
    updateBrandConstants();
    const statusTitles = {
        'Confirmed': { title: 'Order Confirmed', desc: 'Your order has been confirmed and is being prepared.' },
        'Packed': { title: 'Order Packed & Ready', desc: 'Your items are packed and waiting for courier pickup.' },
        'Shipped': { title: 'Order Shipped', desc: 'Your order is on the way with our courier partner.' },
        'Out for Delivery': { title: 'Out for Delivery Today', desc: 'The courier is out for delivery in your area!' },
        'Delivered': { title: 'Order Delivered', desc: 'Your package has been successfully delivered. Enjoy your purchase!' },
        'Returned': { title: 'Return Received', desc: 'We have received your returned package.' }
    };

    const currentInfo = statusTitles[status] || { title: `Order Update: ${status}`, desc: `Your order status has been updated to ${status}.` };

    // Stepper visual indicators
    const steps = ['Confirmed', 'Packed', 'Shipped', 'Delivered'];
    const currentStepIdx = steps.indexOf(status === 'Out for Delivery' ? 'Shipped' : status);

    const stepTrackerHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 20px;">
        <tr>
          ${steps.map((st, i) => {
            const isCompleted = currentStepIdx >= i;
            const isCurrent = steps[currentStepIdx] === st;
            const bgColor = isCompleted ? BRAND_PRIMARY : '#e2e8f0';
            const textColor = isCompleted ? '#065f46' : '#94a3b8';
            return `
              <td align="center" style="width: 25%; vertical-align: top;">
                <div style="width: 28px; height: 28px; line-height: 28px; border-radius: 50%; background-color: ${bgColor}; color: #ffffff; font-size: 11px; font-weight: 700; margin: 0 auto 6px;">
                  ${isCompleted ? '✓' : i + 1}
                </div>
                <span style="font-size: 11px; font-weight: ${isCurrent ? '700' : '500'}; color: ${textColor}; display: block;">
                  ${st}
                </span>
              </td>
            `;
          }).join('')}
        </tr>
      </table>
    `;

    const content = `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #ecfdf5; color: ${BRAND_PRIMARY_DARK}; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;">
          ${status}
        </span>
        <h2 style="margin: 10px 0 6px; font-size: 22px; font-weight: 700; color: #0f172a;">${currentInfo.title}</h2>
        <p style="margin: 0; font-size: 13px; color: #64748b;">${currentInfo.desc}</p>
      </div>

      ${stepTrackerHtml}

      <!-- Tracking Information Box -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Order Number:</td>
                <td align="right" style="padding: 4px 0; font-weight: 600; color: #0f172a;">#${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Courier Service:</td>
                <td align="right" style="padding: 4px 0; font-weight: 600; color: #0f172a;">${trackingCourier || order.shipping?.courier || 'Express Logistics'}</td>
              </tr>
              ${(trackingId || order.shipping?.trackingId) ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">AWB / Tracking ID:</td>
                <td align="right" style="padding: 4px 0; font-family: monospace; font-weight: 700; color: ${BRAND_PRIMARY_DARK};">${trackingId || order.shipping?.trackingId}</td>
              </tr>` : ''}
              ${estimatedDelivery ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Estimated Arrival:</td>
                <td align="right" style="padding: 4px 0; font-weight: 600; color: #0f172a;">${estimatedDelivery}</td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      </table>

      ${(trackingUrl || order.shipping?.trackingUrl) ? `
      <div style="text-align: center; margin: 24px 0 12px;">
        <a href="${trackingUrl || order.shipping?.trackingUrl}" target="_blank" style="display: inline-block; background-color: ${BRAND_PRIMARY}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
          Track Consignment Live
        </a>
      </div>` : ''}
    `;

    return renderBrandEmailLayout({
        title: `Delivery Update: Order #${order.orderNumber} is ${status} - ${BRAND_NAME}`,
        previewText: `${currentInfo.title} for Order #${order.orderNumber}.`,
        contentHtml: content,
        footerNote: `Delivering with care from ${BRAND_NAME}. Track your packages directly from your account dashboard.`
    });
};

/**
 * 5. Payment Update Email Template
 */
export const getPaymentUpdateEmailTemplate = ({ order, paymentStatus, paymentMethod, amount, transactionId }) => {
    updateBrandConstants();
    const isPaid = (paymentStatus || '').toLowerCase() === 'paid';
    const isRefunded = (paymentStatus || '').toLowerCase() === 'refunded';

    const heading = isRefunded
        ? 'Refund Completed'
        : isPaid
        ? 'Payment Received & Verified'
        : `Payment Update: ${paymentStatus}`;

    const badgeColor = isRefunded ? '#3b82f6' : isPaid ? BRAND_PRIMARY : '#f59e0b';
    const badgeBg = isRefunded ? '#eff6ff' : isPaid ? '#ecfdf5' : '#fffbeb';

    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase;">
          ${paymentStatus}
        </span>
        <h2 style="margin: 10px 0 6px; font-size: 22px; font-weight: 700; color: #0f172a;">${heading}</h2>
        <p style="margin: 0; font-size: 13px; color: #64748b;">
          ${isRefunded ? 'Your refund has been processed back to your original payment source.' : 'Thank you! Your payment has been successfully recorded.'}
        </p>
      </div>

      <!-- Receipt Box -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 20px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Order Reference:</td>
                <td align="right" style="padding: 6px 0; font-weight: 600; color: #0f172a;">#${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Amount:</td>
                <td align="right" style="padding: 6px 0; font-size: 16px; font-weight: 800; color: ${BRAND_PRIMARY_DARK};">₹${amount || order.grandTotal}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Payment Method:</td>
                <td align="right" style="padding: 6px 0; font-weight: 600; color: #0f172a;">${paymentMethod || order.payment?.method || 'Online'}</td>
              </tr>
              ${(transactionId || order.payment?.transactionId) ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Transaction Reference:</td>
                <td align="right" style="padding: 6px 0; font-family: monospace; font-weight: 600; color: #475569;">${transactionId || order.payment?.transactionId}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Timestamp:</td>
                <td align="right" style="padding: 6px 0; font-weight: 500; color: #64748b;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #475569; text-align: center;">
        A copy of your Tax Invoice with complete line items and GST details is available anytime in your customer account.
      </div>
    `;

    return renderBrandEmailLayout({
        title: `${heading} - Order #${order.orderNumber} - ${BRAND_NAME}`,
        previewText: `${heading} for Order #${order.orderNumber}. Amount: ₹${amount || order.grandTotal}.`,
        contentHtml: content,
        footerNote: `Secure transactions powered by ${BRAND_NAME}. We never store your full card details or banking credentials.`
    });
};

/**
 * 6. Offer & Promotional Updates Email Template
 */
export const getOfferUpdateEmailTemplate = ({ title, subtitle, promoCode, discountText, validUntil, shopUrl }) => {
    updateBrandConstants();
    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
          Exclusive Offer
        </span>
        <h2 style="margin: 10px 0 6px; font-size: 24px; font-weight: 800; color: #0f172a;">${title || 'Private Member Privilege'}</h2>
        <p style="margin: 0; font-size: 14px; color: #64748b;">${subtitle || 'Handpicked design essentials, curated exclusively for your space.'}</p>
      </div>

      <!-- Coupon Voucher Box -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px dashed ${BRAND_PRIMARY}; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0 24px;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 1px;">
          ${discountText || 'Special Discount'}
        </p>
        <div style="background-color: #ffffff; border: 1px solid #bbf7d0; display: inline-block; padding: 10px 24px; border-radius: 8px; margin: 8px 0;">
          <span style="font-family: monospace; font-size: 26px; font-weight: 800; letter-spacing: 4px; color: ${BRAND_DARK};">
            ${promoCode || 'FORMA20'}
          </span>
        </div>
        ${validUntil ? `
        <p style="margin: 8px 0 0; font-size: 11px; color: #047857;">
          Valid until <strong>${validUntil}</strong> on select collections.
        </p>` : ''}
      </div>

      <div style="text-align: center; margin: 28px 0 12px;">
        <a href="${shopUrl || process.env.FRONTEND_URL || 'https://forma.com'}" style="display: inline-block; background-color: ${BRAND_DARK}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 13px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          Shop the Exclusive Collection
        </a>
      </div>
    `;

    return renderBrandEmailLayout({
        title: `${title || 'Special Offer'} - ${BRAND_NAME}`,
        previewText: `${discountText || 'Special Offer'} from ${BRAND_NAME}. Use code ${promoCode || 'FORMA20'}.`,
        contentHtml: content,
        footerNote: "You are receiving this email because you opted into promotional updates from FORMA Studio. You can manage your notification preferences anytime."
    });
};

