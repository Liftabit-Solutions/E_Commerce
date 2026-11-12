import crypto from "crypto";
import dns from "dns";
import "../config/env.js";

// Ensure IPv4 lookup precedence for stable external API connections
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // Ignore
}

const getCredentials = () => {
  const keyId = (process.env.RAZOR_PAY_API || process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZOR_PAY_SECERET || process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials (RAZOR_PAY_API / RAZOR_PAY_SECERET) are not configured.");
  }

  return { keyId, keySecret };
};

const getAuthHeader = () => {
  const { keyId, keySecret } = getCredentials();
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
};

/**
 * Create an order on Razorpay for UPI checkout.
 */
export const createRazorpayOrder = async ({ amountInPaise, currency = "INR", receipt, notes = {} }) => {
  const authHeader = getAuthHeader();

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency,
      receipt: receipt || `rcpt_${Date.now().toString().slice(-8)}`,
      notes
    }),
    signal: AbortSignal.timeout(15000)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[RAZORPAY] Create Order Failed:", data);
    throw new Error(data.error?.description || data.message || "Failed to create Razorpay order.");
  }

  return data;
};

/**
 * Verify HMAC-SHA256 signature using constant-time comparison to prevent timing attacks.
 */
export const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const { keySecret } = getCredentials();
  const payload = `${orderId}|${paymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const signatureBuf = Buffer.from(signature, "utf-8");

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    console.error("[RAZORPAY] Signature comparison error:", err);
    return false;
  }
};

/**
 * Fetch live payment details directly from Razorpay to verify payment status and parameters.
 */
export const fetchRazorpayPayment = async (paymentId) => {
  if (!paymentId) {
    throw new Error("Payment ID is required to fetch payment details.");
  }

  const authHeader = getAuthHeader();

  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(15000)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[RAZORPAY] Fetch Payment Failed:", data);
    throw new Error(data.error?.description || data.message || "Failed to fetch Razorpay payment.");
  }

  return data;
};

/**
 * Automatically refund payment if stock reservation or order creation fails post-payment.
 */
export const refundRazorpayPayment = async ({ paymentId, amountInPaise, notes = {} }) => {
  try {
    const authHeader = getAuthHeader();

    const bodyPayload = {
      notes
    };
    if (amountInPaise) {
      bodyPayload.amount = amountInPaise;
    }

    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(15000)
    });

    const data = await response.json();
    console.log(`[RAZORPAY] Refund initiated for ${paymentId}:`, data);
    return data;
  } catch (err) {
    console.error(`[RAZORPAY] Refund failed for ${paymentId}:`, err);
    return null;
  }
};

export const getRazorpayPublicKey = () => {
  const { keyId } = getCredentials();
  return keyId;
};
