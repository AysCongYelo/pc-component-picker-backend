import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertIfNotExists } from "../../utils/insertHelpers.js";

// Correct & Safe public URL generator
function getPublicUrl(path) {
  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage.from("components").getPublicUrl(cleanPath);
  return data.publicUrl;
}

async function seedCooler() {
  console.log("❄️ Seeding CPU Cooler Components (Top 14)...");

  // 1️⃣ Fetch category ID dynamically
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "cpu_cooler")
    .single();

  if (catErr || !category) {
    console.error("❌ Missing 'cpu_cooler' category in the database!");
    return;
  }

  // 2️⃣ Top 14 Cooler Data (7 Air + 7 AIO)
  const coolerData = [
    // --------------------
    // 🌬️ TOP 7 AIR COOLERS
    // --------------------
    {
      name: "Noctua NH-D15",
      brand: "Noctua",
      price: 4999,
      stock: 10,
      image_url: getPublicUrl("cpu_cooler/noctua_nh_d15.jpg"),
    },
    {
      name: "be quiet! Dark Rock Pro 4",
      brand: "be quiet!",
      price: 6299,
      stock: 12,
      image_url: getPublicUrl("cpu_cooler/be_quiet_dark_rock_pro_4.jpg"),
    },
    {
      name: "Thermalright Peerless Assassin 120 SE",
      brand: "Thermalright",
      price: 2599,
      stock: 20,
      image_url: getPublicUrl(
        "cpu_cooler/thermalright_peerless_assassin_120_se.jpg"
      ),
    },
    {
      name: "Deepcool AK620",
      brand: "Deepcool",
      price: 2799,
      stock: 18,
      image_url: getPublicUrl("cpu_cooler/deepcool_ak620.jpg"),
    },
    {
      name: "Noctua NH-U12S",
      brand: "Noctua",
      price: 3799,
      stock: 14,
      image_url: getPublicUrl("cpu_cooler/noctua_nh_u12s.jpg"),
    },
    {
      name: "Arctic Freezer 36",
      brand: "Arctic",
      price: 1999,
      stock: 22,
      image_url: getPublicUrl("cpu_cooler/arctic_freezer_36.jpg"),
    },
    {
      name: "ID-COOLING SE-226-XT",
      brand: "ID-COOLING",
      price: 1499,
      stock: 25,
      image_url: getPublicUrl("cpu_cooler/id_cooling_se_226_xt.jpg"),
    },

    // --------------------
    // 💧 TOP 7 AIO COOLERS
    // --------------------
    {
      name: "Corsair iCUE H150i Elite LCD 360mm",
      brand: "Corsair",
      price: 12999,
      stock: 10,
      image_url: getPublicUrl("cpu_cooler/corsair_h150i_elite_lcd_360.jpg"),
    },
    {
      name: "Lian Li Galahad II Trinity 360mm",
      brand: "Lian Li",
      price: 9999,
      stock: 12,
      image_url: getPublicUrl("cpu_cooler/lian_li_galahad_ii_trinity_360.jpg"),
    },
    {
      name: "Arctic Liquid Freezer II 280mm",
      brand: "Arctic",
      price: 6999,
      stock: 16,
      image_url: getPublicUrl("cpu_cooler/arctic_liquid_freezer_ii_280.jpg"),
    },
    {
      name: "NZXT Kraken Elite 360mm",
      brand: "NZXT",
      price: 14999,
      stock: 8,
      image_url: getPublicUrl("cpu_cooler/nzxt_kraken_elite_360.jpg"),
    },
    {
      name: "Deepcool LT720 360mm",
      brand: "Deepcool",
      price: 8999,
      stock: 14,
      image_url: getPublicUrl("cpu_cooler/deepcool_lt720_360.jpg"),
    },
    {
      name: "be quiet! Pure Loop 2 FX 360mm",
      brand: "be quiet!",
      price: 8999,
      stock: 10,
      image_url: getPublicUrl("cpu_cooler/be_quiet_pure_loop_2_fx_360.jpg"),
    },
    {
      name: "Corsair iCUE H100i RGB Elite 240mm",
      brand: "Corsair",
      price: 6999,
      stock: 18,
      image_url: getPublicUrl("cpu_cooler/corsair_h100i_rgb_elite_240.jpg"),
    },
    // ⭐ ADD-ON COOLERS (new items only)
    {
      name: "Deepcool GAMMAXX 400 V2",
      brand: "Deepcool",
      price: 1199,
      stock: 20,
      image_url: getPublicUrl("cpu_cooler/deepcool_gammaxx_400_v2.jpg"),
    },
    {
      name: "Deepcool AK400",
      brand: "Deepcool",
      price: 1899,
      stock: 20,
      image_url: getPublicUrl("cpu_cooler/deepcool_ak400.jpg"),
    },
    {
      name: "ID-COOLING SE-214-XT",
      brand: "ID-COOLING",
      price: 899,
      stock: 25,
      image_url: getPublicUrl("cpu_cooler/id_cooling_se_214_xt.jpg"),
    },
    {
      name: "Thermalright Assassin X 120 SE",
      brand: "Thermalright",
      price: 1299,
      stock: 18,
      image_url: getPublicUrl("cpu_cooler/thermalright_assassin_x_120_se.jpg"),
    },
    {
      name: "Lian Li Galahad II 240",
      brand: "Lian Li",
      price: 5799,
      stock: 12,
      image_url: getPublicUrl("cpu_cooler/lian_li_galahad_ii_240.jpg"),
    },
  ];

  // 3️⃣ Insert using safe helper
  const result = await insertIfNotExists("cpu_cooler", coolerData);

  if (result.inserted > 0) {
    console.log("\n🧊 Newly added CPU Coolers (Top 14):");
    console.table(
      coolerData
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
    `✅ Done seeding CPU Cooler components → Inserted: ${result.inserted}, Skipped: ${result.skipped}\n`
  );
}

seedCooler();
