// src/app.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Redis } from "@upstash/redis";

import authRoutes from "./routes/auth";
import formRoutes from "./routes/forms";
import { setupSocketHandlers } from "./services/socketService";
import { errorHandler } from "./middleware/errorHandler";
import { authenticateToken } from "./middleware/auth";

const app = express();
const server = createServer(app);

// Socket.IO with proper configuration structure
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.FRONTEND_URL,
    ].filter((origin): origin is string => typeof origin === "string"),
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true, // Server-level option, not CORS option
  transports: ["websocket", "polling"],
});

// Upstash Redis setup
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Middleware
app.use(helmet());

// Express CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.FRONTEND_URL,
    ].filter((origin): origin is string => typeof origin === "string"),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const result = await redis.ping();
    res.json({
      status: "OK",
      redis: "Connected",
      ping: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: "Error",
      redis: "Disconnected",
      error: error.message,
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/forms", authenticateToken, formRoutes);

// Socket.IO setup
setupSocketHandlers(io);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const pingResult = await redis.ping();
    console.log("✅ Connected to Upstash Redis:", pingResult);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 Allowed CORS origins: localhost:3000, 127.0.0.1:3000`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export { io };
