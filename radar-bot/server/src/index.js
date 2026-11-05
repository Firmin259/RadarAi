
import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chats.js";
import uploadRoutes from "./routes/uploads.js";
import generationRoutes from "./routes/generation.js";

import { requireAuth } from "./middleware/auth.js";
import pool from "./db.js";

const app = express();
const port = Number(process.env.PORT || 5000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.1.101:5173",

  ...(process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
];

app.use(helmet({
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error("CORS blocked origin: " + origin)
    );
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],

  credentials: true
}));

app.use(express.json({
  limit: "2mb"
}));

// Static uploaded files
const uploadsPath = path.resolve(__dirname, "../uploads");

app.use(
  "/uploads",
  express.static(uploadsPath)
);

// API rate limiting
app.use(
  "/api/",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected"
    });

  } catch (error) {
    console.error("Database health check:", error.message);

    res.status(503).json({
      status: "error",
      database: "disconnected"
    });
  }
});

// Authentication
// Mirror route to catch the frontend's hardcoded path
app.use("/auth", authRoutes);


// Protected routes
app.use("/api/chats", requireAuth, chatRoutes);

app.use("/api/uploads", requireAuth, uploadRoutes);

// Generation route is protected here.
// Do not add requireAuth again inside generation.js.
app.use("/api/generation", requireAuth, generationRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("SERVER ERROR:", err);

  const status =
    err.status ||
    (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);

  res.status(status).json({
    error: status === 500
      ? "An internal server error occurred."
      : err.message
  });
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`Radar Bot API listening on port ${port}`);
});
