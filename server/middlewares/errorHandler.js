import {
  AuthError,
  InvalidCredentialsError,
  UserExistsError,
  UserNotFoundError,
  MfaInvalidError,
  TokenExpiredError,
  TokenInvalidError,
  EmailNotVerifiedError,
  PasswordTooShortError,
  OAuthError,
} from '@custom-auth/core';

/**
 * Global Express error handler.
 *
 * Maps every @custom-auth/core error subclass to the correct HTTP status code.
 * Falls back to a generic 500 in production (never leaking stack traces).
 *
 * Must be registered LAST (after all routes) in server.js.
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log error for server-side observability
  console.error(`[ErrorHandler] ${err.name}: ${err.message}`);

  // Map known @custom-auth/core error subclasses → correct HTTP status
  if (err instanceof InvalidCredentialsError) return res.status(401).json({ error: err.message });
  if (err instanceof UserExistsError)         return res.status(409).json({ error: err.message });
  if (err instanceof UserNotFoundError)        return res.status(404).json({ error: err.message });
  if (err instanceof MfaInvalidError)          return res.status(400).json({ error: err.message });
  if (err instanceof TokenExpiredError)        return res.status(401).json({ error: err.message });
  if (err instanceof TokenInvalidError)        return res.status(401).json({ error: err.message });
  if (err instanceof EmailNotVerifiedError)    return res.status(403).json({ error: err.message });
  if (err instanceof PasswordTooShortError)    return res.status(400).json({ error: err.message });
  if (err instanceof OAuthError)               return res.status(400).json({ error: err.message });
  if (err instanceof AuthError)                return res.status(err.statusCode || 400).json({ error: err.message });

  // Prevent MongoDB / Mongoose internals from leaking to the client
  if (err.name === 'MongoServerError' || err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Database operation failed. Please check your inputs.' });
  }

  // Generic fallback — never expose stack traces in production
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
  res.status(statusCode).json({ error: message });
};
