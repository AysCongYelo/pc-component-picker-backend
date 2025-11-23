// scripts/maintenance/dbHealthCheck.js
import dotenv from "dotenv";
import fs from "fs";
import { supabaseAdmin as supabase } from "../../src/supabaseAdmin.js";

dotenv.config();

const BUCKET = process.env.SUPABASE_BUCKET;
const isForce = process.argv.includes("--force");

async function dbHealthCheck() {
  console.log("🩺 PC Component Picker — Database & Storage Health Check");
  console.log("══════════════════════════════════════════════════════");

  if (!BUCKET) {
    console.error("❌ Missing SUPABASE_BUCKET in .env file!");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && !isForce) {
    console.error("🚫 Use '--force' flag to run health check in production.");
    process.exit(1);
  }

  // 1️⃣ Fetch components
  const { data: components, error: compError } = await supabase
    .from("components")
    .select("id, name, category_id, image_path, image_url");

  if (compError) {
    console.error("❌ Failed to fetch components:", compError.message);
    process.exit(1);
  }

  const totalComponents = components.length;
  const missingImageUrl = components.filter((c) => !c.image_url).length;
  const missingImagePath = components.filter((c) => !c.image_path).length;

  console.log(`📦 Total Components: ${totalComponents}`);
  console.log(`🖼️ Missing image_url: ${missingImageUrl}`);
  console.log(`📁 Missing image_path: ${missingImagePath}\n`);

  // 2️⃣ Recursive file listing
  async function getAllFiles(prefix = "") {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000 });

    if (error) {
      console.error(`⚠️ Failed to list '${prefix}':`, error.message);
      return [];
    }

    let files = [];
    for (const item of data) {
      if (item.name.includes(".")) {
        files.push(prefix ? `${prefix}/${item.name}` : item.name);
      } else {
        await new Promise((r) => setTimeout(r, 100));
        const sub = await getAllFiles(
          prefix ? `${prefix}/${item.name}` : item.name
        );
        files.push(...sub);
      }
    }
    return files;
  }

  console.log("🔍 Scanning Supabase Storage...");
  const storageFiles = await getAllFiles();
  console.log(`🧾 Total Files in Storage: ${storageFiles.length}`);

  // 3️⃣ Compare DB vs Storage
  const dbPaths = components.map((c) => c.image_path).filter(Boolean);

  const orphanedFiles = storageFiles.filter(
    (f) => !dbPaths.some((dbPath) => f.endsWith(dbPath))
  );

  const missingInStorage = dbPaths.filter(
    (p) => !storageFiles.some((f) => f.endsWith(p))
  );

  console.log(`🚫 Orphaned Files (not linked in DB): ${orphanedFiles.length}`);
  console.log(
    `⚠️ Missing in Storage (referenced in DB): ${missingInStorage.length}`
  );

  if (orphanedFiles.length > 0) {
    console.log("\n📂 Sample Orphaned Files:");
    console.table(
      orphanedFiles.slice(0, 10).map((f, i) => ({ "#": i + 1, file_path: f }))
    );
  }

  if (missingInStorage.length > 0) {
    console.log("\n📁 Sample Missing Files:");
    console.table(
      missingInStorage
        .slice(0, 10)
        .map((p, i) => ({ "#": i + 1, image_path: p }))
    );
  }

  // 4️⃣ Optional logging
  const LOG_DIR = "./scripts/logs";
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  fs.writeFileSync(
    `${LOG_DIR}/dbHealthCheck_${new Date().toISOString().split("T")[0]}.log`,
    [
      `🩺 DB Health Check Report — ${new Date().toLocaleString()}`,
      `───────────────────────────────────────`,
      `📦 Total Components: ${totalComponents}`,
      `🖼️ Missing image_url: ${missingImageUrl}`,
      `📁 Missing image_path: ${missingImagePath}`,
      `🚫 Orphaned files: ${orphanedFiles.length}`,
      `⚠️ Missing in storage: ${missingInStorage.length}`,
      `───────────────────────────────────────\n`,
      `Sample Orphans:\n${orphanedFiles.slice(0, 10).join("\n")}`,
      `\nSample Missing:\n${missingInStorage.slice(0, 10).join("\n")}`,
    ].join("\n")
  );

  console.log("\n🧾 Log saved in /scripts/logs directory.");

  // 5️⃣ Final Summary
  console.log("\n══════════════════════════════════════════════════════");
  console.log("📊 HEALTH SUMMARY");
  console.log(`🧱 Components in DB: ${totalComponents}`);
  console.log(`🖼️ Missing image_url: ${missingImageUrl}`);
  console.log(`📁 Missing image_path: ${missingImagePath}`);
  console.log(`🚫 Orphaned storage files: ${orphanedFiles.length}`);
  console.log(
    `⚠️ DB-linked but missing in storage: ${missingInStorage.length}`
  );
  console.log(`🕒 Date: ${new Date().toLocaleString()}`);
  console.log("══════════════════════════════════════════════════════");

  if (orphanedFiles.length || missingInStorage.length) {
    console.warn("\n⚠️ Issues detected. Consider running:");
    console.warn("👉 npm run storage:clean");
    console.warn("👉 npm run db:sync\n");
  } else {
    console.log("🎉 Everything looks great — no inconsistencies found!\n");
  }

  process.exit(0);
}

dbHealthCheck().catch((err) => {
  console.error("💥 Fatal error during health check:", err.message);
  process.exit(1);
});
