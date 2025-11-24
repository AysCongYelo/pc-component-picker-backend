// src/middleware/authMiddleware.js
import { supabase } from "../services/supabaseClient.js";
import pool from "../db.js";

/* ============================================================================
   AUTH — VERIFY USER TOKEN
============================================================================ */

export async function requireAuth(req, res, next) {
  try {
    // Extract token
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

    // Verify token via Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    const authUser = data.user;

    // Load role from profiles table
    const result = await pool.query(`SELECT role FROM profiles WHERE id = $1`, [
      authUser.id,
    ]);

    req.user = {
      id: authUser.id,
      email: authUser.email,
      role: result.rows?.[0]?.role || "user",
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
