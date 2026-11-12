import mongoose from "mongoose";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";
import {
    placeCODOrderService,
    cancelOrderService,
    returnOrderService,
    createRazorpayUpiOrderService,
    verifyRazorpayUpiPaymentService
} from "../services/orderService.js";
import { emitToAdmin, emitToUser, emitToAll } from "../socket/index.js";
import { getInvoiceEmailTemplate } from "../utils/emailTemplates.js";
import { sendDeliveryStatusEmail, sendPaymentStatusEmail } from "../utils/emailService.js";
import { getStoreProfile } from "../utils/storeProfile.js";
import { sendOrderConfirmationWhatsApp } from "../utils/whatsappService.js";





export const placeCODOrder = async (req, res) => {

    try {

        console.log(req.body);
        
        const order = await placeCODOrderService(req);
        const response = {

        orderIdReference: order.orderNumber,

        // transactionId: order.transactionId,

        grandTotalPaid: order.grandTotal,

        paymentMode: order.payment.method,

        expectedArrival: `${order.delivery.estimatedDays}-${Number(order.delivery.estimatedDays) + 1} business days`,

        order

    };
    
        // Real-time synchronization
        const customerId = order.customer?._id || order.customer;
        emitToAdmin("order:created", { order });
        if (customerId) {
            emitToUser(customerId, "order:created", { order });
            emitToUser(customerId, "cart:updated", { items: [], totalItems: 0, grandTotal: 0 });
        }
        if (Array.isArray(order.items)) {
            for (const item of order.items) {
                const pId = item.product?._id || item.product;
                if (pId) {
                    Product.findById(pId).then((p) => {
                        if (p) {
                            emitToAll("product:updated", { product: p });
                            emitToAll("inventory:updated", { productId: p._id, stock: p.stock });
                        }
                    }).catch(() => {});
                }
            }
        }

        // Send WhatsApp confirmation with Order ID, Amount, and Product details
        // Awaiting ensures the message is sent before concluding the order response
        try {
            await sendOrderConfirmationWhatsApp({
                order,
                user: req.user,
                recipientPhone: req.body?.phoneNumber || req.body?.phone
            });
        } catch (waErr) {
            console.error("[WHATSAPP] Failed to send order confirmation:", waErr.message);
        }

        return res.status(201).json({

            success: true,

            message: "Order placed successfully.",

            order:response

        });
        
        

    } catch (error) {

        console.error("Place COD Order Error:", error);

        if (error.productId) {
            Product.findById(error.productId).then((p) => {
                if (p) {
                    emitToAll("product:updated", { product: p });
                    emitToAll("inventory:updated", { productId: p._id, stock: p.stock });
                }
            }).catch(() => {});
        }

        return res.status(error.statusCode || 400).json({

            success: false,

            isOutOfStock: Boolean(error.isOutOfStock),

            message: error.message || "Failed to place order."

        });

    }

};

export const createRazorpayUpiOrder = async (req, res) => {
    try {
        const orderData = await createRazorpayUpiOrderService(req);
        return res.status(200).json({
            success: true,
            ...orderData
        });
    } catch (error) {
        console.error("Create Razorpay UPI Order Error:", error);
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message || "Failed to initiate UPI payment.",
            isOutOfStock: Boolean(error.isOutOfStock)
        });
    }
};

export const verifyRazorpayUpiPayment = async (req, res) => {
    try {
        const order = await verifyRazorpayUpiPaymentService(req);

        const response = {
            orderIdReference: order.orderNumber,
            grandTotalPaid: order.grandTotal,
            paymentMode: order.payment.method,
            transactionId: order.payment.transactionId,
            expectedArrival: `${order.delivery.estimatedDays}-${Number(order.delivery.estimatedDays) + 1} business days`,
            order
        };

        // Real-time synchronization
        const customerId = order.customer?._id || order.customer;
        emitToAdmin("order:created", { order });
        if (customerId) {
            emitToUser(customerId, "order:created", { order });
            emitToUser(customerId, "cart:updated", { items: [], totalItems: 0, grandTotal: 0 });
        }
        if (Array.isArray(order.items)) {
            for (const item of order.items) {
                const pId = item.product?._id || item.product;
                if (pId) {
                    Product.findById(pId).then((p) => {
                        if (p) {
                            emitToAll("product:updated", { product: p });
                            emitToAll("inventory:updated", { productId: p._id, stock: p.stock });
                        }
                    }).catch(() => {});
                }
            }
        }

        // Send WhatsApp confirmation with Order ID, Amount, and Product details
        try {
            await sendOrderConfirmationWhatsApp({
                order,
                user: req.user,
                recipientPhone: req.body?.phoneNumber || req.body?.phone
            });
        } catch (waErr) {
            console.error("[WHATSAPP] Failed to send order confirmation for UPI order:", waErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "UPI payment verified and order placed successfully.",
            order: response
        });
    } catch (error) {
        console.error("Verify Razorpay UPI Payment Error:", error);
        if (error.productId) {
            Product.findById(error.productId).then((p) => {
                if (p) {
                    emitToAll("product:updated", { product: p });
                    emitToAll("inventory:updated", { productId: p._id, stock: p.stock });
                }
            }).catch(() => {});
        }
        return res.status(error.statusCode || 400).json({
            success: false,
            message: error.message || "Failed to verify UPI payment.",
            isOutOfStock: Boolean(error.isOutOfStock)
        });
    }
};
// Get all orders of the logged-in user
export const getMyOrders = async (req, res) => {
    try {

        const { uid } = req.user;

        // =====================================
        // Find User
        // =====================================

        const user = await User.findOne({
            uid,
            isDeleted: false
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // =====================================
        // Fetch Orders
        // =====================================

        const orders = await Order.find({
            customer: user._id,
            isDeleted: false
        })
            .sort({ createdAt: -1 })
            .select(
                "orderNumber items grandTotal status payment shipping shippingAddress billingAddress createdAt"
            );

        // =====================================
        // Format Response
        // =====================================

        // const formattedOrders = orders.map(order => ({

        //     _id: order._id,

        //     orderNumber: order.orderNumber,

        //     items: order.items,

        //     totalItems: order.items.reduce(
        //         (total, item) => total + item.quantity,
        //         0
        //     ),

        //     grandTotal: order.grandTotal,

        //     status: order.status,

        //     paymentStatus: order.payment.status,

        //     paymentMethod: order.payment.method,

        //     courier: order.shipping?.courier || "",

        //     trackingId: order.shipping?.trackingId || "",

        //     estimatedDelivery:
        //         order.shipping?.estimatedDelivery || null,

        //     createdAt: order.createdAt,

        //     firstProductImage:
        //         order.items.length > 0
        //             ? order.items[0].image
        //             : "",

        //     firstProductName:
        //         order.items.length > 0
        //             ? order.items[0].title
        //             : "",

        //     shippingAddress: order.shippingAddress,

        //     billingAddress: order.billingAddress

        // }));

        // =====================================
        // Response
        // =====================================

        return res.status(200).json({

            success: true,

            totalOrders: orders.length,

            orders: orders

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Failed to fetch orders.",

            error: error.message

        });

    }
};


//Cancel The order
export const cancelOrder = async (req, res) => {

    try {
        console.log("Request Body: ", req.body);

        const order = await cancelOrderService(req);

        // Real-time synchronization
        const customerId = order.customer?._id || order.customer;
        emitToAdmin("order:cancelled", { order });
        emitToAdmin("order:statusUpdated", { order, status: "Cancelled" });
        if (customerId) {
            emitToUser(customerId, "order:cancelled", { order });
            emitToUser(customerId, "order:statusUpdated", { order, status: "Cancelled" });
        }
        if (Array.isArray(order.items)) {
            for (const item of order.items) {
                const pId = item.product?._id || item.product;
                if (pId) {
                    Product.findById(pId).then((p) => {
                        if (p) {
                            emitToAll("product:updated", { product: p });
                            emitToAll("inventory:updated", { productId: p._id, stock: p.stock });
                        }
                    }).catch(() => {});
                }
            }
        }

        return res.status(200).json({

            success: true,

            message: "Order cancelled successfully.",

            order

        });

    } catch (error) {

        return res.status(400).json({

            success: false,

            message: error.message

        });

    }

};


// Return The order
export const returnOrder = async (req, res) => {

    try {
        console.log("Return Order Request Body: ", req.body);

        const order = await returnOrderService(req);

        // Real-time synchronization via Socket.io to Admin and Customer
        const customerId = order.customer?._id || order.customer;
        emitToAdmin("order:returned", { order });
        emitToAdmin("order:statusUpdated", { order, status: "Returned" });
        emitToAll("order:statusUpdated", { order, status: "Returned" });

        if (customerId) {
            emitToUser(customerId, "order:returned", { order });
            emitToUser(customerId, "order:statusUpdated", { order, status: "Returned" });
            if (typeof order.customer === "object" && order.customer?.uid) {
                emitToUser(order.customer.uid, "order:returned", { order });
                emitToUser(order.customer.uid, "order:statusUpdated", { order, status: "Returned" });
            }
        }
        if (req.user?.uid) {
            emitToUser(req.user.uid, "order:statusUpdated", { order, status: "Returned" });
        }
        if (Array.isArray(order.items)) {
            for (const item of order.items) {
                const pId = item.product?._id || item.product;
                if (pId) {
                    Product.findById(pId).then((p) => {
                        if (p) {
                            emitToAll("product:updated", { product: p });
                            emitToAll("inventory:updated", { productId: p._id, stock: p.stock });
                        }
                    }).catch(() => {});
                }
            }
        }

        return res.status(200).json({

            success: true,

            message: "Order returned successfully.",

            order

        });

    } catch (error) {

        return res.status(400).json({

            success: false,

            message: error.message

        });

    }

};



export const updateOrderStatus = async (req, res) => {
    try {

        const { id } = req.params;
        const { status } = req.body;

        const allowedStatus = [
            "Pending",
            "Confirmed",
            "Packed",
            "Ready for Dispatch",
            "Shipped",
            "Out for Delivery",
            "Delivered",
            "Cancelled",
            "Returned",
            "Refunded"
        ];

        // =====================================
        // Validate Status
        // =====================================

        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status."
            });
        }

        // =====================================
        // Find Order
        // =====================================

        let order;
        if (mongoose.Types.ObjectId.isValid(id)) {
            order = await Order.findOne({
                _id: id,
                isDeleted: false
            });
        }
        if (!order) {
            order = await Order.findOne({
                orderNumber: id,
                isDeleted: false
            });
        }

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        // =====================================
        // Authorization Check
        // =====================================

        let isUserAdmin = false;
        let requestingUser = null;
        if (req.user && req.user.uid) {
            requestingUser = await User.findOne({ uid: req.user.uid, isDeleted: false });
            if (requestingUser && requestingUser.isAdmin && requestingUser.role === "Admin") {
                isUserAdmin = true;
            }
        }

        if (!isUserAdmin) {
            const customerMongoId = (order.customer?._id || order.customer || "").toString();
            const requestingUserMongoId = (requestingUser?._id || "").toString();
            const requestingUserUid = req.user?.uid || "";
            
            const isOwner = (requestingUserMongoId && customerMongoId === requestingUserMongoId) || 
                            (order.customer && order.customer.uid === requestingUserUid);

            if (!isOwner) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You do not own this order."
                });
            }

            if (status !== "Cancelled" && status !== "Returned") {
                return res.status(403).json({
                    success: false,
                    message: "Customers are only allowed to cancel or return their order."
                });
            }
        }

        // =====================================
        // Ensure Shipping Exists
        // =====================================

        if (!order.shipping) {
            order.shipping = {
                courier: "",
                trackingId: "",
                trackingUrl: "",
                shippedAt: null,
                deliveredAt: null,
                estimatedDelivery: null
            };
        }

        // =====================================
        // Prevent Updating Delivered Orders
        // =====================================

        if (
            order.status === "Delivered" &&
            status !== "Refunded" &&
            status !== "Returned"
        ) {
            return res.status(400).json({
                success: false,
                message: "Delivered orders cannot be modified."
            });
        }

        // =====================================
        // Shipping Dates
        // =====================================

        if (
            status === "Shipped" &&
            !order.shipping.shippedAt
        ) {
            order.shipping.shippedAt = new Date();
        }

        if (
            status === "Delivered" &&
            !order.shipping.deliveredAt
        ) {

            order.shipping.deliveredAt = new Date();

            if (
                order.payment &&
                order.payment.method === "COD" &&
                order.payment.status !== "Paid"
            ) {
                order.payment.status = "Paid";
                order.payment.paidAt = new Date();
            }

        }

        // =====================================
        // Restore Inventory (Only Once)
        // =====================================

        if (
            (status === "Cancelled" ||
                status === "Returned") &&
            !order.inventoryRestored
        ) {

            for (const item of order.items) {

                const product = await Product.findById(item.product);

                if (!product) continue;

                product.stock += item.quantity;

                product.sold = Math.max(
                    0,
                    product.sold - item.quantity
                );

                product.grossRevenue = Math.max(
                    0,
                    product.grossRevenue - item.totalPrice
                );

                await product.save();

            }

            order.inventoryRestored = true;

        }

        // =====================================
        // Refund
        // =====================================

        if (
            status === "Refunded" &&
            order.payment
        ) {

            order.payment.status = "Refunded";
            order.payment.refundAmount = order.grandTotal;

        }

        // =====================================
        // Cancel Information
        // =====================================

        if (
            status === "Cancelled" &&
            !order.isCancelled
        ) {

            order.isCancelled = true;
            order.cancelledAt = new Date();

        }

        // =====================================
        // Return Information
        // =====================================

        if (
            status === "Returned" &&
            !order.isReturned
        ) {

            order.isReturned = true;
            order.returnedAt = new Date();

        }

        // =====================================
        // Update Status
        // =====================================

        order.status = status;

        await order.save();

        // Real-time synchronization
        const customerId = order.customer?._id || order.customer;
        emitToAdmin("order:statusUpdated", { order, status });
        emitToAll("order:statusUpdated", { order, status });
        if (customerId) {
            emitToUser(customerId, "order:statusUpdated", { order, status });
            if (typeof order.customer === "object" && order.customer?.uid) {
                emitToUser(order.customer.uid, "order:statusUpdated", { order, status });
            }
        }
        if (req.user?.uid) {
            emitToUser(req.user.uid, "order:statusUpdated", { order, status });
        }

        // Asynchronous Brand Email Notification Dispatch
        (async () => {
            try {
                let recipientEmail = order.shippingAddress?.email;
                if (!recipientEmail && customerId) {
                    const cust = await User.findById(customerId).select("email name");
                    if (cust && cust.email) recipientEmail = cust.email;
                }
                if (!recipientEmail && req.user?.email) {
                    recipientEmail = req.user.email;
                }

                if (recipientEmail) {
                    if (["Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Returned"].includes(status)) {
                        await sendDeliveryStatusEmail({
                            to: recipientEmail,
                            order,
                            status,
                            trackingCourier: order.shipping?.courier,
                            trackingId: order.shipping?.trackingId,
                            trackingUrl: order.shipping?.trackingUrl,
                        });
                    }

                    if (status === "Refunded" || (status === "Delivered" && order.payment?.method === "COD")) {
                        await sendPaymentStatusEmail({
                            to: recipientEmail,
                            order,
                            paymentStatus: order.payment?.status,
                            paymentMethod: order.payment?.method,
                            amount: order.grandTotal,
                        });
                    }
                }
            } catch (notifyErr) {
                console.warn("[ORDER NOTIFY ERROR] Failed to dispatch async email:", notifyErr.message);
            }
        })();

        if (status === "Cancelled" || status === "Returned") {
            if (Array.isArray(order.items)) {
                for (const item of order.items) {
                    const pId = item.product?._id || item.product;
                    if (pId) {
                        Product.findById(pId).then((p) => {
                            if (p) {
                                emitToAll("product:updated", { product: p });
                                emitToAll("inventory:updated", { productId: p._id, stock: p.stock });
                            }
                        }).catch(() => {});
                    }
                }
            }
        }

        // =====================================
        // Response
        // =====================================

        return res.status(200).json({

            success: true,

            message: "Order status updated successfully.",

            order

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Failed to update order status.",

            error: error.message

        });

    }
};

// Helper to generate a clean, professional A4 PDF invoice buffer
const generateInvoicePDF = (order, user, recipientEmail) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: "A4" });
            const buffers = [];

            doc.on("data", (chunk) => buffers.push(chunk));
            doc.on("end", () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on("error", (err) => reject(err));

            // Dynamic Store Brand Header
            const store = getStoreProfile();
            const brandPrimary = store.brandColor || "#10b981";
            const fullStoreAddress = `${store.addressLine || 'Plot No. 12, Industrial Area'}, ${store.district || 'Coimbatore'}, ${store.state || 'Tamil Nadu'} - ${store.pincode || '641001'}`;

            doc.fillColor(brandPrimary).fontSize(22).font("Helvetica-Bold").text(store.storeName || "FORMA Studio", 40, 40);
            doc.fillColor("#6b7280").fontSize(9).font("Helvetica").text(store.storeName ? `${store.storeName} Official Store` : "FORMA Studio Private Limited", 40, 68);
            doc.text(fullStoreAddress, 40, 80);
            doc.text(`GSTIN: ${store.gstNumber || '33AAAAA0000A1Z5'} | ${store.email || 'concierge@forma.com'} | ${store.phone || '+91 98765 43210'}`, 40, 92);

            // Invoice Title & Metadata
            doc.fillColor("#111827").fontSize(18).font("Helvetica-Bold").text("TAX INVOICE", 380, 40, { align: "right" });
            doc.fillColor("#374151").fontSize(9).font("Helvetica");
            doc.text(`Invoice No: INV-${order.orderNumber}`, 380, 65, { align: "right" });
            const formattedDate = order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : new Date().toLocaleDateString("en-IN");
            doc.text(`Invoice Date: ${formattedDate}`, 380, 78, { align: "right" });
            doc.text(`Order Ref ID: ${order.orderNumber}`, 380, 91, { align: "right" });
            doc.text(`Payment Mode: ${order.payment?.method || 'COD'} (${order.payment?.status || 'Pending'})`, 380, 104, { align: "right" });

            doc.moveTo(40, 122).lineTo(555, 122).strokeColor("#e5e7eb").lineWidth(1).stroke();

            // Customer Details Box
            const shippingAddr = order.shippingAddress || {};
            const fullAddr = `${shippingAddr.addressLine1 || ''} ${shippingAddr.addressLine2 || ''}, ${shippingAddr.city || ''}, ${shippingAddr.state || ''} - ${shippingAddr.postalCode || ''}`.trim();

            doc.rect(40, 132, 515, 65).fillAndStroke("#f9fafb", "#e5e7eb");
            doc.fillColor("#111827").fontSize(10).font("Helvetica-Bold").text("Billed & Delivered To:", 50, 140);
            doc.fillColor("#374151").fontSize(9).font("Helvetica");
            doc.text(`Name: ${shippingAddr.fullName || user?.name || 'Valued Customer'}`, 50, 155);
            doc.text(`Address: ${fullAddr}`, 50, 167);
            doc.text(`Phone: ${shippingAddr.phoneNumber || user?.phoneNumber || 'N/A'} | Email: ${recipientEmail}`, 50, 179);

            // Table Header
            let y = 212;
            doc.rect(40, y, 515, 22).fill("#f3f4f6");
            doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold");
            doc.text("Item Details", 50, y + 6);
            doc.text("SKU", 250, y + 6);
            doc.text("Qty", 340, y + 6, { width: 30, align: "center" });
            doc.text("Unit Price", 380, y + 6, { width: 70, align: "right" });
            doc.text("Total (INR)", 465, y + 6, { width: 80, align: "right" });

            y += 22;
            doc.font("Helvetica").fontSize(9).fillColor("#111827");

            const items = order.items || [];
            let itemsSubtotal = 0;

            items.forEach((item) => {
                const title = item.title || item.product?.title || "Designer Essential";
                const sku = item.sku || "FM-PROD";
                const qty = item.quantity || 1;
                const price = item.sellingPrice || item.unitPrice || item.retailPrice || 0;
                const lineTotal = item.totalPrice || (price * qty);
                itemsSubtotal += lineTotal;

                y += 6;
                doc.text(title, 50, y, { width: 190 });
                doc.text(sku, 250, y, { width: 80 });
                doc.text(String(qty), 340, y, { width: 30, align: "center" });
                doc.text(`INR ${price}`, 380, y, { width: 70, align: "right" });
                doc.text(`INR ${lineTotal}`, 465, y, { width: 80, align: "right" });

                y += 18;
                doc.moveTo(40, y).lineTo(555, y).strokeColor("#f3f4f6").lineWidth(0.5).stroke();
            });

            y += 15;
            // Summary Block
            doc.moveTo(40, y).lineTo(555, y).strokeColor("#e5e7eb").lineWidth(1).stroke();
            y += 10;

            const subtotalVal = order.subtotal || itemsSubtotal || order.grandTotal;
            const shippingVal = order.delivery?.charge || 0;
            const taxVal = order.tax?.amount || Math.round(subtotalVal * 0.18);
            const discountVal = order.discount || 0;
            const grandTotalVal = order.grandTotal || (subtotalVal + taxVal + shippingVal - discountVal);

            doc.font("Helvetica").fontSize(9).fillColor("#4b5563");
            doc.text("Subtotal:", 350, y, { width: 110, align: "right" });
            doc.fillColor("#111827").font("Helvetica-Bold").text(`INR ${subtotalVal}`, 465, y, { width: 80, align: "right" });
            y += 15;

            doc.font("Helvetica").fillColor("#4b5563");
            doc.text("Taxes (GST 18%):", 350, y, { width: 110, align: "right" });
            doc.fillColor("#111827").font("Helvetica-Bold").text(`INR ${taxVal}`, 465, y, { width: 80, align: "right" });
            y += 15;

            doc.font("Helvetica").fillColor("#4b5563");
            doc.text("Shipping & Dispatch:", 350, y, { width: 110, align: "right" });
            doc.fillColor("#10b981").font("Helvetica-Bold").text(shippingVal > 0 ? `INR ${shippingVal}` : "FREE", 465, y, { width: 80, align: "right" });
            y += 15;

            if (discountVal > 0) {
                doc.font("Helvetica").fillColor("#ef4444");
                doc.text("Discount:", 350, y, { width: 110, align: "right" });
                doc.font("Helvetica-Bold").text(`-INR ${discountVal}`, 465, y, { width: 80, align: "right" });
                y += 15;
            }

            doc.moveTo(350, y).lineTo(555, y).strokeColor("#10b981").lineWidth(1.5).stroke();
            y += 8;

            doc.font("Helvetica-Bold").fontSize(12).fillColor("#047857");
            doc.text("Grand Total:", 350, y, { width: 110, align: "right" });
            doc.text(`INR ${grandTotalVal}`, 465, y, { width: 80, align: "right" });

            // Terms & Conditions Footer
            y += 45;
            doc.font("Helvetica-Bold").fontSize(8).fillColor("#374151").text("Terms & Conditions:", 40, y);
            doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
            doc.text("1. Goods once sold cannot be returned or exchanged without valid defect verification.", 40, y + 12);
            doc.text("2. All disputes are subject to Bengaluru judicial jurisdiction only.", 40, y + 24);
            doc.text("Thank you for choosing FORMA Studio! concierge@forma.com", 40, y + 42, { align: "center", width: 515 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

// Create nodemailer transporter helper
const createTransporter = () => {
    const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER;
    let emailPass = process.env.EMAIL_PASS || process.env.GMAIL_PASS || process.env.SMTP_PASS;
    
    if (emailPass) {
        emailPass = emailPass.replace(/\s+/g, "");
    }

    if (!emailUser || !emailPass) {
        console.warn("[SMTP WARNING] EMAIL_USER or EMAIL_PASS missing in .env file.");
        return null;
    }

    if (process.env.SMTP_HOST) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });
    }

    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });
};

export const sendInvoiceEmail = async (req, res) => {
    try {
        const { uid } = req.user || {};
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required."
            });
        }

        // Find logged in user
        const user = uid ? await User.findOne({
            uid,
            isDeleted: false
        }) : null;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to request invoices."
            });
        }

        // Clean & match order ID or orderNumber
        const cleanOrderId = String(orderId).trim();
        const strippedOrderId = cleanOrderId.replace(/^ORD-/, '');
        const isObjectId = mongoose.Types.ObjectId.isValid(cleanOrderId);
        const query = {
            isDeleted: false,
            $or: [
                ...(isObjectId ? [{ _id: cleanOrderId }] : []),
                { orderNumber: cleanOrderId },
                { orderNumber: strippedOrderId },
                { orderNumber: `ORD-${cleanOrderId}` }
            ]
        };

        const order = await Order.findOne(query).populate("items.product");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        // Authorization check: only order owner or administrator can request the invoice
        const orderCustomerId = (order.customer?._id || order.customer || "").toString();
        const requestingUserId = (user._id || "").toString();
        const isOwner = requestingUserId && orderCustomerId === requestingUserId;
        const isAdmin = Boolean(user.isAdmin && user.role === "Admin");

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You are not authorized to view or send this invoice."
            });
        }

        // Send exclusively to verified recipient to prevent spam relay and PII exfiltration
        const recipientEmail = (
            user.email ||
            order.shippingAddress?.email ||
            ""
        ).toLowerCase().trim();

        if (!recipientEmail) {
            return res.status(400).json({
                success: false,
                message: "No verified email address found on file to deliver the invoice."
            });
        }

        // Generate PDF Invoice attachment buffer
        const pdfBuffer = await generateInvoicePDF(order, user, recipientEmail);

        // Build HTML items table
        const itemsList = order.items || [];
        const itemsHtml = itemsList.map((item) => {
            const title = item.title || item.product?.title || "Designer Essential";
            const qty = item.quantity || 1;
            const price = item.sellingPrice || item.unitPrice || item.retailPrice || 0;
            const total = item.totalPrice || (price * qty);
            return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 12px; font-weight: 600; color: #0f172a;">${title}</td>
                    <td style="padding: 10px 12px; color: #64748b; font-family: monospace;">${item.sku || 'FM-PROD'}</td>
                    <td style="padding: 10px 12px; text-align: center; color: #0f172a;">${qty}</td>
                    <td style="padding: 10px 12px; text-align: right; color: #475569;">₹${price}</td>
                    <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a;">₹${total}</td>
                </tr>
            `;
        }).join("");

        const formattedDate = order.createdAt
            ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date().toLocaleDateString('en-IN');

        const shippingAddr = order.shippingAddress || {};
        const fullAddrStr = `${shippingAddr.addressLine1 || ''} ${shippingAddr.addressLine2 || ''}, ${shippingAddr.city || ''}, ${shippingAddr.state || ''} - ${shippingAddr.postalCode || ''}`.trim();

        const htmlTemplate = getInvoiceEmailTemplate({
            order,
            user,
            recipientEmail,
            itemsHtml,
            formattedDate,
            fullAddrStr
        });

        const storeInfo = getStoreProfile();
        const mailSender = process.env.EMAIL_USER
            ? `"${storeInfo.storeName}" <${process.env.EMAIL_USER}>`
            : (process.env.EMAIL_FROM || `"${storeInfo.storeName}" <${storeInfo.email || 'concierge@forma.com'}>`);

        const transporter = createTransporter();
        if (transporter) {
            try {
                const info = await transporter.sendMail({
                    from: mailSender,
                    to: recipientEmail,
                    subject: `Tax Invoice PDF for Order #${order.orderNumber} - ${storeInfo.storeName}`,
                    html: htmlTemplate,
                    attachments: [
                        {
                            filename: `Invoice_${order.orderNumber}.pdf`,
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        }
                    ]
                });
                console.log(`[INVOICE EMAIL SUCCESS] Sent tax invoice PDF for Order #${order.orderNumber} to ${recipientEmail} (MessageId: ${info.messageId})`);
            } catch (emailErr) {
                console.error("[INVOICE EMAIL SMTP ERROR] Failed to send email via SMTP:", emailErr.message);
                return res.status(500).json({
                    success: false,
                    message: `Failed to deliver email: ${emailErr.message}`
                });
            }
        } else {
            console.log(`[INVOICE EMAIL LOGGED] Tax invoice PDF generated for Order #${order.orderNumber} and targeted to: ${recipientEmail}`);
        }

        return res.status(200).json({
            success: true,
            message: `Tax invoice PDF for Order #${order.orderNumber} has been sent to ${recipientEmail}`
        });
    } catch (error) {
        console.error("Send Invoice Email Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send invoice email."
        });
    }
};