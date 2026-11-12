import { getAuth } from "firebase-admin/auth";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Review } from "../models/Review.js";
import { Story } from "../models/Story.js";
import { User } from "../models/User.js";
import { Lead } from "../models/Lead.js"; 
import { Banner } from "../models/Banner.js";
import { v2 as cloudinary } from "cloudinary";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import { emitToAll } from "../socket/index.js";




export const adminLogin = async (req, res) => {
    try {

        const user = req.dbUser;

        user.lastLogin = new Date();
        await user.save();

        // Create Firebase Session Cookie
        const sessionCookie = await getAuth().createSessionCookie(
            req.token,
            {
                expiresIn: 1000 * 60 * 60 * 24 * 5 // 5 Days
            }
        );

        const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
        res.cookie("session", sessionCookie, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 1000 * 60 * 60 * 24 * 5,
            path: "/"
        });

        return res.status(200).json({
            success: true,
            message: "Admin Login Successful",
            user
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Admin Login Failed",
            error: error.message
        });

    }
};



// Admin Dashboard


export const getDashboard = async (req, res) => {
    try {

        // Time boundaries for weekly growth calculation
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const [
            revenue,
            currentWeekRevenueRes,
            previousWeekRevenueRes,
            totalOrders,
            deliveredOrders,
            pendingOrders,
            lowStockAlerts,
            totalProducts,
            totalReviews,
            pendingReviews,
            staffCount,
            activeLeads
        ] = await Promise.all([

            Order.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        status: {
                            $nin: ["Cancelled", "Returned", "Refunded"]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        grossRevenue: {
                            $sum: "$grandTotal"
                        }
                    }
                }
            ]),

            Order.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        status: {
                            $nin: ["Cancelled", "Returned", "Refunded"]
                        },
                        createdAt: { $gte: sevenDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$grandTotal" }
                    }
                }
            ]),

            Order.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        status: {
                            $nin: ["Cancelled", "Returned", "Refunded"]
                        },
                        createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$grandTotal" }
                    }
                }
            ]),

            Order.countDocuments({
                isDeleted: false
            }),

            Order.countDocuments({
                status: "Delivered",
                isDeleted: false
            }),

            Order.countDocuments({
                status: "Pending",
                isDeleted: false
            }),

            Product.countDocuments({
                stock: {
                    $lte: 5
                },
                isDeleted: false,
                isActive: true
            }),

            Product.countDocuments({
                isDeleted: false,
                isActive: true
            }),

            Review.countDocuments({
                isDeleted: false
            }),

            Story.countDocuments({
                status: "Pending",
                isDeleted: false
            }),

            User.countDocuments({
                isAdmin: true,
                isDeleted: false
            }),

            Lead.countDocuments({
                status: {
                    $in: [
                        "New",
                        "Contacted",
                        "In Progress"
                    ]
                }
            })

        ]);

        const currRev = currentWeekRevenueRes.length > 0 ? currentWeekRevenueRes[0].revenue : 0;
        const prevRev = previousWeekRevenueRes.length > 0 ? previousWeekRevenueRes[0].revenue : 0;

        let grossRevenueGrowth = 0;
        if (prevRev > 0) {
            grossRevenueGrowth = Number((((currRev - prevRev) / prevRev) * 100).toFixed(1));
        } else if (currRev > 0) {
            grossRevenueGrowth = 100.0;
        } else {
            grossRevenueGrowth = 0.0;
        }

        // =====================================
        // Recent Orders
        // =====================================

        const recentOrders = await Order.find({
            isDeleted: false
        })
            .populate(
                "customer",
                "firstName lastName email"
            )
            .sort({
                createdAt: -1
            })
            .limit(5);

        // =====================================
        // Recent Leads
        // =====================================

        const recentLeads = await Lead.find()
            .sort({
                createdAt: -1
            })
            .limit(5);

        // =====================================
        // Recent Customers
        // =====================================

        const recentCustomers = await Order.find({
            isDeleted: false
        })
            .populate(
                "customer",
                "firstName lastName email photoURL"
            )
            .sort({
                createdAt: -1
            })
            .limit(5);

        // =====================================
        // Response
        // =====================================

        return res.status(200).json({

            success: true,

            stats: {

                grossRevenue:
                    revenue.length > 0
                        ? revenue[0].grossRevenue
                        : 0,

                grossRevenueGrowth,

                totalOrders,

                deliveredOrders,

                pendingOrders,

                lowStockAlerts,

                activeLeads,

                totalProducts,

                totalReviews,

                pendingReviews,

                staffCount

            },

            recentOrders,

            recentLeads,

            recentCustomers

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Failed to load dashboard.",

            error: error.message

        });

    }
};


// Order Registry


const escapeRegex = (str) => String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getOrderRegistry = async (req, res) => {
    try {

        const {
            page = 1,
            limit = 10,
            status,
            paymentStatus,
            search
        } = req.query;

        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(Math.max(1, Number(limit) || 10), 100);

        const filter = {
            isDeleted: false
        };

        if (status && status !== "All") {
            filter.status = status;
        }

        if (paymentStatus && paymentStatus !== "All") {
            filter["payment.status"] = paymentStatus;
        }

        if (search && search.trim()) {
            const escapedSearch = escapeRegex(search.trim());
            filter.$or = [
                {
                    orderNumber: {
                        $regex: escapedSearch,
                        $options: "i"
                    }
                },
                {
                    "shippingAddress.fullName": {
                        $regex: escapedSearch,
                        $options: "i"
                    }
                },
                {
                    "shippingAddress.phone": {
                        $regex: escapedSearch,
                        $options: "i"
                    }
                },
                {
                    "shippingAddress.phoneNumber": {
                        $regex: escapedSearch,
                        $options: "i"
                    }
                }
            ];
        }

        const totalOrders = await Order.countDocuments(filter);

        const orders = await Order.find(filter)
            .populate(
                "customer",
                "email address addresses phoneNumber"
            )
            .populate(
                "items.product",
                "title sku sellingPrice retailPrice price images img imgs image"
            )
            .sort({
                createdAt: -1
            })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        const registry = orders.map(order => {
            const custAddr = order.customer?.address || (Array.isArray(order.customer?.addresses) && order.customer.addresses[0]) || {};
            const shippingPin = order.shippingAddress?.postalCode || order.shippingAddress?.pincode || order.billingAddress?.postalCode || order.billingAddress?.pincode || custAddr.postalCode || custAddr.pincode || "";
            const billingPin = order.billingAddress?.postalCode || order.billingAddress?.pincode || order.shippingAddress?.postalCode || order.shippingAddress?.pincode || custAddr.postalCode || custAddr.pincode || "";

            return {
            id: order.orderNumber,
            _id: order._id,
            date: order.createdAt,
            total: order.grandTotal,
            customerEmail:
                order.customer?.email || "",
            paymentStatus:
                order.payment.status,
            status:
                order.status,
            shippingAddress: order.shippingAddress,
            billingAddressRaw: order.billingAddress,
            address: {
                name:
                    order.shippingAddress?.fullName || "",
                phone:
                    order.shippingAddress?.phoneNumber || order.shippingAddress?.phone || order.customer?.phoneNumber || "",
                city:
                    order.shippingAddress?.city || "",
                street:
                    order.shippingAddress?.addressLine1 || "",
                addressLine1:
                    order.shippingAddress?.addressLine1 || "",
                addressLine2:
                    order.shippingAddress?.addressLine2 || "",
                state:
                    order.shippingAddress?.state || "",
                pincode: shippingPin
            },
            billingAddress: {
                name:
                    order.billingAddress?.fullName || order.shippingAddress?.fullName || "",
                phone:
                    order.billingAddress?.phoneNumber || order.billingAddress?.phone || order.shippingAddress?.phoneNumber || order.shippingAddress?.phone || order.customer?.phoneNumber || "",
                city:
                    order.billingAddress?.city || order.shippingAddress?.city || "",
                state:
                    order.billingAddress?.state || order.shippingAddress?.state || "",
                street:
                    order.billingAddress?.addressLine1 || order.shippingAddress?.addressLine1 || "",
                addressLine1:
                    order.billingAddress?.addressLine1 || order.shippingAddress?.addressLine1 || "",
                addressLine2:
                    order.billingAddress?.addressLine2 || order.shippingAddress?.addressLine2 || "",
                pincode: billingPin
            },
            paymentMethod:
                order.payment?.method || "COD",
            shippingMethod:
                order.delivery?.title || "Standard Delivery",
            shippingCharge:
                order.delivery?.charge || 0,
            subtotal:
                order.subtotal || 0,
            taxes:
                typeof order.tax === 'number' ? order.tax : (order.tax?.amount || 0),
            discount:
                order.discount || 0,
            courierCompany:
                order.shipping?.courier || "",
            trackingId:
                order.shipping?.trackingId || "",
            trackingUrl:
                order.shipping?.trackingUrl || "",
            estimatedDelivery:
                order.shipping?.estimatedDelivery || null,
            adminNotes:
                order.adminNotes,
            items:
                order.items.map(item => {
                    const priceVal = item.unitPrice || item.sellingPrice || item.retailPrice || (item.totalPrice && item.quantity ? Math.round(item.totalPrice / item.quantity) : 0) || item.product?.sellingPrice || item.product?.retailPrice || item.product?.price || 0;
                    
                    let prodImgs = [];
                    if (item.image) prodImgs.push(item.image);
                    if (item.product) {
                        if (Array.isArray(item.product.images)) {
                            item.product.images.forEach(imgObj => {
                                if (typeof imgObj === 'string' && imgObj) prodImgs.push(imgObj);
                                else if (imgObj?.url) prodImgs.push(imgObj.url);
                                else if (imgObj?.secure_url) prodImgs.push(imgObj.secure_url);
                            });
                        }
                        if (Array.isArray(item.product.imgs)) {
                            item.product.imgs.forEach(imgStr => { if (imgStr) prodImgs.push(imgStr); });
                        }
                        if (item.product.img) prodImgs.push(item.product.img);
                        if (item.product.image) prodImgs.push(item.product.image);
                    }
                    prodImgs = Array.from(new Set(prodImgs)).filter(Boolean);
                    const mainImage = item.image || prodImgs[0] || "";

                    return {
                        quantity:
                            item.quantity,
                        unitPrice:
                            priceVal,
                        sellingPrice:
                            item.sellingPrice || priceVal,
                        retailPrice:
                            item.retailPrice || priceVal,
                        totalPrice:
                            item.totalPrice || (priceVal * item.quantity),
                        image: mainImage,
                        product: {
                            id: item.product?._id || item.product?.id || item._id,
                            name: item.title || item.product?.title || item.product?.name || "Product",
                            sku: item.sku || item.product?.sku || "N/A",
                            price: priceVal,
                            imgs: prodImgs.length > 0 ? prodImgs : (mainImage ? [mainImage] : []),
                            img: mainImage,
                            image: mainImage
                        }
                    };
                }),

            timeline: [

                {
                    date:
                        order.createdAt,

                    status:
                        "Pending",

                    notes:
                        "Order placed successfully."
                },

                ...(order.shipping?.shippedAt
                    ? [{
                        date:
                            order.shipping.shippedAt,

                        status:
                            "Shipped",

                        notes:
                            "Package handed over to courier."
                    }]
                    : []),

                ...(order.shipping?.deliveredAt
                    ? [{
                        date:
                            order.shipping.deliveredAt,

                        status:
                            "Delivered",

                        notes:
                            "Order delivered successfully."
                    }]
                    : [])

            ]

        };
    });

        return res.status(200).json({

            success: true,

            currentPage:
                Number(page),

            totalPages:
                Math.ceil(
                    totalOrders / limit
                ),

            totalOrders,

            orders:
                registry

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch order registry.",

            error:
                error.message

        });

    }
};



//Banner Adding by the Admin


export const publishBanners = async (req, res) => {
    try {

        const banners = JSON.parse(req.body.banners || "[]");

        // Helper to extract uploaded file for slot index i
        const getUploadedFile = (prefix, index) => {
            if (!req.files) return null;
            if (Array.isArray(req.files)) {
                // Find by slot-specific fieldname (e.g. desktopImage_0)
                const exact = req.files.find(f => f.fieldname === `${prefix}_${index}`);
                if (exact) return exact;
                // Fallback to array fieldname (e.g. desktopImages)
                const arrayMatches = req.files.filter(f => f.fieldname === `${prefix}s`);
                return arrayMatches[index] || null;
            } else if (typeof req.files === "object") {
                if (req.files[`${prefix}_${index}`]?.[0]) {
                    return req.files[`${prefix}_${index}`][0];
                }
                if (req.files[`${prefix}s`]?.[index]) {
                    return req.files[`${prefix}s`][index];
                }
            }
            return null;
        };

        if (!Array.isArray(banners) || banners.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Banner list is required."
            });
        }

        if (banners.length > 4) {
            return res.status(400).json({
                success: false,
                message: "Maximum 4 banners are allowed."
            });
        }

        const updated = [];

        for (let i = 0; i < banners.length; i++) {

            const banner = banners[i];

            let desktopImage = (banner.desktopImage && banner.desktopImage.startsWith("http")) ? banner.desktopImage : "";
            let desktopImagePublicId = banner.desktopImagePublicId || "";

            let mobileImage = (banner.mobileImage && banner.mobileImage.startsWith("http")) ? banner.mobileImage : "";
            let mobileImagePublicId = banner.mobileImagePublicId || "";

            const desktopFile = getUploadedFile("desktopImage", i);
            const mobileFile = getUploadedFile("mobileImage", i);

            // Upload Desktop Image if new buffer provided
            if (desktopFile && desktopFile.buffer) {

                const result = await uploadToCloudinary(
                    desktopFile.buffer,
                    "banners/desktop"
                );

                desktopImage = result.secure_url;
                desktopImagePublicId = result.public_id;
            }

            // Upload Mobile Image if new buffer provided
            if (mobileFile && mobileFile.buffer) {

                const result = await uploadToCloudinary(
                    mobileFile.buffer,
                    "banners/mobile"
                );

                mobileImage = result.secure_url;
                mobileImagePublicId = result.public_id;
            }

            const slotOrder = banner.displayOrder || (i + 1);

            const savedBanner = await Banner.findOneAndUpdate(
                {
                    displayOrder: slotOrder
                },
                {
                    label: banner.label || `Banner ${slotOrder}`,
                    title: banner.title || "Organic Clean Solutions",
                    subtitle: banner.subtitle || "",
                    ctaText: banner.ctaText || "",
                    ctaLink: banner.ctaLink || "products",

                    desktopImage,
                    desktopImagePublicId,

                    mobileImage,
                    mobileImagePublicId,

                    displayOrder: slotOrder,

                    scheduleStart: banner.scheduleStart || null,
                    scheduleEnd: banner.scheduleEnd || null,

                    isActive: banner.isActive !== undefined ? banner.isActive : true,
                    isDeleted: false
                },
                {
                    upsert: true,
                    returnDocument: "after",
                    runValidators: true,
                    setDefaultsOnInsert: true
                }
            );

            updated.push(savedBanner);
        }

        // Real-time synchronization: Broadcast to all connected customer and admin clients
        emitToAll("banners:updated", { banners: updated, total: updated.length });

        return res.status(200).json({
            success: true,
            message: "Homepage banners published successfully.",
            total: updated.length,
            banners: updated
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to publish banners.",
            error: error.message
        });

    }
};
//Get all the Banners details

export const getAllBanners = async (req, res) => {
    try {

        const banners = await Banner.find({
            isDeleted: false
        })
            .sort({
                displayOrder: 1
            });

        return res.status(200).json({

            success: true,

            total: banners.length,

            banners

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Failed to fetch banners.",

            error: error.message

        });

    }
};