import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertSpecsIfNotExists } from "../../utils/insertHelpers.js";

// Normalize: lowercase + remove symbols
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

async function seedStorageSpecs() {
  console.log("💽 Seeding Storage Specs...");

  // 1️⃣ Get category_id for Storage
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "storage")
    .maybeSingle();

  if (catError || !category) {
    console.error("❌ Storage category missing.");
    return;
  }

  // 2️⃣ Fetch storage components
  const { data: components, error: fetchError } = await supabase
    .from("components")
    .select("id, name")
    .eq("category_id", category.id);

  if (fetchError || !components?.length) {
    console.error("❌ No storage components found.");
    return;
  }

  // ⭐ SUPER SMART MATCHER
  const getId = (name) => {
    const target = normalize(name);

    // Level 1: exact normalized match
    let comp = components.find((c) => normalize(c.name) === target);
    if (comp) return comp.id;

    // Level 2: DB name inside specs name
    comp = components.find((c) => target.includes(normalize(c.name)));
    if (comp) return comp.id;

    // Level 3: specs name inside DB name
    comp = components.find((c) => normalize(c.name).includes(target));
    if (comp) return comp.id;

    // Level 4: fuzzy word matching
    const words = target.match(/[a-z0-9]+/g) || [];
    comp = components.find((c) => {
      const cname = normalize(c.name);
      return words.every((w) => cname.includes(w));
    });
    if (comp) return comp.id;

    return null;
  };

  // 3️⃣ STORAGE SPECS — EXACTLY MATCHING YOUR CURATED LIST
  const storageSpecsRaw = [
    // ==============================
    // PCIe 4.0 NVMe
    // ==============================
    {
      name: "Samsung 990 Pro 1TB NVMe M.2",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "WD Black SN850X 1TB NVMe M.2",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "Kingston KC3000 1TB NVMe M.2",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "Seagate FireCuda 530 1TB NVMe M.2",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "Corsair MP600 Pro 1TB NVMe M.2",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "Crucial P5 Plus 1TB NVMe M.2",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "ADATA XPG Gammix S70 Blade 1TB NVMe M.2",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },

    // ==============================
    // PCIe 5.0 NVMe
    // ==============================
    {
      name: "Crucial T700 1TB PCIe 5.0 NVMe",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "Corsair MP700 1TB PCIe 5.0 NVMe",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "MSI Spatium M570 Pro 1TB PCIe 5.0",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "Gigabyte AORUS Gen5 10000 1TB NVMe",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "TeamGroup Cardea Z54 1TB PCIe 5.0",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "ADATA Legend 970 1TB PCIe 5.0",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },
    {
      name: "Seagate FireCuda 540 1TB PCIe 5.0",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "NVME",
        form_factor: "M.2",
      },
    },

    // ==============================
    // SATA SSD (Top 7)
    // ==============================
    {
      name: "Samsung 870 EVO 1TB SATA SSD",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "SATA",
        form_factor: "2.5-INCH",
      },
    },
    {
      name: "Crucial MX500 1TB SATA SSD",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "SATA",
        form_factor: "2.5-INCH",
      },
    },
    {
      name: "WD Blue 3D NAND 1TB SATA SSD",
      specs: {
        capacity_gb: 1000,
        type: "SSD",
        interface: "SATA",
        form_factor: "2.5-INCH",
      },
    },
    {
      name: "SanDisk Ultra 3D 500GB SATA SSD",
      specs: {
        capacity_gb: 500,
        type: "SSD",
        interface: "SATA",
        form_factor: "2.5-INCH",
      },
    },
    {
      name: "Kingston A400 480GB SATA SSD",
      specs: {
        capacity_gb: 480,
        type: "SSD",
        interface: "SATA",
        form_factor: "2.5-INCH",
      },
    },
    {
      name: "ADATA SU800 512GB SATA SSD",
      specs: {
        capacity_gb: 512,
        type: "SSD",
        interface: "SATA",
        form_factor: "2.5-INCH",
      },
    },
    {
      name: "TeamGroup GX2 512GB SATA SSD",
      specs: {
        capacity_gb: 512,
        type: "SSD",
        interface: "SATA",
        form_factor: "2.5-INCH",
      },
    },
  ];

  // 4️⃣ Build final payload
  const storageSpecs = storageSpecsRaw
    .map((item) => {
      const id = getId(item.name);
      if (!id) {
        console.warn(`⚠️ No match for: ${item.name}`);
        return null;
      }

      const s = item.specs;

      return {
        component_id: id,
        capacity: `${s.capacity_gb} GB`,
        capacity_gb: Number(s.capacity_gb),
        type: s.type.toUpperCase(),
        interface: s.interface.toUpperCase(),
        form_factor: s.form_factor.toUpperCase(),
      };
    })
    .filter(Boolean);

  if (!storageSpecs.length) {
    console.error("❌ Nothing to insert — matching failed.");
    return;
  }

  // 5️⃣ Insert safely
  const result = await insertSpecsIfNotExists("storage_specs", storageSpecs);

  console.log(
    `✅ Done seeding Storage specs → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedStorageSpecs();
