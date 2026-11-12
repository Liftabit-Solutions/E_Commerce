import "./src/config/env.js";
import express from "express";

import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import mongoSanitize from "@exortek/express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { connectDb } from "./src/config/DataBase.js";
import admin from "./src/config/firebase.js";
import { getApp, getApps } from "firebase-admin/app";
import authRouter from "./src/routes/authRoutes.js";
import adminRouter from "./src/routes/adminRoutes.js";
import userRouter from "./src/routes/userRoutes.js";
import {productRouter,pubilcProductRouter} from "./src/routes/productRoutes.js";
import orderRouter from "./src/routes/orderRoutes.js";
import reviewRouter from "./src/routes/reviewRoutes.js";
import cartRouter from "./src/routes/cartRoutes.js";
import leadRouter from "./src/routes/leadRoutes.js";
import storyRouter from "./src/routes/storyRoutes.js";
import { startReminderScheduler } from "./src/utils/reminderScheduler.js";
import { getStoreProfile, updateStoreProfile } from "./src/utils/storeProfile.js";
import verifyToken from "./src/middlewares/auth.js";
import verifyAdmin from "./src/middlewares/admin.js";
import errorMiddleware from "./src/middlewares/errorMiddleware.js";

// Express 5 req.query compatibility fix:
// Express 5 defines req.query with only a getter on express.request.
// Add a setter so sanitization and query-modifying middlewares work seamlessly without throwing TypeError.
const queryDescriptor = Object.getOwnPropertyDescriptor(express.request, "query");
if (queryDescriptor && !queryDescriptor.set) {
  Object.defineProperty(express.request, "query", {
    configurable: true,
    enumerable: true,
    get() {
      return this._query !== undefined ? this._query : (this._query = queryDescriptor.get.call(this));
    },
    set(val) {
      this._query = val;
    },
  });
}

const app = express();

// Trust proxy for Vercel deployment
app.set("trust proxy", 1);

// Ensure Database connection for serverless function invocations
app.use(async (req, res, next) => {
  await connectDb();
  startReminderScheduler();
  next();
});

// =========================
// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);



const parseOrigins = (val) => {
  if (!val) return [];
  return val
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
};

const allowedOrigins = [
  "https://cleaneveryday.liftabit.in",
  "https://cleaneveryday-admin.liftabit.in",
  "https://clean-every-day.vercel.app",
  "https://clean-every-day-244d.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.ADMIN_FRONTEND_URL),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, "");
      if (
        cleanOrigin.startsWith("http://localhost:") ||
        cleanOrigin.startsWith("http://127.0.0.1:") ||
        cleanOrigin.endsWith(".liftabit.in") ||
        cleanOrigin.endsWith(".vercel.app") ||
        allowedOrigins.includes(cleanOrigin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);



app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 500 : 5000,
    validate: { trustProxy: false },
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  })
);

// =========================
// Body Parser (must run before sanitizers so req.body is parsed)
// =========================
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// =========================
// Sanitization Middleware
// =========================
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// =========================
// Other Middleware
// =========================
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// =========================
// Health Check
// =========================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend API is running 🚀",
  });
});

// Store Profile endpoints (Branding, Logo, Color, Address, Delivery rules)
app.get(["/api/store-profile", "/store-profile"], (req, res) => {
  res.status(200).json({ success: true, storeProfile: getStoreProfile() });
});

app.put(
  ["/api/store-profile", "/store-profile", "/api/admin/store-profile", "/admin/store-profile"],
  verifyToken,
  verifyAdmin,
  (req, res) => {
    const updated = updateStoreProfile(req.body);
    res.status(200).json({ success: true, message: "Store profile updated successfully", storeProfile: updated });
  }
);

try {
  if (getApps().length > 0) {
    console.log("Firebase App Name:", getApp().name);
  }
} catch (err) {
  console.warn("Firebase not initialized:", err.message);
}

// Routes (Supported with and without /api prefix for Vercel rewrites)
// =========================

// Admin Routes (mounted first to prevent prefix collision with /api/auth)
app.use("/api/auth/admin", adminRouter);
app.use("/auth/admin", adminRouter);
app.use("/api/admin", adminRouter);
app.use("/admin", adminRouter);

app.use("/api/auth", authRouter);
app.use("/auth", authRouter);

app.use("/api/users", userRouter);
app.use("/users", userRouter);

app.use("/api/admin", productRouter);
app.use("/admin", productRouter);

app.use("/api/products", pubilcProductRouter);
app.use("/products", pubilcProductRouter);

app.use("/api/orders", orderRouter);
app.use("/orders", orderRouter);

app.use("/api/carts", cartRouter);
app.use("/carts", cartRouter);

app.use("/api/reviews", reviewRouter);
app.use("/reviews", reviewRouter);

app.use("/api/leads", leadRouter);
app.use("/leads", leadRouter);
app.use("/api/admin/leads", leadRouter);
app.use("/admin/leads", leadRouter);

app.use("/api/stories", storyRouter);
app.use("/stories", storyRouter);

// console.log(Cloudinary.api);

// =========================
// =========================
// 404 Handler
// =========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =========================
// Global Error Handler
// =========================
app.use(errorMiddleware);

export default app;