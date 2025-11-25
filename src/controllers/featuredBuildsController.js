import { supabaseAdmin as supabase } from "../supabaseAdmin.js";
import { v4 as uuidv4 } from "uuid";

/* ============================================================================ 
   HELPERS 
============================================================================ */

/** Upload to Supabase Storage */
async function uploadImage(file) {
  if (!file) return { image_url: null, image_path: null };

  const ext = file.originalname.split(".").pop();
  const filename = `${uuidv4()}.${ext}`;
  const path = `featured_builds/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("featured_builds")
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("featured_builds").getPublicUrl(path);

  return {
    image_url: data.publicUrl,
    image_path: path,
  };
}

/** Compute total price */
async function computeTotal(buildId) {
  const { data: items } = await supabase
    .from("featured_build_items")
    .select("component_id, quantity, components ( price )")
    .eq("build_id", buildId);

  if (!items || items.length === 0) return 0;

  return items.reduce((sum, i) => {
    const price = i.components?.price || 0;
    return sum + price * (i.quantity || 1);
  }, 0);
}

/** Expand items */
async function expandItems(buildId) {
  const { data: items } = await supabase
    .from("featured_build_items")
    .select("id, quantity, components (*)")
    .eq("build_id", buildId);

  return items || [];
}

/* ============================================================================ 
   PUBLIC — GET ALL FEATURED BUILDS 
============================================================================ */

export const getFeaturedBuildsPublic = async (req, res) => {
  try {
    const { data: builds, error } = await supabase
      .from("featured_builds")
      .select("id, title, description, image_url, total_price, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: builds });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================ 
   PUBLIC — GET SINGLE FEATURED BUILD 
============================================================================ */

export const getFeaturedBuildPublic = async (req, res) => {
  try {
    const id = req.params.id;

    const { data: build, error } = await supabase
      .from("featured_builds")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!build)
      return res.status(404).json({ success: false, error: "Not found" });
    if (error) throw error;

    const items = await expandItems(id);

    return res.json({
      success: true,
      data: { ...build, items },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================ 
   ADMIN — CREATE 
============================================================================ */

export const adminCreateFeaturedBuild = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title)
      return res.status(400).json({ success: false, error: "title required" });

    const { image_url, image_path } = await uploadImage(req.file);

    const { data: created, error } = await supabase
      .from("featured_builds")
      .insert({
        title,
        description,
        image_url,
        image_path,
        total_price: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data: created });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================ 
   ADMIN — UPDATE 
============================================================================ */

export const adminUpdateFeaturedBuild = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description } = req.body;

    const { data: old } = await supabase
      .from("featured_builds")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();

    let imageData = {};
    if (req.file) {
      if (old?.image_path) {
        await supabase.storage.from("featured_builds").remove([old.image_path]);
      }

      imageData = await uploadImage(req.file);
    }

    const { data: updated, error } = await supabase
      .from("featured_builds")
      .update({
        title,
        description,
        ...imageData,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================ 
   ADMIN — DELETE 
============================================================================ */

export const adminDeleteFeaturedBuild = async (req, res) => {
  try {
    const id = req.params.id;

    const { error } = await supabase
      .from("featured_builds")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================ 
   ADMIN — SET ITEMS 
============================================================================ */

export const adminSetFeaturedItems = async (req, res) => {
  try {
    const id = req.params.id;
    const { items } = req.body;

    if (!Array.isArray(items))
      return res
        .status(400)
        .json({ success: false, error: "items must be array" });

    await supabase.from("featured_build_items").delete().eq("build_id", id);

    for (const it of items) {
      if (!it.component_id) continue;

      await supabase.from("featured_build_items").insert({
        build_id: id,
        component_id: it.component_id,
        quantity: it.quantity || 1,
      });
    }

    const total = await computeTotal(id);

    await supabase
      .from("featured_builds")
      .update({ total_price: total })
      .eq("id", id);

    const expanded = await expandItems(id);

    return res.json({
      success: true,
      total_price: total,
      items: expanded,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================ 
   ADMIN — GET FULL BUILD 
============================================================================ */

export const adminGetFeaturedBuild = async (req, res) => {
  try {
    const id = req.params.id;

    const { data: build, error } = await supabase
      .from("featured_builds")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!build)
      return res.status(404).json({ success: false, error: "Not found" });
    if (error) throw error;

    const items = await expandItems(id);

    return res.json({
      success: true,
      data: { ...build, items },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
