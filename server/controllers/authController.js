import { createAuth } from '@custom-auth/core';
import { MongooseAdapter } from '@custom-auth/mongoose';
import { SmtpEmailAdapter } from '@custom-auth/adapter-nodemailer';

export const auth = createAuth({
  secret: process.env.JWT_SECRET,
  adapter: new MongooseAdapter(),
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
});

// Session refresh endpoint
export const session = async (req, res) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No session" });

    const payload = await auth.sessionManager.verifyToken(token);
    if (!payload || !payload.sub) return res.status(401).json({ error: "Invalid session" });

    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role
    };

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: "Invalid session" });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const { user } = await auth.flows.register(email, password, name);
    // Do not set a session cookie here; the user must verify their email first.
    res.status(201).json({ message: "Registered! Please check your email to verify your account.", user });
  } catch (error) {
    res.status(400).json({ error: error.message || "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await auth.flows.login(email, password);
    if (result.mfaRequired) {
      return res.status(200).json(result);
    }
    const { user, token } = result;
    // Secure cookie setup with maxAge
    const cookieOptions = { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: (parseInt(process.env.COOKIE_MAX_AGE_DAYS) || 7) * 24 * 60 * 60 * 1000 
    };
    res.cookie("token", token, cookieOptions);
    res.status(200).json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message || "Login failed" });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "Logged Out" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    await auth.flows.requestPasswordReset(email, `${process.env.CLIENT_URL}/reset-password`);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;
    await auth.flows.resetPassword(token, email, password);
    
    // Auto-login after password reset
    const { user, token: sessionToken } = await auth.flows.login(email, password);
    const cookieOptions = { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: (parseInt(process.env.COOKIE_MAX_AGE_DAYS) || 7) * 24 * 60 * 60 * 1000 
    };
    res.cookie("token", sessionToken, cookieOptions);
    
    res.status(200).json({ message: "Password updated successfully", user, token: sessionToken });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const magicLink = async (req, res) => {
  try {
    const { email } = req.body;
    await auth.flows.requestMagicLink(email, `${process.env.CLIENT_URL}/magic-link`);
    res.status(200).json({ message: "Magic link sent" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const verifyMagicLink = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ error: "Missing token or email" });
    
    const result = await auth.flows.verifyMagicLink(token, decodeURIComponent(email));
    const { user, token: sessionToken } = result;
    
    const cookieOptions = { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: (parseInt(process.env.COOKIE_MAX_AGE_DAYS) || 7) * 24 * 60 * 60 * 1000 
    };
    res.cookie("token", sessionToken, cookieOptions);
    res.status(200).json({ user, token: sessionToken });
  } catch (error) {
    res.status(400).json({ error: error.message || "Invalid or expired magic link" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ error: "Missing token or email" });
    
    const result = await auth.flows.verifyEmail(token, decodeURIComponent(email));
    
    // Auto-login the user after verifying their email
    const sessionToken = result.token || await auth.sessionManager.createToken(result.user);
    const cookieOptions = { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: (parseInt(process.env.COOKIE_MAX_AGE_DAYS) || 7) * 24 * 60 * 60 * 1000 
    };
    res.cookie("token", sessionToken, cookieOptions);
    
    res.status(200).json({ user: result.user, token: sessionToken });
  } catch (error) {
    console.error("[verifyEmail Error]:", error);
    res.status(400).json({ error: error.message || "Invalid verification link" });
  }
};
