
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chats.js";
import uploadRoutes from "./routes/uploads.js";
import generationRoutes from "./routes/generation.js";
import { requireAuth } from "./middleware/auth.js";
import pool from "./db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);

// Allow both local and LAN frontend access
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
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked origin: " + origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json({ limit: "2mb" }));

app.use("/uploads", express.static(path.resolve("uploads")));

app.use(
  "/api/",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({
      status: "error",
      database: "disconnected"
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/chats", requireAuth, chatRoutes);
app.use("/api/uploads", requireAuth, uploadRoutes);
app.use("/api/generation", requireAuth, generationRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);

  const status =
    err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);

  res.status(status).json({
    error: status === 500 ? (err.message || "Server error.") : err.message
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Radar Bot API listening on port ${port}`);
});
