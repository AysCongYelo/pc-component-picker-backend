import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertSpecsIfNotExists } from "../../utils/insertHelpers.js";

// Normalize strings for fuzzy matching
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

// Parse GHz safely
const parseGHz = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const match = value.toString().match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
};

// Parse Watts safely
const parseWatt = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const match = value.toString().match(/([\d.]+)/);
  return match ? parseInt(match[1]) : 0;
};

async function seedCpuSpecs() {
  console.log("🧠 Seeding CPU Specs...");

  // 1️⃣ CPU category
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "cpu")
    .single();

  if (catError || !category) {
    console.error("❌ CPU category missing.");
    return;
  }

  // 2️⃣ Fetch CPU components
  const { data: components, error: fetchError } = await supabase
    .from("components")
    .select("id, name")
    .eq("category_id", category.id);

  if (fetchError || !components?.length) {
    console.error("❌ No CPU components found.");
    return;
  }

  // ✅ IMPROVED: Stricter fuzzy matcher with length check
  const getId = (name) => {
    const target = normalize(name);

    // Try exact match first
    let comp = components.find((c) => normalize(c.name) === target);
    if (comp) return comp.id;

    // Try matching with length similarity check (prevent substring false positives)
    comp = components.find((c) => {
      const cname = normalize(c.name);
      const targetLen = target.length;
      const cnameLen = cname.length;

      // Length must be within 1 character (handles X, K, F suffixes)
      if (Math.abs(targetLen - cnameLen) > 1) return false;

      // Check if one contains the other
      return target.includes(cname) || cname.includes(target);
    });
    if (comp) return comp.id;

    // Word-level matching (as last resort)
    const words = target.match(/[a-z0-9]+/g) || [];
    comp = components.find((c) => {
      const cname = normalize(c.name);
      return (
        words.every((w) => cname.includes(w)) &&
        Math.abs(target.length - cname.length) <= 2
      );
    });

    return comp?.id || null;
  };

  // 3️⃣ Full CPU specs (AM5, AM4, LGA1700, LGA1851)
  const cpuSpecsRaw = [
    // ✅ AMD AM5
    {
      name: "AMD Ryzen 9 9950X",
      specs: {
        socket: "AM5",
        cores: 16,
        threads: 32,
        base_clock: 4.3,
        boost_clock: 5.7,
        tdp: 170,
        integrated_graphics: "Radeon Graphics",
        process: "4nm",
        architecture: "Zen 5",
      },
    },
    {
      name: "AMD Ryzen 9 7900X",
      specs: {
        socket: "AM5",
        cores: 12,
        threads: 24,
        base_clock: 4.7,
        boost_clock: 5.6,
        tdp: 170,
        integrated_graphics: "Radeon Graphics",
        process: "5nm",
        architecture: "Zen 4",
      },
    },
    {
      name: "AMD Ryzen 7 7800X3D",
      specs: {
        socket: "AM5",
        cores: 8,
        threads: 16,
        base_clock: 4.2,
        boost_clock: 5.0,
        tdp: 120,
        integrated_graphics: "None",
        process: "5nm",
        architecture: "Zen 4 (3D V-Cache)",
      },
    },
    {
      name: "AMD Ryzen 7 7700X",
      specs: {
        socket: "AM5",
        cores: 8,
        threads: 16,
        base_clock: 4.5,
        boost_clock: 5.4,
        tdp: 105,
        integrated_graphics: "Radeon Graphics",
        process: "5nm",
        architecture: "Zen 4",
      },
    },
    {
      name: "AMD Ryzen 5 9600X",
      specs: {
        socket: "AM5",
        cores: 6,
        threads: 12,
        base_clock: 4.4,
        boost_clock: 5.4,
        tdp: 65,
        integrated_graphics: "Radeon Graphics",
        process: "4nm",
        architecture: "Zen 5",
      },
    },
    {
      name: "AMD Ryzen 5 7600X",
      specs: {
        socket: "AM5",
        cores: 6,
        threads: 12,
        base_clock: 4.7,
        boost_clock: 5.3,
        tdp: 105,
        integrated_graphics: "Radeon Graphics",
        process: "5nm",
        architecture: "Zen 4",
      },
    },
    {
      name: "AMD Ryzen 5 7600",
      specs: {
        socket: "AM5",
        cores: 6,
        threads: 12,
        base_clock: 3.8,
        boost_clock: 5.1,
        tdp: 65,
        integrated_graphics: "Radeon Graphics",
        process: "5nm",
        architecture: "Zen 4",
      },
    },

    // ✅ AMD AM4
    {
      name: "AMD Ryzen 9 5950X",
      specs: {
        socket: "AM4",
        cores: 16,
        threads: 32,
        base_clock: 3.4,
        boost_clock: 4.9,
        tdp: 105,
        integrated_graphics: "None",
        process: "7nm",
        architecture: "Zen 3",
      },
    },
    {
      name: "AMD Ryzen 9 5900X",
      specs: {
        socket: "AM4",
        cores: 12,
        threads: 24,
        base_clock: 3.7,
        boost_clock: 4.8,
        tdp: 105,
        integrated_graphics: "None",
        process: "7nm",
        architecture: "Zen 3",
      },
    },
    {
      name: "AMD Ryzen 7 5800X3D",
      specs: {
        socket: "AM4",
        cores: 8,
        threads: 16,
        base_clock: 3.4,
        boost_clock: 4.5,
        tdp: 105,
        integrated_graphics: "None",
        process: "7nm",
        architecture: "Zen 3 (3D V-Cache)",
      },
    },
    {
      name: "AMD Ryzen 7 5700X",
      specs: {
        socket: "AM4",
        cores: 8,
        threads: 16,
        base_clock: 3.4,
        boost_clock: 4.6,
        tdp: 65,
        integrated_graphics: "None",
        process: "7nm",
        architecture: "Zen 3",
      },
    },
    {
      name: "AMD Ryzen 5 5600X",
      specs: {
        socket: "AM4",
        cores: 6,
        threads: 12,
        base_clock: 3.7,
        boost_clock: 4.6,
        tdp: 65,
        integrated_graphics: "None",
        process: "7nm",
        architecture: "Zen 3",
      },
    },
    {
      name: "AMD Ryzen 5 5600",
      specs: {
        socket: "AM4",
        cores: 6,
        threads: 12,
        base_clock: 3.5,
        boost_clock: 4.4,
        tdp: 65,
        integrated_graphics: "None",
        process: "7nm",
        architecture: "Zen 3",
      },
    },
    {
      name: "AMD Ryzen 5 5500",
      specs: {
        socket: "AM4",
        cores: 6,
        threads: 12,
        base_clock: 3.6,
        boost_clock: 4.2,
        tdp: 65,
        integrated_graphics: "None",
        process: "7nm",
        architecture: "Zen 3",
      },
    },

    // ✅ Intel LGA1700
    {
      name: "Intel Core i9-14900K",
      specs: {
        socket: "LGA1700",
        cores: 24,
        threads: 32,
        base_clock: 3.2,
        boost_clock: 6.0,
        tdp: 125,
        integrated_graphics: "Intel UHD 770",
        process: "Intel 7",
        architecture: "Raptor Lake Refresh",
      },
    },
    {
      name: "Intel Core i9-13900K",
      specs: {
        socket: "LGA1700",
        cores: 24,
        threads: 32,
        base_clock: 3.0,
        boost_clock: 5.8,
        tdp: 125,
        integrated_graphics: "Intel UHD 770",
        process: "Intel 7",
        architecture: "Raptor Lake",
      },
    },
    {
      name: "Intel Core i7-14700K",
      specs: {
        socket: "LGA1700",
        cores: 20,
        threads: 28,
        base_clock: 3.4,
        boost_clock: 5.6,
        tdp: 125,
        integrated_graphics: "Intel UHD 770",
        process: "Intel 7",
        architecture: "Raptor Lake Refresh",
      },
    },
    {
      name: "Intel Core i7-13700K",
      specs: {
        socket: "LGA1700",
        cores: 16,
        threads: 24,
        base_clock: 3.4,
        boost_clock: 5.4,
        tdp: 125,
        integrated_graphics: "Intel UHD 770",
        process: "Intel 7",
        architecture: "Raptor Lake",
      },
    },
    {
      name: "Intel Core i5-14600K",
      specs: {
        socket: "LGA1700",
        cores: 14,
        threads: 20,
        base_clock: 3.5,
        boost_clock: 5.3,
        tdp: 125,
        integrated_graphics: "Intel UHD 770",
        process: "Intel 7",
        architecture: "Raptor Lake Refresh",
      },
    },
    {
      name: "Intel Core i5-13600K",
      specs: {
        socket: "LGA1700",
        cores: 14,
        threads: 20,
        base_clock: 3.5,
        boost_clock: 5.1,
        tdp: 125,
        integrated_graphics: "Intel UHD 770",
        process: "Intel 7",
        architecture: "Raptor Lake",
      },
    },
    {
      name: "Intel Core i3-12100F",
      specs: {
        socket: "LGA1700",
        cores: 4,
        threads: 8,
        base_clock: 3.3,
        boost_clock: 4.3,
        tdp: 58,
        integrated_graphics: "None",
        process: "Intel 7",
        architecture: "Alder Lake",
      },
    },

    // ✅ Intel LGA1851
    {
      name: "Intel Core Ultra 9 285K",
      specs: {
        socket: "LGA1851",
        cores: 24,
        threads: 32,
        base_clock: 3.4,
        boost_clock: 5.8,
        tdp: 125,
        integrated_graphics: "Intel Arc Xe2",
        process: "Intel 4",
        architecture: "Arrow Lake",
      },
    },
    {
      name: "Intel Core Ultra 9 285",
      specs: {
        socket: "LGA1851",
        cores: 24,
        threads: 32,
        base_clock: 3.4,
        boost_clock: 5.6,
        tdp: 125,
        integrated_graphics: "Intel Arc Xe2",
        process: "Intel 4",
        architecture: "Arrow Lake",
      },
    },
    {
      name: "Intel Core Ultra 7 265K",
      specs: {
        socket: "LGA1851",
        cores: 20,
        threads: 28,
        base_clock: 3.2,
        boost_clock: 5.5,
        tdp: 125,
        integrated_graphics: "Intel Arc Xe2",
        process: "Intel 4",
        architecture: "Arrow Lake",
      },
    },
    {
      name: "Intel Core Ultra 7 265",
      specs: {
        socket: "LGA1851",
        cores: 20,
        threads: 28,
        base_clock: 3.2,
        boost_clock: 5.4,
        tdp: 125,
        integrated_graphics: "Intel Arc Xe2",
        process: "Intel 4",
        architecture: "Arrow Lake",
      },
    },
    {
      name: "Intel Core Ultra 7 265F",
      specs: {
        socket: "LGA1851",
        cores: 20,
        threads: 28,
        base_clock: 3.2,
        boost_clock: 5.4,
        tdp: 125,
        integrated_graphics: "None",
        process: "Intel 4",
        architecture: "Arrow Lake",
      },
    },
    {
      name: "Intel Core Ultra 5 245K",
      specs: {
        socket: "LGA1851",
        cores: 14,
        threads: 20,
        base_clock: 3.4,
        boost_clock: 5.2,
        tdp: 125,
        integrated_graphics: "Intel Arc Xe2",
        process: "Intel 4",
        architecture: "Arrow Lake",
      },
    },
    {
      name: "Intel Core Ultra 5 245",
      specs: {
        socket: "LGA1851",
        cores: 14,
        threads: 20,
        base_clock: 3.4,
        boost_clock: 5.1,
        tdp: 125,
        integrated_graphics: "Intel Arc Xe2",
        process: "Intel 4",
        architecture: "Arrow Lake",
      },
    },
  ];

  // 4️⃣ Build final payload with duplicate detection
  const seenIds = new Map();
  const cpuSpecs = cpuSpecsRaw
    .map((item) => {
      const id = getId(item.name);
      if (!id) {
        console.warn(`⚠️ No match for: ${item.name}`);
        return null;
      }

      // Check for duplicate component_id
      if (seenIds.has(id)) {
        console.warn(
          `⚠️ DUPLICATE: "${item.name}" matched same ID as "${seenIds.get(id)}"`
        );
        return null;
      }
      seenIds.set(id, item.name);

      const s = item.specs;
      return {
        component_id: id,
        socket: s.socket,
        cores: s.cores,
        threads: s.threads,
        base_clock: parseGHz(s.base_clock),
        boost_clock: parseGHz(s.boost_clock),
        tdp: parseWatt(s.tdp),
        integrated_graphics: s.integrated_graphics,
        process: s.process,
        architecture: s.architecture,
      };
    })
    .filter(Boolean);

  if (!cpuSpecs.length) return console.error("❌ Nothing to insert.");

  console.log(
    `📊 Matched ${cpuSpecs.length} unique CPUs out of ${cpuSpecsRaw.length} specs.`
  );

  // 5️⃣ Insert safely
  const result = await insertSpecsIfNotExists("cpu_specs", cpuSpecs);
  console.log(
    `✅ Done seeding CPU Specs → Inserted: ${result.inserted}, Updated: ${result.updated}, Skipped: ${result.skipped}`
  );
}

seedCpuSpecs();
