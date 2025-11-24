// scripts/crud/viewComponents.js
import { supabase } from "../../src/db/supabaseClient.js";
import { askQuestion } from "../utils/cli.js";

// 🪄 Helper — generate public image URL
function getPublicImageUrl(image_path) {
  if (!image_path) return "—";
  const { data } = supabase.storage
    .from("components") // ✅ fixed: consistent bucket name
    .getPublicUrl(image_path);
  return data?.publicUrl || "—";
}

// 🧠 Main Viewer Logic
async function getComponentsOnce() {
  console.log("\n📦 PC Component Viewer — Start");
  console.log("──────────────────────────────────────────────");

  try {
    // 1️⃣ Fetch categories
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    if (catError) throw catError;
    if (!categories?.length) {
      console.log("⚠️ No categories found. Run `npm run db:seed` first.");
      return;
    }

    console.log("\n📂 Available Categories:");
    categories.forEach((c, i) =>
      console.log(`${i + 1}. ${c.name} (${c.slug})`)
    );

    const choice = await askQuestion(
      "\n👉 Enter category number (or press Enter to view ALL): "
    );

    let categoryId = null;
    let categorySlug = null;

    if (choice) {
      const selected = categories[parseInt(choice) - 1];
      if (!selected) {
        console.error("❌ Invalid category number.");
        return;
      }
      categoryId = selected.id;
      categorySlug = selected.slug;
      console.log(`\n🧠 Selected Category: ${selected.name}\n`);
    }

    // 2️⃣ Search filter
    const search = await askQuestion(
      "🔍 Enter component name to search (or press Enter to skip): "
    );

    // 3️⃣ Build Supabase query
    let query = supabase
      .from("components")
      .select(
        `
        id,
        name,
        brand,
        price,
        stock,
        image_path,
        category_id,
        created_at,
        categories!inner(name, slug)
      `
      )
      .order("created_at", { ascending: false });

    if (categoryId) query = query.eq("category_id", categoryId);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data: components, error } = await query;
    if (error) throw error;

    if (!components?.length) {
      console.log("⚠️ No components found for your filters.");
      return;
    }

    // 4️⃣ Include specs (optional)
    let includeSpecs = false;
    if (categorySlug) {
      includeSpecs =
        (await askQuestion("🧩 Include specs for this category? (y/n): "))
          .trim()
          .toLowerCase() === "y";
    }

    let specsMap = {};
    if (includeSpecs) {
      const specsTable = `${categorySlug}_specs`;
      const { data: specsData, error: specsError } = await supabase
        .from(specsTable)
        .select("*");

      if (!specsError && specsData?.length) {
        specsMap = Object.fromEntries(
          specsData.map((s) => [s.component_id, s])
        );
        console.log(`📄 Loaded ${specsData.length} specs from "${specsTable}"`);
      } else {
        console.log("⚠️ No specs found or table missing for this category.");
      }
    }

    // 5️⃣ Format output rows
    const rows = components.map((c) => {
      const specs = specsMap[c.id] || {};
      return {
        ID: c.id,
        Name: c.name,
        Brand: c.brand || "—",
        Price: c.price ? `₱${c.price.toLocaleString()}` : "N/A",
        Stock: c.stock ?? "N/A",
        Category: c.categories?.slug || "—",
        ImagePath: c.image_path || "—",
        ImageURL: getPublicImageUrl(c.image_path),
        ...(includeSpecs ? specs : {}),
      };
    });

    // 6️⃣ Display results
    console.log("\n🧾 Components Found:");
    console.table(rows);
    console.log(`\n✅ Found ${components.length} component(s).\n`);
  } catch (err) {
    console.error("❌ Error fetching components:", err.message);
  }
}

// 🔁 CLI Loop
async function startLoop() {
  console.log("🚀 Starting Component Viewer CLI Tool");
  console.log("──────────────────────────────────────────────");

  let again = "y";
  while (again.trim().toLowerCase() === "y") {
    await getComponentsOnce();
    again = await askQuestion("🔁 View another category? (y/n): ");
  }

  console.log("\n👋 Exiting Component Viewer.\n");
  process.exit(0);
}

startLoop().catch((err) => console.error("💥 Unexpected Error:", err));
