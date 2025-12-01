import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertSpecsIfNotExists } from "../../utils/insertHelpers.js";

// 🔧 Normalizers
const normalize = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeUpper = (str) =>
  str ? str.toString().trim().toUpperCase() : "UNKNOWN";

const normalizeModular = (value) => {
  if (!value) return "NONE";
  const v = value.toString().toLowerCase();
  if (v.includes("fully")) return "FULL";
  if (v.includes("semi")) return "SEMI";
  return "NONE";
};

// ⭐ SMART MATCHER 2.0 — exact → contains → normalized → token fuzzy
const buildSmartMatcher = (components) => (name) => {
  const targetLower = (name || "").toLowerCase();
  const targetNorm = normalize(name);

  // 1) exact lower
  let comp = components.find(
    (c) => (c.name || "").toLowerCase() === targetLower
  );
  if (comp) return comp.id;

  // 2) contains
  comp = components.find((c) =>
    (c.name || "").toLowerCase().includes(targetLower)
  );
  if (comp) return comp.id;

  // 3) exact normalized
  comp = components.find((c) => normalize(c.name) === targetNorm);
  if (comp) return comp.id;

  // 4) token fuzzy match (best catch-all)
  const tokens = targetNorm.split(/[^a-z0-9]+/).filter(Boolean);
  comp = components.find((c) => {
    const cNorm = normalize(c.name);
    return tokens.every((t) => cNorm.includes(t));
  });
  if (comp) return comp.id;

  return null;
};

async function seedPsuSpecs() {
  console.log("⚡ Seeding PSU Specs...");

  // 1️⃣ Fetch category
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "psu")
    .maybeSingle();

  if (catError || !category) {
    console.error("❌ PSU category missing.");
    return;
  }

  // 2️⃣ Fetch components
  const { data: components, error: fetchError } = await supabase
    .from("components")
    .select("id, name")
    .eq("category_id", category.id);

  if (fetchError || !components?.length) {
    console.error("❌ No PSU components found.");
    return;
  }

  const getId = buildSmartMatcher(components);

  // 3️⃣ PSU Specs Raw — EXACTLY matching your curated 14 PSUs
  const psuSpecsRaw = [
    // High Wattage (850W+)
    {
      name: "Corsair RM1000x 1000W 80+ Gold",
      specs: {
        wattage: 1000,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Seasonic Focus GX-1000 1000W 80+ Gold",
      specs: {
        wattage: 1000,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "EVGA SuperNOVA 1000 G6 1000W 80+ Gold",
      specs: {
        wattage: 1000,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "MSI MPG A1000G 1000W 80+ Gold",
      specs: {
        wattage: 1000,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Corsair HX1000i 1000W 80+ Platinum",
      specs: {
        wattage: 1000,
        efficiency_rating: "80+ Platinum",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Seasonic Prime TX-1000 1000W 80+ Titanium",
      specs: {
        wattage: 1000,
        efficiency_rating: "80+ Titanium",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "ASUS ROG Thor 1200W 80+ Platinum",
      specs: {
        wattage: 1200,
        efficiency_rating: "80+ Platinum",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },

    // Mid Wattage (650W–750W)
    {
      name: "Corsair RM750e 750W 80+ Gold",
      specs: {
        wattage: 750,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Seasonic Focus GM-750 750W 80+ Gold",
      specs: {
        wattage: 750,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "EVGA SuperNOVA 750 GT 750W 80+ Gold",
      specs: {
        wattage: 750,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "MSI MAG A750GL 750W 80+ Gold",
      specs: {
        wattage: 750,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "be quiet! Pure Power 11 FM 750W 80+ Gold",
      specs: {
        wattage: 750,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Cooler Master MWE Gold 750W",
      specs: {
        wattage: 750,
        efficiency_rating: "80+ Gold",
        modular: "Semi-Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Seasonic Core GM-650 650W 80+ Gold",
      specs: {
        wattage: 650,
        efficiency_rating: "80+ Gold",
        modular: "Fully Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Corsair CV550 550W 80+ Bronze",
      specs: {
        wattage: 550,
        efficiency_rating: "80+ Bronze",
        modular: "Non-Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Corsair CV650 650W 80+ Bronze",
      specs: {
        wattage: 650,
        efficiency_rating: "80+ Bronze",
        modular: "Non-Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Cooler Master Elite V3 600W",
      specs: {
        wattage: 600,
        efficiency_rating: "Standard",
        modular: "Non-Modular",
        form_factor: "ATX",
      },
    },
    {
      name: "Seasonic S12III 550W 80+ Bronze",
      specs: {
        wattage: 550,
        efficiency_rating: "80+ Bronze",
        modular: "Non-Modular",
        form_factor: "ATX",
      },
    },
  ];

  // 4️⃣ Normalize + convert into payload
  const psuSpecs = psuSpecsRaw
    .map((item) => {
      const id = getId(item.name);
      if (!id) {
        console.warn(`⚠️ No match for: ${item.name}`);
        return null;
      }

      const s = item.specs;
      const rating = normalizeUpper(s.efficiency_rating || "");
      const level = rating.replace("80+", "").trim() || "UNKNOWN";

      return {
        component_id: id,
        wattage: Number(s.wattage),
        efficiency_rating: rating,
        efficiency_level: level,
        modular: normalizeModular(s.modular),
        form_factor: normalizeUpper(s.form_factor),
      };
    })
    .filter(Boolean);

  if (!psuSpecs.length) {
    console.error("❌ No valid PSU specs to insert.");
    return;
  }

  // 5️⃣ Insert safely
  const result = await insertSpecsIfNotExists("psu_specs", psuSpecs);

  console.log(
    `✅ Done seeding PSU specs → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedPsuSpecs();
