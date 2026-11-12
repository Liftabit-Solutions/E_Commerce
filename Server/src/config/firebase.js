import "./env.js";
import admin from "firebase-admin";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { readFileSync, existsSync } from "node:fs";

let serviceAccount = null;

// 1. Try parsing JSON string from environment variable (recommended for cloud/production)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    // Support base64 encoded or direct JSON string
    const jsonStr = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8");
    serviceAccount = JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:", err.message);
  }
}

// 2. Try individual environment variables
if (!serviceAccount && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };
}

// 3. Try service account file path from environment variable
if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    if (existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
      serviceAccount = JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8"));
    }
  } catch (err) {
    console.warn("Could not read FIREBASE_SERVICE_ACCOUNT_PATH:", err.message);
  }
}

// 4. Local dev fallback (checks local file if present, with warning)
if (!serviceAccount) {
  try {
    const jsonUrl = new URL("../clean-every-day-firebase-adminsdk-fbsvc-2d895691c1.json", import.meta.url);
    if (existsSync(jsonUrl)) {
      console.warn("[SECURITY NOTICE] Loading Firebase credentials from local file. For production, supply FIREBASE_SERVICE_ACCOUNT via environment variables.");
      serviceAccount = JSON.parse(readFileSync(jsonUrl, "utf-8"));
    }
  } catch (e) {
    // Local dev key not found
  }
}

if (serviceAccount && typeof serviceAccount.private_key === "string") {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

if (getApps().length === 0 && serviceAccount) {
  try {
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin initialized successfully.");
  } catch (initErr) {
    console.error("Firebase Admin initialization error:", initErr);
  }
} else if (!serviceAccount) {
  console.warn("[FIREBASE WARNING] No Firebase service account credentials found. Auth operations will fail.");
}

export default admin;
