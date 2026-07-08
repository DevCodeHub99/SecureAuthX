export const checkOrigin = (req, res, next) => {
  // Only enforce origin check on state-mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // In development mode, allow tool requests (like curl, postman, or internal server calls) 
    // that don't send Origin or Referer headers.
    if (process.env.NODE_ENV !== 'production' && !origin && !referer) {
      return next();
    }
    
    // Normalize origins by stripping trailing slashes
    const cleanOrigin = origin ? origin.replace(/\/+$/, "") : "";
    const cleanAllowedOrigin = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/+$/, "") : "";
    
    // Allow standard client URL
    let isOriginValid = cleanOrigin === cleanAllowedOrigin;
    let isRefererValid = referer && referer.replace(/\/+$/, "").startsWith(cleanAllowedOrigin);

    // In development, also accept requests from local dev server variants
    if (process.env.NODE_ENV !== 'production') {
      const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
      if (localOrigins.includes(cleanOrigin)) {
        isOriginValid = true;
      }
      if (referer) {
        const cleanReferer = referer.replace(/\/+$/, "");
        if (localOrigins.some(loc => cleanReferer.startsWith(loc))) {
          isRefererValid = true;
        }
      }
    }

    if (!isOriginValid && !isRefererValid) {
      console.warn(`[CSRF Blocked] Blocked request from Origin: ${origin}, Referer: ${referer}`);
      return res.status(403).json({ error: "Forbidden: Invalid Origin (CSRF Protection)" });
    }
  }
  next();
};
