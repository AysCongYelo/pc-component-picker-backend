// src/controllers/publicComponentsController.js
import { supabase } from "../services/supabaseClient.js";

export async function publicListComponents(req, res) {
  try {
    const { search, category, min_price, max_price } = req.query;

    let q = supabase
      .from("components")
      .select("id, name, brand, price, image_url, category_id, specs, stock")
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

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function publicGetComponent(req, res) {
  try {
    const id = req.params.id;

    const { data, error } = await supabase
      .from("components")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Component not found" });

    await supabase.rpc("increment_component_views", { comp_id: id });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
