import { getAuth } from "firebase-admin/auth"; // Import the clean ESM auth module
import admin from "../config/firebase.js";    // Keeps your config file loading first

const verifyToken = async (req, res, next) => {
    try {

        // Get Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header not found",
            });
        }

        // Check Bearer format
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Invalid Authorization format",
            });
        }

        // Extract Firebase ID Token
        const token = authHeader.split(" ")[1];

        // Verify Firebase ID Token
        const decodedToken = await getAuth().verifyIdToken(token);

        // Store decoded user and original token
        req.user = decodedToken;
        req.token = token;

        next();

    } catch (error) {

        console.error("Firebase Verify Error");
        console.error(error);

        return res.status(401).json({
            success: false,
            message: "Invalid or Expired Firebase Token",
            error: error.message,
        });

    }
};

export const verifyOptionalToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            if (token && token.trim()) {
                const decodedToken = await getAuth().verifyIdToken(token);
                req.user = decodedToken;
                req.token = token;
            }
        }
    } catch (error) {
        console.warn("[AUTH] Optional token notice:", error.message);
    }
    next();
};

export default verifyToken;