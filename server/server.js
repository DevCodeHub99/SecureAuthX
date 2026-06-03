import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const app = express();

// Security Headers (Helmet)
app.use(helmet());

// Global Rate Limiting (e.g., 100 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: (parseInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: parseInt(process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Enable CORS with specific origin and credentials
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
// Parse JSON request bodies
app.use(express.json());

// Parse cookies attached to the request
app.use(cookieParser());

// Mount authentication routes under the /api/auth path
app.use("/api/auth", authRoutes);

// Global Error Handler (prevents HTML stack traces from leaking)
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start the server and listen for incoming requests on the specified port
app.listen(process.env.PORT, () => {
  console.log(`Server is running on: localhost:${process.env.PORT}`);
});
