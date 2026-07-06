import { createAuth, hashPassword, verifyPassword } from '@custom-auth/core';
import { MongooseAdapter } from '@custom-auth/mongoose';
import { SmtpEmailAdapter } from '@custom-auth/adapter-nodemailer';

function normalizeCredentialID(id) {
  try {
    const decoded = Buffer.from(id, 'base64url').toString('utf8');
    if (/^[A-Za-z0-9_-]+$/.test(decoded)) {
      return decoded;
    }
  } catch (e) {}
  return id;
}

class WrappedMongooseAdapter extends MongooseAdapter {
  async createAuthenticator(data) {
    const credentialID = normalizeCredentialID(data.credentialID);
    await this.authenticatorModel.create({
      credentialID,
      credentialPublicKey: data.credentialPublicKey,
      counter: data.counter,
      transports: data.transports,
      userId: data.userId,
      credentialDeviceType: data.credentialDeviceType,
      credentialBackedUp: data.credentialBackedUp
    });
  }

  async getAuthenticatorById(credentialID) {
    const normId = normalizeCredentialID(credentialID);
    const record = await this.authenticatorModel.findOne({
      $or: [{ credentialID: normId }, { credentialID }]
    });
    if (!record) return null;
    return {
      credentialID: record.credentialID,
      credentialPublicKey: record.credentialPublicKey,
      counter: record.counter,
      transports: record.transports,
      userId: record.userId.toString(),
      credentialDeviceType: record.credentialDeviceType,
      credentialBackedUp: record.credentialBackedUp
    };
  }

  async listAuthenticatorsByUserId(userId) {
    const records = await this.authenticatorModel.find({ userId });
    return records.map((record) => ({
      credentialID: record.credentialID,
      credentialPublicKey: record.credentialPublicKey,
      counter: record.counter,
      transports: record.transports,
      userId: record.userId.toString(),
      credentialDeviceType: record.credentialDeviceType,
      credentialBackedUp: record.credentialBackedUp
    }));
  }
}

export const auth = createAuth({
  secret: process.env.JWT_SECRET,
  adapter: new WrappedMongooseAdapter(),
  emailAdapter: new SmtpEmailAdapter({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.EMAIL_FROM,
  }),
  emailVerification: true,
  verifyEmailUrl: `${process.env.CLIENT_URL}/verify-email`,
  resetPasswordUrl: `${process.env.CLIENT_URL}/reset-password`,
  providers: [
    {
      id: 'google',
      name: 'Google',
      type: 'oauth',
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder_google_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder_google_secret',
    },
    {
      id: 'github',
      name: 'GitHub',
      type: 'oauth',
      clientId: process.env.GITHUB_CLIENT_ID || 'placeholder_github_id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'placeholder_github_secret',
    },
  ],
  webauthn: {
    rpName: 'SecureAuthX',
    rpID: new URL(process.env.CLIENT_URL || 'http://localhost:5173').hostname,
    origin: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, ""),
  },
});

const originalVerifyLogin = auth.flows.verifyLogin.bind(auth.flows);
auth.flows.verifyLogin = async function (response, challenge) {
  const dbToken = this.adapter("getVerificationToken");
  const tokenRecord = await dbToken.getVerificationToken(challenge, "webauthn-challenge");
  
  // Execute standard core verification first
  const result = await originalVerifyLogin(response, challenge);
  
  // Verify that the authenticated passkey user matches the email used to generate options
  if (tokenRecord && tokenRecord.email && result.user.email.toLowerCase().trim() !== tokenRecord.email.toLowerCase().trim()) {
    throw new Error(`This passkey belongs to a different user (${result.user.email}). Please enter the correct email to sign in.`);
  }
  
  return result;
};

const originalSetupMfa = auth.flows.setupMfa.bind(auth.flows);
auth.flows.setupMfa = async function (userId) {
  const result = await originalSetupMfa(userId);
  
  const dbUser = this.adapter("getUserById");
  const user = await dbUser.getUserById(userId);
  if (!user) return result;
  
  // URL-encode the label and issuer parameters to strictly comply with Authenticator app URI specs
  const issuer = "SecureAuthX";
  const label = `${issuer}:${user.email}`;
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${result.secret}&issuer=${encodeURIComponent(issuer)}`;
  
  const qrcodeLib = await import("qrcode");
  const qrCodeUrl = await qrcodeLib.default.toDataURL(otpauthUrl);
  
  return {
    secret: result.secret,
    qrCodeUrl,
    otpauthUrl
  };
};

// Centralized helper to build cookie settings defensively for production environments
const getCookieOptions = (req) => {
  const isProd = process.env.NODE_ENV === "production" || req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "strict",
    maxAge: (parseInt(process.env.COOKIE_MAX_AGE_DAYS) || 7) * 24 * 60 * 60 * 1000
  };
};

// Session refresh endpoint
export const session = async (req, res) => {
  try {
    const token = req.cookies?.['auth-token'] || req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ error: "No session" });

    const payload = await auth.sessionManager.verifyToken(token);
    if (!payload || !payload.sub) return res.status(401).json({ error: "Invalid session" });

    const dbAdapter = auth.config.adapter;
    const dbUser = await dbAdapter.getUserById(payload.sub);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      mfaEnabled: dbUser.mfaEnabled
    };

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: "Invalid session" });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const { user } = await auth.flows.register(normalizedEmail, password, name);
    // Do not set a session cookie here; the user must verify their email first.
    res.status(201).json({ message: "Registered! Please check your email to verify your account.", user });
  } catch (error) {
    res.status(400).json({ error: error.message || "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const result = await auth.flows.login(normalizedEmail, password);
    if (result.mfaRequired) {
      return res.status(200).json(result);
    }
    const { user, token } = result;
    const cookieOptions = getCookieOptions(req);
    res.cookie("auth-token", token, cookieOptions);
    res.status(200).json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message || "Login failed" });
  }
};

export const logout = async (req, res) => {
  try {
    const cookieOptions = getCookieOptions(req);
    delete cookieOptions.maxAge; // Clearing options don't require maxAge
    res.clearCookie("auth-token", cookieOptions);
    res.status(200).json({ message: "Logged Out" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    await auth.flows.requestPasswordReset(normalizedEmail, `${process.env.CLIENT_URL}/reset-password`);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    await auth.flows.resetPassword(token, normalizedEmail, password);
    
    // Auto-login after password reset
    const { user, token: sessionToken } = await auth.flows.login(normalizedEmail, password);
    const cookieOptions = getCookieOptions(req);
    res.cookie("auth-token", sessionToken, cookieOptions);
    
    res.status(200).json({ message: "Password updated successfully", user, token: sessionToken });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const magicLink = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    await auth.flows.requestMagicLink(normalizedEmail, `${process.env.CLIENT_URL}/magic-link`);
    res.status(200).json({ message: "Magic link sent" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const verifyMagicLink = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ error: "Missing token or email" });
    
    const normalizedEmail = decodeURIComponent(email).toLowerCase().trim();
    const result = await auth.flows.verifyMagicLink(token, normalizedEmail);
    const { user, token: sessionToken } = result;
    
    const cookieOptions = getCookieOptions(req);
    res.cookie("auth-token", sessionToken, cookieOptions);
    res.status(200).json({ user, token: sessionToken });
  } catch (error) {
    res.status(400).json({ error: error.message || "Invalid or expired magic link" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ error: "Missing token or email" });
    
    const normalizedEmail = decodeURIComponent(email).toLowerCase().trim();
    const result = await auth.flows.verifyEmail(token, normalizedEmail);
    
    // Auto-login the user after verifying their email
    const sessionToken = result.token || await auth.sessionManager.createToken(result.user);
    const cookieOptions = getCookieOptions(req);
    res.cookie("auth-token", sessionToken, cookieOptions);
    
    res.status(200).json({ user: result.user, token: sessionToken });
  } catch (error) {
    console.error("[verifyEmail Error]:", error);
    res.status(400).json({ error: error.message || "Invalid verification link" });
  }
};

export const handleAuthRequest = async (req, res) => {
  try {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const url = `${protocol}://${req.headers.host}${req.originalUrl}`;

    // Map headers and inject Authorization Bearer token from query/cookies fallback if missing
    const reqHeaders = new Headers(req.headers);
    const token = req.cookies?.['auth-token'] || req.headers.authorization?.split(" ")[1] || req.query.token;
    if (token && !reqHeaders.has("authorization")) {
      reqHeaders.set("authorization", `Bearer ${token}`);
    }

    const requestOptions = {
      method: req.method,
      headers: reqHeaders,
    };

    if (!['GET', 'HEAD'].includes(req.method)) {
      requestOptions.body = JSON.stringify(req.body);
    }

    const webReq = new Request(url, requestOptions);
    console.log(`[handleAuthRequest] Mapping request: ${req.method} ${req.originalUrl}`);
    console.log(`[handleAuthRequest] Headers:`, req.headers);
    console.log(`[handleAuthRequest] Body:`, req.body);
    
    const webRes = await auth.handleRequest(webReq);

    res.status(webRes.status);
    webRes.headers.forEach((v, k) => {
      res.append(k, v);
    });

    const text = await webRes.text();
    res.send(text);
  } catch (error) {
    console.error("[handleAuthRequest Error]:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long" });
    }
    
    const dbAdapter = auth.config.adapter;
    const userEmail = req.user.email;
    const user = await dbAdapter.getUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // If the user already has a password set, they MUST verify their current password
    if (user.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required to change your password." });
      }
      
      const isMatch = await verifyPassword(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect." });
      }
      
      if (currentPassword === password) {
        return res.status(400).json({ error: "New password cannot be the same as your current password." });
      }
    }
    
    const passwordHash = await hashPassword(password);
    await dbAdapter.updateUser(userEmail, { passwordHash });
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to update password" });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }
    
    const dbAdapter = auth.config.adapter;
    
    // Verify the OTP code against MongoDB
    const tokenRecord = await dbAdapter.getVerificationToken(code, "email-otp");
    if (!tokenRecord || tokenRecord.email.toLowerCase().trim() !== normalizedEmail || tokenRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }
    
    // Code is valid! Delete the verification token from database to prevent replay attacks
    await dbAdapter.deleteVerificationToken(code, "email-otp");
    
    // Hash the password and save to user
    const passwordHash = await hashPassword(password);
    await dbAdapter.updateUser(normalizedEmail, { passwordHash });
    
    // Log the user in and return the session token
    const result = await auth.flows.login(normalizedEmail, password);
    const { user, token } = result;
    
    const cookieOptions = getCookieOptions(req);
    res.cookie("auth-token", token, cookieOptions);
    
    res.status(200).json({ message: "Password reset successfully! Logging you in...", user, token });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to reset password." });
  }
};
