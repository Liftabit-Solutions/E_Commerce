import "./env.js";
import mongoose from "mongoose";
import { attachMongoAdapter } from "../socket/index.js";

let isConnecting = false;
let lastAttemptTime = 0;

export const connectDb = async () => {
    if (mongoose.connection.readyState >= 1) {
        await attachMongoAdapter();
        return;
    }
    const now = Date.now();
    // Throttle reconnect attempts to at most once every 10 seconds if failed
    if (isConnecting || (now - lastAttemptTime < 10000)) {
        return;
    }
    isConnecting = true;
    lastAttemptTime = now;
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 3000,
        });
        console.log("DB connection is successful");
        await attachMongoAdapter();
    } catch (error) {
        console.warn("DB connection attempt failed (check if MongoDB is running):", error.message);
    } finally {
        isConnecting = false;
    }
};