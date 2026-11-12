/**
 * Email Service for FORMA Studio.
 * Dispatches branded transactional and marketing emails via Nodemailer.
 */

import { createTransporter } from "./email.js";
import {
    getWelcomeEmailTemplate,
    getOtpEmailTemplate,
    getInvoiceEmailTemplate,
    getDeliveryUpdateEmailTemplate,
    getPaymentUpdateEmailTemplate,
    getOfferUpdateEmailTemplate,
} from "./emailTemplates.js";
import { getStoreProfile } from "./storeProfile.js";

const getSender = () => {
    const store = getStoreProfile();
    if (process.env.EMAIL_USER) {
        return `"${store.storeName}" <${process.env.EMAIL_USER}>`;
    }
    return process.env.EMAIL_FROM || `"${store.storeName}" <${store.email || 'concierge@forma.com'}>`;
};

/**
 * Send welcome email to newly registered or logged-in users
 */
export const sendWelcomeEmail = async ({ to, name }) => {
    if (!to) return;
    try {
        const store = getStoreProfile();
        const transporter = createTransporter();
        const html = getWelcomeEmailTemplate({ name, email: to });
        if (transporter) {
            const info = await transporter.sendMail({
                from: getSender(),
                to,
                subject: `Welcome to ${store.storeName}`,
                html,
            });
            console.log(`[EMAIL] Welcome email sent to ${to} (MessageId: ${info.messageId})`);
        } else {
            console.log(`[EMAIL LOGGED] Welcome email prepared for ${to}`);
        }
    } catch (err) {
        console.error(`[EMAIL ERROR] Failed to send welcome email to ${to}:`, err.message);
    }
};

/**
 * Send OTP verification or password reset email
 */
export const sendOtpEmail = async ({ to, name, otp, purpose = "Password Reset" }) => {
    if (!to) return;
    try {
        const store = getStoreProfile();
        const transporter = createTransporter();
        const html = getOtpEmailTemplate({ name, otp, purpose });
        if (transporter) {
            const info = await transporter.sendMail({
                from: getSender(),
                to,
                subject: `Your ${purpose} Code: ${otp} - ${store.storeName}`,
                html,
            });
            console.log(`[EMAIL] ${purpose} OTP sent to ${to} (MessageId: ${info.messageId})`);
        } else {
            console.log(`[EMAIL LOGGED] ${purpose} OTP for ${to}: ${otp}`);
        }
    } catch (err) {
        console.error(`[EMAIL ERROR] Failed to send OTP email to ${to}:`, err.message);
    }
};

/**
 * Send delivery / shipping status update email
 */
export const sendDeliveryStatusEmail = async ({ to, order, status, trackingCourier, trackingId, trackingUrl, estimatedDelivery }) => {
    if (!to || !order) return;
    try {
        const store = getStoreProfile();
        const transporter = createTransporter();
        const html = getDeliveryUpdateEmailTemplate({
            order,
            status,
            trackingCourier,
            trackingId,
            trackingUrl,
            estimatedDelivery,
        });
        if (transporter) {
            const info = await transporter.sendMail({
                from: getSender(),
                to,
                subject: `Order #${order.orderNumber} Delivery Update: ${status} - ${store.storeName}`,
                html,
            });
            console.log(`[EMAIL] Delivery status (${status}) sent to ${to} for Order #${order.orderNumber} (MessageId: ${info.messageId})`);
        } else {
            console.log(`[EMAIL LOGGED] Delivery status (${status}) for Order #${order.orderNumber} targeted to ${to}`);
        }
    } catch (err) {
        console.error(`[EMAIL ERROR] Failed to send delivery update email to ${to}:`, err.message);
    }
};

/**
 * Send payment confirmation or refund update email
 */
export const sendPaymentStatusEmail = async ({ to, order, paymentStatus, paymentMethod, amount, transactionId }) => {
    if (!to || !order) return;
    try {
        const store = getStoreProfile();
        const transporter = createTransporter();
        const html = getPaymentUpdateEmailTemplate({
            order,
            paymentStatus: paymentStatus || order.payment?.status,
            paymentMethod: paymentMethod || order.payment?.method,
            amount: amount || order.grandTotal,
            transactionId: transactionId || order.payment?.transactionId,
        });
        if (transporter) {
            const info = await transporter.sendMail({
                from: getSender(),
                to,
                subject: `Payment Update for Order #${order.orderNumber}: ${paymentStatus} - ${store.storeName}`,
                html,
            });
            console.log(`[EMAIL] Payment status (${paymentStatus}) sent to ${to} for Order #${order.orderNumber} (MessageId: ${info.messageId})`);
        } else {
            console.log(`[EMAIL LOGGED] Payment status (${paymentStatus}) for Order #${order.orderNumber} targeted to ${to}`);
        }
    } catch (err) {
        console.error(`[EMAIL ERROR] Failed to send payment update email to ${to}:`, err.message);
    }
};

/**
 * Send promotional / offer campaign email
 */
export const sendOfferEmail = async ({ to, title, subtitle, promoCode, discountText, validUntil, shopUrl }) => {
    if (!to) return;
    try {
        const store = getStoreProfile();
        const transporter = createTransporter();
        const html = getOfferUpdateEmailTemplate({
            title,
            subtitle,
            promoCode,
            discountText,
            validUntil,
            shopUrl,
        });
        if (transporter) {
            const info = await transporter.sendMail({
                from: getSender(),
                to,
                subject: `${title || 'Special Exclusive Offer'} - ${store.storeName}`,
                html,
            });
            console.log(`[EMAIL] Offer email sent to ${to} (MessageId: ${info.messageId})`);
        } else {
            console.log(`[EMAIL LOGGED] Offer email prepared for ${to}`);
        }
    } catch (err) {
        console.error(`[EMAIL ERROR] Failed to send offer email to ${to}:`, err.message);
    }
};

