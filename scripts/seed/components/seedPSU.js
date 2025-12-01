import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertIfNotExists } from "../../utils/insertHelpers.js";

// Public URL Helper
function getPublicUrl(path) {
  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage.from("components").getPublicUrl(cleanPath);
  return data.publicUrl;
}

async function seedPSU() {
  console.log("🔌 Seeding PSU Components...");

  // Get PSU Category ID
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "psu")
    .single();

  if (catErr || !category) {
    console.error("❌ Missing 'psu' category!");
    return;
  }

  // FINAL PSU LIST (Exact 14)
  const psuData = [
    // ====================
    // HIGH WATTAGE 850W+
    // ====================
    {
      name: "Corsair RM1000x 1000W 80+ Gold",
      brand: "Corsair",
      price: 9999,
      stock: 10,
      image_url: getPublicUrl("psu/corsair_rm1000x_gold.jpg"),
    },
    {
      name: "Seasonic Focus GX-1000 1000W 80+ Gold",
      brand: "Seasonic",
      price: 10299,
      stock: 8,
      image_url: getPublicUrl("psu/seasonic_focus_gx_1000_gold.jpg"),
    },
    {
      name: "EVGA SuperNOVA 1000 G6 1000W 80+ Gold",
      brand: "EVGA",
      price: 10999,
      stock: 7,
      image_url: getPublicUrl("psu/evga_supernova_1000_g6_gold.jpg"),
    },
    {
      name: "MSI MPG A1000G 1000W 80+ Gold",
      brand: "MSI",
      price: 9699,
      stock: 12,
      image_url: getPublicUrl("psu/msi_mpg_a1000g_gold.jpg"),
    },
    {
      name: "Corsair HX1000i 1000W 80+ Platinum",
      brand: "Corsair",
      price: 12999,
      stock: 6,
      image_url: getPublicUrl("psu/corsair_hx1000i_platinum.jpg"),
    },
    {
      name: "Seasonic Prime TX-1000 1000W 80+ Titanium",
      brand: "Seasonic",
      price: 16999,
      stock: 5,
      image_url: getPublicUrl("psu/seasonic_prime_tx_1000_titanium.jpg"),
    },
    {
      name: "ASUS ROG Thor 1200W 80+ Platinum",
      brand: "ASUS",
      price: 18999,
      stock: 4,
      image_url: getPublicUrl("psu/asus_rog_thor_1200w_platinum.jpg"),
    },

    // ====================
    // MID WATTAGE 650–750W
    // ====================
    {
      name: "Corsair RM750e 750W 80+ Gold",
      brand: "Corsair",
      price: 6499,
      stock: 15,
      image_url: getPublicUrl("psu/corsair_rm750e_gold.jpg"),
    },
    {
      name: "Seasonic Focus GM-750 750W 80+ Gold",
      brand: "Seasonic",
      price: 6999,
      stock: 14,
      image_url: getPublicUrl("psu/seasonic_focus_gm_750_gold.jpg"),
    },
    {
      name: "EVGA SuperNOVA 750 GT 750W 80+ Gold",
      brand: "EVGA",
      price: 5999,
      stock: 18,
      image_url: getPublicUrl("psu/evga_supernova_750_gt_gold.jpg"),
    },
    {
      name: "MSI MAG A750GL 750W 80+ Gold",
      brand: "MSI",
      price: 5799,
      stock: 16,
      image_url: getPublicUrl("psu/msi_mag_a750gl_gold.jpg"),
    },
    {
      name: "be quiet! Pure Power 11 FM 750W 80+ Gold",
      brand: "be quiet!",
      price: 6299,
      stock: 12,
      image_url: getPublicUrl("psu/bequiet_purepower11fm_750w_gold.jpg"),
    },
    {
      name: "Cooler Master MWE Gold 750W",
      brand: "Cooler Master",
      price: 5499,
      stock: 20,
      image_url: getPublicUrl("psu/cooler_master_mwe_gold_750w.jpg"),
    },
    {
      name: "Seasonic Core GM-650 650W 80+ Gold",
      brand: "Seasonic",
      price: 4899,
      stock: 22,
      image_url: getPublicUrl("psu/seasonic_core_gm_650_gold.jpg"),
    },
    // ⭐ ADD-ON BUDGET PSUs
    {
      name: "Corsair CV550 550W 80+ Bronze",
      brand: "Corsair",
      price: 2499,
      stock: 30,
      image_url: getPublicUrl("psu/corsair_cv550_bronze.jpg"),
    },
    {
      name: "Corsair CV650 650W 80+ Bronze",
      brand: "Corsair",
      price: 2699,
      stock: 28,
      image_url: getPublicUrl("psu/corsair_cv650_bronze.jpg"),
    },
    {
      name: "Cooler Master Elite V3 600W",
      brand: "Cooler Master",
      price: 1799,
      stock: 35,
      image_url: getPublicUrl("psu/cooler_master_elite_v3_600w.jpg"),
    },
    {
      name: "Seasonic S12III 550W 80+ Bronze",
      brand: "Seasonic",
      price: 2099,
      stock: 25,
      image_url: getPublicUrl("psu/seasonic_s12iii_550w_bronze.jpg"),
    },
  ];

  // Insert
  const result = await insertIfNotExists("psu", psuData);

  if (result.inserted > 0) {
    console.log("\n🔋 Newly Added PSUs:");
    console.table(
      psuData
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
    `✅ Done seeding PSU components → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedPSU();
