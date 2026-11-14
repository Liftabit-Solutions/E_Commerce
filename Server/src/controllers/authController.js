import crypto from "crypto";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { getAuth } from "firebase-admin/auth";
import nodemailer from "nodemailer";
import { getOtpEmailTemplate } from "../utils/emailTemplates.js";
import { sendWelcomeEmail } from "../utils/emailService.js";

export const register = async (req, res) => {
    try {
        const {
            uid,
            name,
            email,
            picture,
            phone_number,
            email_verified
        } = req.user;

        const bodyName = req.body?.name || req.body?.fullName;
        const bodyPhone = req.body?.phone || req.body?.phoneNumber;

        // Check if user already exists
        const tokenEmail = email ? email.toLowerCase().trim() : null;
        let existingUser = await User.findOne({ uid, isDeleted: false });

        if (!existingUser && tokenEmail) {
            const userWithEmail = await User.findOne({ email: tokenEmail, isDeleted: false });
            if (userWithEmail) {
                if (userWithEmail.uid && userWithEmail.uid !== uid) {
                    return res.status(409).json({
                        success: false,
                        message: "An account with this email address already exists.",
                    });
                }
                if (email_verified) {
                    userWithEmail.uid = uid;
                    existingUser = userWithEmail;
                } else {
                    return res.status(403).json({
                        success: false,
                        message: "Email address is unverified. Please verify your email first.",
                    });
                }
            }
        }

        console.log("=== REGISTER DIAGNOSTIC START ===");
        console.log("mongoose.connection.name:", mongoose.connection.name);
        console.log("mongoose.connection.host:", mongoose.connection.host);
        console.log("mongoose.connection.readyState:", mongoose.connection.readyState);
        console.log("searched email:", tokenEmail);
        console.log("searched UID:", uid);
        console.log("existingUser found:", !!existingUser);
        if (existingUser) {
            console.log("existingUser DETAILS:", {
                _id: existingUser._id,
                email: existingUser.email,
                uid: existingUser.uid,
                isDeleted: existingUser.isDeleted
            });
        }
        console.log("=== REGISTER DIAGNOSTIC END ===");

        if (existingUser) {
            console.log("-> TAKING BRANCH: existingUser (HTTP 200)");
            existingUser.lastLogin = new Date();
            if (!existingUser.uid && uid) {
                existingUser.uid = uid;
            }
            await existingUser.save();

            try {
                const token = req.headers.authorization?.split(" ")[1];
                if (token) {
                    const sessionCookie = await getAuth().createSessionCookie(
                        token,
                        { expiresIn: 1000 * 60 * 60 * 24 * 5 }
                    );

                    const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
                    res.cookie("session", sessionCookie, {
                        httpOnly: true,
                        secure: isProduction,
                        sameSite: isProduction ? "none" : "lax",
                        maxAge: 1000 * 60 * 60 * 24 * 5,
                        path: "/"
                    });
                }
            } catch (sessionErr) {
                console.warn("Could not create session cookie for existing user:", sessionErr.message);
            }

            return res.status(200).json({
                success: true,
                message: "User already registered",
                user: existingUser,
            });
        }

        console.log("ABOUT TO CREATE USER in DB:", mongoose.connection.name);

        // Create new user using decoded token claims + req.body form inputs
        const user = await User.create({
            uid,
            name: bodyName || name || "User",
            email: email || req.body?.email,
            photoURL: picture || "",
            phoneNumber: bodyPhone || phone_number || "",
            role: "customer",
            isEmailVerified: email_verified,
            lastLogin: new Date(),
        });

        console.log("USER CREATED SUCCESSFULLY with ID:", user._id);

        // Send welcome email asynchronously
        if (user.email) {
            sendWelcomeEmail({ to: user.email, name: user.name }).catch((err) => {
                console.warn("[WELCOME EMAIL WARNING] Failed to deliver welcome email:", err.message);
            });
        }

        // Set session cookie on successful registration
        try {
            const sessionCookie = await getAuth().createSessionCookie(
                req.headers.authorization.split(" ")[1],
                { expiresIn: 1000 * 60 * 60 * 24 * 5 }
            );

            const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
            res.cookie("session", sessionCookie, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax",
                maxAge: 1000 * 60 * 60 * 24 * 5,
                path: "/"
            });
        } catch (sessionErr) {
            console.warn("Could not create session cookie during registration:", sessionErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "Registration Successful",
            user,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Registration Failed",
            error: error.message,
        });

    }
};


//Login controller
export const login = async (req, res) => {

    try {

        const { uid, email, name } = req.user;

        let user = await User.findOne({
            uid,
            isDeleted: false,
        });

        if (!user && email) {
            user = await User.findOne({
                email,
                isDeleted: false,
            });
            if (user) {
                user.uid = uid;
                await user.save();
            }
        }

        if (!user) {
            const userName = name || (email ? email.split("@")[0] : "Customer");
            user = await User.create({
                uid,
                email: email || "",
                name: userName,
                role: "customer",
                isDeleted: false,
                lastLogin: new Date()
            });
        } else {
            user.lastLogin = new Date();
            await user.save();
        }
        console.log(user.email);
        
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
            message: "Login Successful",
            user,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Login Failed",
            error: error.message,
        });

    }

};


//Logout Controller

export const logout = async (req, res) => {
    try {

        const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
        res.clearCookie("session", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/"
        });
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/"
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully."
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Logout failed.",
            error: error.message
        });

    }
};


// authController.js

export const getCurrentUser = async (req, res) => {
    try {

        let uid = req.user?.uid;

        if (!uid) {
            const sessionCookie = req.cookies?.session;
            if (sessionCookie) {
                try {
                    const decodedClaims = await getAuth().verifySessionCookie(
                        sessionCookie,
                        true
                    );
                    uid = decodedClaims.uid;
                } catch (e) {
                    // Session cookie invalid or expired
                }
            }
        }

        if (!uid && req.headers.authorization?.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = await getAuth().verifyIdToken(token);
                uid = decoded.uid;
            } catch (e) {
                // Token invalid or expired
            }
        }

        if (!uid) {
            return res.status(200).json({
                success: true,
                user: null
            });
        }

        const user = await User.findOne({
            uid,
            isDeleted: false,
        }).select("-__v");

        if (!user) {
            return res.status(200).json({
                success: true,
                user: null
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });

    } catch (error) {

        console.error("Session verification failed in getCurrentUser:", error.message);

        return res.status(200).json({
            success: true,
            user: null
        });

    }
};

// Create nodemailer transporter
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

    // Gmail SMTP Transport over SSL (Port 465)
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

const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp || "").trim()).digest("hex");

// Send 6-Digit OTP for Password Reset
export const sendPasswordResetOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: "Database service is temporarily unavailable. Please ensure MongoDB is running.",
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            isDeleted: false,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No registered account found with this email address.",
            });
        }

        // Generate cryptographically secure 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 Minutes expiration

        // Store secure SHA-256 hash of OTP and reset attempt counter
        user.resetOtp = hashOtp(otp);
        user.resetOtpExpires = otpExpires;
        user.resetOtpAttempts = 0;
        await user.save();

        const transporter = createTransporter();
        if (transporter) {
            try {
                const info = await transporter.sendMail({
                    from: process.env.EMAIL_FROM || '"FORMA Studio" <concierge@forma.com>',
                    to: user.email,
                    subject: "Your 6-Digit Password Reset OTP - FORMA Studio",
                    html: getOtpEmailTemplate({
                        name: user.name,
                        otp,
                        purpose: "Password Reset"
                    }),
                });
                console.log(`[SMTP SUCCESS] OTP email sent successfully to ${user.email} (MessageId: ${info.messageId})`);
            } catch (emailErr) {
                console.error("[SMTP ERROR] Could not send OTP email via SMTP:", emailErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: "A 6-digit OTP code has been sent to your email address.",
        });

    } catch (error) {
        console.error("sendPasswordResetOtp error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send OTP.",
            error: error.message,
        });
    }
};

// Verify OTP and Reset Password in Firebase & Database
export const verifyOtpAndResetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP, and new password are required.",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long.",
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            isDeleted: false,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User account not found.",
            });
        }

        if (!user.resetOtp || !user.resetOtpExpires) {
            return res.status(400).json({
                success: false,
                message: "No active password reset request found. Please request a new OTP.",
            });
        }

        if (new Date() > new Date(user.resetOtpExpires)) {
            user.resetOtp = null;
            user.resetOtpExpires = null;
            user.resetOtpAttempts = 0;
            await user.save();
            return res.status(400).json({
                success: false,
                message: "OTP code has expired. Please request a new OTP.",
            });
        }

        // Brute-force protection: lock out after 5 consecutive failed attempts
        if (user.resetOtpAttempts >= 5) {
            user.resetOtp = null;
            user.resetOtpExpires = null;
            user.resetOtpAttempts = 0;
            await user.save();
            return res.status(429).json({
                success: false,
                message: "Too many failed attempts. For security, this OTP has been invalidated. Please request a new OTP.",
            });
        }

        const hashedInput = hashOtp(otp);
        if (user.resetOtp !== hashedInput) {
            user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
            const remaining = 5 - user.resetOtpAttempts;
            await user.save();
            return res.status(400).json({
                success: false,
                message: remaining > 0
                    ? `Invalid OTP code. ${remaining} attempt(s) remaining.`
                    : "Too many failed attempts. This OTP has been invalidated.",
            });
        }

        // Update password in Firebase Auth via Firebase Admin SDK
        try {
            await getAuth().updateUser(user.uid, {
                password: newPassword,
            });
        } catch (fbErr) {
            console.error("Firebase Password Update Error:", fbErr);
            return res.status(500).json({
                success: false,
                message: "Failed to update password in Firebase: " + fbErr.message,
            });
        }

        // Clear OTP fields & reset counter on successful password change
        user.resetOtp = null;
        user.resetOtpExpires = null;
        user.resetOtpAttempts = 0;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully! You can now log in with your new password.",
        });

    } catch (error) {
        console.error("verifyOtpAndResetPassword error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reset password.",
            error: error.message,
        });
    }
};


