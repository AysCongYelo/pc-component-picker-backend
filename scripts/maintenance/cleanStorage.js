// scripts/maintenance/cleanStorage.js
import { supabaseAdmin as supabase } from "../../src/supabaseAdmin.js";
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const BUCKET = process.env.SUPABASE_BUCKET;
const isDryRun = process.argv.includes("--dry");
const isForce = process.argv.includes("--force");

async function cleanStorage() {
  console.log("🧹 Supabase Storage Cleaner — Category Mode");
  console.log("══════════════════════════════════════════════");

  if (!BUCKET) {
    console.error("❌ Missing SUPABASE_BUCKET in .env file");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && !isForce) {
    console.error(
      "🚫 Not allowed in production without --force flag. Exiting..."
    );
    process.exit(1);
  }

  // 🧩 Fetch all image paths in database
  const { data: components, error: compError } = await supabase
    .from("components")
    .select("image_path");

  if (compError) {
    console.error("❌ Failed to fetch components:", compError.message);
    process.exit(1);
  }

  const dbPaths = components.map((c) => c.image_path).filter(Boolean);
  console.log(`📦 Found ${dbPaths.length} active image references in DB.\n`);

  // 🧩 Recursively list all files
  async function listAllFiles(prefix = "") {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 1000,
    });

    if (error) {
      console.error(`❌ Error listing '${prefix}':`, error.message);
      return [];
    }

    let files = [];
    for (const item of data) {
      if (item.name.includes(".")) {
        files.push(prefix ? `${prefix}/${item.name}` : item.name);
      } else {
        await new Promise((r) => setTimeout(r, 100)); // avoid rate-limit
        const subFiles = await listAllFiles(
          prefix ? `${prefix}/${item.name}` : item.name
        );
        files.push(...subFiles);
      }
    }
    return files;
  }

  console.log("🔍 Scanning all files in Supabase storage...");
  const allFiles = await listAllFiles();
  console.log(`🧾 Found ${allFiles.length} total files in storage.\n`);

  // 🧩 Detect orphaned files
  const orphaned = allFiles.filter(
    (f) => !dbPaths.some((db) => f.endsWith(db))
  );

  if (orphaned.length === 0) {
    console.log("✅ No orphaned files found — storage is clean!");
    process.exit(0);
  }

  // 🗂️ Group by folder
  const grouped = orphaned.reduce((acc, path) => {
    const category = path.split("/")[1] || "unknown";
    acc[category] = acc[category] || [];
    acc[category].push(path);
    return acc;
  }, {});

  console.log("🧩 Orphaned files by category:");
  Object.entries(grouped).forEach(([cat, files]) => {
    console.log(`- ${cat}: ${files.length} file(s)`);
  });
  console.log("\n══════════════════════════════════════════════");

  if (isDryRun) {
    console.log("🧪 Dry run mode active — no deletions will occur.");
    console.log("💡 Run without '--dry' to actually delete orphaned files.\n");
    process.exit(0);
  }

  // 🧠 Confirm deletion
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    "🧹 Delete (a)ll or choose (s)pecific category? (a/s): ",
    async (choice) => {
      if (!["a", "s"].includes(choice)) {
        console.log("❌ Cancelled. Exiting...");
        rl.close();
        process.exit(0);
      }

      if (choice === "a") {
        rl.question(
          `⚠️ Confirm delete of ALL ${orphaned.length} orphaned files? (y/n): `,
          async (confirm) => {
            if (confirm.toLowerCase() !== "y") {
              console.log("❌ Cancelled. No deletions made.");
              rl.close();
              process.exit(0);
            }

            console.log("\n🗑️ Deleting all orphaned files...");
            await deleteFiles(orphaned);
            rl.close();
          }
        );
      } else {
        console.log("\n🗂️ Available categories:");
        Object.keys(grouped).forEach((cat, i) =>
          console.log(`${i + 1}. ${cat} (${grouped[cat].length} files)`)
        );

        rl.question("\nEnter category number to delete: ", async (num) => {
          const index = parseInt(num) - 1;
          const selected = Object.keys(grouped)[index];
          if (!selected) {
            console.log("❌ Invalid choice.");
            rl.close();
            process.exit(0);
          }

          console.log(`\n🗑️ Deleting orphaned files from "${selected}"...`);
          await deleteFiles(grouped[selected]);
          rl.close();
        });
      }
    }
  );
}

// ⚡ Batch deletion
async function deleteFiles(fileList) {
  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < fileList.length; i += batchSize) {
    const batch = fileList.slice(i, i + batchSize);
    const filtered = batch.filter(
      (file) => !file.includes("default_") && !file.includes("placeholder")
    );

    const { error } = await supabase.storage.from(BUCKET).remove(filtered);
    if (error) console.error(`❌ Failed batch:`, error.message);
    else {
      deleted += filtered.length;
      console.log(`🧩 Deleted batch (${filtered.length}) files...`);
    }
  }

  console.log("\n══════════════════════════════════════════════");
  console.log("🎉 Storage cleanup complete!");
  console.log(`🧾 Deleted: ${deleted} file(s)`);
  console.log(`🕒 Finished: ${new Date().toLocaleString()}`);
  console.log("══════════════════════════════════════════════");
  process.exit(0);
}

// 🚀 Execute
cleanStorage().catch((err) => {
  console.error("💥 Fatal error:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
