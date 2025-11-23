// scripts/seed/runAllSeeds.js
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------
// SEED ORDER (components → specs)
// Compatibility seeds removed (deprecated)
// ---------------------------------------------
const seedFiles = [
  // 1) Base components (must run first)
  "components/seedCase.js",
  "components/seedCPU.js",
  "components/seedCpuCooler.js",
  "components/seedGPU.js",
  "components/seedMemory.js",
  "components/seedMotherboard.js",
  "components/seedPSU.js",
  "components/seedStorage.js",

  // 2) Specs (dependent on components)
  "specs/seedCaseSpecs.js",
  "specs/seedCpuSpecs.js",
  "specs/seedCpuCoolerSpecs.js",
  "specs/seedGpuSpecs.js",
  "specs/seedMemorySpecs.js",
  "specs/seedMotherboardSpecs.js",
  "specs/seedPsuSpecs.js",
  "specs/seedStorageSpecs.js",
];

// ---------------------------------------------
// Helper: Sleep
// ---------------------------------------------
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------
// Execute a single seeder
// ---------------------------------------------
async function runSeed(relativePath) {
  const fullPath = path.join(__dirname, relativePath);

  console.log(`\n▶️ Running: ${relativePath}`);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️ Skipped: File not found (${relativePath})`);
    return { status: "skipped" };
  }

  try {
    const cmd = `node "${fullPath}"`;
    const { stdout, stderr } = await execAsync(cmd);

    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());

    console.log(`✅ Completed: ${relativePath}`);
    return { status: "success" };
  } catch (err) {
    console.error(`❌ Error in ${relativePath}: ${err.message}`);
    return { status: "failed" };
  }
}

// ---------------------------------------------
// MAIN RUNNER
// ---------------------------------------------
(async () => {
  console.log("🌱 PC Component Picker — Full Database Seeder");
  console.log("══════════════════════════════════════════════");

  const startTime = Date.now();
  let success = 0,
    failed = 0,
    skipped = 0;

  for (const file of seedFiles) {
    const start = Date.now();
    const result = await runSeed(`./${file}`);

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`🕒 Time: ${duration}s`);
    console.log("──────────────────────────────────────────────");

    if (result.status === "success") success++;
    else if (result.status === "failed") failed++;
    else skipped++;

    // Small delay to avoid DB flooding
    await delay(300);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n🎉 All seeding scripts finished!");
  console.log("══════════════════════════════════════════════");
  console.log(`✅ Successful: ${success}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️ Total time: ${totalTime}s`);
  console.log(`📅 Finished: ${new Date().toLocaleString()}`);
  console.log("══════════════════════════════════════════════\n");
})();
