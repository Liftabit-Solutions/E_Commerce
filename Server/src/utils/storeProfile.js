import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { emitToAll } from "../socket/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, "../config/storeProfile.json");

export const DEFAULT_STORE_PROFILE = {
    storeName: "FORMA Studio",
    logo: "",
    brandColor: "#4f46e5",
    email: "concierge@forma.com",
    phone: "+91 98765 43210",
    addressLine: "124 Commercial Avenue, Gandhi Nagar",
    district: "Coimbatore",
    state: "Tamil Nadu",
    pincode: "641001",
    gstNumber: "33AAAAA0000A1Z5",
    standardLocalDelivery: 40,
    outsideDistrictDelivery: 70,
    outsideStateDelivery: 120,
    freeDeliveryThreshold: 799,
};

let inMemoryStoreProfile = { ...DEFAULT_STORE_PROFILE };

// Load initially from disk if available
try {
    if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        inMemoryStoreProfile = { ...DEFAULT_STORE_PROFILE, ...parsed };
    }
} catch (err) {
    console.warn("[STORE PROFILE] Could not load persisted store profile, using default:", err.message);
}

/**
 * Returns current store profile
 */
export const getStoreProfile = () => {
    return { ...inMemoryStoreProfile };
};

/**
 * Updates store profile, persists to disk, and broadcasts via Socket.IO
 */
export const updateStoreProfile = (newProfile) => {
    inMemoryStoreProfile = {
        ...inMemoryStoreProfile,
        ...newProfile,
    };

    try {
        const configDir = path.dirname(CONFIG_FILE);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(inMemoryStoreProfile, null, 2), "utf-8");
    } catch (err) {
        console.warn("[STORE PROFILE] Failed to persist store profile to disk:", err.message);
    }

    // Real-time broadcast to all connected customer and admin clients
    emitToAll("store:updated", inMemoryStoreProfile);

    return inMemoryStoreProfile;
};

