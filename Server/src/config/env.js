import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Force IPv4 first for all Node outgoing HTTPS requests to prevent Windows IPv6 DNS connection timeouts
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // Ignore
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly resolve and load Server/.env regardless of current working directory
const serverEnvPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: serverEnvPath });
// Also load from current working directory as fallback
dotenv.config();

export default process.env;
