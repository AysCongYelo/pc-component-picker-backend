import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertSpecsIfNotExists } from "../../utils/insertHelpers.js";

// Normalizers
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeUpper = (str) =>
  str ? str.toString().trim().toUpperCase() : "UNKNOWN";

function normalizeList(arr) {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map((v) => v.toString().trim());
}

async function seedMotherboardSpecs() {
  console.log("🧩 Seeding Motherboard Specs...");

  // 1️⃣ Fetch category
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "motherboard")
    .single();

  if (catError || !category) {
    console.error("❌ Missing 'motherboard' category.");
    return;
  }

  // 2️⃣ Fetch components
  const { data: components, error: fetchError } = await supabase
    .from("components")
    .select("id, name")
    .eq("category_id", category.id);

  if (fetchError || !components.length) {
    console.error("❌ No motherboard components found.");
    return;
  }

  // ⭐ SMART MATCHER (all motherboard naming issues solved)
  const getId = (name) => {
    const target = normalize(name);

    let comp =
      components.find((c) => normalize(c.name) === target) ||
      components.find((c) => target.includes(normalize(c.name))) ||
      components.find((c) => normalize(c.name).includes(target)) ||
      components.find((c) => {
        const words = target.split(/[^a-z0-9]+/).filter(Boolean);
        const cname = normalize(c.name);
        return words.every((t) => cname.includes(t));
      });

    return comp?.id || null;
  };

  // 3️⃣ Full Spec List (ALL 28 MOTHERBOARDS)
  const motherboardSpecsRaw = [
    // ======================================================
    // AMD AM5 (DDR5) – Top 7
    // ======================================================
    {
      name: "ASUS ROG Crosshair X670E Hero",
      specs: {
        socket: "AM5",
        form_factor: "ATX",
        chipset: "X670E",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 6400,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16", "PCIe 4.0 x1"],
      },
    },
    {
      name: "MSI MPG X670E Carbon WiFi",
      specs: {
        socket: "AM5",
        form_factor: "ATX",
        chipset: "X670E",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 6600,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16", "PCIe 5.0 x4"],
      },
    },
    {
      name: "Gigabyte X670 AORUS Elite AX",
      specs: {
        socket: "AM5",
        form_factor: "ATX",
        chipset: "X670",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 6600,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "ASRock X670E Taichi",
      specs: {
        socket: "AM5",
        form_factor: "ATX",
        chipset: "X670E",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 6600,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16", "PCIe 5.0 x4"],
      },
    },
    {
      name: "ASUS TUF Gaming B650-Plus WiFi",
      specs: {
        socket: "AM5",
        form_factor: "ATX",
        chipset: "B650",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 6400,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
    {
      name: "MSI MAG B650 Tomahawk WiFi",
      specs: {
        socket: "AM5",
        form_factor: "ATX",
        chipset: "B650",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 6600,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
    {
      name: "Gigabyte B650 AORUS Elite AX",
      specs: {
        socket: "AM5",
        form_factor: "ATX",
        chipset: "B650",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 6600,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },

    // ======================================================
    // AMD AM4 (DDR4) – Top 7
    // ======================================================
    {
      name: "ASUS ROG Strix X570-E Gaming",
      specs: {
        socket: "AM4",
        form_factor: "ATX",
        chipset: "X570",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 5100,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
    {
      name: "MSI MAG X570S Tomahawk Max WiFi",
      specs: {
        socket: "AM4",
        form_factor: "ATX",
        chipset: "X570S",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 5100,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
    {
      name: "Gigabyte X570 AORUS Elite",
      specs: {
        socket: "AM4",
        form_factor: "ATX",
        chipset: "X570",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 4733,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
    {
      name: "ASRock X570 Phantom Gaming 4",
      specs: {
        socket: "AM4",
        form_factor: "ATX",
        chipset: "X570",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 4400,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
    {
      name: "ASUS TUF Gaming B550-Plus",
      specs: {
        socket: "AM4",
        form_factor: "ATX",
        chipset: "B550",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 4866,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
    {
      name: "MSI B550-A PRO",
      specs: {
        socket: "AM4",
        form_factor: "ATX",
        chipset: "B550",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 4400,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
    {
      name: "Gigabyte B550 AORUS Elite V2",
      specs: {
        socket: "AM4",
        form_factor: "ATX",
        chipset: "B550",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 4933,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },

    // ======================================================
    // Intel LGA1700 – Top 7
    // ======================================================
    {
      name: "ASUS ROG Maximus Z790 Hero",
      specs: {
        socket: "LGA1700",
        form_factor: "ATX",
        chipset: "Z790",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 7800,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "MSI MPG Z790 Carbon WiFi",
      specs: {
        socket: "LGA1700",
        form_factor: "ATX",
        chipset: "Z790",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 7200,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "Gigabyte Z790 AORUS Master",
      specs: {
        socket: "LGA1700",
        form_factor: "ATX",
        chipset: "Z790",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 8000,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "ASRock Z690 Taichi",
      specs: {
        socket: "LGA1700",
        form_factor: "ATX",
        chipset: "Z690",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 6400,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "ASUS TUF Gaming Z690-Plus WiFi D4",
      specs: {
        socket: "LGA1700",
        form_factor: "ATX",
        chipset: "Z690",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 5333,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "MSI MAG B760 Tomahawk WiFi DDR4",
      specs: {
        socket: "LGA1700",
        form_factor: "ATX",
        chipset: "B760",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 5333,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
    {
      name: "Gigabyte B760 Gaming X DDR4",
      specs: {
        socket: "LGA1700",
        form_factor: "ATX",
        chipset: "B760",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 5333,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },

    // ======================================================
    // Intel LGA1851 – Top 7
    // ======================================================
    {
      name: "ASUS ROG Maximus Z890 Hero",
      specs: {
        socket: "LGA1851",
        form_factor: "ATX",
        chipset: "Z890",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 8800,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "MSI MPG Z890 Carbon WiFi",
      specs: {
        socket: "LGA1851",
        form_factor: "ATX",
        chipset: "Z890",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 8400,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "Gigabyte Z890 AORUS Master",
      specs: {
        socket: "LGA1851",
        form_factor: "ATX",
        chipset: "Z890",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 8600,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "ASRock Z890 Taichi",
      specs: {
        socket: "LGA1851",
        form_factor: "ATX",
        chipset: "Z890",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 8400,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "ASUS TUF Gaming Z890-Plus WiFi",
      specs: {
        socket: "LGA1851",
        form_factor: "ATX",
        chipset: "Z890",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 7600,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "MSI MAG Z890 Tomahawk WiFi",
      specs: {
        socket: "LGA1851",
        form_factor: "ATX",
        chipset: "Z890",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 7600,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "Gigabyte Z890 Gaming X",
      specs: {
        socket: "LGA1851",
        form_factor: "ATX",
        chipset: "Z890",
        memory_slots: 4,
        max_memory_gb: 192,
        max_memory_speed_mhz: 7600,
        memory_type: "DDR5",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 5.0 x16"],
      },
    },
    {
      name: "Gigabyte A520M DS3H",
      specs: {
        socket: "AM4",
        form_factor: "Micro-ATX",
        chipset: "A520",
        memory_slots: 2,
        max_memory_gb: 64,
        max_memory_speed_mhz: 4733,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 3.0 x16"],
      },
    },
    {
      name: "MSI B450M PRO-VDH MAX",
      specs: {
        socket: "AM4",
        form_factor: "Micro-ATX",
        chipset: "B450",
        memory_slots: 4,
        max_memory_gb: 128,
        max_memory_speed_mhz: 4133,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 3.0 x16"],
      },
    },
    {
      name: "ASUS Prime H610M-E",
      specs: {
        socket: "LGA1700",
        form_factor: "Micro-ATX",
        chipset: "H610",
        memory_slots: 2,
        max_memory_gb: 64,
        max_memory_speed_mhz: 3200,
        memory_type: "DDR4",
        storage_support: ["SATA", "NVMe"],
        pcie_slots: ["PCIe 4.0 x16"],
      },
    },
  ];

  // 4️⃣ Normalize payload
  const motherboardSpecs = motherboardSpecsRaw
    .map((item) => {
      const id = getId(item.name);
      if (!id) {
        console.warn(`⚠️ No match for: ${item.name}`);
        return null;
      }

      const s = item.specs;

      return {
        component_id: id,
        socket: normalizeUpper(s.socket),
        form_factor: s.form_factor || "ATX",
        chipset: normalizeUpper(s.chipset),
        memory_slots: Number(s.memory_slots),
        max_memory_gb: Number(s.max_memory_gb),
        max_memory_speed_mhz: Number(s.max_memory_speed_mhz),
        memory_type: normalizeUpper(s.memory_type),
        storage_support: normalizeList(s.storage_support).map((v) =>
          normalizeUpper(v)
        ),
        pcie_slots: normalizeList(s.pcie_slots),
      };
    })
    .filter(Boolean);

  if (!motherboardSpecs.length) {
    console.error("❌ No valid motherboard specs generated.");
    return;
  }

  // 5️⃣ Insert safely
  const result = await insertSpecsIfNotExists(
    "motherboard_specs",
    motherboardSpecs
  );

  console.log(
    `✅ Done seeding Motherboard Specs → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedMotherboardSpecs();
