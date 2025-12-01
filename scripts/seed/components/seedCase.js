import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertIfNotExists } from "../../utils/insertHelpers.js";

// ✅ Correct public URL builder for Supabase
function getPublicUrl(path) {
  const cleanPath = path.replace(/^\/+/, ""); // remove leading slash only
  const { data } = supabase.storage.from("components").getPublicUrl(cleanPath);
  return data.publicUrl;
}

async function seedCase() {
  console.log("🖥️ Seeding CASE Components...");

  // 1️⃣ Fetch category_id dynamically
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "case")
    .single();

  if (catErr || !category) {
    console.error("❌ Missing 'case' category in the database!");
    return;
  }

  // ⭐ 2️⃣ Curated TOP 14 Cases (Mid Tower + Full Tower)
  const caseData = [
    // 🔷 ATX MID TOWER — TOP 7
    {
      name: "NZXT H7 Flow",
      brand: "NZXT",
      price: 7999,
      stock: 15,
      image_url: getPublicUrl("case/nzxt_h7_flow.jpg"),
    },
    {
      name: "Corsair 4000D Airflow",
      brand: "Corsair",
      price: 6399,
      stock: 18,
      image_url: getPublicUrl("case/corsair_4000d_airflow.jpg"),
    },
    {
      name: "Lian Li Lancool 216",
      brand: "Lian Li",
      price: 6899,
      stock: 15,
      image_url: getPublicUrl("case/lian_li_lancool_216.jpg"),
    },
    {
      name: "Fractal Design Meshify 2",
      brand: "Fractal Design",
      price: 9999,
      stock: 10,
      image_url: getPublicUrl("case/fractal_meshify_2.jpg"),
    },
    {
      name: "Be Quiet! Pure Base 500DX",
      brand: "be quiet!",
      price: 7299,
      stock: 12,
      image_url: getPublicUrl("case/be_quiet_pure_base_500dx.jpg"),
    },
    {
      name: "Phanteks Eclipse P400A",
      brand: "Phanteks",
      price: 5899,
      stock: 20,
      image_url: getPublicUrl("case/phanteks_p400a.jpg"),
    },
    {
      name: "Cooler Master TD500 Mesh",
      brand: "Cooler Master",
      price: 6499,
      stock: 16,
      image_url: getPublicUrl("case/cooler_master_td500_mesh.jpg"),
    },

    // 🔶 ATX FULL TOWER — TOP 7
    {
      name: "Lian Li O11 Dynamic EVO",
      brand: "Lian Li",
      price: 9999,
      stock: 10,
      image_url: getPublicUrl("case/lian_li_o11_dynamic_evo.jpg"),
    },
    {
      name: "Corsair 5000D Airflow",
      brand: "Corsair",
      price: 8499,
      stock: 14,
      image_url: getPublicUrl("case/corsair_5000d_airflow.jpg"),
    },
    {
      name: "Fractal Design Torrent",
      brand: "Fractal Design",
      price: 11299,
      stock: 8,
      image_url: getPublicUrl("case/fractal_design_torrent.jpg"),
    },
    {
      name: "Be Quiet! Dark Base Pro 900",
      brand: "be quiet!",
      price: 15999,
      stock: 6,
      image_url: getPublicUrl("case/be_quiet_dark_base_pro_900.jpg"),
    },
    {
      name: "Phanteks Enthoo Pro 2",
      brand: "Phanteks",
      price: 9999,
      stock: 9,
      image_url: getPublicUrl("case/phanteks_enthoo_pro_2.jpg"),
    },
    {
      name: "Cooler Master HAF 700",
      brand: "Cooler Master",
      price: 14999,
      stock: 5,
      image_url: getPublicUrl("case/cooler_master_haf_700.jpg"),
    },
    {
      name: "NZXT H9 Flow",
      brand: "NZXT",
      price: 9999,
      stock: 12,
      image_url: getPublicUrl("case/nzxt_h9_flow.jpg"),
    },
    // ⭐ ADD-ON BUDGET CASES
    {
      name: "Tecware Nexus M",
      brand: "Tecware",
      price: 1499,
      stock: 30,
      image_url: getPublicUrl("case/tecware_nexus_m.jpg"),
    },
    {
      name: "Tecware NEO M",
      brand: "Tecware",
      price: 1599,
      stock: 28,
      image_url: getPublicUrl("case/tecware_neo_m.jpg"),
    },
    {
      name: "Deepcool Matrexx 30",
      brand: "Deepcool",
      price: 1399,
      stock: 25,
      image_url: getPublicUrl("case/deepcool_matrexx_30.jpg"),
    },
    {
      name: "MicroATX Compact Case",
      brand: "Generic",
      price: 1199,
      stock: 40,
      image_url: getPublicUrl("case/generic_microatx_case.jpg"),
    },
  ];

  // 3️⃣ Insert components using the safe helper
  const result = await insertIfNotExists("case", caseData);

  if (result.inserted > 0) {
    console.log("\n🧩 Newly added CASE components:");
    console.table(
      caseData
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
    `✅ Done seeding CASE components → Inserted: ${result.inserted}, Skipped: ${result.skipped}\n`
  );
}

seedCase();
