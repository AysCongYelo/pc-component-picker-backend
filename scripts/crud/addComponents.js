// scripts/crud/addComponent.js
import { supabase } from "../../src/db/supabaseClient.js";
import fs from "fs";
import path from "path";
import mime from "mime";
import { askQuestion } from "../utils/cli.js";
import { formatValue } from "../utils/format.js";

// 🧹 Sanitize basic numeric inputs
function sanitizeInputs(component) {
  component.stock = parseInt(component.stock) || 0;
  if (component.price) {
    const clean = String(component.price).replace(/[₱,]/g, "").trim();
    const parsed = parseFloat(clean);
    component.price = isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
  } else {
    component.price = 0;
  }
  if (component.price < 0) component.price = 0;
  return component;
}

// 🧠 SPECS SCHEMA — must match DB
const SPECS_SCHEMA = {
  cpu: [
    "socket",
    "cores",
    "threads",
    "base_clock",
    "boost_clock",
    "tdp",
    "integrated_graphics",
    "process",
    "architecture",
  ],
  cpu_cooler: [
    "type",
    "fan_rpm",
    "noise_level",
    "height",
    "compatible_sockets",
  ],
  motherboard: [
    "socket",
    "chipset",
    "form_factor",
    "memory_slots",
    "memory_type",
    "max_memory",
    "max_memory_gb",
    "max_memory_speed_mhz", // ✅ fixed typo
    "storage_support",
    "pcie_slots",
  ],
  gpu: [
    "chipset",
    "memory_size",
    "core_clock",
    "boost_clock",
    "tdp",
    "length",
    "ports",
  ],
  memory: [
    "capacity",
    "capacity_gb",
    "type",
    "speed",
    "speed_mhz",
    "modules",
    "cas_latency",
  ],
  storage: ["capacity", "capacity_gb", "type", "interface", "form_factor"],
  psu: [
    "wattage",
    "efficiency_rating",
    "efficiency_level",
    "modular",
    "form_factor",
  ],
  case: [
    "form_factor",
    "max_gpu_length",
    "max_cpu_cooler_height",
    "psu_shroud",
    "side_panel",
    "form_factor_support",
  ],
};

async function addComponentOnce() {
  console.log("\n🧩 Add New Component — Start");
  console.log("──────────────────────────────");

  // 🔹 Step 1: Choose category
  const categories = Object.keys(SPECS_SCHEMA);
  console.log("\nAvailable Categories:");
  categories.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));

  const catChoice = await askQuestion("\n👉 Enter category number: ");
  const categorySlug = categories[parseInt(catChoice) - 1];
  if (!categorySlug) {
    console.log("❌ Invalid category selected.");
    return;
  }

  console.log(`\n🧠 Selected Category: ${categorySlug.toUpperCase()}\n`);

  // 🔹 Step 2: Basic details
  const name = await askQuestion("Component Name: ");
  const brand = await askQuestion("Brand: ");
  const price = await askQuestion("Price (₱): ");
  const stock = await askQuestion("Stock Quantity: ");

  const newComponent = sanitizeInputs({ name, brand, price, stock });

  // 🔹 Step 3: Upload image to Supabase Storage
  const localPathInput = await askQuestion(
    "Local image path (e.g. ./assets/cpu/ryzen9.jpg): "
  );
  const localPath = localPathInput.replace(/^["']|["']$/g, "").trim();

  if (!fs.existsSync(localPath)) {
    console.error("❌ File not found:", localPath);
    return;
  }

  const fileName = path.basename(localPath);
  const uploadPath = `${categorySlug}/${fileName}`; // ✅ consistent with your seeder
  const mimeType = mime.getType(localPath) || "image/jpeg";
  const fileBuffer = fs.readFileSync(localPath);

  console.log("📤 Uploading image...");
  const { error: uploadError } = await supabase.storage
    .from("components") // ✅ fixed: use your bucket name directly
    .upload(uploadPath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("❌ Upload failed:", uploadError.message);
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from("components")
    .getPublicUrl(uploadPath);

  newComponent.image_path = uploadPath;
  newComponent.image_url = publicUrlData.publicUrl;

  // 🔹 Step 4: Get category_id from DB
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (catError || !category) {
    console.error("❌ Failed to fetch category:", catError?.message);
    return;
  }

  newComponent.category_id = category.id;

  // 🔹 Step 5: Insert into components table
  const { data: inserted, error: insertError } = await supabase
    .from("components")
    .insert(newComponent)
    .select()
    .single();

  if (insertError) {
    console.error("❌ Component insert failed:", insertError.message);
    return;
  }

  const componentId = inserted.id;
  console.log(`✅ Component added successfully! ID: ${componentId}`);

  // 🔹 Step 6: Insert specs
  const specsFields = SPECS_SCHEMA[categorySlug];
  const specs = { component_id: componentId };

  console.log(`\n⚙️ Enter ${categorySlug.toUpperCase()} specs:`);
  for (const field of specsFields) {
    const value = await askQuestion(`${field.replace(/_/g, " ")}: `);
    specs[field] = formatValue(field, value);
  }

  const tableName = `${categorySlug}_specs`;
  const { error: specsError } = await supabase.from(tableName).insert(specs);

  if (specsError) {
    console.error("❌ Specs insert failed:", specsError.message);
    return;
  }

  console.log(`✅ Specs successfully saved to ${tableName}!`);
  console.log("──────────────────────────────\n");
}

// 🔁 Continuous CLI
async function startLoop() {
  console.log("🚀 Starting Add Component CLI Tool");
  console.log("──────────────────────────────");

  let again = "y";
  while (again.toLowerCase() === "y") {
    await addComponentOnce();
    again = await askQuestion("➕ Add another component? (y/n): ");
  }

  console.log("\n👋 Done! Exiting Add Component tool.\n");
  process.exit(0);
}

startLoop().catch((err) => console.error("💥 Unexpected Error:", err));
