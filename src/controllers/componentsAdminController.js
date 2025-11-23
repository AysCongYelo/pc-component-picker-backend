// src/controllers/adminComponentsController.js
import { supabaseAdmin } from "../supabaseAdmin.js";

/* ============================================================================
   ADMIN — GET ALL COMPONENTS
============================================================================ */
export async function adminListComponents(req, res) {
  try {
    let {
      search,
      category,
      status,
      min_price,
      max_price,
      page = 1,
      limit = 20,
      sort = "created_at",
      order = "desc",
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("components")
      .select("*", { count: "exact" });

    if (search) {
      const s = search.toLowerCase();
      query = query.or(`name.ilike.%${s}%,brand.ilike.%${s}%`);
    }

    if (category) query = query.eq("category_id", category);

    if (status) query = query.eq("status", status);

    if (min_price) query = query.gte("price", min_price);
    if (max_price) query = query.lte("price", max_price);

    query = query
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
      data,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/* ============================================================================
   ADMIN — GET SINGLE
============================================================================ */
export async function adminGetComponent(req, res) {
  try {
    const id = req.params.id;

    const { data, error } = await supabaseAdmin
      .from("components")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Component not found" });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/* ============================================================================
   ADMIN — CREATE
============================================================================ */
export async function adminCreateComponent(req, res) {
  try {
    let {
      name,
      brand,
      price,
      category_id,
      stock = 0,
      low_stock_threshold = 5,
      status = "active",
      vendor,
      image_url,
      image_path,
      specs = {},
    } = req.body;

    specs = typeof specs === "string" ? JSON.parse(specs) : specs;

    const { data, error } = await supabaseAdmin
      .from("components")
      .insert({
        name,
        brand,
        price,
        category_id,
        stock,
        low_stock_threshold,
        status,
        vendor,
        image_url,
        image_path,
        specs,
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/* ============================================================================
   ADMIN — UPDATE
============================================================================ */
export async function adminUpdateComponent(req, res) {
  try {
    const id = req.params.id;

    const {
      name,
      brand,
      price,
      category_id,
      stock,
      low_stock_threshold,
      status,
      vendor,
      image_url,
      image_path,
      specs,
    } = req.body;

    const { data: old } = await supabaseAdmin
      .from("components")
      .select("image_path")
      .eq("id", id)
      .single();

    // If image changed → remove old image from storage
    if (image_path && old?.image_path && image_path !== old.image_path) {
      await supabaseAdmin.storage.from("components").remove([old.image_path]);
    }

    const parsedSpecs = typeof specs === "string" ? JSON.parse(specs) : specs;

    const { data, error } = await supabaseAdmin
      .from("components")
      .update({
        name,
        brand,
        price,
        category_id,
        stock,
        low_stock_threshold,
        status,
        vendor,
        image_url,
        image_path,
        specs: parsedSpecs,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/* ============================================================================
   ADMIN — DELETE
============================================================================ */
export async function adminDeleteComponent(req, res) {
  try {
    const id = req.params.id;

    const { data: old } = await supabaseAdmin
      .from("components")
      .select("image_path")
      .eq("id", id)
      .single();

    if (old?.image_path) {
      await supabaseAdmin.storage.from("components").remove([old.image_path]);
    }

    await supabaseAdmin.from("components").delete().eq("id", id);

    return res.json({ success: true, message: "Component deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/* ============================================================================
   ADMIN — BULK DELETE
============================================================================ */
export async function adminBulkDelete(req, res) {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids))
      return res.status(400).json({ error: "ids must be array" });

    const { data: components } = await supabaseAdmin
      .from("components")
      .select("id, image_path")
      .in("id", ids);

    for (const c of components) {
      if (c.image_path) {
        await supabaseAdmin.storage.from("components").remove([c.image_path]);
      }
    }

    await supabaseAdmin.from("components").delete().in("id", ids);

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/* ============================================================================
   ADMIN — BULK UPDATE
============================================================================ */
export async function adminBulkUpdate(req, res) {
  try {
    const { ids, changes } = req.body;

    const allowed = [
      "name",
      "brand",
      "price",
      "stock",
      "status",
      "low_stock_threshold",
      "category_id",
      "vendor",
    ];

    const payload = {};

    for (const key of Object.keys(changes)) {
      if (allowed.includes(key)) payload[key] = changes[key];
    }

    const { data, error } = await supabaseAdmin
      .from("components")
      .update(payload)
      .in("id", ids)
      .select();

    if (error) throw error;

    return res.json({
      success: true,
      updated_count: data.length,
      data,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
