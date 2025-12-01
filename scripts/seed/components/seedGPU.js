import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertIfNotExists } from "../../utils/insertHelpers.js";

// ✅ Safe public URL generator
function getPublicUrl(path) {
  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage.from("components").getPublicUrl(cleanPath);
  return data.publicUrl;
}

async function seedGPU() {
  console.log("🎮 Seeding GPU Components...");

  // 1️⃣ Get GPU category ID
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "gpu")
    .single();

  if (catErr || !category) {
    console.error("❌ Missing 'gpu' category!");
    return;
  }

  // 2️⃣ GPU Data — EXACTLY your Top 14 GPUs
  const gpuData = [
    // ===================================
    // NVIDIA (Top 7)
    // ===================================
    {
      name: "NVIDIA GeForce RTX 4090 24GB",
      brand: "NVIDIA",
      price: 129999,
      stock: 5,
      image_url: getPublicUrl("gpu/nvidia_rtx_4090_24gb.jpg"),
    },
    {
      name: "NVIDIA GeForce RTX 4080 Super 16GB",
      brand: "NVIDIA",
      price: 98999,
      stock: 6,
      image_url: getPublicUrl("gpu/nvidia_rtx_4080_super_16gb.jpg"),
    },
    {
      name: "NVIDIA GeForce RTX 4070 Ti Super 16GB",
      brand: "NVIDIA",
      price: 69999,
      stock: 8,
      image_url: getPublicUrl("gpu/nvidia_rtx_4070_ti_super_16gb.jpg"),
    },
    {
      name: "NVIDIA GeForce RTX 4070 Super 12GB",
      brand: "NVIDIA",
      price: 58999,
      stock: 9,
      image_url: getPublicUrl("gpu/nvidia_rtx_4070_super_12gb.jpg"),
    },
    {
      name: "NVIDIA GeForce RTX 4070 12GB",
      brand: "NVIDIA",
      price: 49999,
      stock: 11,
      image_url: getPublicUrl("gpu/nvidia_rtx_4070_12gb.jpg"),
    },
    {
      name: "NVIDIA GeForce RTX 4060 Ti 16GB",
      brand: "NVIDIA",
      price: 38999,
      stock: 10,
      image_url: getPublicUrl("gpu/nvidia_rtx_4060_ti_16gb.jpg"),
    },
    {
      name: "NVIDIA GeForce RTX 4060 Ti 8GB",
      brand: "NVIDIA",
      price: 31999,
      stock: 12,
      image_url: getPublicUrl("gpu/nvidia_rtx_4060_ti_8gb.jpg"),
    },

    // ===================================
    // AMD Radeon (Top 7)
    // ===================================
    {
      name: "AMD Radeon RX 7900 XTX 24GB",
      brand: "AMD",
      price: 84999,
      stock: 7,
      image_url: getPublicUrl("gpu/amd_rx_7900_xtx_24gb.jpg"),
    },
    {
      name: "AMD Radeon RX 7900 XT 20GB",
      brand: "AMD",
      price: 73999,
      stock: 8,
      image_url: getPublicUrl("gpu/amd_rx_7900_xt_20gb.jpg"),
    },
    {
      name: "AMD Radeon RX 7900 GRE 16GB",
      brand: "AMD",
      price: 59999,
      stock: 9,
      image_url: getPublicUrl("gpu/amd_rx_7900_gre_16gb.jpg"),
    },
    {
      name: "AMD Radeon RX 7800 XT 16GB",
      brand: "AMD",
      price: 55999,
      stock: 10,
      image_url: getPublicUrl("gpu/amd_rx_7800_xt_16gb.jpg"),
    },
    {
      name: "AMD Radeon RX 7700 XT 12GB",
      brand: "AMD",
      price: 44999,
      stock: 10,
      image_url: getPublicUrl("gpu/amd_rx_7700_xt_12gb.jpg"),
    },
    {
      name: "AMD Radeon RX 7600 XT 16GB",
      brand: "AMD",
      price: 32999,
      stock: 12,
      image_url: getPublicUrl("gpu/amd_rx_7600_xt_16gb.jpg"),
    },
    {
      name: "AMD Radeon RX 7600 8GB",
      brand: "AMD",
      price: 29999,
      stock: 15,
      image_url: getPublicUrl("gpu/amd_rx_7600_8gb.jpg"),
    },
    // ⭐ ADD-ON GPUs (Budget to Midrange)
    {
      name: "NVIDIA GeForce GTX 1650 4GB",
      brand: "NVIDIA",
      price: 8999,
      stock: 20,
      image_url: getPublicUrl("gpu/nvidia_gtx_1650_4gb.jpg"),
    },
    {
      name: "AMD Radeon RX 580 8GB",
      brand: "AMD",
      price: 6499,
      stock: 18,
      image_url: getPublicUrl("gpu/amd_rx_580_8gb.jpg"),
    },
    {
      name: "Intel ARC A750 8GB",
      brand: "Intel",
      price: 11999,
      stock: 15,
      image_url: getPublicUrl("gpu/intel_arc_a750_8gb.jpg"),
    },
    {
      name: "NVIDIA GeForce RTX 3050 6GB",
      brand: "NVIDIA",
      price: 12999,
      stock: 16,
      image_url: getPublicUrl("gpu/nvidia_rtx_3050_6gb.jpg"),
    },
    {
      name: "NVIDIA GeForce RTX 3050 8GB",
      brand: "NVIDIA",
      price: 14999,
      stock: 10,
      image_url: getPublicUrl("gpu/nvidia_rtx_3050_8gb.jpg"),
    },
  ];

  // 3️⃣ Insert via helper
  const result = await insertIfNotExists("gpu", gpuData);

  if (result.inserted > 0) {
    console.log("\n🎮 Newly added GPU components:");
    console.table(
      gpuData.slice(0, result.inserted).map((g) => ({
        Name: g.name,
        Brand: g.brand,
        Price: g.price,
        Stock: g.stock,
      }))
    );
  }

  console.log(
    `✅ Done seeding GPU components → Inserted: ${result.inserted}, Skipped: ${result.skipped}\n`
  );
}

seedGPU();
