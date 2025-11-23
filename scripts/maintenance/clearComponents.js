// scripts/maintenance/clearComponents.js
import { supabaseAdmin as supabase } from "../../src/supabaseAdmin.js";
import readline from "readline";

// 🧠 CLI helper
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    })
  );
}

/**
 * 🗑️ Safely delete all records from a table
 * Returns count of deleted records
 */
async function deleteAllFromTable(tableName) {
  try {
    // First, get count
    const { count: beforeCount } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (beforeCount === 0) {
      console.log(`⏭️ Table "${tableName}" is already empty.`);
      return 0;
    }

    // Delete in batches to avoid timeouts
    const BATCH_SIZE = 1000;
    let totalDeleted = 0;

    while (true) {
      const { data, error } = await supabase
        .from(tableName)
        .select("id")
        .limit(BATCH_SIZE);

      if (error) throw error;
      if (!data || data.length === 0) break;

      const ids = data.map((row) => row.id);
      const { error: delError } = await supabase
        .from(tableName)
        .delete()
        .in("id", ids);

      if (delError) throw delError;

      totalDeleted += ids.length;
      console.log(`   🗑️ Deleted ${ids.length} records from "${tableName}"...`);

      if (ids.length < BATCH_SIZE) break;
    }

    console.log(`✅ Cleared ${totalDeleted} records from "${tableName}".`);
    return totalDeleted;
  } catch (err) {
    console.error(`❌ Failed to clear "${tableName}":`, err.message);
    return 0;
  }
}

/**
 * 🗑️ Delete specs for specific component IDs
 */
async function deleteSpecsByComponentIds(tableName, componentIds) {
  if (!componentIds || componentIds.length === 0) {
    console.log(`⏭️ No components to clear specs for in "${tableName}".`);
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from(tableName)
      .delete()
      .in("component_id", componentIds)
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    console.log(`✅ Cleared ${count || 0} specs from "${tableName}".`);
    return count || 0;
  } catch (err) {
    console.error(`❌ Failed to clear specs from "${tableName}":`, err.message);
    return 0;
  }
}

async function clearComponents() {
  console.log("🧹 PC Component Picker — Clear Components Tool");
  console.log("══════════════════════════════════════════════\n");

  // 🧱 Prevent accidental production wipes
  if (process.env.NODE_ENV === "production") {
    console.error("🚫 Not allowed in production environment. Exiting...");
    process.exit(1);
  }

  const startTime = Date.now();

  const categories = [
    "case",
    "cpu",
    "cpu_cooler",
    "gpu",
    "memory",
    "motherboard",
    "psu",
    "storage",
  ];

  const specsTables = {
    case: "case_specs",
    cpu: "cpu_specs",
    cpu_cooler: "cpu_cooler_specs",
    gpu: "gpu_specs",
    memory: "memory_specs",
    motherboard: "motherboard_specs",
    psu: "psu_specs",
    storage: "storage_specs",
  };

  // 🧩 Menu
  console.log("Choose cleanup mode:");
  console.log("1️⃣  Delete ALL components + specs + rules");
  console.log("2️⃣  Delete by CATEGORY");
  console.log("3️⃣  Delete MULTIPLE categories");
  console.log("4️⃣  Delete ONLY specs (keep components)");
  console.log("5️⃣  Delete ONLY compatibility rules\n");

  const mode = await askQuestion("👉 Enter your choice (1–5): ");

  try {
    switch (mode) {
      // =====================================================
      // 1️⃣ DELETE ALL COMPONENTS + SPECS + RULES
      // =====================================================
      case "1": {
        console.log(
          "\n⚠️ This will permanently delete ALL components, specs, and compatibility rules."
        );
        const confirm = await askQuestion("Type 'confirm' to proceed: ");
        if (confirm !== "confirm") return console.log("❌ Cancelled.");

        console.log("\n🗑️ Step 1: Clearing all specs tables...");
        for (const [category, table] of Object.entries(specsTables)) {
          await deleteAllFromTable(table);
        }

        console.log("\n🗑️ Step 2: Clearing all components...");
        await deleteAllFromTable("components");

        console.log("\n🗑️ Step 3: Clearing compatibility rules...");
        await deleteAllFromTable("compatibility_rules");

        console.log("\n✅ All components, specs, and rules cleared.\n");
        break;
      }

      // =====================================================
      // 2️⃣ DELETE SINGLE CATEGORY
      // =====================================================
      case "2": {
        console.log("\n📂 Available categories:");
        categories.forEach((c, i) => console.log(`${i + 1}. ${c}`));

        const choice = await askQuestion("\n👉 Enter category number: ");
        const categorySlug = categories[parseInt(choice) - 1];
        if (!categorySlug) return console.log("⚠️ Invalid category.");

        const { data: category, error: catError } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", categorySlug)
          .single();

        if (catError || !category)
          throw new Error(`Category "${categorySlug}" not found.`);

        console.log(`\n🗑️ Clearing "${categorySlug}"...`);

        // Get all component IDs for this category
        const { data: components } = await supabase
          .from("components")
          .select("id")
          .eq("category_id", category.id);

        const componentIds = (components || []).map((c) => c.id);

        // Clear specs first
        const specsTable = specsTables[categorySlug];
        if (specsTable && componentIds.length > 0) {
          await deleteSpecsByComponentIds(specsTable, componentIds);
        }

        // Then clear components
        if (componentIds.length > 0) {
          const { error: delErr } = await supabase
            .from("components")
            .delete()
            .in("id", componentIds);

          if (delErr) throw delErr;
          console.log(
            `✅ Cleared ${componentIds.length} "${categorySlug}" components.`
          );
        } else {
          console.log(`⏭️ No "${categorySlug}" components to delete.`);
        }

        console.log(`\n✅ Category "${categorySlug}" cleared successfully!\n`);
        break;
      }

      // =====================================================
      // 3️⃣ DELETE MULTIPLE CATEGORIES
      // =====================================================
      case "3": {
        console.log("\n📂 Available categories:");
        categories.forEach((c, i) => console.log(`${i + 1}. ${c}`));

        const input = await askQuestion(
          "\n👉 Enter category numbers (comma-separated, e.g. 1,3,5): "
        );

        const indexes = input
          .split(",")
          .map((n) => parseInt(n.trim()))
          .filter((n) => !isNaN(n) && n > 0 && n <= categories.length);

        if (indexes.length === 0)
          return console.log("⚠️ No valid categories selected.");

        const selected = indexes.map((i) => categories[i - 1]);
        console.log(`🧾 Selected: ${selected.join(", ")}`);

        const confirm = await askQuestion(
          "⚠️ Type 'confirm' to delete selected categories: "
        );
        if (confirm !== "confirm") return console.log("❌ Cancelled.");

        for (const slug of selected) {
          console.log(`\n🗑️ Processing "${slug}"...`);

          const { data: category } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", slug)
            .single();

          if (!category) {
            console.warn(`⚠️ Skipping invalid category: ${slug}`);
            continue;
          }

          // Get component IDs
          const { data: components } = await supabase
            .from("components")
            .select("id")
            .eq("category_id", category.id);

          const componentIds = (components || []).map((c) => c.id);

          // Clear specs
          const specsTable = specsTables[slug];
          if (specsTable && componentIds.length > 0) {
            await deleteSpecsByComponentIds(specsTable, componentIds);
          }

          // Clear components
          if (componentIds.length > 0) {
            const { error: delErr } = await supabase
              .from("components")
              .delete()
              .in("id", componentIds);

            if (delErr) {
              console.warn(`⚠️ Failed to clear "${slug}":`, delErr.message);
            } else {
              console.log(
                `✅ Cleared ${componentIds.length} "${slug}" components.`
              );
            }
          } else {
            console.log(`⏭️ No "${slug}" components to delete.`);
          }
        }

        console.log("\n🎯 Selected categories cleared successfully!\n");
        break;
      }

      // =====================================================
      // 4️⃣ DELETE ONLY SPECS (KEEP COMPONENTS)
      // =====================================================
      case "4": {
        const confirm = await askQuestion(
          "⚠️ Delete ALL specs tables only (keep components)? (y/n): "
        );
        if (confirm !== "y") return console.log("❌ Cancelled.");

        console.log("\n🗑️ Clearing all specs tables...");
        for (const [category, table] of Object.entries(specsTables)) {
          await deleteAllFromTable(table);
        }

        console.log("\n🎉 All specs tables cleared successfully!\n");
        break;
      }

      // =====================================================
      // 5️⃣ DELETE ONLY COMPATIBILITY RULES
      // =====================================================
      case "5": {
        const confirm = await askQuestion(
          "⚠️ Delete ALL compatibility rules? (y/n): "
        );
        if (confirm !== "y") return console.log("❌ Cancelled.");

        console.log("\n🗑️ Clearing compatibility rules...");
        await deleteAllFromTable("compatibility_rules");

        console.log("\n🎉 Compatibility rules cleared successfully!\n");
        break;
      }

      default:
        console.log("⚠️ Invalid choice. Please enter 1–5.");
        break;
    }

    console.log("══════════════════════════════════════════════");
    console.log("🧹 Cleanup complete!");
    console.log("🕒 Finished:", new Date().toLocaleString());
    console.log(
      `⏱️ Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`
    );
    console.log("══════════════════════════════════════════════\n");
  } catch (err) {
    console.error("❌ Operation failed:", err.message);
  }

  process.exit(0);
}

clearComponents();
