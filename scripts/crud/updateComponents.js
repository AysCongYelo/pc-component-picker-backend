// scripts/crud/updateComponent.js
import { supabase } from "../../src/db/supabaseClient.js";
import fs from "fs";
import path from "path";
import mime from "mime";
import { askQuestion } from "../utils/cli.js";
import { formatValue } from "../utils/format.js";
import { sanitizeInputs } from "../utils/sanitize.js";

// 🔗 Generate public image URL from the "components" bucket
function getPublicImageUrl(image_path) {
  if (!image_path) return null;
  const { data } = supabase.storage.from("components").getPublicUrl(image_path);
  return data?.publicUrl || null;
}

async function updateComponentOnce() {
  console.log("\n✏️ Update Component — Start");
  console.log("──────────────────────────────");

  // 1️⃣ Category selection
  const categories = [
    "cpu",
    "cpu_cooler",
    "motherboard",
    "gpu",
    "memory",
    "storage",
    "psu",
    "case",
  ];

  categories.forEach((c, i) => console.log(`${i + 1}. ${c}`));
  const choice = await askQuestion("\n👉 Enter category number: ");
  const categorySlug = categories[parseInt(choice) - 1];
  if (!categorySlug) {
    console.error("❌ Invalid category.");
    return;
  }

  // 2️⃣ Fetch category_id
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (catError || !category) {
    console.error("❌ Failed to fetch category:", catError?.message);
    return;
  }

  // 3️⃣ Search for component
  const search = await askQuestion("🔍 Enter component name (partial ok): ");
  const { data: components, error: compError } = await supabase
    .from("components")
    .select("id, name, brand, price, stock, image_path, image_url")
    .eq("category_id", category.id)
    .ilike("name", `%${search}%`);

  if (compError) {
    console.error("❌ Fetch failed:", compError.message);
    return;
  }

  if (!components?.length) {
    console.log("⚠️ No components found.");
    return;
  }

  console.table(
    components.map((c) => ({
      id: c.id,
      name: c.name,
      brand: c.brand,
      price: `₱${c.price.toLocaleString()}`,
      stock: c.stock ?? "N/A",
    }))
  );

  const compId = await askQuestion("\n🆔 Enter component ID to update: ");
  const selected = components.find((c) => String(c.id) === compId.trim());

  if (!selected) {
    console.error("⚠️ Component not found.");
    return;
  }

  console.log(
    `\n📄 Editing "${selected.name}" (${categorySlug.toUpperCase()})`
  );

  // 4️⃣ Edit base fields
  const brand = await askQuestion(`Brand (${selected.brand}): `);
  const price = await askQuestion(`Price (₱${selected.price}): `);
  const stock = await askQuestion(`Stock (${selected.stock}): `);

  const { cleanPrice, cleanStock } = sanitizeInputs(price, stock);
  const updates = {};
  if (brand) updates.brand = brand.trim();
  if (price) updates.price = cleanPrice;
  if (stock) updates.stock = cleanStock;

  // 5️⃣ Replace image (if chosen)
  const changeImg = await askQuestion("🖼️ Replace image? (y/n): ");
  if (changeImg.toLowerCase() === "y") {
    const localPath = await askQuestion(
      "📁 Path to new image (e.g. ./assets/cpu/ryzen9.jpg): "
    );
    if (!fs.existsSync(localPath)) {
      console.error("❌ File not found:", localPath);
      return;
    }

    const fileName = path.basename(localPath);
    const uploadPath = `${categorySlug}/${fileName}`;
    const mimeType = mime.getType(localPath) || "image/jpeg";
    const fileBuffer = fs.readFileSync(localPath);

    console.log("📤 Uploading new image...");

    // Delete old image
    if (selected.image_path) {
      await supabase.storage.from("components").remove([selected.image_path]);
    }

    // Upload new one
    const { error: uploadError } = await supabase.storage
      .from("components")
      .upload(uploadPath, fileBuffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error("❌ Upload failed:", uploadError.message);
      return;
    }

    const image_url = getPublicImageUrl(uploadPath);
    updates.image_path = uploadPath;
    updates.image_url = image_url;
    console.log(`✅ Image updated → ${image_url}`);
  }

  // 6️⃣ Apply updates
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("components")
      .update(updates)
      .eq("id", selected.id);

    if (error) {
      console.error("❌ Component update failed:", error.message);
      return;
    }

    console.log("✅ Component info updated successfully!");
  } else {
    console.log("ℹ️ No changes made to component info.");
  }

  // 7️⃣ Update specs
  const updateSpecs = await askQuestion("🧩 Update specs too? (y/n): ");
  if (updateSpecs.toLowerCase() === "y") {
    const specsTable = `${categorySlug}_specs`;
    const { data: specs, error: specError } = await supabase
      .from(specsTable)
      .select("*")
      .eq("component_id", selected.id)
      .maybeSingle();

    if (specError && !specError.message.includes("No rows")) {
      console.error("❌ Failed to fetch specs:", specError.message);
      return;
    }

    if (!specs) {
      console.log("⚠️ No specs found for this component.");
      return;
    }

    const newSpecs = {};
    for (const [key, value] of Object.entries(specs)) {
      if (["id", "component_id", "created_at"].includes(key)) continue;
      const ans = await askQuestion(`${key} (${value ?? "—"}): `);
      if (ans) newSpecs[key] = formatValue(key, ans);
    }

    if (Object.keys(newSpecs).length > 0) {
      const { error: specsErr } = await supabase
        .from(specsTable)
        .update(newSpecs)
        .eq("component_id", selected.id);

      if (specsErr) console.error("❌ Specs update failed:", specsErr.message);
      else console.log("✅ Specs updated successfully!");
    } else {
      console.log("ℹ️ No changes made to specs.");
    }
  }

  console.log("\n🎉 Update complete!\n──────────────────────────────\n");
}

// 🔁 CLI Loop
async function startLoop() {
  console.log("🚀 Starting Update Component CLI Tool");
  console.log("──────────────────────────────");

  let again = "y";
  while (again.toLowerCase() === "y") {
    await updateComponentOnce();
    again = await askQuestion("✏️ Update another component? (y/n): ");
  }

  console.log("\n✅ All done! Exiting tool. 👋");
  process.exit(0);
}

startLoop().catch((err) => console.error("💥 Unexpected Error:", err));
