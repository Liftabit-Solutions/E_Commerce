import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        // =====================================
        // Relations
        // =====================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },

        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },

        // =====================================
        // User Snapshot
        // =====================================

        authorName: {
            type: String,
            required: true,
            trim: true,
        },

        profileImage: {
            type: String,
            default: "",
        },

        // =====================================
        // Review
        // =====================================

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },

        comment: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },

        // Attached customer photo of the product
        image: {
            type: String,
            default: "",
        },

        images: {
            type: [String],
            default: [],
        },

        // =====================================
        // Moderation
        // =====================================

        status: {
            type: String,
            enum: [
                "Pending",
                "Approved",
                "Hidden",
                "Rejected"
            ],
            default: "Pending",
            index: true,
        },

        // =====================================
        // Purchase Verification
        // =====================================

        isVerifiedPurchase: {
            type: Boolean,
            default: false,
        },

        // =====================================
        // Admin
        // =====================================

        adminReply: {
            type: String,
            default: "",
        },

        repliedAt: {
            type: Date,
            default: null,
        },

        // =====================================
        // Community
        // =====================================

        likes: {
            type: Number,
            default: 0,
        },

        dislikes: {
            type: Number,
            default: 0,
        },

        // =====================================
        // Soft Delete
        // =====================================

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        }

    },
    {
        timestamps: true,
    }
);

// =====================================
// Indexes
// =====================================

reviewSchema.index({
    product: 1,
    status: 1,
    createdAt: -1,
});

// Prevent one user from reviewing the same product more than once
reviewSchema.index(
    {
        user: 1,
        product: 1
    },
    {
        unique: true
    }
);

export const Review = mongoose.model("Review", reviewSchema);