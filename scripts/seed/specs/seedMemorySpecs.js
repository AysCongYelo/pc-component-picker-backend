import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertSpecsIfNotExists } from "../../utils/insertHelpers.js";

// Helper extractors
const extractNumber = (str) => {
  if (!str) return 0;
  const match = str.toString().match(/([\d.]+)/);
  return match ? Number(match[1]) : 0;
};

const normalizeModules = (str) => {
  if (!str) return "UNKNOWN";
  return str.replace(/\s+/g, "").toUpperCase(); // "2x16 GB" → "2X16GB"
};

const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

async function seedMemorySpecs() {
  console.log("💾 Seeding Memory Specs...");

  // 1️⃣ Fetch memory category
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "memory")
    .single();

  if (catError || !category) {
    console.error("❌ Memory category missing!");
    return;
  }

  // 2️⃣ Fetch memory components
  const { data: components, error: fetchError } = await supabase
    .from("components")
    .select("id, name")
    .eq("category_id", category.id);

  if (fetchError || !components.length) {
    console.error("❌ No memory components found!");
    return;
  }

  // ⭐ SMART MATCHER
  const getId = (name) => {
    const target = normalize(name);

    // exact normalized
    let comp = components.find((c) => normalize(c.name) === target);
    if (comp) return comp.id;

    // db name contains target
    comp = components.find((c) => normalize(c.name).includes(target));
    if (comp) return comp.id;

    // target contains db name
    comp = components.find((c) => target.includes(normalize(c.name)));
    if (comp) return comp.id;

    // word-group fuzzy match
    const words = target.match(/[a-z0-9]+/g) || [];
    comp = components.find((c) => {
      const cname = normalize(c.name);
      return words.every((w) => cname.includes(w));
    });

    return comp?.id || null;
  };

  // ============================================================
  // 3️⃣ STRICT CURATED RAM SPECS — EXACT 14 MODELS
  // ============================================================

  const memorySpecsRaw = [
    // =======================
    // DDR5 — TOP 7
    // =======================
    {
      name: "Corsair Vengeance DDR5 6000MHz 32GB (2x16GB)",
      specs: {
        capacity: "32 GB",
        type: "DDR5",
        speed: "6000 MHz",
        modules: "2x16 GB",
        cas_latency: "CL36",
      },
    },
    {
      name: "G.Skill Trident Z5 RGB 6400MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR5",
        speed: "6400 MHz",
        modules: "2x16 GB",
        cas_latency: "CL32",
      },
    },
    {
      name: "Kingston Fury Beast DDR5 5600MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR5",
        speed: "5600 MHz",
        modules: "2x16 GB",
        cas_latency: "CL40",
      },
    },
    {
      name: "Corsair Dominator Platinum RGB 6600MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR5",
        speed: "6600 MHz",
        modules: "2x16 GB",
        cas_latency: "CL32",
      },
    },
    {
      name: "TeamGroup T-Force Delta RGB 6000MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR5",
        speed: "6000 MHz",
        modules: "2x16 GB",
        cas_latency: "CL36",
      },
    },
    {
      name: "Crucial DDR5 5600MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR5",
        speed: "5600 MHz",
        modules: "2x16 GB",
        cas_latency: "CL46",
      },
    },
    {
      name: "ADATA XPG Lancer RGB 6000MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR5",
        speed: "6000 MHz",
        modules: "2x16 GB",
        cas_latency: "CL40",
      },
    },

    // =======================
    // DDR4 — TOP 7
    // =======================
    {
      name: "Corsair Vengeance LPX 3200MHz 32GB (2x16GB)",
      specs: {
        capacity: "32 GB",
        type: "DDR4",
        speed: "3200 MHz",
        modules: "2x16 GB",
        cas_latency: "CL16",
      },
    },
    {
      name: "G.Skill Ripjaws V 3600MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR4",
        speed: "3600 MHz",
        modules: "2x16 GB",
        cas_latency: "CL18",
      },
    },
    {
      name: "Kingston Fury Beast 3200MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR4",
        speed: "3200 MHz",
        modules: "2x16 GB",
        cas_latency: "CL16",
      },
    },
    {
      name: "Corsair Vengeance RGB Pro 3600MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR4",
        speed: "3600 MHz",
        modules: "2x16 GB",
        cas_latency: "CL18",
      },
    },
    {
      name: "G.Skill Trident Z RGB 3600MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR4",
        speed: "3600 MHz",
        modules: "2x16 GB",
        cas_latency: "CL18",
      },
    },
    {
      name: "TeamGroup T-Force Vulcan Z 3200MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR4",
        speed: "3200 MHz",
        modules: "2x16 GB",
        cas_latency: "CL16",
      },
    },
    {
      name: "Crucial Ballistix 3200MHz 32GB",
      specs: {
        capacity: "32 GB",
        type: "DDR4",
        speed: "3200 MHz",
        modules: "2x16 GB",
        cas_latency: "CL16",
      },
    },
  ];

  // ============================================================
  // 4️⃣ Build final insert payload
  // ============================================================

  const memorySpecs = memorySpecsRaw
    .map((item) => {
      const id = getId(item.name);

      if (!id) {
        console.warn(`⚠️ No match for: ${item.name}`);
        return null;
      }

      const s = item.specs;

      return {
        component_id: id,
        capacity: s.capacity,
        capacity_gb: extractNumber(s.capacity),
        type: s.type.toUpperCase(),
        speed: s.speed,
        speed_mhz: extractNumber(s.speed),
        modules: normalizeModules(s.modules),
        cas_latency: s.cas_latency.toUpperCase(),
      };
    })
    .filter(Boolean);

  if (!memorySpecs.length) {
    console.error("❌ No valid RAM specs generated.");
    return;
  }

  // 5️⃣ Insert safely
  const result = await insertSpecsIfNotExists("memory_specs", memorySpecs);

  console.log(
    `✅ Done seeding Memory Specs → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedMemorySpecs();
