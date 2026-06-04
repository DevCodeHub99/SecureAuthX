import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import { checkOrigin } from "./middlewares/checkOrigin.js";
import { errorHandler } from "./middlewares/errorHandler.js";

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const app = express();

// Trust the first proxy (required for Render/Heroku to use express-rate-limit correctly)
app.set("trust proxy", 1);

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
app.use("/api/auth", checkOrigin, authRoutes);

// JSON 404 Fallback for undefined API routes
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint Not Found" });
});

// Global Error Handler (prevents HTML stack traces from leaking)
app.use(errorHandler);

// Start the server only if we aren't in Vercel's serverless production environment
if (process.env.NODE_ENV !== "production") {
  const server = app.listen(process.env.PORT || 5001, () => {
    console.log(`Server is running on: localhost:${process.env.PORT || 5001}`);
  });

  // Graceful Shutdown
  const gracefulShutdown = () => {
    console.log("Shutting down gracefully...");
    server.close(async () => {
      console.log("Closed out remaining HTTP connections.");
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
      }
      process.exit(0);
    });
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

// Export the app for Vercel Serverless Functions
export default app;
