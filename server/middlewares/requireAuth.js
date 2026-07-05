import { auth } from "../controllers/authController.js";

export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.['auth-token'] || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized: No token provided" });

    const payload = await auth.sessionManager.verifyToken(token);
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'user',
      name: payload.name,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized: Invalid session" });
  }
};
