import { RBACManager } from '@custom-auth/core';

/**
 * RBAC configuration.
 * admin inherits all user permissions via the `inherits` field —
 * so granting admin access to any `user` permission is automatic.
 */
export const rbac = new RBACManager({
  roles: {
    admin: {
      permissions: ['users:read', 'users:write', 'settings:write'],
      inherits: ['user'],
    },
    user: {
      permissions: ['profile:read', 'profile:write'],
    },
  },
});

/**
 * requirePermission — factory that returns a middleware checking whether
 * req.user holds the specified permission (via RBAC, including inherited roles).
 *
 * Must be used AFTER requireAuth so that req.user is populated.
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user session' });
    }

    const hasAccess = rbac.hasPermission(req.user, permission);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
