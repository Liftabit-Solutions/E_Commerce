import "./src/config/env.js";
import http from "http";
import app from "./app.js";
import { initSocket, getIO, RUNTIME_INSTANCE_ID } from "./src/socket/index.js";

const PORT = process.env.PORT || 5002;

const httpServer = http.createServer(app);
initSocket(httpServer);

if (!process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with Socket.IO enabled (instance=${RUNTIME_INSTANCE_ID}) 🚀`);
  });
}

export default app;

