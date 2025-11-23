import { supabaseAdmin as supabase } from "../../src/supabaseAdmin.js";

/**
 * 🌱 Inserts components safely (prevents duplicates + auto-creates category)
 * Matches on (name + brand + category_id).
 */
export async function insertIfNotExists(categorySlug, dataArray = []) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.warn(`⚠️ No data provided for ${categorySlug}.`);
    return { inserted: 0, skipped: 0 };
  }

  console.log(`\n🌱 Seeding ${categorySlug.toUpperCase()} components...`);

  // 1️⃣ Get category ID (or auto-create)
  let { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (catError || !category) {
    console.warn(
      `⚠️ Category "${categorySlug}" not found — creating it now...`
    );

    const { data: newCat, error: newCatErr } = await supabase
      .from("categories")
      .insert([{ name: categorySlug.toUpperCase(), slug: categorySlug }])
      .select()
      .single();

    if (newCatErr || !newCat) {
      console.error(
        `❌ Failed to create category "${categorySlug}":`,
        newCatErr?.message
      );
      return { inserted: 0, skipped: dataArray.length };
    }

    category = newCat;
    console.log(`✅ Created missing category "${categorySlug}"`);
  }

  // 2️⃣ Normalize image URLs + paths + vendor
  const itemsWithCategory = dataArray.map((item) => {
    const image_url = item.image_url || null;
    let image_path = null;

    // ✅ Correct public URL parser for Supabase storage
    if (image_url) {
      const match = image_url.match(/\/object\/public\/components\/(.+)$/);
      if (match) {
        image_path = decodeURIComponent(match[1].replace(/^\/+/, ""));
      }
    }

    return {
      ...item,
      vendor: item.vendor || item.brand || null,
      image_url,
      image_path,
      category_id: category.id,
    };
  });

  // 3️⃣ Check existing by (name + brand + category_id)
  const names = itemsWithCategory.map((i) => i.name);
  const brands = itemsWithCategory.map((i) => i.brand);

  const { data: existing, error: existingError } = await supabase
    .from("components")
    .select("name, brand, category_id")
    .eq("category_id", category.id)
    .in("name", names)
    .in("brand", brands);

  if (existingError) {
    console.error(
      `❌ Failed to fetch existing ${categorySlug}:`,
      existingError.message
    );
    return { inserted: 0, skipped: dataArray.length };
  }

  const existingSet = new Set(
    (existing || []).map((e) =>
      `${e.name}|${e.brand}|${e.category_id}`.toLowerCase()
    )
  );

  // 4️⃣ Filter new items
  const newItems = itemsWithCategory.filter((item) => {
    const key = `${item.name}|${item.brand}|${category.id}`.toLowerCase();
    return !existingSet.has(key);
  });

  if (newItems.length === 0) {
    console.log(`⏭️ All ${categorySlug} components already exist.`);
    return { inserted: 0, skipped: itemsWithCategory.length };
  }

  // 5️⃣ Insert new components
  const { error: insertError } = await supabase
    .from("components")
    .insert(newItems);

  if (insertError) {
    console.error(`❌ Failed to insert ${categorySlug}:`, insertError.message);
    return { inserted: 0, skipped: itemsWithCategory.length };
  }

  console.log(`✅ Inserted ${newItems.length} new ${categorySlug} components.`);

  return {
    inserted: newItems.length,
    skipped: itemsWithCategory.length - newItems.length,
  };
}

/**
 * ⚙️ Inserts specs safely using UPSERT (idempotent)
 * Links specs by component_id in their respective specs tables.
 */
export async function insertSpecsIfNotExists(tableName, specsArray = []) {
  if (!Array.isArray(specsArray) || specsArray.length === 0) {
    console.warn(`⚠️ No specs provided for ${tableName}.`);
    return { inserted: 0, skipped: 0, updated: 0 };
  }

  console.log(`\n🧩 Seeding specs into "${tableName}"...`);

  // 🧹 Clean stringified arrays into real arrays
  const sanitizedSpecs = specsArray.map((spec) => {
    const cleaned = {};
    for (const [key, value] of Object.entries(spec)) {
      if (
        typeof value === "string" &&
        value.trim().startsWith("[") &&
        value.trim().endsWith("]")
      ) {
        try {
          cleaned[key] = JSON.parse(value);
        } catch {
          cleaned[key] = [value];
        }
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  });

  // ✅ Use UPSERT directly - handles both insert and update
  const { data, error: upsertError } = await supabase
    .from(tableName)
    .upsert(sanitizedSpecs, {
      onConflict: "component_id",
      ignoreDuplicates: false, // Update existing records
    })
    .select();

  if (upsertError) {
    console.error(
      `❌ Failed to upsert into ${tableName}:`,
      upsertError.message
    );
    return { inserted: 0, skipped: 0, updated: 0 };
  }

  // Check which ones were actually inserted vs updated
  const componentIds = sanitizedSpecs.map((s) => s.component_id);

  const { data: existing, error: checkError } = await supabase
    .from(tableName)
    .select("component_id")
    .in("component_id", componentIds);

  if (checkError) {
    console.log(
      `✅ Upserted ${sanitizedSpecs.length} specs into "${tableName}".`
    );
    return {
      inserted: 0,
      updated: sanitizedSpecs.length,
      skipped: 0,
    };
  }

  const existingCount = existing?.length || 0;
  const insertedCount = sanitizedSpecs.length - existingCount;
  const updatedCount = existingCount;

  if (insertedCount > 0) {
    console.log(`✅ Inserted ${insertedCount} new specs into "${tableName}".`);
  }
  if (updatedCount > 0) {
    console.log(`✅ Updated ${updatedCount} existing specs in "${tableName}".`);
  }
  if (insertedCount === 0 && updatedCount === 0) {
    console.log(`⏭️ No changes made to "${tableName}".`);
  }

  return {
    inserted: insertedCount,
    updated: updatedCount,
    skipped: 0,
  };
}
