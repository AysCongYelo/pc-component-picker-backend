import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertIfNotExists } from "../../utils/insertHelpers.js";

// ✅ Safe Public URL Generator
function getPublicUrl(path) {
  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage.from("components").getPublicUrl(cleanPath);
  return data.publicUrl;
}

async function seedStorage() {
  console.log("💽 Seeding Storage Components...");

  // 1️⃣ Fetch category for storage
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "storage")
    .single();

  if (catErr || !category) {
    console.error("❌ Missing 'storage' category in database!");
    return;
  }

  // 2️⃣ Curated Storage Data (Top 21)
  const storageData = [
    // ==============================
    // NVMe M.2 PCIe 4.0 (Top 7)
    // ==============================
    {
      name: "Samsung 990 Pro 1TB NVMe M.2",
      brand: "Samsung",
      price: 8299,
      stock: 20,
      image_url: getPublicUrl("storage/samsung_990_pro_1tb.jpg"),
    },
    {
      name: "WD Black SN850X 1TB NVMe M.2",
      brand: "Western Digital",
      price: 7499,
      stock: 18,
      image_url: getPublicUrl("storage/wd_black_sn850x_1tb.jpg"),
    },
    {
      name: "Kingston KC3000 1TB NVMe M.2",
      brand: "Kingston",
      price: 6999,
      stock: 20,
      image_url: getPublicUrl("storage/kingston_kc3000_1tb.jpg"),
    },
    {
      name: "Seagate FireCuda 530 1TB NVMe M.2",
      brand: "Seagate",
      price: 8999,
      stock: 15,
      image_url: getPublicUrl("storage/seagate_firecuda_530_1tb.jpg"),
    },
    {
      name: "Corsair MP600 Pro 1TB NVMe M.2",
      brand: "Corsair",
      price: 6399,
      stock: 22,
      image_url: getPublicUrl("storage/corsair_mp600_pro_1tb.jpg"),
    },
    {
      name: "Crucial P5 Plus 1TB NVMe M.2",
      brand: "Crucial",
      price: 6199,
      stock: 24,
      image_url: getPublicUrl("storage/crucial_p5_plus_1tb.jpg"),
    },
    {
      name: "ADATA XPG Gammix S70 Blade 1TB NVMe M.2",
      brand: "ADATA",
      price: 5599,
      stock: 22,
      image_url: getPublicUrl("storage/adata_s70_blade_1tb.jpg"),
    },

    // ==============================
    // NVMe M.2 PCIe 5.0 (Top 7)
    // ==============================
    {
      name: "Crucial T700 1TB PCIe 5.0 NVMe",
      brand: "Crucial",
      price: 12999,
      stock: 12,
      image_url: getPublicUrl("storage/crucial_t700_1tb.jpg"),
    },
    {
      name: "Corsair MP700 1TB PCIe 5.0 NVMe",
      brand: "Corsair",
      price: 11999,
      stock: 11,
      image_url: getPublicUrl("storage/corsair_mp700_1tb.jpg"),
    },
    {
      name: "MSI Spatium M570 Pro 1TB PCIe 5.0",
      brand: "MSI",
      price: 12499,
      stock: 10,
      image_url: getPublicUrl("storage/msi_m570_pro_1tb.jpg"),
    },
    {
      name: "Gigabyte AORUS Gen5 10000 1TB NVMe",
      brand: "Gigabyte",
      price: 12799,
      stock: 10,
      image_url: getPublicUrl("storage/gigabyte_gen5_10000_1tb.jpg"),
    },
    {
      name: "TeamGroup Cardea Z54 1TB PCIe 5.0",
      brand: "TeamGroup",
      price: 10999,
      stock: 14,
      image_url: getPublicUrl("storage/teamgroup_z54_1tb.jpg"),
    },
    {
      name: "ADATA Legend 970 1TB PCIe 5.0",
      brand: "ADATA",
      price: 10499,
      stock: 15,
      image_url: getPublicUrl("storage/adata_legend_970_1tb.jpg"),
    },
    {
      name: "Seagate FireCuda 540 1TB PCIe 5.0",
      brand: "Seagate",
      price: 11999,
      stock: 13,
      image_url: getPublicUrl("storage/seagate_firecuda_540_1tb.jpg"),
    },

    // ==============================
    // SATA SSD (Top 7)
    // ==============================
    {
      name: "Samsung 870 EVO 1TB SATA SSD",
      brand: "Samsung",
      price: 4299,
      stock: 25,
      image_url: getPublicUrl("storage/samsung_870_evo_1tb.jpg"),
    },
    {
      name: "Crucial MX500 1TB SATA SSD",
      brand: "Crucial",
      price: 3799,
      stock: 28,
      image_url: getPublicUrl("storage/crucial_mx500_1tb.jpg"),
    },
    {
      name: "WD Blue 3D NAND 1TB SATA SSD",
      brand: "Western Digital",
      price: 3699,
      stock: 30,
      image_url: getPublicUrl("storage/wd_blue_3d_1tb.jpg"),
    },
    {
      name: "SanDisk Ultra 3D 500GB SATA SSD",
      brand: "SanDisk",
      price: 2499,
      stock: 32,
      image_url: getPublicUrl("storage/sandisk_ultra_3d_500gb.jpg"),
    },
    {
      name: "Kingston A400 480GB SATA SSD",
      brand: "Kingston",
      price: 1899,
      stock: 35,
      image_url: getPublicUrl("storage/kingston_a400_480gb.jpg"),
    },
    {
      name: "ADATA SU800 512GB SATA SSD",
      brand: "ADATA",
      price: 2099,
      stock: 28,
      image_url: getPublicUrl("storage/adata_su800_512gb.jpg"),
    },
    {
      name: "TeamGroup GX2 512GB SATA SSD",
      brand: "TeamGroup",
      price: 1799,
      stock: 34,
      image_url: getPublicUrl("storage/teamgroup_gx2_512gb.jpg"),
    },
    // ⭐ ADD-ON BUDGET NVMe SSDs
    {
      name: "Lexar NM620 512GB NVMe M.2",
      brand: "Lexar",
      price: 1799,
      stock: 30,
      image_url: getPublicUrl("storage/lexar_nm620_512gb.jpg"),
    },
    {
      name: "Kingston NV2 500GB NVMe M.2",
      brand: "Kingston",
      price: 1599,
      stock: 40,
      image_url: getPublicUrl("storage/kingston_nv2_500gb.jpg"),
    },
    {
      name: "TeamGroup MP33 512GB NVMe M.2",
      brand: "TeamGroup",
      price: 1799,
      stock: 35,
      image_url: getPublicUrl("storage/teamgroup_mp33_512gb.jpg"),
    },
  ];

  // 3️⃣ Insert
  const result = await insertIfNotExists("storage", storageData);

  if (result.inserted > 0) {
    console.log("\n💽 Newly added Storage Components:");
    console.table(
      storageData.slice(0, result.inserted).map((item) => ({
        Name: item.name,
        Brand: item.brand,
        Price: item.price,
        Stock: item.stock,
      }))
    );
  }

  console.log(
    `✅ Done seeding Storage components → Inserted: ${result.inserted}, Skipped: ${result.skipped}\n`
  );
}

seedStorage();
