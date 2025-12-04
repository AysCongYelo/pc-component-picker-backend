// src/utils/compatibility.js
// -----------------------------------------------------------------------------
// COMPLETE PC BUILD COMPATIBILITY ENGINE (Hardened - Normalized comparisons)
// Handles CPU ↔ Motherboard, RAM, GPU size, PSU wattage, case form-factor,
// storage (NVMe slots), and cooler compatibility. All checks return consistent
// messages. Comparisons are normalized (case-insensitive) and null-safe.
// -----------------------------------------------------------------------------

// Safe spec getter
const get = (obj, key) => {
  if (!obj || !obj.specs) return null;
  const specs = obj.specs;

  if (specs[key] !== undefined) return specs[key];
  if (specs[key.toLowerCase()] !== undefined) return specs[key.toLowerCase()];

  return null;
};

// Normalize helper for strings
const norm = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim().toLowerCase();
  return v;
};

// Normalize helper for array-of-strings
const normArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => (x ? String(x).trim().toLowerCase() : ""));
};

// Numeric safe
const n = (v) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
};

// PSU safety multiplier (recommended headroom). Tweakable.
const PSU_HEADROOM = 1.25;

// -----------------------------------------------------------------------------
//  SINGLE COMPONENT VALIDATION AGAINST CURRENT BUILD
// -----------------------------------------------------------------------------
export const checkComponentAgainstBuild = (build, category, comp) => {
  // ensure `build` categories are present (may be expanded objects)
  const cpu = build?.cpu || null;
  const mb = build?.motherboard || null;
  const ram = build?.memory || null;
  const gpu = build?.gpu || null;
  const psu = build?.psu || null;
  const casing = build?.case || null;
  const cooler = build?.cpu_cooler || null;

  // normalize some spec values we will compare
  const compSocket = norm(get(comp, "socket"));
  const compForm = norm(get(comp, "form_factor"));
  const compIface = norm(get(comp, "interface"));
  const compCategory = (
    comp.category ||
    comp.category_id ||
    comp.specs?.category ||
    ""
  ).toString();

  // ----------------------------- CPU ↔ Motherboard
  if (category === "cpu" && mb) {
    const mbSocket = norm(get(mb, "socket"));
    if (mbSocket && compSocket && mbSocket !== compSocket) {
      return { ok: false, reason: "CPU socket does not match motherboard" };
    }
  }

  if (category === "motherboard" && cpu) {
    const cpuSocket = norm(get(cpu, "socket"));
    const mSocket = norm(get(comp, "socket"));
    if (cpuSocket && mSocket && cpuSocket !== mSocket) {
      return { ok: false, reason: "Motherboard socket does not match CPU" };
    }
  }

  // ----------------------------- Motherboard ↔ RAM
  if (category === "memory" && mb) {
    const ramType = norm(get(comp, "type"));
    const mbType = norm(get(mb, "memory_type"));

    if (ramType && mbType && ramType !== mbType) {
      return { ok: false, reason: "RAM type incompatible with motherboard" };
    }

    const mbMax = n(get(mb, "max_memory_speed_mhz"));
    const ramSpeed = n(get(comp, "speed_mhz"));

    if (mbMax && ramSpeed > mbMax) {
      return { ok: false, reason: "RAM speed exceeds motherboard limit" };
    }
  }

  if (category === "motherboard" && ram) {
    const ramType = norm(get(ram, "type"));
    const mbType = norm(get(comp, "memory_type"));

    if (ramType && mbType && ramType !== mbType) {
      return {
        ok: false,
        reason: "Motherboard RAM type incompatible with RAM",
      };
    }
  }

  // ----------------------------- GPU ↔ Case (length)
  if (category === "gpu" && casing) {
    const gpuLen = n(get(comp, "length"));
    const maxLen = n(get(casing, "max_gpu_length"));

    if (gpuLen && maxLen && gpuLen > maxLen) {
      return { ok: false, reason: "GPU is too long for the case" };
    }
  }

  if (category === "case" && gpu) {
    const gpuLen = n(get(gpu, "length"));
    const maxLen = n(get(comp, "max_gpu_length"));

    if (gpuLen && maxLen && gpuLen > maxLen) {
      return { ok: false, reason: "Case cannot fit the selected GPU" };
    }
  }

  // ----------------------------- CPU Cooler ↔ Case / CPU
  if (category === "cpu_cooler") {
    const height = n(get(comp, "height"));
    const maxH = n(get(casing, "max_cpu_cooler_height"));

    if (casing && height && maxH && height > maxH) {
      return { ok: false, reason: "Cooler height exceeds case clearance" };
    }

    if (cpu) {
      const socket = norm(get(cpu, "socket"));
      const supported = normArray(comp.specs?.compatible_sockets || []);
      if (socket && supported.length && !supported.includes(socket)) {
        return { ok: false, reason: "Cooler not compatible with CPU socket" };
      }
    }
  }

  if (category === "case" && cooler) {
    const coolerH = n(get(cooler, "height"));
    const maxH = n(get(comp, "max_cpu_cooler_height"));

    if (coolerH && maxH && coolerH > maxH) {
      return { ok: false, reason: "Case cannot fit the selected cooler" };
    }
  }

  // ----------------------------- PSU Wattage (explicit headroom)
  if (category === "psu" && (cpu || gpu)) {
    const psuW = n(get(comp, "wattage"));
    const cpuTDP = n(get(cpu, "tdp"));
    const gpuTDP = n(get(gpu, "tdp"));
    const required = cpuTDP + gpuTDP;

    if (psuW && required && psuW < Math.ceil(required * PSU_HEADROOM)) {
      return { ok: false, reason: "PSU wattage insufficient for the build" };
    }
  }

  if (category === "gpu" && psu) {
    const psuW = n(get(psu, "wattage"));
    const gpuTDP = n(get(comp, "tdp"));
    const cpuTDP = cpu ? n(get(cpu, "tdp")) : 0;
    const required = cpuTDP + gpuTDP;

    if (psuW && required && psuW < Math.ceil(required * PSU_HEADROOM)) {
      return { ok: false, reason: "PSU cannot support CPU + GPU load" };
    }
  }

  // ----------------------------- Case ↔ Motherboard (form factor)
  if (category === "case" && mb) {
    const mbForm = norm(get(mb, "form_factor"));
    const supported = normArray(comp.specs?.form_factor_support || []);

    // FIX: allow if missing info
    if (!supported.length || !mbForm) return { ok: true };

    if (mbForm && supported.length && !supported.includes(mbForm)) {
      return {
        ok: false,
        reason: "Case does not support motherboard form factor",
      };
    }
  }

  if (category === "motherboard" && casing) {
    const mbForm = norm(get(comp, "form_factor"));
    const supported = normArray(casing.specs?.form_factor_support || []);

    // FIX: allow if missing info
    if (!supported.length || !mbForm) return { ok: true };

    if (mbForm && supported.length && !supported.includes(mbForm)) {
      return {
        ok: false,
        reason: "Motherboard form factor not supported by case",
      };
    }
  }

  // ----------------------------- Storage (M.2 / NVMe) - require NVMe slot count
  if (category === "storage" && mb) {
    const iface = (get(comp, "interface") || "").toString().toLowerCase();
    const support = normArray(mb.specs?.storage_support || []);
    const nvmeSlots = n(mb.specs?.nvme_slots || mb.specs?.m2_slots || 0);
    const sataPorts = n(mb.specs?.sata_ports || 0);

    // FIX: if motherboard has NO info → auto allow storage
    if (!support.length && nvmeSlots === 0 && sataPorts === 0) {
      return { ok: true };
    }

    // If NVMe / M.2 interface requested, ensure mobo advertises NVMe/M.2 support AND at least 1 slot
    if (
      iface.includes("nvme") ||
      iface.includes("m.2") ||
      iface.includes("m2") ||
      iface.includes("pci")
    ) {
      // first, the generic support token
      const match = support.some((s) => /nvme|m\.2|m2|pci/i.test(String(s)));
      if (!match || nvmeSlots < 1) {
        return {
          ok: false,
          reason:
            "Motherboard does not support NVMe/M.2 drive (or no free slots)",
        };
      }
    } else {
      // for SATA drives ensure motherboard has SATA ports
      if (iface.includes("sata") && sataPorts < 1) {
        return {
          ok: false,
          reason: "Motherboard does not have SATA ports for this drive",
        };
      }
    }
  }

  return { ok: true };
};

// -----------------------------------------------------------------------------
//  VALIDATE ENTIRE BUILD (skip empty/null slots)
// -----------------------------------------------------------------------------
export const checkWholeBuild = (expanded) => {
  if (!expanded || typeof expanded !== "object") return { ok: true };

  for (const category of Object.keys(expanded)) {
    const comp = expanded[category];
    if (!comp) continue; // skip empty categories

    const others = { ...expanded };
    delete others[category];

    const res = checkComponentAgainstBuild(others, category, comp);
    if (!res.ok) return res;
  }

  return { ok: true };
};

// -----------------------------------------------------------------------------
//  FILTER CANDIDATE COMPONENTS
// -----------------------------------------------------------------------------
export const isComponentCompatibleWithBuild = (build, component) => {
  const category =
    component.category || component.category_id || component.specs?.category;
  return checkComponentAgainstBuild(build, category, component).ok;
};
