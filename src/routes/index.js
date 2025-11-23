// src/routes/index.js
// Safe, production-ready dynamic route loader.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function registerRoutes(app) {
  const routesPath = path.resolve(__dirname);
  const files = fs.readdirSync(routesPath);

  let count = 0;

  for (const file of files) {
    if (!file.endsWith("Routes.js") || file === "index.js") continue;

    const modulePath = path.join(routesPath, file);

    let routeModule = null;

    try {
      // Safe dual import resolution
      routeModule = await import(pathToFileURL(modulePath).href);
    } catch (err1) {
      try {
        routeModule = await import(`./${file}`);
      } catch (err2) {
        console.error(
          `❌ Failed to import route file: ${file}\n   →`,
          err2 instanceof Error ? err2.message : err2
        );
        continue;
      }
    }

    const handler = routeModule?.default;

    if (typeof handler !== "function") {
      console.error(
        `⚠️ Route file ${file} does not export a valid router (export default router). Skipping.`
      );
      continue;
    }

    // Route name
    const name = file.replace("Routes.js", "").toLowerCase();

    app.use(`/api/${name}`, handler);
    count++;
    console.log(`✔ Mounted /api/${name}`);
  }

  if (count === 0) {
    console.warn("⚠️ No route files were registered. Check your filenames.");
  }
}
