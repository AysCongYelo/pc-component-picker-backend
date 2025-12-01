import { supabaseAdmin as supabase } from "../../../src/supabaseAdmin.js";
import { insertIfNotExists } from "../../utils/insertHelpers.js";

// Public URL generator
function getPublicUrl(path) {
  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage.from("components").getPublicUrl(cleanPath);
  return data.publicUrl;
}

async function seedMotherboard() {
  console.log("🧩 Seeding Motherboard Components...");

  // Fetch category by slug
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "motherboard")
    .single();

  if (catErr || !category) {
    console.error("❌ Missing 'motherboard' category!");
    return;
  }

  const motherboardData = [
    // =====================================================
    // ✅ AMD AM5 (DDR5) – Top 7
    // =====================================================
    {
      name: "ASUS ROG Crosshair X670E Hero",
      brand: "ASUS",
      price: 32999,
      stock: 8,
      image_url: getPublicUrl("motherboard/asus_rog_crosshair_x670e_hero.jpg"),
    },
    {
      name: "MSI MPG X670E Carbon WiFi",
      brand: "MSI",
      price: 28999,
      stock: 10,
      image_url: getPublicUrl("motherboard/msi_mpg_x670e_carbon_wifi.jpg"),
    },
    {
      name: "Gigabyte X670 AORUS Elite AX",
      brand: "Gigabyte",
      price: 24999,
      stock: 12,
      image_url: getPublicUrl("motherboard/gigabyte_x670_aorus_elite_ax.jpg"),
    },
    {
      name: "ASRock X670E Taichi",
      brand: "ASRock",
      price: 29999,
      stock: 7,
      image_url: getPublicUrl("motherboard/asrock_x670e_taichi.jpg"),
    },
    {
      name: "ASUS TUF Gaming B650-Plus WiFi",
      brand: "ASUS",
      price: 13999,
      stock: 15,
      image_url: getPublicUrl("motherboard/asus_tuf_b650_plus_wifi.jpg"),
    },
    {
      name: "MSI MAG B650 Tomahawk WiFi",
      brand: "MSI",
      price: 12999,
      stock: 18,
      image_url: getPublicUrl("motherboard/msi_mag_b650_tomahawk_wifi.jpg"),
    },
    {
      name: "Gigabyte B650 AORUS Elite AX",
      brand: "Gigabyte",
      price: 12499,
      stock: 20,
      image_url: getPublicUrl("motherboard/gigabyte_b650_aorus_elite_ax.jpg"),
    },

    // =====================================================
    // ✅ AMD AM4 (DDR4) – Top 7
    // =====================================================
    {
      name: "ASUS ROG Strix X570-E Gaming",
      brand: "ASUS",
      price: 18999,
      stock: 10,
      image_url: getPublicUrl("motherboard/asus_rog_strix_x570_e_gaming.jpg"),
    },
    {
      name: "MSI MAG X570S Tomahawk Max WiFi",
      brand: "MSI",
      price: 14999,
      stock: 12,
      image_url: getPublicUrl(
        "motherboard/msi_mag_x570s_tomahawk_max_wifi.jpg"
      ),
    },
    {
      name: "Gigabyte X570 AORUS Elite",
      brand: "Gigabyte",
      price: 13999,
      stock: 14,
      image_url: getPublicUrl("motherboard/gigabyte_x570_aorus_elite.jpg"),
    },
    {
      name: "ASRock X570 Phantom Gaming 4",
      brand: "ASRock",
      price: 9999,
      stock: 18,
      image_url: getPublicUrl("motherboard/asrock_x570_phantom_gaming_4.jpg"),
    },
    {
      name: "ASUS TUF Gaming B550-Plus",
      brand: "ASUS",
      price: 8999,
      stock: 20,
      image_url: getPublicUrl("motherboard/asus_tuf_b550_plus.jpg"),
    },
    {
      name: "MSI B550-A PRO",
      brand: "MSI",
      price: 8499,
      stock: 22,
      image_url: getPublicUrl("motherboard/msi_b550_a_pro.jpg"),
    },
    {
      name: "Gigabyte B550 AORUS Elite V2",
      brand: "Gigabyte",
      price: 8999,
      stock: 22,
      image_url: getPublicUrl("motherboard/gigabyte_b550_aorus_elite_v2.jpg"),
    },

    // =====================================================
    // ✅ Intel LGA1700 (DDR4/DDR5) – Top 7
    // =====================================================
    {
      name: "ASUS ROG Maximus Z790 Hero",
      brand: "ASUS",
      price: 32999,
      stock: 7,
      image_url: getPublicUrl("motherboard/asus_rog_maximus_z790_hero.jpg"),
    },
    {
      name: "MSI MPG Z790 Carbon WiFi",
      brand: "MSI",
      price: 24999,
      stock: 10,
      image_url: getPublicUrl("motherboard/msi_mpg_z790_carbon_wifi.jpg"),
    },
    {
      name: "Gigabyte Z790 AORUS Master",
      brand: "Gigabyte",
      price: 27999,
      stock: 8,
      image_url: getPublicUrl("motherboard/gigabyte_z790_aorus_master.jpg"),
    },
    {
      name: "ASRock Z690 Taichi",
      brand: "ASRock",
      price: 19999,
      stock: 11,
      image_url: getPublicUrl("motherboard/asrock_z690_taichi.jpg"),
    },
    {
      name: "ASUS TUF Gaming Z690-Plus WiFi D4",
      brand: "ASUS",
      price: 14999,
      stock: 15,
      image_url: getPublicUrl("motherboard/asus_tuf_z690_plus_wifi_d4.jpg"),
    },
    {
      name: "MSI MAG B760 Tomahawk WiFi DDR4",
      brand: "MSI",
      price: 10999,
      stock: 20,
      image_url: getPublicUrl("motherboard/msi_mag_b760_tomahawk_ddr4.jpg"),
    },
    {
      name: "Gigabyte B760 Gaming X DDR4",
      brand: "Gigabyte",
      price: 9999,
      stock: 22,
      image_url: getPublicUrl("motherboard/gigabyte_b760_gaming_x_ddr4.jpg"),
    },

    // =====================================================
    // ✅ Intel LGA1851 (DDR5) – Top 7
    // =====================================================
    {
      name: "ASUS ROG Maximus Z890 Hero",
      brand: "ASUS",
      price: 34999,
      stock: 6,
      image_url: getPublicUrl("motherboard/asus_rog_maximus_z890_hero.jpg"),
    },
    {
      name: "MSI MPG Z890 Carbon WiFi",
      brand: "MSI",
      price: 28999,
      stock: 8,
      image_url: getPublicUrl("motherboard/msi_mpg_z890_carbon_wifi.jpg"),
    },
    {
      name: "Gigabyte Z890 AORUS Master",
      brand: "Gigabyte",
      price: 30999,
      stock: 7,
      image_url: getPublicUrl("motherboard/gigabyte_z890_aorus_master.jpg"),
    },
    {
      name: "ASRock Z890 Taichi",
      brand: "ASRock",
      price: 27999,
      stock: 7,
      image_url: getPublicUrl("motherboard/asrock_z890_taichi.jpg"),
    },
    {
      name: "ASUS TUF Gaming Z890-Plus WiFi",
      brand: "ASUS",
      price: 16999,
      stock: 12,
      image_url: getPublicUrl("motherboard/asus_tuf_z890_plus_wifi.jpg"),
    },
    {
      name: "MSI MAG Z890 Tomahawk WiFi",
      brand: "MSI",
      price: 18999,
      stock: 10,
      image_url: getPublicUrl("motherboard/msi_mag_z890_tomahawk_wifi.jpg"),
    },
    {
      name: "Gigabyte Z890 Gaming X",
      brand: "Gigabyte",
      price: 14999,
      stock: 18,
      image_url: getPublicUrl("motherboard/gigabyte_z890_gaming_x.jpg"),
    }, // ⭐ ADD-ON BUDGET MOTHERBOARDS
    {
      name: "Gigabyte A520M DS3H",
      brand: "Gigabyte",
      price: 2999,
      stock: 25,
      image_url: getPublicUrl("motherboard/gigabyte_a520m_ds3h.jpg"),
    },
    {
      name: "MSI B450M PRO-VDH MAX",
      brand: "MSI",
      price: 3499,
      stock: 25,
      image_url: getPublicUrl("motherboard/msi_b450m_pro_vdh_max.jpg"),
    },
    {
      name: "ASUS Prime H610M-E",
      brand: "ASUS",
      price: 3299,
      stock: 30,
      image_url: getPublicUrl("motherboard/asus_prime_h610m_e.jpg"),
    },
  ];

  // Insert safely
  const result = await insertIfNotExists("motherboard", motherboardData);

  console.log(
    `✅ Seeding motherboards complete → Inserted: ${result.inserted}, Skipped: ${result.skipped}`
  );
}

seedMotherboard();
