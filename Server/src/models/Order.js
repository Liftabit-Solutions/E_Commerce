import mongoose from "mongoose";

/* ===========================================
   Order Item Schema
=========================================== */

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        title: {
            type: String,
            required: true
        },

        sku: {
            type: String,
            required: true
        },

        image: {
            type: String,
            default: ""
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        retailPrice: {
            type: Number,
            required: true
        },

        sellingPrice: {
            type: Number,
            required: true
        },

        unitPrice: {
            type: Number,
            required: true
        },

        totalPrice: {
            type: Number,
            required: true
        }
    },
    {
        _id: false
    }
);

/* ===========================================
   Address
=========================================== */

const addressSchema = new mongoose.Schema(
    {
        fullName: String,

        phoneNumber: String,

        phone: String,

        alternatePhone: String,

        addressLine1: String,

        addressLine2: String,

        landmark: String,

        city: String,

        state: String,

        postalCode: String,

        pincode: String,

        country: String
    },
    {
        _id: false
    }
);

/* ===========================================
   Delivery
=========================================== */

const deliverySchema = new mongoose.Schema(
    {
        option: {
            type: String,
            enum: [
                "FREE",
                "STANDARD",
                "EXPRESS"
            ],
            required: true
        },

        title: {
            type: String,
            required: true
        },

        charge: {
            type: Number,
            default: 0
        },

        estimatedDays: {
            type: String
        }
    },
    {
        _id: false
    }
);

/* ===========================================
   Tax
=========================================== */

const taxSchema = new mongoose.Schema(
    {
        percentage: {
            type: Number,
            default: 18
        },

        amount: {
            type: Number,
            default: 0
        }
    },
    {
        _id: false
    }
);

/* ===========================================
   Payment
=========================================== */

const paymentSchema = new mongoose.Schema(
    {
        method: {
            type: String,
            enum: [
                "COD",
                "Razorpay"
            ],
            required: true
        },

        status: {
            type: String,
            enum: [
                "Pending",
                "Paid",
                "Failed",
                "Refunded",
                "Cancelled"
            ],
            default: "Pending"
        },

        transactionId: {
            type: String,
            default: ""
        },

        paymentGatewayOrderId: {
            type: String,
            default: ""
        },

        paymentGatewayPaymentId: {
            type: String,
            default: ""
        },

        paymentGatewaySignature: {
            type: String,
            default: ""
        },

        paidAt: Date
    },
    {
        _id: false
    }
);

/* ===========================================
   Shipping
=========================================== */

const shippingSchema = new mongoose.Schema(
    {
        courier: {
            type: String,
            default: ""
        },

        trackingId: {
            type: String,
            default: ""
        },

        trackingUrl: {
            type: String,
            default: ""
        },

        shippedAt: Date,

        deliveredAt: Date,

        estimatedDelivery: Date
    },
    {
        _id: false
    }
);

/* ===========================================
   Order Schema
=========================================== */

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            unique: true,
            required: true
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        items: {
            type: [orderItemSchema],
            required: true
        },

        billingAddress: addressSchema,

        shippingAddress: addressSchema,

        subtotal: {
            type: Number,
            required: true
        },

        discount: {
            type: Number,
            default: 0
        },

        couponCode: {
            type: String,
            default: ""
        },

        couponDiscount: {
            type: Number,
            default: 0
        },

        delivery: deliverySchema,

        tax: taxSchema,

        grandTotal: {
            type: Number,
            required: true
        },

        payment: paymentSchema,

        shipping: shippingSchema,

        status: {
            type: String,
            enum: [
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
            ],
            default: "Pending",
            index: true
        },

        inventoryRestored: {
            type: Boolean,
            default: false
        },

        adminNotes: {
            type: String,
            default: ""
        },

        customerNotes: {
            type: String,
            default: ""
        },

        isCancelled: {
            type: Boolean,
            default: false
        },

        cancelledAt: Date,

        cancelReason: String,

        isReturned: {
            type: Boolean,
            default: false
        },

        returnedAt: Date,

        returnReason: String,

        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

/* ===========================================
   Indexes
=========================================== */

orderSchema.index({
    customer: 1,
    createdAt: -1
});

export const Order = mongoose.model(
    "Order",
    orderSchema
);