import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import authRoutes from "./routes/authRoutes.js";
import { checkOrigin } from "./middlewares/checkOrigin.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import morgan from "morgan";
import { requireAuth } from "./middlewares/requireAuth.js";
import { requirePermission } from "./middlewares/requirePermission.js";

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("[DB] MongoDB connected"))
  .catch((error) => {
    console.error("[DB] Connection failed:", error.message);
    process.exit(1);
  });

const app = express();

// ---------------------------------------------------------------------------
// Request logging (dev-friendly format in dev, combined in prod)
// ---------------------------------------------------------------------------
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ---------------------------------------------------------------------------
// Trust first proxy — required for Render/Railway/Heroku/Vercel to correctly
// extract the client's real IP for rate limiting and secure cookie detection.
// ---------------------------------------------------------------------------
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// Security headers — Helmet with a configured CSP
// ---------------------------------------------------------------------------
const clientOrigin = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", clientOrigin],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Keep false for OAuth popup flows
  }),
);

// ---------------------------------------------------------------------------
// Global rate limiter — 100 req / 15 min per IP for all routes
// ---------------------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: (parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Never rate-limit health checks
    return req.path === "/health";
  },
});
app.use(globalLimiter);

// ---------------------------------------------------------------------------
// CORS — credentials require an explicit origin (not *)
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// ---------------------------------------------------------------------------
// Body parsing + NoSQL injection prevention + Cookie parsing
// Order: json → sanitize → cookieParser (sanitize runs BEFORE cookie reads)
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "10kb" })); // Limit body size to prevent DoS
app.use(mongoSanitize());
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Health check (before auth routes — no rate limiting needed)
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ---------------------------------------------------------------------------
// Auth routes — behind checkOrigin (CSRF) middleware
// ---------------------------------------------------------------------------
app.use("/api/auth", checkOrigin, authRoutes);

// ---------------------------------------------------------------------------
// Protected demo routes — demonstrate RBAC
// ---------------------------------------------------------------------------
app.get("/api/protected", requireAuth, (req, res) => {
  res.json({
    message: "Access granted to secure route.",
    user: req.user,
  });
});

app.get(
  "/api/admin-data",
  requireAuth,
  requirePermission("settings:write"),
  (req, res) => {
    res.json({ message: "Admin permission verified.", user: req.user });
  },
);

// ---------------------------------------------------------------------------
// JSON 404 fallback — catches all undefined routes
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found." });
});

// ---------------------------------------------------------------------------
// Global error handler — must be last (4-arg signature)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Server startup — supports both Vercel serverless and traditional Node.js
// hosts (e.g. Render, Railway, Heroku, self-hosted VPS).
//
// On Vercel: the file is imported as a serverless function; the listen() call
// is skipped. On all other hosts NODE_ENV may be 'production', so we check
// for the VERCEL env variable instead.
// ---------------------------------------------------------------------------
const isVercel = process.env.VERCEL === "1";
if (!isVercel) {
  const PORT = parseInt(process.env.PORT) || 5001;
  const server = app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT} (NODE_ENV=${process.env.NODE_ENV ?? "development"})`);
  });

  // Graceful shutdown — allows in-flight requests to complete
  const gracefulShutdown = (signal) => {
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log("[Server] HTTP server closed.");
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log("[DB] MongoDB connection closed.");
      }
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error("[Server] Forced shutdown after timeout.");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught errors — log but don't crash (let the request fail gracefully)
  process.on("uncaughtException", (err) => {
    console.error("[Uncaught Exception]", err.message);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[Unhandled Rejection]", reason);
  });
}

export default app;
