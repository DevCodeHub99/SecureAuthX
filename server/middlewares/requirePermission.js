import { RBACManager } from "@custom-auth/core";

export const rbac = new RBACManager({
  roles: {
    admin: {
      permissions: ["users:read", "users:write", "settings:write"],
    },
    user: {
      permissions: ["profile:read"],
    },
  },
});

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: No user session" });
    }

    const hasAccess = rbac.hasPermission(req.user, permission);
    if (!hasAccess) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};
