/**
 * 🧩 Converts CLI input into proper data types for Supabase inserts/updates
 * ✅ Normalizes all text for consistent compatibility checks
 * ✅ Converts arrays, booleans, and numbers correctly
 */
export function formatValue(field, value) {
  if (value === "") return null;

  // 🧮 Numeric fields
  const numericFields = [
    "cores",
    "threads",
    "tdp",
    "wattage",
    "length",
    "height",
    "memory_slots",
    "max_gpu_length",
    "max_cpu_cooler_height",
    "capacity_gb",
    "speed_mhz",
    "max_memory_gb",
  ];
  if (numericFields.includes(field)) {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  // 🔘 Boolean fields
  const booleanFields = ["psu_shroud", "modular", "is_modular", "is_nvme"];
  if (booleanFields.includes(field)) {
    const lowered = value.trim().toLowerCase();
    return ["y", "yes", "true", "1"].includes(lowered);
  }

  // 🧾 Array fields (normalized and uppercased for compatibility)
  const arrayFields = [
    "compatible_sockets",
    "form_factor_support",
    "storage_support",
    "pcie_slots",
  ];
  if (arrayFields.includes(field)) {
    return value
      .split(",")
      .map((v) => v.trim().toUpperCase())
      .filter((v) => v.length > 0);
  }

  // 🧠 Default — trim and uppercase text for consistent rule matching
  return value.trim().toUpperCase();
}
