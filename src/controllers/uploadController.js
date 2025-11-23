// src/controllers/uploadController.js
// -----------------------------------------------------------------------------
// IMAGE UPLOAD CONTROLLER
// Handles uploading component images to Supabase Storage.
// -----------------------------------------------------------------------------

import { supabase } from "../services/supabaseClient.js";
import { v4 as uuidv4 } from "uuid";

/* ============================================================================
   UPLOAD — COMPONENT IMAGE
============================================================================ */

/**
 * Upload a component image to Supabase Storage under:
 *    /components/<category_slug>/<generated_filename>
 */
export const uploadComponentImage = async (req, res) => {
  try {
    const { category_id } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded.",
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        error: "category_id is required.",
      });
    }

    /* -----------------------------------------------------------------------
       VALIDATE CATEGORY → GET SLUG
    ----------------------------------------------------------------------- */
    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", category_id)
      .single();

    if (catError || !category) {
      return res.status(400).json({
        success: false,
        error: "Invalid category_id.",
      });
    }

    const slug = category.slug;

    /* -----------------------------------------------------------------------
       BUILD UNIQUE FILENAME
    ----------------------------------------------------------------------- */
    const ext = req.file.originalname.split(".").pop();
    const filename = `${uuidv4()}.${ext}`;
    const filePath = `components/${slug}/${filename}`;

    /* -----------------------------------------------------------------------
       UPLOAD TO SUPABASE STORAGE
    ----------------------------------------------------------------------- */
    const { error: uploadError } = await supabase.storage
      .from("components")
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    /* -----------------------------------------------------------------------
       GENERATE PUBLIC URL
    ----------------------------------------------------------------------- */
    const { data: urlData } = supabase.storage
      .from("components")
      .getPublicUrl(filePath);

    return res.json({
      success: true,
      image_url: urlData.publicUrl,
      image_path: filePath,
    });
  } catch (err) {
    console.error("uploadComponentImage:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
