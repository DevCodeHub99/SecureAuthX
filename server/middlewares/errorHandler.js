export const errorHandler = (err, req, res, next) => {
  console.error(`[Error Handler] ${err.name}: ${err.message}`);
  
  // If it's a known operational error from the auth package, send the message to the client
  if (err.name === 'AuthError' || err.statusCode === 400) {
    return res.status(400).json({ error: err.message });
  }

  // Prevent leaking MongoDB or internal Node stack traces to the client
  // Mongoose errors often have names like ValidationError, MongoServerError, etc.
  if (err.name === 'MongoServerError' || err.name === 'ValidationError') {
    return res.status(400).json({ error: "Database operation failed. Please check your inputs." });
  }

  // Generic fallback for all other unhandled internal server errors
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? "Internal Server Error" 
    : err.message; // Safe to show in dev

  res.status(statusCode).json({ error: message });
};
