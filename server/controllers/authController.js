import {
  createAuth,
  hashPassword,
  AuthError,
  InvalidCredentialsError,
  UserExistsError,
  UserNotFoundError,
  MfaRequiredError,
  MfaInvalidError,
  TokenExpiredError,
  TokenInvalidError,
  EmailNotVerifiedError,
  PasswordTooShortError,
  OAuthError,
} from '@custom-auth/core';
import { MongooseAdapter } from '@custom-auth/mongoose';
import { SmtpEmailAdapter } from '@custom-auth/adapter-nodemailer';
import mongoose, { Schema } from 'mongoose';

// ---------------------------------------------------------------------------
// CustomSessionModel — registers custom schema fields for IP & User-Agent metadata
// ---------------------------------------------------------------------------
const CustomSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    expiresAt: { type: Date, required: true },
    ipAddress: { type: String, default: 'Unknown IP' },
    userAgent: { type: String, default: 'Authorized Device' },
  },
  { timestamps: true }
);

CustomSessionSchema.index({ userId: 1 });
CustomSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CustomSessionModel = mongoose.models["Session"] || mongoose.model("Session", CustomSessionSchema);

// ---------------------------------------------------------------------------
// WrappedMongooseAdapter — normalizes WebAuthn base64url credential IDs to
// prevent duplicate-credential issues from encoding variations across browsers.
// ---------------------------------------------------------------------------
function normalizeCredentialID(id) {
  if (!id) return id;
  try {
    const decoded = Buffer.from(id, 'base64url').toString('utf8');
    if (/^[A-Za-z0-9_-]+$/.test(decoded)) return decoded;
  } catch (_) {}
  return id;
}

class WrappedMongooseAdapter extends MongooseAdapter {
  async createAuthenticator(data) {
    const credentialID = normalizeCredentialID(data.credentialID);
    return super.createAuthenticator({ ...data, credentialID });
  }

  async getAuthenticatorById(credentialID) {
    const normId = normalizeCredentialID(credentialID);
    // Try normalized first, then raw — handles encoding drift between registrations
    const record = (await super.getAuthenticatorById(normId))
      ?? (await super.getAuthenticatorById(credentialID));
    return record ?? null;
  }
}

// ---------------------------------------------------------------------------
// Startup guard — fail fast with clear error if JWT_SECRET is too short.
// v1.0.17 core enforces ≥32 chars in production but we check at module load.
// ---------------------------------------------------------------------------
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SecureAuthX] FATAL: JWT_SECRET must be at least 32 characters in production.');
    process.exit(1);
  } else {
    console.warn('[SecureAuthX] WARNING: JWT_SECRET is too short. Use a secure random string of ≥32 chars in production.');
  }
}

// ---------------------------------------------------------------------------
// createAuth — single instance shared across all request handlers.
// ---------------------------------------------------------------------------
export const auth = createAuth({
  secret: process.env.JWT_SECRET || 'temporary_development_fallback_secret_at_least_32_characters_long',
  session: {
    expiresIn: `${(parseInt(process.env.COOKIE_MAX_AGE_DAYS) || 7) * 24}h`,
  },
  adapter: new WrappedMongooseAdapter({ SessionModel: CustomSessionModel }),
  emailAdapter: new SmtpEmailAdapter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.EMAIL_FROM || 'SecureAuthX <no-reply@example.com>',
  }),
  emailVerification: true,
  verifyEmailUrl: `${process.env.CLIENT_URL}/verify-email`,
  resetPasswordUrl: `${process.env.CLIENT_URL}/reset-password`,
  bcrypt: { rounds: 12 }, // OWASP recommended: 12 rounds in production
  // v1.0.17: built-in CSRF protection with allowed origins
  csrf: {
    allowedOrigins: [
      (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ''),
      // Allow localhost variants in development for API testing
      ...(process.env.NODE_ENV !== 'production'
        ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
        : []),
    ],
  },
  providers: [
    {
      id: 'google',
      name: 'Google',
      type: 'oauth',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    {
      id: 'github',
      name: 'GitHub',
      type: 'oauth',
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
  ],
  webauthn: {
    rpName: 'SecureAuthX',
    rpID: new URL(process.env.CLIENT_URL || 'http://localhost:5173').hostname,
    origin: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  },
  // Lifecycle hooks — structured audit log on every auth event
  hooks: {
    onSuccess: (event) => {
      console.info(
        `[Auth:OK] event=${event.event} userId=${event.userId ?? '-'} email=${event.email ?? '-'} ts=${event.timestamp.toISOString()}`,
      );
    },
    onError: (event) => {
      // Do not log the full error message (may contain sensitive input)
      console.warn(
        `[Auth:FAIL] event=${event.event} email=${event.email ?? '-'} code=${event.error.code ?? 'UNKNOWN'} ts=${event.timestamp.toISOString()}`,
      );
    },
  },
});

// ---------------------------------------------------------------------------
// mapAuthError — maps @custom-auth/core error subclasses → HTTP status + message.
// Keeps all catch blocks DRY. Returns { status, message }.
// ---------------------------------------------------------------------------
function mapAuthError(error) {
  // Log the error for server-side troubleshooting / Vercel logging
  console.error('[mapAuthError] Caught auth error:', error);

  if (error instanceof InvalidCredentialsError) return { status: 401, message: error.message };
  if (error instanceof UserExistsError)         return { status: 409, message: error.message };
  if (error instanceof UserNotFoundError)        return { status: 404, message: error.message };
  if (error instanceof MfaRequiredError)         return { status: 200, message: error.message };
  if (error instanceof MfaInvalidError)          return { status: 400, message: error.message };
  if (error instanceof TokenExpiredError)        return { status: 401, message: error.message };
  if (error instanceof TokenInvalidError)        return { status: 401, message: error.message };
  if (error instanceof EmailNotVerifiedError)    return { status: 403, message: error.message };
  if (error instanceof PasswordTooShortError)    return { status: 400, message: error.message };
  if (error instanceof OAuthError)               return { status: 400, message: error.message };
  if (error instanceof AuthError)                return { status: error.statusCode || 400, message: error.message };
  // Generic fallback — never expose raw error details in production
  return {
    status: 500,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (error.message ?? 'Unknown error'),
  };
}

// ---------------------------------------------------------------------------
// getCookieOptions — builds httpOnly cookie options, auto-detecting secure context.
// ---------------------------------------------------------------------------
const getCookieOptions = (req) => {
  const isProd = process.env.NODE_ENV === 'production'
    || req.secure
    || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    path: '/',
    maxAge: (parseInt(process.env.COOKIE_MAX_AGE_DAYS) || 7) * 24 * 60 * 60 * 1000,
  };
};

// ---------------------------------------------------------------------------
// updateSessionMeta — updates the newly created session with IP & User-Agent metadata
// ---------------------------------------------------------------------------
const updateSessionMeta = async (req, token) => {
  try {
    if (!token) return;
    const payload = await auth.sessionManager.verifyToken(token);
    if (payload?.jti) {
      const rawUserAgent = req.headers['user-agent'] || '';
      let deviceName = 'Authorized Device';
      
      if (/windows/i.test(rawUserAgent)) deviceName = 'Windows PC';
      else if (/macintosh/i.test(rawUserAgent)) deviceName = 'Mac';
      else if (/iphone/i.test(rawUserAgent)) deviceName = 'iPhone';
      else if (/ipad/i.test(rawUserAgent)) deviceName = 'iPad';
      else if (/android/i.test(rawUserAgent)) deviceName = 'Android Device';
      else if (/linux/i.test(rawUserAgent)) deviceName = 'Linux Device';

      let browserName = '';
      if (/chrome|crios/i.test(rawUserAgent) && !/edge|edg/i.test(rawUserAgent)) browserName = 'Chrome';
      else if (/safari/i.test(rawUserAgent) && !/chrome|crios/i.test(rawUserAgent)) browserName = 'Safari';
      else if (/firefox|fxios/i.test(rawUserAgent)) browserName = 'Firefox';
      else if (/edge|edg/i.test(rawUserAgent)) browserName = 'Edge';
      else if (/opera|opr/i.test(rawUserAgent)) browserName = 'Opera';

      const userAgentLabel = browserName ? `${deviceName} (${browserName})` : deviceName;

      const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const ipAddress = rawIp.split(',')[0].trim().replace(/^.*:/, ''); 

      await auth.config.adapter.sessionModel.findByIdAndUpdate(payload.jti, {
        userAgent: userAgentLabel,
        ipAddress: ipAddress || '127.0.0.1',
      });
    }
  } catch (error) {
    console.error('[updateSessionMeta] Failed to update session metadata:', error.message);
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/session — returns current authenticated user (fresh DB data)
// ---------------------------------------------------------------------------
export const session = async (req, res) => {
  try {
    const token = req.cookies?.['auth-token']
      || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'No session' });

    const payload = await auth.sessionManager.verifyToken(token);
    if (!payload?.sub) return res.status(401).json({ error: 'Invalid session' });

    // Always fetch fresh user data — never rely on stale JWT claims
    const dbUser = await auth.config.adapter.getUserById(payload.sub);
    if (!dbUser) return res.status(401).json({ error: 'User not found' });

    return res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name ?? null,
        role: dbUser.role,
        mfaEnabled: dbUser.mfaEnabled ?? false,
        emailVerified: dbUser.emailVerified ?? false,
      },
    });
  } catch {
    return res.status(401).json({ error: 'Invalid session' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const { user } = await auth.flows.register(normalizedEmail, password, name?.trim() ?? undefined);
    // No session cookie — user must verify email first (emailVerification: true)
    return res.status(201).json({
      message: 'Account created! Please check your email to verify your account before signing in.',
      user: { id: user.id, email: user.email, name: user.name ?? null },
    });
  } catch (error) {
    const { status, message } = mapAuthError(error);
    return res.status(status).json({ error: message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const result = await auth.flows.login(normalizedEmail, password);

    // MFA required — return tempToken so client can present the 2FA challenge
    if (result.mfaRequired) {
      return res.status(200).json({ mfaRequired: true, tempToken: result.tempToken });
    }

    const { user, token } = result;
    res.cookie('auth-token', token, getCookieOptions(req));
    await updateSessionMeta(req, token);
    return res.status(200).json({ user, token });
  } catch (error) {
    const { status, message } = mapAuthError(error);
    return res.status(status).json({ error: message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
export const logout = async (req, res) => {
  try {
    // Delete the server-side DB session (revocation) before clearing the cookie
    const token = req.cookies?.['auth-token']
      || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const payload = await auth.sessionManager.verifyToken(token);
        if (payload?.jti && auth.config.adapter.deleteSession) {
          await auth.config.adapter.deleteSession(payload.jti);
        }
      } catch {
        // Token may already be expired — still clear the cookie
      }
    }

    // Must preserve secure/sameSite when clearing — browsers reject mismatched attributes
    const opts = { ...getCookieOptions(req) };
    delete opts.maxAge;
    res.clearCookie('auth-token', opts);
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Logout failed.' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// Anti-enumeration: ALWAYS returns 200, regardless of whether the email exists.
// ---------------------------------------------------------------------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const normalizedEmail = email.toLowerCase().trim();
    await auth.flows.requestPasswordReset(normalizedEmail, `${process.env.CLIENT_URL}/reset-password`);
  } catch {
    // Intentionally swallow all errors — never expose whether the email exists
  }
  // Always 200 to prevent user enumeration
  return res.status(200).json({
    message: 'If that email address is registered, a password reset link has been sent.',
  });
};

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password (via email link token)
// ---------------------------------------------------------------------------
export const resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) {
      return res.status(400).json({ error: 'token, email, and password are required.' });
    }
    const normalizedEmail = email.toLowerCase().trim();
    await auth.flows.resetPassword(token, normalizedEmail, password);

    // Auto-login after successful password reset
    const loginResult = await auth.flows.login(normalizedEmail, password);
    if (loginResult.mfaRequired) {
      return res.status(200).json({
        message: 'Password updated. Please complete 2FA to sign in.',
        mfaRequired: true,
        tempToken: loginResult.tempToken,
      });
    }

    const { user, token: sessionToken } = loginResult;
    res.cookie('auth-token', sessionToken, getCookieOptions(req));
    await updateSessionMeta(req, sessionToken);
    return res.status(200).json({ message: 'Password updated successfully.', user, token: sessionToken });
  } catch (error) {
    const { status, message } = mapAuthError(error);
    return res.status(status).json({ error: message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/magic-link — send passwordless login email
// Client can supply a custom callbackUrl; falls back to server default.
// ---------------------------------------------------------------------------
export const magicLink = async (req, res) => {
  try {
    const { email, callbackUrl } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const normalizedEmail = email.toLowerCase().trim();
    // Respect the client-supplied callbackUrl (validated against allowed origin below)
    const resolvedCallback = callbackUrl
      ? String(callbackUrl).replace(/\/+$/, '')
      : `${process.env.CLIENT_URL}/magic-link`;
    // Security: ensure callbackUrl points to the allowed client origin
    const allowedOrigin = (process.env.CLIENT_URL || '').replace(/\/+$/, '');
    if (allowedOrigin && !resolvedCallback.startsWith(allowedOrigin)) {
      return res.status(400).json({ error: 'Invalid callback URL.' });
    }
    await auth.flows.requestMagicLink(normalizedEmail, resolvedCallback);
  } catch {
    // Swallow errors to prevent user enumeration
  }
  return res.status(200).json({ message: 'If that email is registered, a magic link has been sent.' });
};

// ---------------------------------------------------------------------------
// GET /api/auth/magic-link/verify
// ---------------------------------------------------------------------------
export const verifyMagicLink = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ error: 'Missing token or email.' });

    const normalizedEmail = decodeURIComponent(String(email)).toLowerCase().trim();
    const { user, token: sessionToken } = await auth.flows.verifyMagicLink(String(token), normalizedEmail);

    res.cookie('auth-token', sessionToken, getCookieOptions(req));
    await updateSessionMeta(req, sessionToken);
    return res.status(200).json({ user, token: sessionToken });
  } catch (error) {
    const { status, message } = mapAuthError(error);
    return res.status(status).json({ error: message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/verify-email
// ---------------------------------------------------------------------------
export const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ error: 'Missing token or email.' });

    const normalizedEmail = decodeURIComponent(String(email)).toLowerCase().trim();
    // verifyEmail returns { user } only — no token (per v1.0.17 API)
    const { user } = await auth.flows.verifyEmail(String(token), normalizedEmail);

    // Issue a session token so the user is auto-logged-in after verifying
    const sessionToken = await auth.sessionManager.createToken(user);
    res.cookie('auth-token', sessionToken, getCookieOptions(req));
    await updateSessionMeta(req, sessionToken);
    return res.status(200).json({ user, token: sessionToken });
  } catch (error) {
    const { status, message } = mapAuthError(error);
    return res.status(status).json({ error: message });
  }
};

// ---------------------------------------------------------------------------
// Catch-all handler — proxies MFA, WebAuthn, OAuth, OTP routes through the
// core auth.handleRequest() Web Fetch API adapter.
// ---------------------------------------------------------------------------
export const handleAuthRequest = async (req, res) => {
  try {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const url = `${protocol}://${req.headers.host}${req.originalUrl}`;

    const reqHeaders = new Headers();
    // Allowlist — only forward safe, non-sensitive headers
    const ALLOWED_HEADERS = new Set(['host', 'content-type', 'origin', 'cookie', 'accept', 'accept-language']);
    for (const [key, value] of Object.entries(req.headers)) {
      if (ALLOWED_HEADERS.has(key.toLowerCase())) {
        reqHeaders.set(key.toLowerCase(), value);
      }
    }

    // Inject Authorization from cookie (preferred) or existing header — for MFA/WebAuthn flows
    const existingToken = req.cookies?.['auth-token']
      || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (existingToken) {
      reqHeaders.set('authorization', `Bearer ${existingToken}`);
    }

    const requestOptions = { method: req.method, headers: reqHeaders };
    if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
      requestOptions.body = JSON.stringify(req.body);
      if (!reqHeaders.has('content-type')) {
        reqHeaders.set('content-type', 'application/json');
      }
    }

    const webRes = await auth.handleRequest(new Request(url, requestOptions));

    res.status(webRes.status);
    // Forward headers except Set-Cookie which we handle via Express cookie API
    webRes.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.append(key, value);
      }
    });

    const text = await webRes.text();
    if (webRes.status === 200) {
      try {
        const data = JSON.parse(text);
        if (data && data.token) {
          await updateSessionMeta(req, data.token);
        }
      } catch (_) {}
    }
    return res.send(text);
  } catch (error) {
    console.error('[handleAuthRequest]', error.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/update-password (authenticated)
// v1.0.17: AuthFlows.updatePassword verifies current password, hashes new,
// and calls deleteSessionsByUserId to invalidate all other sessions.
// ---------------------------------------------------------------------------
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, password: newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from your current password.' });
    }

    await auth.flows.updatePassword(req.user.id, currentPassword, newPassword);

    // Issue a fresh token — old sessions were all invalidated by updatePassword
    const dbUser = await auth.config.adapter.getUserById(req.user.id);
    const newToken = await auth.sessionManager.createToken(dbUser);
    res.cookie('auth-token', newToken, getCookieOptions(req));
    await updateSessionMeta(req, newToken);

    return res.status(200).json({
      message: 'Password updated. All other sessions have been signed out for your security.',
      token: newToken,
    });
  } catch (error) {
    const { status, message } = mapAuthError(error);
    return res.status(status).json({ error: message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password-otp (forgot-password via OTP code)
// OTP proves email ownership → no current password needed.
// ---------------------------------------------------------------------------
export const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
      return res.status(400).json({ error: 'email, code, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const dbAdapter = auth.config.adapter;

    // Validate OTP: fetch the token record, check email match + expiry
    const tokenRecord = await dbAdapter.getVerificationToken(String(code), 'email-otp');
    if (
      !tokenRecord
      || tokenRecord.email.toLowerCase().trim() !== normalizedEmail
      || tokenRecord.expiresAt < new Date()
    ) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Consume token immediately to prevent replay attacks
    await dbAdapter.deleteVerificationToken(String(code), 'email-otp');

    // Hash and persist the new password (top-level import, no dynamic import)
    const newHash = await hashPassword(password, 12);
    await dbAdapter.updateUser(normalizedEmail, { passwordHash: newHash });

    // Invalidate all existing sessions for security
    const user = await dbAdapter.getUserByEmail(normalizedEmail);
    if (user && typeof dbAdapter.deleteSessionsByUserId === 'function') {
      await dbAdapter.deleteSessionsByUserId(user.id);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Issue a session token directly — skip login() to avoid EmailNotVerifiedError
    // edge case where user registered via OTP without completing email verification
    const sessionToken = await auth.sessionManager.createToken(user);
    res.cookie('auth-token', sessionToken, getCookieOptions(req));
    await updateSessionMeta(req, sessionToken);

    return res.status(200).json({
      message: 'Password reset successfully.',
      user: { id: user.id, email: user.email, name: user.name ?? null, role: user.role },
      token: sessionToken,
    });
  } catch (error) {
    const { status, message } = mapAuthError(error);
    return res.status(status).json({ error: message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/sessions (authenticated)
// Returns a list of active sessions for the logged-in user.
// ---------------------------------------------------------------------------
export const listSessions = async (req, res) => {
  try {
    const dbAdapter = auth.config.adapter;
    // Find all unexpired sessions for this user
    const sessions = await dbAdapter.sessionModel.find({
      userId: req.user.id,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      sessions: sessions.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        ipAddress: s.ipAddress || 'Unknown IP',
        userAgent: s.userAgent || 'Authorized Session',
        isCurrent: s.id === req.user.sessionId,
      })),
    });
  } catch (error) {
    console.error('[listSessions Error]:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve active sessions.' });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/auth/sessions/:id (authenticated)
// Revokes the specified session.
// ---------------------------------------------------------------------------
export const revokeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const dbAdapter = auth.config.adapter;

    // Verify session belongs to the requesting user before revoking
    const sessionRecord = await dbAdapter.getSession(id);
    if (!sessionRecord) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (String(sessionRecord.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: Cannot revoke other user\'s session.' });
    }

    await dbAdapter.deleteSession(id);
    return res.status(200).json({ message: 'Session revoked successfully.' });
  } catch (error) {
    console.error('[revokeSession Error]:', error.message);
    return res.status(500).json({ error: 'Failed to revoke session.' });
  }
};
