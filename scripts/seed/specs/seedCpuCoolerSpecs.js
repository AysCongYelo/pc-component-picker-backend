import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertSpecsIfNotExists } from "../../utils/insertHelpers.js";

// Normalize string for fuzzy matching
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

async function seedCpuCoolerSpecs() {
  console.log("🧊 Seeding CPU Cooler Specs (Top 14)...");

  // 1️⃣ Get category_id for CPU cooler
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "cpu_cooler")
    .single();

  if (catError || !category) {
    console.error("❌ CPU Cooler category missing.");
    return;
  }

  // 2️⃣ Fetch CPU cooler components from DB
  const { data: components, error: fetchError } = await supabase
    .from("components")
    .select("id, name")
    .eq("category_id", category.id);

  if (fetchError || !components?.length) {
    console.error("❌ No CPU cooler components found.");
    return;
  }

  // ⭐ SUPER SMART MATCHER
  const getId = (name) => {
    const target = normalize(name);

    let comp =
      components.find((c) => normalize(c.name) === target) ||
      components.find((c) => target.includes(normalize(c.name))) ||
      components.find((c) => normalize(c.name).includes(target));

    if (comp) return comp.id;

    // token fuzzy
    const words = target.match(/[a-z0-9]+/g) || [];
    comp = components.find((c) =>
      words.every((w) => normalize(c.name).includes(w))
    );

    return comp?.id || null;
  };

  // 3️⃣ **FINAL Top 14 Cooler Specs**
  const coolerSpecsRaw = [
    // =============== AIR COOLERS ===============
    {
      name: "Noctua NH-D15",
      specs: {
        type: "Air Cooler (Dual Tower)",
        fan_rpm: "300–1500 RPM",
        noise_level: "24.6 dBA",
        height: 165,
        compatible_sockets: ["LGA1700", "LGA1200", "AM5", "AM4"],
      },
    },
    {
      name: "be quiet! Dark Rock Pro 4",
      specs: {
        type: "Air Cooler (Dual Tower)",
        fan_rpm: "600–1500 RPM",
        noise_level: "24.3 dBA",
        height: 163,
        compatible_sockets: ["LGA1700", "LGA115x", "AM5", "AM4"],
      },
    },
    {
      name: "Thermalright Peerless Assassin 120 SE",
      specs: {
        type: "Air Cooler (Dual Tower)",
        fan_rpm: "500–1550 RPM",
        noise_level: "25.6 dBA",
        height: 157,
        compatible_sockets: ["LGA1700", "LGA115x", "AM5", "AM4"],
      },
    },
    {
      name: "Deepcool AK620",
      specs: {
        type: "Air Cooler (Dual Tower)",
        fan_rpm: "500–1850 RPM",
        noise_level: "28 dBA",
        height: 160,
        compatible_sockets: ["LGA1700", "LGA115x", "AM5", "AM4"],
      },
    },
    {
      name: "Noctua NH-U12S",
      specs: {
        type: "Air Cooler",
        fan_rpm: "300–1500 RPM",
        noise_level: "22.4 dBA",
        height: 158,
        compatible_sockets: ["LGA1700", "LGA1200", "AM5", "AM4"],
      },
    },
    {
      name: "Arctic Freezer 36",
      specs: {
        type: "Air Cooler",
        fan_rpm: "200–1800 RPM",
        noise_level: "22.4 dBA",
        height: 158,
        compatible_sockets: ["LGA1700", "LGA1151", "AM5", "AM4"],
      },
    },
    {
      name: "ID-COOLING SE-226-XT",
      specs: {
        type: "Air Cooler",
        fan_rpm: "700–1800 RPM",
        noise_level: "26.4 dBA",
        height: 154,
        compatible_sockets: ["LGA1700", "LGA115x", "AM5", "AM4"],
      },
    },

    // =============== AIO COOLERS ===============
    {
      name: "Corsair iCUE H150i Elite LCD 360mm",
      specs: {
        type: "Liquid Cooler (AIO)",
        fan_rpm: "400–2400 RPM",
        noise_level: "10–37 dBA",
        height: 360,
        compatible_sockets: ["LGA1700", "LGA1200", "AM5", "AM4"],
      },
    },
    {
      name: "Lian Li Galahad II Trinity 360mm",
      specs: {
        type: "Liquid Cooler (AIO)",
        fan_rpm: "300–2100 RPM",
        noise_level: "29 dBA",
        height: 360,
        compatible_sockets: ["LGA1700", "LGA1200", "AM5", "AM4"],
      },
    },
    {
      name: "Arctic Liquid Freezer II 280mm",
      specs: {
        type: "Liquid Cooler (AIO)",
        fan_rpm: "200–1700 RPM",
        noise_level: "22.5 dBA",
        height: 280,
        compatible_sockets: ["LGA1700", "LGA1200", "AM5", "AM4"],
      },
    },
    {
      name: "NZXT Kraken Elite 360mm",
      specs: {
        type: "Liquid Cooler (AIO)",
        fan_rpm: "500–1800 RPM",
        noise_level: "21–36 dBA",
        height: 360,
        compatible_sockets: ["LGA1700", "LGA1200", "AM5", "AM4"],
      },
    },
    {
      name: "Deepcool LT720 360mm",
      specs: {
        type: "Liquid Cooler (AIO)",
        fan_rpm: "500–2250 RPM",
        noise_level: "32 dBA",
        height: 360,
        compatible_sockets: ["LGA1700", "LGA1200", "AM5", "AM4"],
      },
    },
    {
      name: "be quiet! Pure Loop 2 FX 360mm",
      specs: {
        type: "Liquid Cooler (AIO)",
        fan_rpm: "500–2000 RPM",
        noise_level: "32.1 dBA",
        height: 360,
        compatible_sockets: ["LGA1700", "LGA1200", "AM5", "AM4"],
      },
    },
    {
      name: "Corsair iCUE H100i RGB Elite 240mm",
      specs: {
        type: "Liquid Cooler (AIO)",
        fan_rpm: "400–1850 RPM",
        noise_level: "10–28 dBA",
        height: 240,
        compatible_sockets: ["LGA1700", "LGA1200", "AM5", "AM4"],
      },
    },
  ];

  // 4️⃣ Attach IDs + format specs
  const coolerSpecs = coolerSpecsRaw
    .map((item) => {
      const id = getId(item.name);
      if (!id) {
        console.warn(`⚠️ No match for: ${item.name}`);
        return null;
      }

      return {
        component_id: id,
        type: item.specs.type,
        fan_rpm: item.specs.fan_rpm,
        noise_level: item.specs.noise_level,
        height: Number(item.specs.height),
        compatible_sockets: item.specs.compatible_sockets,
      };
    })
    .filter(Boolean);

  if (!coolerSpecs.length) {
    console.error("❌ No valid cooler specs to insert.");
    return;
  }

  // 5️⃣ Insert specs safely
  const result = await insertSpecsIfNotExists("cpu_cooler_specs", coolerSpecs);

  console.log(
    `✅ Done seeding CPU COOLER SPECS → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedCpuCoolerSpecs();
