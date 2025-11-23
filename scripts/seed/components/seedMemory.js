import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertIfNotExists } from "../../utils/insertHelpers.js";

// Public URL generator (safe)
function getPublicUrl(path) {
  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage.from("components").getPublicUrl(cleanPath);
  return data.publicUrl;
}

async function seedMemory() {
  console.log("💾 Seeding Memory Components...");

  // 1️⃣ Fetch category_id for RAM
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "memory")
    .single();

  if (catErr || !category) {
    console.error("❌ Missing 'memory' category!");
    return;
  }

  // ======================================================
  // 2️⃣ OFFICIAL RAM DATA — EXACT TOP 7 DDR5 + TOP 7 DDR4
  // ======================================================

  const memoryData = [
    // ======================================================
    // DDR5 – TOP 7
    // ======================================================
    {
      name: "Corsair Vengeance DDR5 6000MHz 32GB (2x16GB)",
      brand: "Corsair",
      price: 7999,
      stock: 20,
      image_url: getPublicUrl("memory/corsair_vengeance_ddr5_6000_32gb.jpg"),
    },
    {
      name: "G.Skill Trident Z5 RGB 6400MHz 32GB",
      brand: "G.Skill",
      price: 8999,
      stock: 15,
      image_url: getPublicUrl("memory/gskill_trident_z5_rgb_6400_32gb.jpg"),
    },
    {
      name: "Kingston Fury Beast DDR5 5600MHz 32GB",
      brand: "Kingston",
      price: 6499,
      stock: 25,
      image_url: getPublicUrl("memory/kingston_fury_beast_ddr5_5600_32gb.jpg"),
    },
    {
      name: "Corsair Dominator Platinum RGB 6600MHz 32GB",
      brand: "Corsair",
      price: 11999,
      stock: 12,
      image_url: getPublicUrl("memory/corsair_dominator_6600_32gb.jpg"),
    },
    {
      name: "TeamGroup T-Force Delta RGB 6000MHz 32GB",
      brand: "TeamGroup",
      price: 7599,
      stock: 18,
      image_url: getPublicUrl("memory/teamgroup_delta_rgb_6000_32gb.jpg"),
    },
    {
      name: "Crucial DDR5 5600MHz 32GB",
      brand: "Crucial",
      price: 5999,
      stock: 30,
      image_url: getPublicUrl("memory/crucial_ddr5_5600_32gb.jpg"),
    },
    {
      name: "ADATA XPG Lancer RGB 6000MHz 32GB",
      brand: "ADATA",
      price: 6999,
      stock: 20,
      image_url: getPublicUrl("memory/adata_lancer_rgb_6000_32gb.jpg"),
    },

    // ======================================================
    // DDR4 – TOP 7
    // ======================================================
    {
      name: "Corsair Vengeance LPX 3200MHz 32GB (2x16GB)",
      brand: "Corsair",
      price: 4299,
      stock: 25,
      image_url: getPublicUrl("memory/corsair_vengeance_lpx_3200_32gb.jpg"),
    },
    {
      name: "G.Skill Ripjaws V 3600MHz 32GB",
      brand: "G.Skill",
      price: 4699,
      stock: 20,
      image_url: getPublicUrl("memory/gskill_ripjaws_v_3600_32gb.jpg"),
    },
    {
      name: "Kingston Fury Beast 3200MHz 32GB",
      brand: "Kingston",
      price: 4199,
      stock: 22,
      image_url: getPublicUrl("memory/kingston_fury_beast_3200_32gb.jpg"),
    },
    {
      name: "Corsair Vengeance RGB Pro 3600MHz 32GB",
      brand: "Corsair",
      price: 4999,
      stock: 18,
      image_url: getPublicUrl("memory/corsair_vengeance_rgb_pro_3600_32gb.jpg"),
    },
    {
      name: "G.Skill Trident Z RGB 3600MHz 32GB",
      brand: "G.Skill",
      price: 5299,
      stock: 17,
      image_url: getPublicUrl("memory/gskill_trident_z_rgb_3600_32gb.jpg"),
    },
    {
      name: "TeamGroup T-Force Vulcan Z 3200MHz 32GB",
      brand: "TeamGroup",
      price: 3899,
      stock: 28,
      image_url: getPublicUrl("memory/teamgroup_vulcan_z_3200_32gb.jpg"),
    },
    {
      name: "Crucial Ballistix 3200MHz 32GB",
      brand: "Crucial",
      price: 3999,
      stock: 30,
      image_url: getPublicUrl("memory/crucial_ballistix_3200_32gb.jpg"),
    },
  ];

  // 3️⃣ Insert safely
  const result = await insertIfNotExists("memory", memoryData);

  if (result.inserted > 0) {
    console.log("\n💾 Newly added Memory Components:");
    console.table(
      memoryData
        .slice(0, result.inserted)
        .map(({ name, brand, price, stock }) => ({
          Name: name,
          Brand: brand,
          Price: price,
          Stock: stock,
        }))
    );
  }

  console.log(
    `✅ Done seeding Memory components → Inserted: ${result.inserted}, Skipped: ${result.skipped}\n`
  );
}

seedMemory();
