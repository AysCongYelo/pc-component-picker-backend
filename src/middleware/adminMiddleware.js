// src/middleware/adminMiddleware.js
// -----------------------------------------------------------------------------
// ADMIN ROLE MIDDLEWARE
// Ensures the authenticated user has admin privileges using Supabase Profiles.
// -----------------------------------------------------------------------------

import { supabaseAdmin } from "../supabaseAdmin.js";

/**
 * Middleware: Only allow access if the authenticated user is an admin.
 */
export async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    // Fetch role from Supabase Profiles table
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return res.status(403).json({
        success: false,
        error: "Profile not found",
      });
    }

    if (data.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required",
      });
    }

    next();
  } catch (err) {
    console.error("requireAdmin:", err.message);
    return res.status(500).json({
      success: false,
      error: "Authorization failed",
    });
  }
}
