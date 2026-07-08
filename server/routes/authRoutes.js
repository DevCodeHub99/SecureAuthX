import express from 'express';
import { body, validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../middlewares/requireAuth.js';
import {
  register,
  login,
  session,
  logout,
  forgotPassword,
  resetPassword,
  magicLink,
  verifyMagicLink,
  verifyEmail,
  handleAuthRequest,
  updatePassword,
  resetPasswordWithOtp,
} from '../controllers/authController.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Rate limiter — strict limit on sensitive auth endpoints to prevent brute-force
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: (parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------------------------------------------------------------------------
// Validation middleware — returns the first validation error as JSON
// ---------------------------------------------------------------------------
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------
router.get('/session', session);

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('name').optional().isString().trim().isLength({ max: 100 }).escape(),
  ],
  validateRequest,
  register,
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  login,
);

router.post('/logout', logout);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validateRequest,
  forgotPassword,
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  ],
  validateRequest,
  resetPassword,
);

router.post(
  '/magic-link',
  authLimiter,
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validateRequest,
  magicLink,
);

router.get('/magic-link/verify', verifyMagicLink);
router.get('/verify-email', verifyEmail);

// ---------------------------------------------------------------------------
// Reset via OTP (forgot-password alternative flow)
// ---------------------------------------------------------------------------
router.post(
  '/reset-password-otp',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('code').notEmpty().withMessage('Verification code is required')
      .isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  ],
  validateRequest,
  resetPasswordWithOtp,
);

// ---------------------------------------------------------------------------
// Authenticated routes (require valid session)
// ---------------------------------------------------------------------------
router.post(
  '/password/update',
  requireAuth,
  [
    body('password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  ],
  validateRequest,
  updatePassword,
);

// ---------------------------------------------------------------------------
// Catch-all routes — handled by auth.handleRequest() (MFA, WebAuthn, OAuth, OTP, Profile)
// ---------------------------------------------------------------------------
router.use('/mfa', handleAuthRequest);
router.use('/webauthn', handleAuthRequest);
router.use('/oauth', handleAuthRequest);
router.use('/callback', handleAuthRequest);
router.use('/otp', handleAuthRequest);
router.use('/profile', handleAuthRequest);

export default router;
