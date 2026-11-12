import { User } from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinaryUpload.js";
import cloudinary from "../config/cloudinary.js";
import { Banner } from "../models/Banner.js";
import mongoose from "mongoose";
import { emitToUser } from "../socket/index.js";

//add address

export const addAddress = async (req, res) => {
    try {

        const { uid } = req.user;

        const {
            tag,
            fullName,
            phoneNumber,
            alternatePhone,
            addressLine1,
            addressLine2,
            landmark,
            city,
            state,
            postalCode,
            country,
            isDefault
        } = req.body;

        // =====================================
        // Validation
        // =====================================

        if (
            !fullName ||
            !phoneNumber ||
            !addressLine1 ||
            !city ||
            !state ||
            !postalCode
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

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
        // First Address -> Default
        // =====================================

        let defaultAddress = false;

        if (user.addresses.length === 0) {
            defaultAddress = true;
        }

        // =====================================
        // User selected default
        // =====================================

        if (isDefault === true) {

            user.addresses.forEach(address => {
                address.isDefault = false;
            });

            defaultAddress = true;
        }

        // =====================================
        // Create Address
        // =====================================

        user.addresses.push({

            tag: tag || "Home",

            fullName,

            phoneNumber,

            alternatePhone: alternatePhone || "",

            addressLine1,

            addressLine2: addressLine2 || "",

            landmark: landmark || "",

            city,

            state,

            postalCode,

            country: country || "India",

            isDefault: defaultAddress

        });

        await user.save();

        // Real-time synchronization
        emitToUser(user._id, "user:updated", { user });

        return res.status(201).json({

            success: true,

            message: "Address added successfully.",

            addresses: user.addresses

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "Failed to add address.",

            error: error.message

        });

    }
};


// update the profile default address

export const setDefaultAddress = async (req, res) => {
    try {

        const { uid } = req.user;
        const { addressId } = req.params;

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

        const addressExists = user.addresses.some(
            address => address._id.toString() === addressId
        );

        if (!addressExists) {
            return res.status(404).json({
                success: false,
                message: "Address not found."
            });
        }

        // Remove previous default
        user.addresses.forEach(address => {
            address.isDefault = false;
        });

        // Set new default
        const selectedAddress = user.addresses.id(addressId);
        selectedAddress.isDefault = true;

        await user.save();

        // Real-time synchronization
        emitToUser(user._id, "user:updated", { user });

        return res.status(200).json({
            success: true,
            message: "Default address updated.",
            addresses: user.addresses
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to update default address.",
            error: error.message
        });

    }
};


//update the User Address

export const updateAddress = async (req, res) => {
    try {

        const { uid } = req.user;
        const { addressId } = req.params;

        const {
            fullName,
            phoneNumber,
            tag,
            addressLine1,
            addressLine2,
            city,
            state,
            landmark,
            alternatePhone,
            postalCode,
            country
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid address id."
            });
        }
        console.log(alternatePhone);
        
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

        const address = user.addresses.id(addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found."
            });
        }
            address.fullName = fullName ?? address.fullName;

            address.phoneNumber = phoneNumber ?? address.phoneNumber;

            address.tag = tag ?? address.tag;

            address.addressLine1 = addressLine1 ?? address.addressLine1;

            address.addressLine2 = addressLine2 ?? address.addressLine2;

            address.city = city ?? address.city;

            address.state = state ?? address.state;
            
            address.landmark = landmark ?? address.landmark;

            address.alternatePhone = alternatePhone ?? address.alternatePhone

            address.postalCode = postalCode ?? address.postalCode;

            address.country = country ?? address.country;
        await user.save();

        // Real-time synchronization
        emitToUser(user._id, "user:updated", { user });

        return res.status(200).json({
            success: true,
            message: "Address updated successfully.",
            address
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to update address.",
            error: error.message
        });

    }
};

//delete the users address
export const deleteAddress = async (req, res) => {
    try {
        const { uid } = req.user;
        const { addressId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid address ID"
            });
        }

        const user = await User.findOne({ uid });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const addressIndex = user.addresses.findIndex(
            address => address._id.toString() === addressId
        );

        if (addressIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Address not found"
            });
        }

        user.addresses.splice(addressIndex, 1);

        await user.save();

        // Real-time synchronization
        emitToUser(user._id, "user:updated", { user });

        res.status(200).json({
            success: true,
            message: "Address deleted successfully",
            addresses: user.addresses
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// get current user
export const getCurrentUser = async (req, res) => {
    try {

        const { uid } = req.user;

        const user = await User.findOne({
            uid,
            isDeleted: false,
        }).select("-__v");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch current user",
            error: error.message,
        });

    }
};

//update the curent user controller using cloudinary and multer ' - ' ;
export const updateProfile = async (req, res) => {
    try {

        const { uid } = req.user;

        const {
            firstName,
            lastName,
            gender,
            dateOfBirth,
            phoneNumber,

            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country
        } = req.body;

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
        // Upload Profile Image
        // =====================================

        if (req.file) {

            // Delete previous image (optional)

            if (
                user.photoURL &&
                user.photoURL.includes("cloudinary")
            ) {

                try {

                    const publicId = user.photoURL
                        .split("/")
                        .slice(-2)
                        .join("/")
                        .replace(/\.[^/.]+$/, "");

                    await cloudinary.uploader.destroy(publicId);

                } catch (err) {
                    console.log("Old image delete failed.");
                }

            }

            const uploaded = await uploadToCloudinary(
                req.file.buffer,
                "users/profile"
            );

            user.photoURL = uploaded.secure_url;
        }

        // =====================================
        // Basic Details
        // =====================================

        if (firstName !== undefined)
            user.firstName = firstName.trim();

        if (lastName !== undefined)
            user.lastName = lastName.trim();

        if (gender !== undefined)
            user.gender = gender;

        if (dateOfBirth !== undefined)
            user.dateOfBirth = dateOfBirth;

        if (phoneNumber !== undefined)
            user.phoneNumber = phoneNumber;

        // Update full name automatically

        user.name =
            `${user.firstName} ${user.lastName}`.trim();

        // =====================================
        // Address
        // =====================================

        if (addressLine1 !== undefined)
            user.address.addressLine1 = addressLine1;

        if (addressLine2 !== undefined)
            user.address.addressLine2 = addressLine2;

        if (city !== undefined)
            user.address.city = city;

        if (state !== undefined)
            user.address.state = state;

        if (postalCode !== undefined)
            user.address.postalCode = postalCode;

        if (country !== undefined)
            user.address.country = country;

        // =====================================
        // Save
        // =====================================

        await user.save();

        // Real-time synchronization
        emitToUser(user._id, "user:updated", { user });

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            user
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to update profile.",
            error: error.message
        });

    }
};


//Banner to all the users

export const getActiveBanners = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(200).json({
                success: true,
                total: 0,
                banners: []
            });
        }

        const now = new Date();

        const banners = await Banner.find({

            isDeleted: false,

            isActive: true,

            $and: [

                {
                    $or: [
                        { scheduleStart: null },
                        { scheduleStart: { $lte: now } }
                    ]
                },

                {
                    $or: [
                        { scheduleEnd: null },
                        { scheduleEnd: { $gte: now } }
                    ]
                }

            ]

        })
            .sort({
                displayOrder: 1
            })
            .select(
                "label title subtitle ctaText ctaLink desktopImage mobileImage displayOrder"
            );

        return res.status(200).json({

            success: true,

            total: banners.length,

            banners

        });

    } catch (error) {

        console.warn("[BANNERS WARNING] Could not fetch banners from DB, returning fallback:", error.message);

        return res.status(200).json({

            success: true,

            total: 0,

            banners: []

        });

    }
};