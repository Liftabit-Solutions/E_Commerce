import dns from "dns";
import "./../config/env.js";

// Ensure IPv4 lookup priority to prevent Windows DNS IPv6 connection timeouts to Meta graph API
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // Ignore
}

/**
 * Format phone number into WhatsApp international E.164 format without '+' or spaces.
 * e.g., "+91 6383643060" -> "916383643060"
 *       "6383643060"      -> "916383643060" (assumes India 10-digit mobile)
 */
export const formatWhatsAppNumber = (rawPhone) => {
  if (!rawPhone) return null;
  let digits = String(rawPhone).replace(/\D/g, "");
  // Strip leading zeros
  digits = digits.replace(/^0+/, "");

  // If standard 10-digit Indian phone number, prepend country code 91
  if (digits.length === 10) {
    digits = "91" + digits;
  }

  // Ensure digits length is valid for international numbers (10 to 15 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
};

/**
 * Send a WhatsApp Cloud API request to graph.facebook.com
 */
export const callWhatsAppApi = async (payload) => {
  const token = (process.env.WHATSAPP_PERMANENT_KEY || process.env["WHATSAPP_PERMANENT_KEY "])?.trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env["WHATSAPP_PHONE_NUMBER_ID "] || "1503413899513526")?.trim();
  const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;

  if (!token) {
    console.warn("[WHATSAPP] ⚠️ Skipped: WHATSAPP_PERMANENT_KEY is not defined in Server/.env.");
    return { success: false, skipped: true, reason: "Missing WHATSAPP_PERMANENT_KEY" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorDetails = data?.error?.message || response.statusText;
    const errorCode = data?.error?.code;
    const errorSubcode = data?.error?.error_subcode;
    const errorObj = new Error(`Meta WhatsApp API HTTP ${response.status}: ${errorDetails} (code: ${errorCode}, subcode: ${errorSubcode})`);
    errorObj.data = data;
    errorObj.code = errorCode;
    errorObj.subcode = errorSubcode;
    throw errorObj;
  }

  return { success: true, data };
};

/**
 * Sends order confirmation WhatsApp message using the pre-approved Order Confirmation template
 * (jaspers_market_order_confirmation_v1), with fallback to text or hello_world.
 *
 * @param {Object} params
 * @param {Object} params.order - The created order document/object
 * @param {Object} [params.user] - Logged-in user document or decoded token
 * @param {string} [params.recipientPhone] - Optional override phone number
 */
export const sendOrderConfirmationWhatsApp = async ({ order, user, recipientPhone } = {}) => {
  if (!order) {
    console.warn("[WHATSAPP] No order provided for WhatsApp confirmation.");
    return { success: false, reason: "No order provided" };
  }

  // Resolve recipient phone number from order shipping address, logged-in user, or override
  let rawNumber =
    recipientPhone ||
    order.shippingAddress?.phoneNumber ||
    order.shippingAddress?.phone ||
    user?.phoneNumber ||
    user?.phone ||
    (Array.isArray(user?.addresses) && user.addresses[0]?.phoneNumber) ||
    process.env.WHATSAPP_DEFAULT_RECIPIENT ||
    "916383643060";

  let formattedTo = formatWhatsAppNumber(rawNumber);

  // If resolved phone number is missing or invalid, fallback to default test number (916383643060)
  if (!formattedTo) {
    console.warn(`[WHATSAPP] Could not resolve phone number from input "${rawNumber}". Falling back to default recipient.`);
    formattedTo = formatWhatsAppNumber(process.env.WHATSAPP_DEFAULT_RECIPIENT || "916383643060");
  }

  const customerName = user?.name || order.shippingAddress?.fullName || "Valued Customer";
  const orderId = order.orderNumber || order._id;
  const grandTotal = order.grandTotal ?? order.total ?? order.subtotal ?? 0;

  // Calculate estimated delivery date string (e.g. "Nov 12, 2026")
  const deliveryDays = Number(order.delivery?.estimatedDays) || 3;
  const deliveryDate = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000);
  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Build product details summary list
  const productLines = Array.isArray(order.items) && order.items.length > 0
    ? order.items
        .map((item, idx) => {
          const itemPrice = item.totalPrice ?? ((item.sellingPrice || item.retailPrice || item.price || 0) * (item.quantity || 1));
          return `• ${item.title || "Product"} (Qty: ${item.quantity || 1}) - ₹${itemPrice}`;
        })
        .join("\n")
    : "• Order items";

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "jaspers_market_order_confirmation_v1";
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || "en_US";

  console.log(`[WHATSAPP] Initiating order confirmation via template "${templateName}" to +${formattedTo} (Order #${orderId})...`);

  // ==============================================================
  // 1. PRIMARY: Send Meta-Approved Template (Guaranteed Delivery)
  // ==============================================================
  let templateSent = false;
  let templateResult = null;

  try {
    let templatePayload;

    if (templateName === "jaspers_market_order_confirmation_v1") {
      // jaspers_market_order_confirmation_v1 template:
      // Hi {{1}}, Thank you for your purchase! Your order number is {{2}}.
      // We'll start getting your farm fresh groceries ready to ship.
      // Estimated delivery: {{3}}. We will let you know when your order ships.
      templatePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedTo,
        type: "template",
        template: {
          name: "jaspers_market_order_confirmation_v1",
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: String(customerName) },
                { type: "text", text: String(orderId) },
                { type: "text", text: String(formattedDeliveryDate) },
              ],
            },
          ],
        },
      };
    } else if (templateName === "hello_world") {
      templatePayload = {
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: templateLang },
        },
      };
    } else {
      // Generic custom template with 4 body parameters
      templatePayload = {
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: String(customerName) },
                { type: "text", text: String(orderId) },
                { type: "text", text: `₹${grandTotal}` },
                { type: "text", text: String(productLines).substring(0, 1024) },
              ],
            },
          ],
        },
      };
    }

    templateResult = await callWhatsAppApi(templatePayload);
    const msgId = templateResult?.data?.messages?.[0]?.id || "N/A";
    console.log(`[WHATSAPP] ✅ WhatsApp order confirmation template "${templateName}" delivered to +${formattedTo} (Message ID: ${msgId}).`);
    templateSent = true;
  } catch (templateErr) {
    console.warn(`[WHATSAPP] Primary template "${templateName}" failed (${templateErr.message}). Attempting fallback to "hello_world"...`);
    try {
      const fallbackPayload = {
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" },
        },
      };
      templateResult = await callWhatsAppApi(fallbackPayload);
      console.log(`[WHATSAPP] ✅ WhatsApp fallback template "hello_world" delivered to +${formattedTo}.`);
      templateSent = true;
    } catch (fbErr) {
      console.error(`[WHATSAPP] ❌ Fallback template "hello_world" also failed:`, fbErr.message);
    }
  }

  // ==============================================================
  // 2. SECONDARY: Send itemized text breakdown (if 24h window active)
  // ==============================================================
  try {
    const textBody = `📋 *Order Items Breakdown* (Order #${orderId})
💰 *Total Amount:* ₹${grandTotal}
💳 *Payment Mode:* ${order.payment?.method === "COD" ? "Cash on Delivery (COD)" : (order.payment?.method || "Cash on Delivery (COD)")}

📦 *Products:*
${productLines}

Thank you for choosing us! 🚚`;

    await callWhatsAppApi({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedTo,
      type: "text",
      text: { preview_url: false, body: textBody },
    });
    console.log(`[WHATSAPP] ✅ Itemized product breakdown text also sent to +${formattedTo}.`);
  } catch (textErr) {
    // Expected to be silently ignored if 24-hr customer window is not yet active
  }

  return {
    success: templateSent,
    template: templateName,
    to: formattedTo,
    data: templateResult?.data,
  };
};

export default {
  formatWhatsAppNumber,
  callWhatsAppApi,
  sendOrderConfirmationWhatsApp,
};
