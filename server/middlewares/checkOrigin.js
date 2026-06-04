export const checkOrigin = (req, res, next) => {
  // Only enforce origin check on state-mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // Allow if it matches the configured client URL
    const allowedOrigin = process.env.CLIENT_URL;
    
    // Ensure at least one header is present and matches the allowed origin
    // Note: referer often includes trailing slashes or paths, so we use startsWith
    const isOriginValid = origin === allowedOrigin;
    const isRefererValid = referer && referer.startsWith(allowedOrigin);

    if (!isOriginValid && !isRefererValid) {
      console.warn(`[CSRF Blocked] Blocked request from Origin: ${origin}, Referer: ${referer}`);
      return res.status(403).json({ error: "Forbidden: Invalid Origin (CSRF Protection)" });
    }
  }
  next();
};
