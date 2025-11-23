import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertSpecsIfNotExists } from "../../utils/insertHelpers.js";

// Normalize helper
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

async function seedCaseSpecs() {
  console.log("🧱 Seeding CASE Specs...");

  // 1️⃣ Fetch category ID
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "case")
    .single();

  if (catError || !category) {
    console.error("❌ Case category missing.");
    return;
  }

  // 2️⃣ Fetch all case components
  const { data: components, error: fetchError } = await supabase
    .from("components")
    .select("id, name")
    .eq("category_id", category.id);

  if (fetchError || !components?.length) {
    console.error("❌ No case components found.");
    return;
  }

  // ⭐ Smart Matcher
  const getId = (name) => {
    const target = normalize(name);

    let comp =
      components.find((c) => normalize(c.name) === target) ||
      components.find((c) => target.includes(normalize(c.name))) ||
      components.find((c) => normalize(c.name).includes(target));

    if (comp) return comp.id;

    // word-level fuzzy
    const words = target.match(/[a-z0-9]+/g) || [];
    comp = components.find((c) =>
      words.every((w) => normalize(c.name).includes(w))
    );

    return comp?.id || null;
  };

  // 3️⃣ RAW SPECS — Top 14 ONLY
  const caseSpecsRaw = [
    // 🟦 MID TOWER
    {
      name: "NZXT H7 Flow",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX",
        max_gpu_length: 400,
        max_cpu_cooler_height: 185,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Corsair 4000D Airflow",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX",
        max_gpu_length: 360,
        max_cpu_cooler_height: 170,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Lian Li Lancool 216",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX, E-ATX",
        max_gpu_length: 392,
        max_cpu_cooler_height: 180,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Fractal Design Meshify 2",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX, E-ATX",
        max_gpu_length: 491,
        max_cpu_cooler_height: 185,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Be Quiet! Pure Base 500DX",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX",
        max_gpu_length: 369,
        max_cpu_cooler_height: 190,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Phanteks Eclipse P400A",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX",
        max_gpu_length: 420,
        max_cpu_cooler_height: 160,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Cooler Master TD500 Mesh",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX",
        max_gpu_length: 410,
        max_cpu_cooler_height: 165,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },

    // 🟥 FULL TOWER
    {
      name: "Lian Li O11 Dynamic EVO",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX, E-ATX",
        max_gpu_length: 445,
        max_cpu_cooler_height: 167,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Corsair 5000D Airflow",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX, E-ATX",
        max_gpu_length: 420,
        max_cpu_cooler_height: 170,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Fractal Design Torrent",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX, E-ATX",
        max_gpu_length: 423,
        max_cpu_cooler_height: 188,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Be Quiet! Dark Base Pro 900",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX, E-ATX",
        max_gpu_length: 472,
        max_cpu_cooler_height: 185,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Phanteks Enthoo Pro 2",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX, E-ATX",
        max_gpu_length: 503,
        max_cpu_cooler_height: 190,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "Cooler Master HAF 700",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX, E-ATX, SSI-EEB",
        max_gpu_length: 490,
        max_cpu_cooler_height: 166,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
    {
      name: "NZXT H9 Flow",
      specs: {
        form_factor: "ATX, Micro-ATX, Mini-ITX",
        max_gpu_length: 435,
        max_cpu_cooler_height: 165,
        psu_shroud: true,
        side_panel: "Tempered Glass",
      },
    },
  ];

  // 4️⃣ Attach component IDs + structure output
  const caseSpecs = caseSpecsRaw
    .map((item) => {
      const id = getId(item.name);
      if (!id) {
        console.warn(`⚠️ No match for: ${item.name}`);
        return null;
      }

      const forms = item.specs.form_factor.split(",").map((f) => f.trim());
      return {
        component_id: id,
        form_factor: forms[0],
        form_factor_support: forms,
        max_gpu_length: item.specs.max_gpu_length,
        max_cpu_cooler_height: item.specs.max_cpu_cooler_height,
        psu_shroud: item.specs.psu_shroud,
        side_panel: item.specs.side_panel,
      };
    })
    .filter(Boolean);

  if (!caseSpecs.length) {
    console.error("❌ No valid case specs to insert.");
    return;
  }

  // 5️⃣ Insert specs
  const result = await insertSpecsIfNotExists("case_specs", caseSpecs);

  console.log(
    `✅ Done seeding CASE SPECS → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedCaseSpecs();
