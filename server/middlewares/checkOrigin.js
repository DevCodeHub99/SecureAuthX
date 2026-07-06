export const checkOrigin = (req, res, next) => {
  // Only enforce origin check on state-mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // Normalize origins by stripping trailing slashes
    const cleanOrigin = origin ? origin.replace(/\/+$/, "") : "";
    const cleanAllowedOrigin = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/+$/, "") : "";
    
    const isOriginValid = cleanOrigin === cleanAllowedOrigin;
    const isRefererValid = referer && referer.replace(/\/+$/, "").startsWith(cleanAllowedOrigin);

    if (!isOriginValid && !isRefererValid) {
      console.warn(`[CSRF Blocked] Blocked request from Origin: ${origin}, Referer: ${referer}`);
      return res.status(403).json({ error: "Forbidden: Invalid Origin (CSRF Protection)" });
    }
  }
  next();
};
