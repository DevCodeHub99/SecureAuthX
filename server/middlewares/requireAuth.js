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

    // Asynchronously update last active timestamp and metadata to prevent blocking request path
    if (payload.jti && auth.config.adapter?.sessionModel) {
      const rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '';
      let ipAddress = typeof rawIp === 'string' && rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp;
      if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
        ipAddress = '127.0.0.1';
      }
      const userAgent = req.headers['user-agent'] || 'Authorized Device';

      auth.config.adapter.sessionModel.findByIdAndUpdate(payload.jti, {
        ipAddress,
        userAgent,
        updatedAt: new Date()
      }).catch(err => console.error('[requireAuth] Session update error:', err.message));
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid session' });
  }
};
