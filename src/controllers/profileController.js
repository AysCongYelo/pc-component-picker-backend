// src/controllers/profileController.js
// -----------------------------------------------------------------------------
// USER PROFILE CONTROLLER
// Handles: retrieving, updating user's profile, and avatar upload.
// -----------------------------------------------------------------------------

import { supabaseAdmin as supabase } from "../supabaseAdmin.js";
import crypto from "crypto";

/* ============================================================================
   USER — GET MY PROFILE
============================================================================ */

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, created_at")
      .eq("id", userId)
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      profile,
    });
  } catch (err) {
    console.error("getMyProfile:", err.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/* ============================================================================
   USER — UPDATE FULL NAME
============================================================================ */

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name } = req.body;

    if (!full_name) {
      return res.status(400).json({
        success: false,
        error: "full_name is required",
      });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: "Profile updated successfully",
      profile: data,
    });
  } catch (err) {
    console.error("updateProfile:", err.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/* ============================================================================
   USER — UPLOAD / UPDATE AVATAR
============================================================================ */
/**
 * Expected FE request (multipart/form-data):
 * POST /api/profile/avatar
 * file: binary avatar image
 *
 * Uses Supabase Storage → bucket: "avatars"
 */

export const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    // Multer places uploaded file at req.file
    if (!req.file) {
      return res.json({
        success: false,
        error: "No file uploaded",
      });
    }

    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;

    // Create unique filename
    const ext = originalName.split(".").pop();
    const fileName = `avatar-${userId}-${crypto.randomUUID()}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(fileName, fileBuffer, {
        upsert: true,
        contentType: req.file.mimetype,
      });

    if (uploadErr) {
      console.error("Supabase upload error:", uploadErr);
      throw uploadErr;
    }

    // Generate public URL
    const { data: publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    // Update profile row
    const { data: updated, error: updateErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl.publicUrl })
      .eq("id", userId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return res.json({
      success: true,
      message: "Avatar updated successfully",
      profile: updated,
    });
  } catch (err) {
    console.error("updateAvatar:", err.message);
    return res.status(500).json({
      success: false,
      error: "Server error uploading avatar",
    });
  }
};
