import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Cart } from "../models/Cart.js";
import { Order } from "../models/Order.js";

import { calculateOrderPricing } from "../utils/pricingService.js";

import { generateOrderNumber } from "../utils/orderNumberGenerator.js";
import { generateTransactionId } from "../utils/transactionGenerator.js";
import {
    createRazorpayOrder,
    verifyRazorpaySignature,
    fetchRazorpayPayment,
    refundRazorpayPayment,
    getRazorpayPublicKey
} from "../utils/razorpayService.js";


export const getUser = async (uid) => {

    const user = await User.findOne({

        uid,

        isDeleted: false

    });

    if (!user) {

        throw new Error("User not found.");

    }

    return user;

};

export const getShippingAddress = (

    user,

    shippingAddressId,

    reqPhone

) => {

    let address = null;

    if (user.addresses && Array.isArray(user.addresses) && user.addresses.length > 0) {
        if (shippingAddressId) {
            try {
                address = user.addresses.id(shippingAddressId);
            } catch (e) {
                // ignore cast error
            }
            if (!address) {
                address = user.addresses.find(a => 
                    String(a._id) === String(shippingAddressId) || 
                    String(a.id) === String(shippingAddressId)
                );
            }
        }
        if (!address) {
            address = user.addresses[0];
        }
    }

    if (!address) {

        throw new Error("Shipping address not found.");

    }

    const resolvedPhone = address.phoneNumber || address.phone || reqPhone || user.phoneNumber || user.phone || "";
    const resolvedPincode = address.postalCode || address.pincode || address.zip || address.zipCode || "";

    return {

        fullName: address.fullName,

        phoneNumber: resolvedPhone,

        phone: resolvedPhone,

        alternatePhone: address.alternatePhone || "",

        addressLine1: address.addressLine1,

        addressLine2: address.addressLine2,

        city: address.city,

        state: address.state,

        country: address.country,

        postalCode: resolvedPincode,

        pincode: resolvedPincode

    };

};

export const getProducts = async (items) => {

    if (!items || items.length === 0) {

        throw new Error("No products selected.");

    }

    const productIds = items.map(item => item.product);

    const products = await Product.find({

        _id: { $in: productIds },

        isDeleted: false,

        isActive: true

    });

    if (products.length !== items.length) {

        throw new Error("One or more products were not found.");

    }

    const productMap = new Map();

    products.forEach(product => {

        productMap.set(

            product._id.toString(),

            product

        );

    });

    return productMap;

};

export const validateStock = (items, productMap) => {

    const validatedItems = [];

    for (const item of items) {

        const product = productMap.get(item.product);

        if (!product) {

            const err = new Error("Product not found.");
            err.statusCode = 404;
            throw err;

        }

        if (!item.quantity || item.quantity <= 0) {

            const err = new Error(
                `Invalid quantity for ${product.title}.`
            );
            err.statusCode = 400;
            throw err;

        }

        if (product.stock <= 0) {

            const err = new Error(
                `"${product.title}" is currently out of stock.`
            );
            err.statusCode = 409;
            err.isOutOfStock = true;
            throw err;

        }

        if (product.stock < item.quantity) {

            const err = new Error(
                `"${product.title}" has only ${product.stock} item(s) left in stock.`
            );
            err.statusCode = 409;
            err.isOutOfStock = true;
            throw err;

        }

        validatedItems.push({

            product,

            quantity: item.quantity

        });

    }

    return validatedItems;

};

export const createOrder = async ({
    user,
    shippingAddress,
    validatedItems,
    deliveryOption,
    couponCode,
    customerNotes,
    paymentDetails
}) => {

    // =====================================
    // Build Order Items
    // =====================================

    const orderItems = validatedItems.map(item => ({

        product: item.product._id,

        title: item.product.title,

        sku: item.product.sku,

        image:
            item.product.images?.length > 0
                ? (typeof item.product.images[0] === 'string' ? item.product.images[0] : (item.product.images[0]?.url || item.product.images[0]?.secure_url || ""))
                : (item.product.imgs?.length > 0 ? item.product.imgs[0] : (item.product.img || item.product.image || "")),

        quantity: item.quantity,

        retailPrice: item.product.retailPrice,

        sellingPrice: item.product.sellingPrice,

        unitPrice: item.product.sellingPrice,

        totalPrice:
            item.product.sellingPrice *
            item.quantity

    }));

    // =====================================
    // Calculate Pricing
    // =====================================

    const pricing = calculateOrderPricing({

        cartItems: validatedItems,

        deliveryOption,

        couponCode

    });

    // =====================================
    // Create Order
    // =====================================

    const order = await Order.create({

        orderNumber: generateOrderNumber(),

        transactionId: paymentDetails?.transactionId || generateTransactionId(),

        customer: user._id,

        items: orderItems,

        billingAddress: shippingAddress,

        shippingAddress: shippingAddress,

        subtotal: pricing.subtotal,

        discount: pricing.discount,

        couponCode,

        couponDiscount: pricing.couponDiscount,

        delivery: pricing.delivery,

        tax: pricing.tax,

        grandTotal: pricing.grandTotal,

        payment: paymentDetails || {

            method: "COD",

            status: "Pending",

        },

        customerNotes:
            customerNotes || ""

    });

    return {

        order,

        pricing

    };

};

export const reserveInventory = async (validatedItems) => {

    const reservedItems = [];

    try {

        for (const item of validatedItems) {

            const updatedProduct = await Product.findOneAndUpdate(
                {
                    _id: item.product._id,
                    stock: { $gte: item.quantity },
                    isDeleted: false,
                    isActive: true
                },
                {
                    $inc: {
                        stock: -item.quantity,
                        sold: item.quantity,
                        totalPurchased: item.quantity,
                        grossRevenue:
                            item.product.sellingPrice *
                            item.quantity
                    }
                },
                { new: true }
            );

            if (!updatedProduct) {
                // Stock race condition: Another customer completed checkout for the last stock first!
                const currentProd = await Product.findById(item.product._id);
                const currentStock = currentProd ? currentProd.stock : 0;
                const err = new Error(
                    currentStock <= 0
                        ? `"${item.product.title}" has just gone out of stock! Another customer completed their purchase first.`
                        : `Only ${currentStock} item(s) left in stock for "${item.product.title}". Please adjust your order quantity.`
                );
                err.statusCode = 409;
                err.isOutOfStock = true;
                err.productId = item.product._id;
                err.remainingStock = currentStock;
                throw err;
            }

            reservedItems.push({
                product: updatedProduct,
                item
            });

        }

        return reservedItems;

    } catch (error) {

        // Rollback any successfully reserved inventory in this attempt
        for (const reserved of reservedItems) {
            await Product.findByIdAndUpdate(
                reserved.item.product._id,
                {
                    $inc: {
                        stock: reserved.item.quantity,
                        sold: -reserved.item.quantity,
                        totalPurchased: -reserved.item.quantity,
                        grossRevenue: -(reserved.item.product.sellingPrice * reserved.item.quantity)
                    }
                }
            );
        }

        throw error;

    }

};

export const updateInventory = async (validatedItems) => {

    return await reserveInventory(validatedItems);

};

export const updateUserStatistics = async (

    user,

    grandTotal

) => {

    user.totalOrders += 1;

    user.totalSpent += grandTotal;

    await user.save();

};

export const removePurchasedItemsFromCart = async (

    user,

    purchasedItems

) => {

    const cart = await Cart.findOne({

        user: user._id,

        isDeleted: false

    });

    if (!cart) {

        return;

    }

    // Remove purchased products

    cart.items = cart.items.filter(cartItem => {

        return !purchasedItems.some(item =>

            item.product._id.toString() ===

            cartItem.product.toString()

        );

    });

    // Recalculate totals

    cart.totalItems = 0;

    cart.subtotal = 0;

    cart.totalDiscount = 0;

    cart.tax = 0;

    cart.shippingCharge = 0;

    cart.grandTotal = 0;

    cart.items.forEach(item => {

        cart.totalItems += item.quantity;

        cart.subtotal +=

            item.priceAtAdded *

            item.quantity;

        cart.totalDiscount +=

            (

                item.priceAtAdded -

                item.discountPriceAtAdded

            ) *

            item.quantity;

    });

    cart.tax = Math.round(

        cart.subtotal * 0.18

    );

    cart.grandTotal =

        cart.subtotal +

        cart.tax +

        cart.shippingCharge -

        cart.totalDiscount;

    await cart.save();

};

export const getOrder = async (

    orderId,

    userId

) => {

    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    const query = {
        customer: userId,
        isDeleted: false,
        ...(isObjectId ? { $or: [{ _id: orderId }, { orderNumber: orderId }] } : { orderNumber: orderId })
    };

    const order = await Order.findOne(query)

    .populate("items.product")

    .populate("customer");

    if (!order) {

        throw new Error(

            "Order not found."

        );

    }

    return order;

};

export const validateOrderCancellation = (order) => {

    if (order.isCancelled) {

        throw new Error("Order is already cancelled.");

    }

    if (order.isReturned) {

        throw new Error("Returned orders cannot be cancelled.");

    }

    if (order.status === "Delivered") {

        throw new Error("Delivered orders cannot be cancelled.");

    }

    if (order.status === "Cancelled") {

        throw new Error("Order is already cancelled.");

    }

    if (order.status === "Refunded") {

        throw new Error("Refunded orders cannot be cancelled.");

    }

};

export const restoreInventory = async (order) => {

    for (const item of order.items) {

        await Product.findByIdAndUpdate(

            item.product._id,

            {

                $inc: {

                    stock: item.quantity,

                    sold: -item.quantity,

                    totalPurchased: -item.quantity,

                    grossRevenue:

                        -(item.sellingPrice * item.quantity)

                }

            }

        );

    }

};

export const updateCancelledOrder = async (

    order,

    cancelReason

) => {

    order.status = "Cancelled";

    order.isCancelled = true;

    order.cancelledAt = new Date();

    order.cancelReason = cancelReason || "";

    order.inventoryRestored = true;
    // COD
    if (order.payment.method === "COD") {

        order.payment.status = "Cancelled";

    }

    // Razorpay
    // We'll add refund logic here later.

    await order.save();

    return order;

};

export const placeCODOrderService = async (req) => {

    const { uid } = req.user;

    const {

        items,

        shippingAddressId,

        deliveryOption,

        couponCode,

        customerNotes,

        phoneNumber,

        phone

    } = req.body;

    // =====================================
    // USER
    // =====================================

    const user = await getUser(uid);

    // =====================================
    // ADDRESS
    // =====================================

    const shippingAddress = getShippingAddress(

        user,

        shippingAddressId,

        phoneNumber || phone

    );

    // =====================================
    // PRODUCTS
    // =====================================

    const productMap = await getProducts(items);

    // =====================================
    // STOCK VALIDATION
    // =====================================

    const validatedItems = validateStock(

        items,

        productMap

    );

    // =====================================
    // ATOMIC INVENTORY RESERVATION
    // (Prevents overselling when multiple customers trigger purchase on last stock concurrently)
    // =====================================

    await reserveInventory(validatedItems);

    // =====================================
    // CREATE ORDER
    // =====================================

    let order;
    let pricing;

    try {

        const orderResult = await createOrder({

            user,

            shippingAddress,

            validatedItems,

            deliveryOption,

            couponCode,

            customerNotes

        });

        order = orderResult.order;
        pricing = orderResult.pricing;

    } catch (createOrderError) {

        // Rollback reserved stock if order document creation failed
        for (const item of validatedItems) {
            await Product.findByIdAndUpdate(
                item.product._id,
                {
                    $inc: {
                        stock: item.quantity,
                        sold: -item.quantity,
                        totalPurchased: -item.quantity,
                        grossRevenue: -(item.product.sellingPrice * item.quantity)
                    }
                }
            );
        }

        throw createOrderError;

    }

    // =====================================
    // UPDATE USER
    // =====================================

    await updateUserStatistics(

        user,

        pricing.grandTotal

    );

    // =====================================
    // REMOVE ITEMS FROM CART
    // =====================================

    await removePurchasedItemsFromCart(

        user,

        validatedItems

    );

    // =====================================
    // RETURN ORDER
    // =====================================

    await order.populate("customer");

    await order.populate("items.product");

    return order;

};

export const createRazorpayPaymentOrderService = async (req) => {

    const { uid } = req.user;

    const {
        items,
        shippingAddressId,
        deliveryOption,
        couponCode,
        customerNotes,
        phoneNumber,
        phone,
        upiId,
        paymentMethod
    } = req.body;

    const user = await getUser(uid);

    const shippingAddress = getShippingAddress(
        user,
        shippingAddressId,
        phoneNumber || phone
    );

    const productMap = await getProducts(items);

    const validatedItems = validateStock(items, productMap);

    const pricing = calculateOrderPricing({
        cartItems: validatedItems,
        deliveryOption,
        couponCode
    });

    const amountInPaise = Math.round(pricing.grandTotal * 100);
    const receipt = `rcpt_${Date.now().toString().slice(-8)}`;
    const resolvedPaymentMethod = paymentMethod === "Card" ? "Card" : "UPI";

    const razorpayOrder = await createRazorpayOrder({
        amountInPaise,
        currency: "INR",
        receipt,
        notes: {
            userId: user._id.toString(),
            shippingAddressId: shippingAddressId || "",
            paymentMethod: resolvedPaymentMethod,
            upiId: upiId || ""
        }
    });

    return {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: getRazorpayPublicKey(),
        grandTotal: pricing.grandTotal,
        paymentMethod: resolvedPaymentMethod,
        customer: {
            name: shippingAddress.fullName || user.name || "Customer",
            email: user.email || "",
            contact: shippingAddress.phoneNumber || user.phoneNumber || ""
        },
        upiId: upiId || ""
    };

};

export const createRazorpayUpiOrderService = createRazorpayPaymentOrderService;

export const verifyRazorpayPaymentService = async (req) => {

    const { uid } = req.user;

    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        items,
        shippingAddressId,
        deliveryOption,
        couponCode,
        customerNotes,
        phoneNumber,
        phone,
        upiId,
        paymentMethod
    } = req.body;

    const resolvedPaymentMethod = paymentMethod === "Card" ? "Card" : "UPI";

    // 1. Validate mandatory payment parameters
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        const err = new Error("Payment verification failed: Missing required payment gateway credentials.");
        err.statusCode = 400;
        throw err;
    }

    // 2. Cryptographic signature verification using constant-time comparison
    const isSignatureValid = verifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
    });

    if (!isSignatureValid) {
        const err = new Error("Security Alert: Cryptographic payment signature verification failed. Potential tampering detected.");
        err.statusCode = 400;
        throw err;
    }

    // 3. Replay attack prevention: Ensure this payment ID has never been used for any prior order
    const existingOrder = await Order.findOne({
        "payment.paymentGatewayPaymentId": razorpay_payment_id
    });
    if (existingOrder) {
        const err = new Error("Security Alert: Duplicate payment detected. This transaction ID has already been utilized.");
        err.statusCode = 409;
        throw err;
    }

    // 4. Direct server-to-server gateway verification with Razorpay API
    const payment = await fetchRazorpayPayment(razorpay_payment_id);
    if (!payment) {
        const err = new Error("Unable to retrieve payment confirmation from Razorpay gateway.");
        err.statusCode = 502;
        throw err;
    }

    if (payment.order_id !== razorpay_order_id) {
        const err = new Error("Security Alert: Payment order ID does not match transaction order ID.");
        err.statusCode = 400;
        throw err;
    }

    if (payment.status !== "captured" && payment.status !== "authorized") {
        const err = new Error(`Payment is not in a completed status. Current status: ${payment.status}`);
        err.statusCode = 400;
        throw err;
    }

    if (payment.currency !== "INR") {
        const err = new Error(`Invalid transaction currency: ${payment.currency}`);
        err.statusCode = 400;
        throw err;
    }

    // 5. Server-side price calculation and amount matching
    const user = await getUser(uid);
    const shippingAddress = getShippingAddress(
        user,
        shippingAddressId,
        phoneNumber || phone
    );

    const productMap = await getProducts(items);
    const validatedItems = validateStock(items, productMap);

    const pricing = calculateOrderPricing({
        cartItems: validatedItems,
        deliveryOption,
        couponCode
    });

    const expectedAmountInPaise = Math.round(pricing.grandTotal * 100);
    if (payment.amount !== expectedAmountInPaise) {
        const err = new Error(`Security Alert: Paid amount (₹${payment.amount / 100}) does not match server-calculated order total (₹${pricing.grandTotal}).`);
        err.statusCode = 400;
        throw err;
    }

    // 6. Atomic Inventory Reservation with Automatic Gateway Refund on stock conflict
    try {
        await reserveInventory(validatedItems);
    } catch (stockError) {
        console.warn(`[RAZORPAY] Stock reservation failed post-payment. Refunding payment ${razorpay_payment_id}...`);
        await refundRazorpayPayment({
            paymentId: razorpay_payment_id,
            amountInPaise: payment.amount,
            notes: { reason: "Out of stock during checkout completion" }
        });
        throw stockError;
    }

    // 7. Create Order with Payment Details
    let order;
    try {
        const orderResult = await createOrder({
            user,
            shippingAddress,
            validatedItems,
            deliveryOption,
            couponCode,
            customerNotes,
            paymentDetails: {
                method: resolvedPaymentMethod,
                status: "Paid",
                transactionId: razorpay_payment_id,
                paymentGatewayOrderId: razorpay_order_id,
                paymentGatewayPaymentId: razorpay_payment_id,
                paymentGatewaySignature: razorpay_signature,
                paidAt: new Date()
            }
        });
        order = orderResult.order;
    } catch (createOrderError) {
        for (const item of validatedItems) {
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: {
                    stock: item.quantity,
                    sold: -item.quantity,
                    totalPurchased: -item.quantity,
                    grossRevenue: -(item.product.sellingPrice * item.quantity)
                }
            });
        }
        await refundRazorpayPayment({
            paymentId: razorpay_payment_id,
            amountInPaise: payment.amount,
            notes: { reason: "Order database document creation failed" }
        });
        throw createOrderError;
    }

    // 8. Update User Statistics & Remove Items From Cart
    await updateUserStatistics(user, pricing.grandTotal);
    await removePurchasedItemsFromCart(user, validatedItems);

    await order.populate("customer");
    await order.populate("items.product");

    return order;

};

export const verifyRazorpayUpiPaymentService = verifyRazorpayPaymentService;



export const cancelOrderService = async (req) => {

    const { uid } = req.user;

    const { orderId } = req.params;

    const cancelReason = req.body?.cancelReason || req.body?.reason || "";

    // =====================================
    // USER
    // =====================================

    const user = await getUser(uid);

    // =====================================
    // ORDER
    // =====================================

    const order = await getOrder(

        orderId,

        user._id

    );
    validateOrderCancellation(order);

    // =====================================
    // RESTORE INVENTORY
    // =====================================

    await restoreInventory(order);

    // =====================================
    // UPDATE ORDER
    // =====================================

    await updateCancelledOrder(

        order,

        cancelReason

    );

    // =====================================
    // RETURN ORDER
    // =====================================

    await order.populate("customer");

    await order.populate("items.product");

    return order;

};

export const validateOrderReturn = (order) => {
    if (order.isReturned || order.status === "Returned") {
        throw new Error("Order is already returned.");
    }

    if (order.isCancelled || order.status === "Cancelled") {
        throw new Error("Cancelled orders cannot be returned.");
    }

    if (order.status !== "Delivered") {
        throw new Error("Only delivered orders can be returned.");
    }

    // 7-day return window validation (from delivery timestamp)
    const deliveryTime = order.shipping?.deliveredAt
        ? new Date(order.shipping.deliveredAt).getTime()
        : order.updatedAt
        ? new Date(order.updatedAt).getTime()
        : new Date(order.createdAt).getTime();

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - deliveryTime > SEVEN_DAYS_MS) {
        throw new Error("Return window has expired. Orders can only be returned within 7 days of delivery.");
    }
};

export const updateReturnedOrder = async (
    order,
    returnReason
) => {
    order.status = "Returned";
    order.isReturned = true;
    order.returnedAt = new Date();
    order.returnReason = returnReason || "";
    order.inventoryRestored = true;

    await order.save();
    return order;
};

export const returnOrderService = async (req) => {
    const { uid } = req.user;
    const { orderId } = req.params;
    const returnReason = req.body?.returnReason || req.body?.reason || "";

    const user = await getUser(uid);

    const order = await getOrder(
        orderId,
        user._id
    );

    validateOrderReturn(order);

    if (!order.inventoryRestored) {
        await restoreInventory(order);
    }

    await updateReturnedOrder(
        order,
        returnReason
    );

    await order.populate("customer");
    await order.populate("items.product");

    return order;
};