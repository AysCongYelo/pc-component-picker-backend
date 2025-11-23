import { supabaseAdmin as supabase } from "../supabaseAdmin.js";

/* ============================================================================
   HELPERS
============================================================================ */

/** Compute total price based on items with components.price */
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

/** Expand components for public view */
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
    console.error("getFeaturedBuildsPublic:", err.message);
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
    console.error("getFeaturedBuildPublic:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================
   ADMIN — CREATE FEATURED BUILD
============================================================================ */

export const adminCreateFeaturedBuild = async (req, res) => {
  try {
    const { title, description, image_url } = req.body;

    if (!title)
      return res.status(400).json({ success: false, error: "title required" });

    const { data: created, error } = await supabase
      .from("featured_builds")
      .insert({
        title,
        description,
        image_url,
        total_price: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data: created });
  } catch (err) {
    console.error("adminCreateFeaturedBuild:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================
   ADMIN — UPDATE FEATURED BUILD (MAIN DATA)
============================================================================ */

export const adminUpdateFeaturedBuild = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, image_url } = req.body;

    const { data: updated, error } = await supabase
      .from("featured_builds")
      .update({
        title,
        description,
        image_url,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("adminUpdateFeaturedBuild:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================
   ADMIN — DELETE FEATURED BUILD
============================================================================ */

export const adminDeleteFeaturedBuild = async (req, res) => {
  try {
    const id = req.params.id;

    // items auto-delete via FK cascade
    const { error } = await supabase
      .from("featured_builds")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error("adminDeleteFeaturedBuild:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================
   ADMIN — SET ITEMS (REPLACE ALL)
============================================================================ */

export const adminSetFeaturedItems = async (req, res) => {
  try {
    const id = req.params.id;
    const { items } = req.body;

    if (!Array.isArray(items))
      return res
        .status(400)
        .json({ success: false, error: "items must be array" });

    // delete old items
    await supabase.from("featured_build_items").delete().eq("build_id", id);

    // insert new items
    for (const it of items) {
      if (!it.component_id) continue;

      await supabase.from("featured_build_items").insert({
        build_id: id,
        component_id: it.component_id,
        quantity: it.quantity || 1,
      });
    }

    // compute total
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
    console.error("adminSetFeaturedItems:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================================
   ADMIN — GET FULL BUILD (WITH ITEMS)
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
    console.error("adminGetFeaturedBuild:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
