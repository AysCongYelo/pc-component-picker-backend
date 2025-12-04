import { supabase } from "../services/supabaseClient.js";

const CATEGORY_MAP = {
  "2bbab1a8-0a20-49da-b0fb-e932a68ca35f": "cpu",
  "aa06cff7-dcf2-4e74-ba06-e36073fe6037": "gpu",
  "760d0169-1b6d-4769-8e16-ee98739411c3": "motherboard",
  "e70730b3-e286-425a-8255-c9039ab7b337": "memory",
  "d37a208d-1cf7-4aa3-affd-059abf0c9b86": "storage",
  "0b75a480-8751-4c03-9089-1a180d54caa5": "psu",
  "b12acc94-c57c-493a-a5c5-ebd565935cdc": "case",
  "e4e7380f-aa46-46e7-8bee-2072ffc91401": "cpu_cooler",
};

// Map category_id → table name
const SPECS_TABLE = {
  cpu: "cpu_specs",
  gpu: "gpu_specs",
  motherboard: "motherboard_specs",
  memory: "memory_specs",
  storage: "storage_specs",
  psu: "psu_specs",
  case: "case_specs",
  cpu_cooler: "cpu_cooler_specs",
};

export async function publicListComponents(req, res) {
  try {
    const { search, category, min_price, max_price } = req.query;

    let q = supabase
      .from("components")
      .select("id, name, brand, price, image_url, category_id, stock")
      .eq("status", "active")
      .gt("stock", 0);

    if (search) {
      const s = search.toLowerCase();
      q = q.or(`name.ilike.%${s}%,brand.ilike.%${s}%`);
    }

    if (category) q = q.eq("category_id", category);
    if (min_price) q = q.gte("price", min_price);
    if (max_price) q = q.lte("price", max_price);

    const { data, error } = await q;
    if (error) throw error;

    const results = [];

    for (const comp of data) {
      const categoryName = CATEGORY_MAP[comp.category_id]; // <-- FIXED
      const table = SPECS_TABLE[categoryName]; // <-- FIXED

      let specs = {};

      if (table) {
        const { data: specData } = await supabase
          .from(table)
          .select("*")
          .eq("component_id", comp.id)
          .single();

        if (specData) specs = specData;
      }

      results.push({
        ...comp,
        category: CATEGORY_MAP[comp.category_id] || null, // <-- ADD THIS
        specs,
      });
    }

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("publicListComponents ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

/* ================================
   PUBLIC GET ONE COMPONENT
================================ */
export async function publicGetComponent(req, res) {
  try {
    const id = req.params.id;

    const { data: comp, error } = await supabase
      .from("components")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (error || !comp)
      return res.status(404).json({ error: "Component not found" });

    const categoryName = CATEGORY_MAP[comp.category_id]; // <-- FIX
    const table = SPECS_TABLE[categoryName]; // <-- FIX

    let specs = {};

    if (table) {
      const { data: specData } = await supabase
        .from(table)
        .select("*")
        .eq("component_id", id)
        .single();

      if (specData) specs = specData;
    }

    await supabase.rpc("increment_component_views", { comp_id: id });

    return res.json({
      success: true,
      data: {
        ...comp,
        category: CATEGORY_MAP[comp.category_id] || null, // <-- ADD THIS
        specs,
      },
    });
  } catch (err) {
    console.error("publicGetComponent ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

/* ================================
   PUBLIC TRENDING COMPONENTS (Smart)
================================ */
export async function publicGetTrending(req, res) {
  try {
    // 1️⃣ fetch components with views + stock + category
    const { data, error } = await supabase
      .from("components")
      .select("id, name, brand, price, image_url, category_id, views, stock")
      .eq("status", "active")
      .gt("stock", 0);

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 2️⃣ compute trending score
    const ranked = data
      .map((c) => ({
        ...c,
        trending_score:
          (c.views || 0) * 0.7 + (10 - Math.min(c.stock, 10)) * 0.3,
      }))
      .sort((a, b) => b.trending_score - a.trending_score);

    // 3️⃣ ensure category balance — max 2 per category
    const categoryCount = {};
    const balanced = [];

    for (const item of ranked) {
      const category = CATEGORY_MAP[item.category_id] || "other";

      if (!categoryCount[category]) categoryCount[category] = 0;

      if (categoryCount[category] < 2) {
        balanced.push(item);
        categoryCount[category]++;
      }

      if (balanced.length >= 10) break;
    }

    // 4️⃣ fetch specs for each item
    const results = [];

    for (const comp of balanced) {
      const categoryName = CATEGORY_MAP[comp.category_id];
      const table = SPECS_TABLE[categoryName];

      let specs = {};

      if (table) {
        const { data: specData } = await supabase
          .from(table)
          .select("*")
          .eq("component_id", comp.id)
          .single();

        if (specData) specs = specData;
      }

      results.push({
        ...comp,
        category: CATEGORY_MAP[comp.category_id] || null, // <-- ADD THIS
        specs,
      });
    }

    return res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("publicGetTrending ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
