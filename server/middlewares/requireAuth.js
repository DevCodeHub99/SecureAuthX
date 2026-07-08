import { auth } from '../controllers/authController.js';

/**
 * requireAuth middleware — verifies the JWT and attaches fresh user data from
 * the database to req.user. Using DB data (not JWT claims) ensures that role
 * changes, account disabling, and MFA status are always current without
 * requiring the user to re-log-in first.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.['auth-token']
      || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const payload = await auth.sessionManager.verifyToken(token);
    if (!payload?.sub) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Always pull fresh data from DB — never rely on potentially stale JWT claims
    const dbUser = await auth.config.adapter.getUserById(payload.sub);
    if (!dbUser) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role || 'user',
      name: dbUser.name,
      mfaEnabled: dbUser.mfaEnabled,
      sessionId: payload.jti, // Attach session ID (jti) from the verified token
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid session' });
  }
};
