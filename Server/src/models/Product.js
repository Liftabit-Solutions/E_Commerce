import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        // ===================================
        // Step 1 : General Product Details
        // ===================================

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },

        sku: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },

        brand: {
            type: String,
            required: true,
            trim: true,
            default: "FORMA",
        },

        category: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        badge: {
            type: String,
            default: "None",
            trim: true,
        },

        tags: [
            {
                type: String,
                trim: true,
            }
        ],

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },

        // ===================================
        // Step 2 : Price Configuration
        // ===================================

        retailPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        discountPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },

        sellingPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        // ===================================
        // Step 3 : Inventory
        // ===================================

        stock: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        totalPurchased: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        minStockAlert: {
            type: Number,
            default: 5,
            min: 0,
        },

        specifications: {

            containerSize: {
                type: String,
                required: true,
                trim: true,
            },

            usageInstructions: {
                type: String,
                required: true,
                trim: true,
            },

            phLevel: {
                type: String,
                required: true,
                trim: true,
            },

            suitableSurfaces: {
                type: String,
                required: true,
                trim: true,
            }

        },

        // ===================================
        // Step 4 : Product Images
        // ===================================

        images: [
            {
                url: {
                    type: String,
                    required: true,
                },

                public_id: {
                    type: String,
                    required: true,
                }
            }
        ],

        // ===================================
        // Step 5 : SEO
        // ===================================

        seo: {

            metaTitle: {
                type: String,
                default: "",
                trim: true,
                maxlength: 60,
            },

            metaDescription: {
                type: String,
                default: "",
                trim: true,
                maxlength: 160,
            },

            metaKeywords: [
                {
                    type: String,
                    trim: true,
                }
            ]

        },

        // ===================================
        // Product Statistics
        // ===================================

        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        totalReviews: {
            type: Number,
            default: 0,
            min: 0,
        },

        sold: {
            type: Number,
            default: 0,
            min: 0,
        },

        grossRevenue: {
            type: Number,
            default: 0,
            min: 0,
        },

        // ===================================
        // Product Status
        // ===================================

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        }

    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const Product = mongoose.model("Product", productSchema);