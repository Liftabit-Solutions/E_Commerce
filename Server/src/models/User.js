import mongoose from "mongoose";

/* ===========================================================
   Address Schema
=========================================================== */

const addressSchema = new mongoose.Schema(
    {
        tag: {
            type: String,
            trim: true,
            default: "Home"
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        phoneNumber: {
            type: String,
            required: true,
            trim: true
        },

        alternatePhone: {
            type: String,
            default: "",
            trim: true
        },

        addressLine1: {
            type: String,
            required: true,
            trim: true
        },

        addressLine2: {
            type: String,
            default: "",
            trim: true
        },

        landmark: {
            type: String,
            default: "",
            trim: true
        },

        city: {
            type: String,
            required: true,
            trim: true
        },

        state: {
            type: String,
            required: true,
            trim: true
        },

        postalCode: {
            type: String,
            required: true,
            trim: true
        },

        country: {
            type: String,
            default: "India",
            trim: true
        },

        isDefault: {
            type: Boolean,
            default: false
        }

    },
    {
        _id: true
    }
);

/* ===========================================================
   User Schema
=========================================================== */

const userSchema = new mongoose.Schema(
    {

        uid: {
            type: String,
            required: true,
            unique: true,
            immutable: true
        },

        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        firstName: {
            type: String,
            trim: true,
            default: ""
        },

        lastName: {
            type: String,
            trim: true,
            default: ""
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        photoURL: {
            type: String,
            default: ""
        },

        gender: {
            type: String,
            enum: [
                "Male",
                "Female",
                "Other",
                "Prefer not to say"
            ],
            default: "Prefer not to say"
        },

        dateOfBirth: {
            type: Date,
            default: null
        },

        phoneNumber: {
            type: String,
            default: ""
        },

        /* ======================================
           Multiple Addresses
        ====================================== */

        addresses: {
            type: [addressSchema],
            default: []
        },

        /* ======================================
           Statistics
        ====================================== */

        totalOrders: {
            type: Number,
            default: 0,
            min: 0
        },

        totalSpent: {
            type: Number,
            default: 0,
            min: 0
        },

        rewardPoints: {
            type: Number,
            default: 0,
            min: 0
        },

        wishlistCount: {
            type: Number,
            default: 0,
            min: 0
        },

        /* ======================================
           Account
        ====================================== */

        isEmailVerified: {
            type: Boolean,
            default: false
        },

        isDeleted: {
            type: Boolean,
            default: false,
            index: true
        },

        isAdmin: {
            type: Boolean,
            default: false
        },

        role: {
            type: String,
            enum: [
                "customer",
                "Customer",
                "admin",
                "Admin"
            ],
            default: "customer"
        },

        status: {
            type: String,
            enum: [
                "Active",
                "Inactive",
                "Blocked"
            ],
            default: "Active"
        },

        lastLogin: {
            type: Date,
            default: null
        },

        resetOtp: {
            type: String,
            default: null
        },

        resetOtpExpires: {
            type: Date,
            default: null
        },

        resetOtpAttempts: {
            type: Number,
            default: 0
        }

    },
    {
        timestamps: true,
        versionKey: false
    }
);

export const User = mongoose.model("User", userSchema);