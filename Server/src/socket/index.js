import { Server } from "socket.io";
import { createAdapter } from "@socket.io/mongo-adapter";
import mongoose from "mongoose";
import { getAuth } from "firebase-admin/auth";
import { User } from "../models/User.js";

export const RUNTIME_INSTANCE_ID =
  "inst_" + Math.random().toString(36).substring(2, 8) + "_" + Date.now().toString(36);

let io = null;
let adapterAttached = false;

/**
 * Attach MongoDB change stream adapter for cross-instance event broadcasting
 */
export const attachMongoAdapter = async () => {
  if (adapterAttached || !io) return;
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const db = mongoose.connection.db;
      const collectionName = "socket.io-adapter-events";

      try {
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
          await db.createCollection(collectionName, {
            capped: true,
            size: 1e6, // 1MB
            max: 5000,
          });
        }
      } catch (collErr) {
        // Collection already exists
      }

      const mongoCollection = db.collection(collectionName);
      io.adapter(createAdapter(mongoCollection));
      adapterAttached = true;
      console.log(
        `[SOCKET ADAPTER] MongoDB adapter successfully attached on instance=${RUNTIME_INSTANCE_ID} pid=${process.pid}`
      );
    }
  } catch (err) {
    console.warn(`[SOCKET ADAPTER] Could not attach Mongo adapter:`, err.message);
  }
};

/**
 * Initialize Socket.IO with HTTP Server
 * @param {import("http").Server} httpServer
 */
export const initSocket = (httpServer) => {
  if (io) return io;

  console.log(
    `[SOCKET INIT] instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} timestamp=${new Date().toISOString()}`
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

  io = new Server(httpServer, {
    path: "/socket.io/",
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, "");
        if (
          cleanOrigin.startsWith("http://localhost:") ||
          cleanOrigin.startsWith("http://127.0.0.1:") ||
          allowedOrigins.includes(cleanOrigin)
        ) {
          return callback(null, cleanOrigin);
        }
        return callback(new Error("Socket CORS origin not allowed"), false);
      },
      credentials: true,
    },
    transports: ["polling", "websocket"],
    allowUpgrades: true,
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.engine.on("connection", (rawSocket) => {
    console.log(
      `[SOCKET ENGINE CONNECT] sid=${rawSocket.id} transport=${rawSocket.transport?.name} instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} timestamp=${new Date().toISOString()}`
    );

    rawSocket.on("upgrade", () => {
      console.log(
        `[SOCKET ENGINE UPGRADE] sid=${rawSocket.id} newTransport=${rawSocket.transport?.name} instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} timestamp=${new Date().toISOString()}`
      );
    });
  });

  // Authentication Middleware for connection
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization?.startsWith("Bearer ")
          ? socket.handshake.headers.authorization.split(" ")[1]
          : null);

      if (token) {
        try {
          const decoded = await getAuth().verifyIdToken(token);
          const user = await User.findOne({
            uid: decoded.uid,
            isDeleted: false,
          });

          if (user) {
            socket.user = user;
            socket.userId = user._id.toString();
            socket.uid = decoded.uid;
            socket.isAdmin = !!(user.isAdmin || user.role === "Admin");
          }
        } catch (authErr) {
          console.warn("[Socket.IO] Invalid/expired token during handshake, proceeding as guest:", authErr.message);
        }
      }

      next();
    } catch (err) {
      console.error("[Socket.IO] Middleware Error:", err);
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `[SOCKET CONNECT] sid=${socket.conn.id} socketId=${socket.id} transport=${socket.conn.transport?.name} instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} timestamp=${new Date().toISOString()}`
    );

    socket.conn.on("upgrade", (transport) => {
      console.log(
        `[SOCKET UPGRADE] sid=${socket.conn.id} socketId=${socket.id} transport=${transport?.name} instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} timestamp=${new Date().toISOString()}`
      );
    });

    // Join authenticated rooms
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      socket.join(`user:${socket.uid}`);
      console.log(
        `[SOCKET ROOM JOIN] socketId=${socket.id} room=user:${socket.userId} instance=${RUNTIME_INSTANCE_ID} pid=${process.pid}`
      );
    }

    if (socket.isAdmin) {
      socket.join("admin");
      console.log(
        `[SOCKET ROOM JOIN] socketId=${socket.id} room=admin instance=${RUNTIME_INSTANCE_ID} pid=${process.pid}`
      );
    }

    // Dynamic authentication listener
    socket.on("authenticate", async (data, callback) => {
      try {
        const token = data?.token;
        if (!token) {
          if (typeof callback === "function") callback({ success: false, message: "Token required" });
          return;
        }

        const decoded = await getAuth().verifyIdToken(token);
        const user = await User.findOne({
          uid: decoded.uid,
          isDeleted: false,
        });

        if (!user) {
          if (typeof callback === "function") callback({ success: false, message: "User not found" });
          return;
        }

        socket.user = user;
        socket.userId = user._id.toString();
        socket.uid = decoded.uid;
        socket.isAdmin = !!(user.isAdmin || user.role === "Admin");

        socket.join(`user:${socket.userId}`);
        socket.join(`user:${socket.uid}`);

        console.log(
          `[SOCKET AUTH SUCCESS] socketId=${socket.id} userId=${user._id} isAdmin=${socket.isAdmin} instance=${RUNTIME_INSTANCE_ID}`
        );

        if (socket.isAdmin) {
          socket.join("admin");
          console.log(`[SOCKET ROOM JOIN] socketId=${socket.id} room=admin instance=${RUNTIME_INSTANCE_ID}`);
        }

        if (typeof callback === "function") {
          callback({
            success: true,
            user: {
              id: user._id,
              email: user.email,
              isAdmin: socket.isAdmin,
            },
          });
        }
      } catch (err) {
        console.error("[Socket.IO] Authenticate event error:", err.message);
        if (typeof callback === "function") callback({ success: false, message: err.message });
      }
    });

    // Room subscription for product detail pages
    socket.on("join:product", (productId) => {
      if (productId) {
        socket.join(`product:${productId}`);
        console.log(`[SOCKET ROOM JOIN] socketId=${socket.id} room=product:${productId} instance=${RUNTIME_INSTANCE_ID}`);
      }
    });

    socket.on("leave:product", (productId) => {
      if (productId) {
        socket.leave(`product:${productId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `[SOCKET DISCONNECT] sid=${socket.conn.id} socketId=${socket.id} reason=${reason} instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} timestamp=${new Date().toISOString()}`
      );
    });
  });

  return io;
};

/**
 * Get Socket.IO instance
 * @returns {import("socket.io").Server}
 */
export const getIO = () => {
  return io;
};

/**
 * Broadcast event to all connected clients
 * @param {string} event
 * @param {any} data
 */
export const emitToAll = (event, data) => {
  const count = io?.sockets?.sockets?.size || 0;
  console.log(
    `[SOCKET EMIT] event=${event} room=ALL instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} localSocketsCount=${count} timestamp=${new Date().toISOString()}`
  );
  if (io) {
    io.emit(event, data);
  }
};

/**
 * Broadcast event to a specific room
 * @param {string} room
 * @param {string} event
 * @param {any} data
 */
export const emitToRoom = (room, event, data) => {
  const count = io?.sockets?.sockets?.size || 0;
  console.log(
    `[SOCKET EMIT] event=${event} room=${room} instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} localSocketsCount=${count} timestamp=${new Date().toISOString()}`
  );
  if (io) {
    io.to(room).emit(event, data);
  }
};

/**
 * Broadcast event to a specific user by database _id or Firebase uid
 * @param {string} userId
 * @param {string} event
 * @param {any} data
 */
export const emitToUser = (userId, event, data) => {
  const count = io?.sockets?.sockets?.size || 0;
  console.log(
    `[SOCKET EMIT] event=${event} room=user:${userId} instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} localSocketsCount=${count} timestamp=${new Date().toISOString()}`
  );
  if (io && userId) {
    io.to(`user:${userId.toString()}`).emit(event, data);
  }
};

/**
 * Broadcast event to admin room
 * @param {string} event
 * @param {any} data
 */
export const emitToAdmin = (event, data) => {
  const count = io?.sockets?.sockets?.size || 0;
  console.log(
    `[SOCKET EMIT] event=${event} room=admin instance=${RUNTIME_INSTANCE_ID} pid=${process.pid} localSocketsCount=${count} timestamp=${new Date().toISOString()}`
  );
  if (io) {
    io.to("admin").emit(event, data);
  }
};

