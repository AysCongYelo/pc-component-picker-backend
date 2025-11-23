import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertSpecsIfNotExists } from "../../utils/insertHelpers.js";

// Normalize text for fuzzy matching
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

async function seedGpuSpecs() {
  console.log("🎮 Seeding GPU Specs...");

  // 1️⃣ Get GPU category
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "gpu")
    .single();

  if (catError || !category) {
    console.error("❌ GPU category missing.");
    return;
  }

  // 2️⃣ Fetch GPU components
  const { data: components, error: fetchError } = await supabase
    .from("components")
    .select("id, name")
    .eq("category_id", category.id);

  if (fetchError || !components?.length) {
    console.error("❌ No GPU components found.");
    return;
  }

  // ⭐ SUPER SMART MATCHER
  const getId = (name) => {
    const target = normalize(name);

    let comp =
      components.find((c) => normalize(c.name) === target) ||
      components.find((c) => normalize(c.name).includes(target)) ||
      components.find((c) => target.includes(normalize(c.name)));

    if (comp) return comp.id;

    const words = target.match(/[a-z0-9]+/g) || [];
    comp = components.find((c) => {
      const cname = normalize(c.name);
      return words.every((w) => cname.includes(w));
    });

    return comp?.id || null;
  };

  // 3️⃣ GPU Specs — EXACTLY your curated GPUs ONLY
  const gpuSpecsRaw = [
    // =============================
    // NVIDIA (7)
    // =============================
    {
      name: "NVIDIA GeForce RTX 4090 24GB",
      specs: {
        chipset: "Ada Lovelace",
        memory_size: "24 GB GDDR6X",
        core_clock: 2235,
        boost_clock: 2520,
        tdp: 450,
        length: 336,
        ports: ["3x DisplayPort 1.4a", "1x HDMI 2.1"],
      },
    },
    {
      name: "NVIDIA GeForce RTX 4080 Super 16GB",
      specs: {
        chipset: "Ada Lovelace",
        memory_size: "16 GB GDDR6X",
        core_clock: 2295,
        boost_clock: 2550,
        tdp: 320,
        length: 304,
        ports: ["3x DisplayPort 1.4a", "1x HDMI 2.1"],
      },
    },
    {
      name: "NVIDIA GeForce RTX 4070 Ti Super 16GB",
      specs: {
        chipset: "Ada Lovelace",
        memory_size: "16 GB GDDR6X",
        core_clock: 2340,
        boost_clock: 2640,
        tdp: 285,
        length: 285,
        ports: ["3x DisplayPort 1.4a", "1x HDMI 2.1"],
      },
    },
    {
      name: "NVIDIA GeForce RTX 4070 Super 12GB",
      specs: {
        chipset: "Ada Lovelace",
        memory_size: "12 GB GDDR6X",
        core_clock: 1980,
        boost_clock: 2475,
        tdp: 220,
        length: 267,
        ports: ["3x DisplayPort 1.4a", "1x HDMI 2.1"],
      },
    },
    {
      name: "NVIDIA GeForce RTX 4070 12GB",
      specs: {
        chipset: "Ada Lovelace",
        memory_size: "12 GB GDDR6X",
        core_clock: 1920,
        boost_clock: 2475,
        tdp: 200,
        length: 244,
        ports: ["3x DisplayPort 1.4a", "1x HDMI 2.1"],
      },
    },
    {
      name: "NVIDIA GeForce RTX 4060 Ti 16GB",
      specs: {
        chipset: "Ada Lovelace",
        memory_size: "16 GB GDDR6",
        core_clock: 2310,
        boost_clock: 2535,
        tdp: 165,
        length: 244,
        ports: ["3x DisplayPort 1.4a", "1x HDMI 2.1"],
      },
    },
    {
      name: "NVIDIA GeForce RTX 4060 Ti 8GB",
      specs: {
        chipset: "Ada Lovelace",
        memory_size: "8 GB GDDR6",
        core_clock: 2310,
        boost_clock: 2535,
        tdp: 160,
        length: 244,
        ports: ["3x DisplayPort 1.4a", "1x HDMI 2.1"],
      },
    },

    // =============================
    // AMD (7)
    // =============================
    {
      name: "AMD Radeon RX 7900 XTX 24GB",
      specs: {
        chipset: "RDNA 3",
        memory_size: "24 GB GDDR6",
        core_clock: 2300,
        boost_clock: 2500,
        tdp: 355,
        length: 287,
        ports: ["2x DisplayPort 2.1", "1x HDMI 2.1", "1x USB-C"],
      },
    },
    {
      name: "AMD Radeon RX 7900 XT 20GB",
      specs: {
        chipset: "RDNA 3",
        memory_size: "20 GB GDDR6",
        core_clock: 2000,
        boost_clock: 2400,
        tdp: 300,
        length: 276,
        ports: ["2x DisplayPort 2.1", "1x HDMI 2.1", "1x USB-C"],
      },
    },
    {
      name: "AMD Radeon RX 7900 GRE 16GB",
      specs: {
        chipset: "RDNA 3",
        memory_size: "16 GB GDDR6",
        core_clock: 1880,
        boost_clock: 2245,
        tdp: 260,
        length: 267,
        ports: ["2x DisplayPort 2.1", "1x HDMI 2.1"],
      },
    },
    {
      name: "AMD Radeon RX 7800 XT 16GB",
      specs: {
        chipset: "RDNA 3",
        memory_size: "16 GB GDDR6",
        core_clock: 2124,
        boost_clock: 2430,
        tdp: 263,
        length: 267,
        ports: ["2x DisplayPort 2.1", "1x HDMI 2.1"],
      },
    },
    {
      name: "AMD Radeon RX 7700 XT 12GB",
      specs: {
        chipset: "RDNA 3",
        memory_size: "12 GB GDDR6",
        core_clock: 2171,
        boost_clock: 2544,
        tdp: 245,
        length: 267,
        ports: ["2x DisplayPort 2.1", "1x HDMI 2.1"],
      },
    },
    {
      name: "AMD Radeon RX 7600 XT 16GB",
      specs: {
        chipset: "RDNA 3",
        memory_size: "16 GB GDDR6",
        core_clock: 2220,
        boost_clock: 2725,
        tdp: 190,
        length: 267,
        ports: ["3x DisplayPort 2.1", "1x HDMI 2.1"],
      },
    },
    {
      name: "AMD Radeon RX 7600 8GB",
      specs: {
        chipset: "RDNA 3",
        memory_size: "8 GB GDDR6",
        core_clock: 2250,
        boost_clock: 2655,
        tdp: 165,
        length: 267,
        ports: ["3x DisplayPort 2.1", "1x HDMI 2.1"],
      },
    },
  ];

  // 4️⃣ Build insertable payload
  const gpuSpecs = gpuSpecsRaw
    .map((item) => {
      const id = getId(item.name);
      if (!id) {
        console.warn(`⚠️ No match for: ${item.name}`);
        return null;
      }

      const s = item.specs;
      return {
        component_id: id,
        chipset: s.chipset,
        memory_size: s.memory_size,
        core_clock: Number(s.core_clock),
        boost_clock: Number(s.boost_clock),
        tdp: Number(s.tdp),
        length: Number(s.length),
        ports: s.ports,
      };
    })
    .filter(Boolean);

  if (!gpuSpecs.length) {
    console.error("❌ Nothing to insert.");
    return;
  }

  // 5️⃣ Insert
  const result = await insertSpecsIfNotExists("gpu_specs", gpuSpecs);

  console.log(
    `✅ Done seeding GPU specs → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedGpuSpecs();
