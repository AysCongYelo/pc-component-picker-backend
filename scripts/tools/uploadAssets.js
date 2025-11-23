// scripts/tools/uploadAssets.js
import fs from "fs";
import path from "path";
import mime from "mime";
import dotenv from "dotenv";
import { supabaseAdmin as supabase } from "../../src/supabaseAdmin.js";

dotenv.config();

const BUCKET = process.env.SUPABASE_BUCKET;
const BASE_DIR = "./assets"; // 👈 Your local assets folder (no backend prefix)

// 🧩 Upload all component images to Supabase
async function uploadAssets() {
  console.log("🚀 PC Component Picker — Upload Assets to Supabase Storage");
  console.log("══════════════════════════════════════════════════\n");

  // 🧠 1️⃣ Sanity checks
  if (!BUCKET) {
    console.error("❌ Missing SUPABASE_BUCKET in .env file.");
    process.exit(1);
  }

  if (!fs.existsSync(BASE_DIR)) {
    console.error(`❌ Assets folder not found: ${BASE_DIR}`);
    process.exit(1);
  }

  // 🧩 2️⃣ Get all category subfolders (e.g. cpu, gpu, case, etc.)
  const categories = fs.readdirSync(BASE_DIR).filter((folder) => {
    const fullPath = path.join(BASE_DIR, folder);
    return fs.statSync(fullPath).isDirectory();
  });

  if (categories.length === 0) {
    console.log("⚠️ No subfolders found under ./assets/");
    process.exit(0);
  }

  let uploadedCount = 0;
  let failedCount = 0;

  // 🧩 3️⃣ Iterate through each category folder
  for (const category of categories) {
    console.log(`📂 Uploading category: ${category}`);

    const dirPath = path.join(BASE_DIR, category);
    const files = fs.readdirSync(dirPath).filter((f) => !f.startsWith("."));

    if (files.length === 0) {
      console.log(`⚠️ Skipping ${category} — empty folder.\n`);
      continue;
    }

    // Loop through each file in the folder
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = mime.getType(filePath) || "application/octet-stream";

      // 🧠 Clean + normalize file names
      const cleanFileName = file
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[!()]/g, "")
        .replace(/[^a-z0-9_.-]/g, ""); // keeps only safe chars

      // 🧩 Correct Supabase path (NO 'assets/' prefix!)
      const uploadPath = `${category}/${cleanFileName}`;

      // 🧠 Check if file exists
      const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(category, { limit: 1000 });

      const exists = existing?.some((f) => f.name === cleanFileName);
      if (exists) {
        console.log(
          `↩️  File exists: ${uploadPath} — overwriting (upsert: true)`
        );
      }

      // 🧩 4️⃣ Upload (with retries)
      let attempt = 0;
      const maxRetries = 2;
      let uploaded = false;

      while (!uploaded && attempt <= maxRetries) {
        attempt++;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(uploadPath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (error) {
          console.error(
            `❌ Attempt ${attempt} failed for ${uploadPath}: ${error.message}`
          );
          if (attempt === maxRetries) {
            failedCount++;
            console.warn(`⚠️ Skipping after ${maxRetries} failed attempts.`);
          } else {
            await new Promise((res) => setTimeout(res, 500));
          }
        } else {
          uploadedCount++;
          uploaded = true;
          console.log(`✅ Uploaded: ${uploadPath}`);
        }
      }
    }

    console.log(`✅ Finished category: ${category}\n`);
  }

  // 🧾 Summary
  console.log("══════════════════════════════════════════════════");
  console.log("🎉 Upload Complete!");
  console.log(`🟢 Uploaded: ${uploadedCount}`);
  console.log(`🔴 Failed:   ${failedCount}`);
  console.log("══════════════════════════════════════════════════\n");
  console.log(`🕒 Finished: ${new Date().toLocaleString()}`);
  process.exit(0);
}

// 🚀 Run the script
uploadAssets().catch((err) => {
  console.error("💥 Unexpected error during upload:", err.message);
  process.exit(1);
});
