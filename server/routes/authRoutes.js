import express from "express";
import { body, validationResult } from "express-validator";
import { rateLimit } from "express-rate-limit";
import {
  register,
  login,
  session,
  logout,
  forgotPassword,
  resetPassword,
  magicLink,
  verifyMagicLink,
  verifyEmail
} from "../controllers/authController.js";

const router = express.Router();

// Strict rate limiter for authentication endpoints (e.g., 5 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: (parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5, // 5 requests per window
  message: { error: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to handle validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

router.get("/session", session);

router.post(
  "/register",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
    body("name").optional().isString().trim().escape(),
  ],
  validateRequest,
  register
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  login
);

router.post("/logout", logout);

router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail().withMessage("Valid email is required").normalizeEmail()],
  validateRequest,
  forgotPassword
);

router.post(
  "/reset-password",
  authLimiter,
  [
    body("token").notEmpty().withMessage("Token is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters long"),
  ],
  validateRequest,
  resetPassword
);

router.post(
  "/magic-link",
  authLimiter,
  [body("email").isEmail().withMessage("Valid email is required").normalizeEmail()],
  validateRequest,
  magicLink
);

router.get("/magic-link/verify", verifyMagicLink);
router.get("/verify-email", verifyEmail);

export default router;
