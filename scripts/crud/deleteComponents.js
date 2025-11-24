// scripts/crud/deleteComponent.js
import { supabase } from "../../src/db/supabaseClient.js";
import { askQuestion } from "../utils/cli.js";

// 🧹 Safe Delete CLI Tool
async function deleteOnce() {
  console.log("\n🗑️ Delete Component — Start");
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

  console.log("📦 Available categories:");
  categories.forEach((c, i) => console.log(`${i + 1}. ${c}`));

  const choice = await askQuestion("\n👉 Enter category number: ");
  const categorySlug = categories[parseInt(choice) - 1];
  if (!categorySlug) {
    console.error("⚠️ Invalid category. Exiting...");
    return;
  }

  // 2️⃣ Get category_id
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (catError || !category) {
    console.error(`❌ Category "${categorySlug}" not found.`);
    return;
  }

  // 3️⃣ Search component(s)
  const search = await askQuestion("🔍 Enter component name (partial ok): ");
  const { data: components, error: compError } = await supabase
    .from("components")
    .select("id, name, price, stock, image_path")
    .eq("category_id", category.id)
    .ilike("name", `%${search}%`);

  if (compError) {
    console.error("❌ Fetch failed:", compError.message);
    return;
  }
  if (!components?.length) {
    console.log("⚠️ No matching components found.");
    return;
  }

  console.table(
    components.map((c) => ({
      id: c.id,
      name: c.name,
      price: `₱${c.price.toLocaleString()}`,
      stock: c.stock ?? "N/A",
      image_path: c.image_path || "—",
    }))
  );

  // 4️⃣ Select IDs to delete
  const idsInput = await askQuestion(
    "\n🆔 Enter component ID(s) to delete (comma-separated): "
  );
  const idsArray = idsInput
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  if (!idsArray.length) {
    console.log("⚠️ No valid IDs entered. Skipping...");
    return;
  }

  // 5️⃣ Confirm deletion
  const confirmDelete = await askQuestion(
    `⚠️ Are you sure you want to delete ${idsArray.length} item(s)? (y/n): `
  );
  if (confirmDelete.trim().toLowerCase() !== "y") {
    console.log("❌ Cancelled. Nothing deleted.");
    return;
  }

  // 6️⃣ Delete specs (if exists)
  const specsTable = `${categorySlug}_specs`;
  const { error: specsDelErr } = await supabase
    .from(specsTable)
    .delete()
    .in("component_id", idsArray);

  if (specsDelErr && !specsDelErr.message.includes("does not exist")) {
    console.warn(
      `⚠️ Could not delete specs from "${specsTable}":`,
      specsDelErr.message
    );
  } else {
    console.log(`🧩 Specs deleted from "${specsTable}" (if they existed).`);
  }

  // 7️⃣ Delete main components
  const { error: delError } = await supabase
    .from("components")
    .delete()
    .in("id", idsArray);

  if (delError) {
    console.error("❌ Component deletion failed:", delError.message);
    return;
  }

  console.log(`✅ Successfully deleted ${idsArray.length} component(s).`);

  // 8️⃣ Delete related images (optional)
  const deleteImages = await askQuestion(
    "🖼️ Delete related images from Supabase Storage too? (y/n): "
  );

  if (deleteImages.trim().toLowerCase() === "y") {
    const imagePaths = components
      .filter((c) => idsArray.includes(String(c.id)) && c.image_path)
      .map((c) => c.image_path);

    if (imagePaths.length > 0) {
      // ✅ Fixed: use your actual bucket name
      const { error: storageError } = await supabase.storage
        .from("components")
        .remove(imagePaths);

      if (storageError) {
        console.error(
          "⚠️ Some images could not be deleted:",
          storageError.message
        );
      } else {
        console.log(`🧹 Deleted ${imagePaths.length} image(s) from storage.`);
      }
    } else {
      console.log("ℹ️ No image paths found to delete.");
    }
  }

  console.log("──────────────────────────────\n");
}

// 🔁 CLI loop
async function startLoop() {
  console.log("🚀 Starting Delete Component CLI Tool");
  console.log("──────────────────────────────────────");

  let again = "y";
  while (again.trim().toLowerCase() === "y") {
    await deleteOnce();
    again = await askQuestion("🗑️ Delete another component? (y/n): ");
  }

  console.log("\n✅ Done deleting components. Exiting tool. 👋");
  process.exit(0);
}

startLoop().catch((err) => console.error("💥 Unexpected Error:", err));
