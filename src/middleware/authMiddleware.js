// src/middleware/authMiddleware.js
// -----------------------------------------------------------------------------
// AUTH MIDDLEWARE
// Handles: JWT verification via Supabase, attaches user info to req.user,
// and optional admin role enforcement.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "../supabaseAdmin.js";
import pool from "../db.js";

/* ============================================================================
   AUTH — VERIFY USER TOKEN
============================================================================ */

/**
 * Middleware: Validate Bearer token using Supabase auth
 * and attach authenticated user info to req.user.
 */
export async function requireAuth(req, res, next) {
  try {
    // Extract Authorization token
    let token =
      req.headers.authorization ||
      req.headers.Authorization ||
      req.headers["authorization"];

    if (token?.toLowerCase().startsWith("bearer ")) {
      token = token.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Missing authentication token",
      });
    }

    // Verify token with Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    const authUser = data.user;

    // Load role from database
    const { rows } = await pool.query(
      `SELECT role FROM profiles WHERE id = $1 LIMIT 1`,
      [authUser.id]
    );

    req.user = {
      id: authUser.id,
      email: authUser.email,
      role: rows?.[0]?.role || "user",
    };

    return next();
  } catch (err) {
    console.error("requireAuth:", err.message);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

/* ============================================================================
   AUTH — REQUIRE ADMIN
============================================================================ */

/**
 * Middleware: Check if authenticated user has admin role.
 */
export async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.role) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
      });
    }

    return next();
  } catch (err) {
    console.error("requireAdmin:", err.message);
    return res.status(500).json({ error: "Authorization failed" });
  }
}
