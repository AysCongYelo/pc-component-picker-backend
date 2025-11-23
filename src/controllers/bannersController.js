import { supabaseAdmin as supabase } from "../supabaseAdmin.js";

export const getBanners = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (err) {
    console.error("getBanners:", err.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
