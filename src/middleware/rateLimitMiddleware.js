// src/middleware/rateLimitMiddleware.js
// -----------------------------------------------------------------------------
// RATE LIMIT MIDDLEWARE
// Protects auth-sensitive endpoints from brute-force and abuse.
// -----------------------------------------------------------------------------

import rateLimit from "express-rate-limit";

// ============================================================================
// LOGIN LIMITER
// ============================================================================

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute
  message: {
    success: false,
    error: "Too many login attempts. Please try again in 1 minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// SIGNUP LIMITER
// ============================================================================

export const signupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 attempts per minute
  message: {
    success: false,
    error: "Too many signup attempts. Please try again shortly.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// PASSWORD RESET LIMITER
// ============================================================================

export const forgotPassLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 attempts per minute
  message: {
    success: false,
    error: "Too many reset requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
