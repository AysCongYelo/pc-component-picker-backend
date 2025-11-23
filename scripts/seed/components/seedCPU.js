import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertIfNotExists } from "../../utils/insertHelpers.js";

// Correct public URL builder
function getPublicUrl(path) {
  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage.from("components").getPublicUrl(cleanPath);
  return data.publicUrl;
}

async function seedCPU() {
  console.log("🧠 Seeding CPU Components...");

  // Fetch category ID for CPU
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "cpu")
    .single();

  if (catErr || !category) {
    console.error("❌ Missing 'cpu' category in the database!");
    return;
  }

  const cpuData = [
    // -----------------------------
    // AMD AM5 – Top 7
    // -----------------------------
    {
      name: "AMD Ryzen 9 9950X",
      brand: "AMD",
      price: 45999,
      stock: 10,
      image_url: getPublicUrl("cpu/amd_ryzen_9_9950x.jpg"),
    },
    {
      name: "AMD Ryzen 9 7900X",
      brand: "AMD",
      price: 34999,
      stock: 12,
      image_url: getPublicUrl("cpu/amd_ryzen_9_7900x.jpg"),
    },
    {
      name: "AMD Ryzen 7 7800X3D",
      brand: "AMD",
      price: 28999,
      stock: 15,
      image_url: getPublicUrl("cpu/amd_ryzen_7_7800x3d.jpg"),
    },
    {
      name: "AMD Ryzen 7 7700X",
      brand: "AMD",
      price: 22999,
      stock: 16,
      image_url: getPublicUrl("cpu/amd_ryzen_7_7700x.jpg"),
    },
    {
      name: "AMD Ryzen 5 9600X",
      brand: "AMD",
      price: 18999,
      stock: 18,
      image_url: getPublicUrl("cpu/amd_ryzen_5_9600x.jpg"),
    },
    {
      name: "AMD Ryzen 5 7600X",
      brand: "AMD",
      price: 16999,
      stock: 20,
      image_url: getPublicUrl("cpu/amd_ryzen_5_7600x.jpg"),
    },
    {
      name: "AMD Ryzen 5 7600",
      brand: "AMD",
      price: 14999,
      stock: 22,
      image_url: getPublicUrl("cpu/amd_ryzen_5_7600.jpg"),
    },

    // -----------------------------
    // AMD AM4 – Top 7
    // -----------------------------
    {
      name: "AMD Ryzen 9 5950X",
      brand: "AMD",
      price: 32999,
      stock: 10,
      image_url: getPublicUrl("cpu/amd_ryzen_9_5950x.jpg"),
    },
    {
      name: "AMD Ryzen 9 5900X",
      brand: "AMD",
      price: 24999,
      stock: 12,
      image_url: getPublicUrl("cpu/amd_ryzen_9_5900x.jpg"),
    },
    {
      name: "AMD Ryzen 7 5800X3D",
      brand: "AMD",
      price: 20999,
      stock: 14,
      image_url: getPublicUrl("cpu/amd_ryzen_7_5800x3d.jpg"),
    },
    {
      name: "AMD Ryzen 7 5700X",
      brand: "AMD",
      price: 12999,
      stock: 18,
      image_url: getPublicUrl("cpu/amd_ryzen_7_5700x.jpg"),
    },
    {
      name: "AMD Ryzen 5 5600X",
      brand: "AMD",
      price: 9999,
      stock: 20,
      image_url: getPublicUrl("cpu/amd_ryzen_5_5600x.jpg"),
    },
    {
      name: "AMD Ryzen 5 5600",
      brand: "AMD",
      price: 8999,
      stock: 24,
      image_url: getPublicUrl("cpu/amd_ryzen_5_5600.jpg"),
    },
    {
      name: "AMD Ryzen 5 5500",
      brand: "AMD",
      price: 7499,
      stock: 25,
      image_url: getPublicUrl("cpu/amd_ryzen_5_5500.jpg"),
    },

    // -----------------------------
    // Intel LGA1700 – Top 7
    // -----------------------------
    {
      name: "Intel Core i9-14900K",
      brand: "Intel",
      price: 35999,
      stock: 10,
      image_url: getPublicUrl("cpu/intel_core_i9_14900k.jpg"),
    },
    {
      name: "Intel Core i9-13900K",
      brand: "Intel",
      price: 32999,
      stock: 10,
      image_url: getPublicUrl("cpu/intel_core_i9_13900k.jpg"),
    },
    {
      name: "Intel Core i7-14700K",
      brand: "Intel",
      price: 27999,
      stock: 12,
      image_url: getPublicUrl("cpu/intel_core_i7_14700k.jpg"),
    },
    {
      name: "Intel Core i7-13700K",
      brand: "Intel",
      price: 24999,
      stock: 15,
      image_url: getPublicUrl("cpu/intel_core_i7_13700k.jpg"),
    },
    {
      name: "Intel Core i5-14600K",
      brand: "Intel",
      price: 18999,
      stock: 18,
      image_url: getPublicUrl("cpu/intel_core_i5_14600k.jpg"),
    },
    {
      name: "Intel Core i5-13600K",
      brand: "Intel",
      price: 15999,
      stock: 20,
      image_url: getPublicUrl("cpu/intel_core_i5_13600k.jpg"),
    },
    {
      name: "Intel Core i3-12100F",
      brand: "Intel",
      price: 6999,
      stock: 25,
      image_url: getPublicUrl("cpu/intel_core_i3_12100f.jpg"),
    },

    // -----------------------------
    // Intel LGA1851 – Top 7
    // -----------------------------
    {
      name: "Intel Core Ultra 9 285K",
      brand: "Intel",
      price: 38999,
      stock: 10,
      image_url: getPublicUrl("cpu/intel_core_ultra_9_285k.jpg"),
    },
    {
      name: "Intel Core Ultra 9 285",
      brand: "Intel",
      price: 35999,
      stock: 12,
      image_url: getPublicUrl("cpu/intel_core_ultra_9_285.jpg"),
    },
    {
      name: "Intel Core Ultra 7 265K",
      brand: "Intel",
      price: 29999,
      stock: 14,
      image_url: getPublicUrl("cpu/intel_core_ultra_7_265k.jpg"),
    },
    {
      name: "Intel Core Ultra 7 265",
      brand: "Intel",
      price: 26999,
      stock: 16,
      image_url: getPublicUrl("cpu/intel_core_ultra_7_265.jpg"),
    },
    {
      name: "Intel Core Ultra 7 265F",
      brand: "Intel",
      price: 25999,
      stock: 18,
      image_url: getPublicUrl("cpu/intel_core_ultra_7_265f.jpg"),
    },
    {
      name: "Intel Core Ultra 5 245K",
      brand: "Intel",
      price: 19999,
      stock: 20,
      image_url: getPublicUrl("cpu/intel_core_ultra_5_245k.jpg"),
    },
    {
      name: "Intel Core Ultra 5 245",
      brand: "Intel",
      price: 17999,
      stock: 20,
      image_url: getPublicUrl("cpu/intel_core_ultra_5_245.jpg"),
    },
  ];

  // Insert safely
  const result = await insertIfNotExists("cpu", cpuData);

  console.log(
    `✅ Done seeding CPU components → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedCPU();
