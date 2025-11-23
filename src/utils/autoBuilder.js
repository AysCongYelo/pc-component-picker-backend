// src/utils/autoBuilder.js
// -----------------------------------------------------------------------------
// AUTO-BUILDER ENGINE (Optimized + Defensive)
// Generates builds based on purpose, budget, and compatibility rules.
// All selection steps are deterministic and strictly filtered.
// -----------------------------------------------------------------------------

import * as BuilderModel from "../models/builderModel.js";
import * as Compatibility from "./compatibility.js";

// Fetch active + in-stock components
const fetchAll = async (category) => {
  const list = await BuilderModel.getComponentsWithSpecs(category);
  return list.filter(
    (c) => c.status === "active" && (c.stock === null || c.stock > 0)
  );
};

// -----------------------------------------------------------------------------
// Purpose Config
// -----------------------------------------------------------------------------
const PURPOSES = {
  gaming: {
    ram_gb: 16,
    cpu_rank: "mid",
    prefer_gpu: true,
    priority: [
      "gpu",
      "cpu",
      "motherboard",
      "memory",
      "storage",
      "psu",
      "case",
      "cpu_cooler",
    ],
  },
  workstation: {
    ram_gb: 32,
    cpu_rank: "high",
    prefer_gpu: true,
    priority: [
      "cpu",
      "memory",
      "motherboard",
      "storage",
      "gpu",
      "psu",
      "case",
      "cpu_cooler",
    ],
  },
  streaming: {
    ram_gb: 16,
    cpu_rank: "mid-high",
    prefer_gpu: true,
    priority: [
      "cpu",
      "gpu",
      "motherboard",
      "memory",
      "storage",
      "psu",
      "case",
      "cpu_cooler",
    ],
  },
  basic: {
    ram_gb: 8,
    cpu_rank: "entry",
    prefer_gpu: false,
    priority: [
      "cpu",
      "motherboard",
      "memory",
      "storage",
      "psu",
      "case",
      "cpu_cooler",
      "gpu",
    ],
  },
};

// -----------------------------------------------------------------------------
// CPU Ranking Logic
// -----------------------------------------------------------------------------
const selectCPUFromList = (cpus, rank) => {
  if (!cpus.length) return null;

  const byPriceAsc = [...cpus].sort(
    (a, b) => Number(a.price) - Number(b.price)
  );
  const byCores = [...cpus].sort(
    (a, b) => (b.specs?.cores || 0) - (a.specs?.cores || 0)
  );

  if (rank === "high") {
    return byCores[0]; // pick highest core count
  }

  if (rank === "mid-high" || rank === "mid") {
    // balanced: cores first, then cheaper
    return [...cpus].sort(
      (a, b) =>
        (b.specs?.cores || 0) - (a.specs?.cores || 0) ||
        Number(a.price) - Number(b.price)
    )[0];
  }

  return byPriceAsc[0]; // entry-level tier
};

// Price helper
const priceNum = (c) => Number(c?.price || 0);

// -----------------------------------------------------------------------------
// MAIN AUTO-BUILD ENGINE
// -----------------------------------------------------------------------------
export const buildFromPurpose = async ({
  purpose,
  budget = null,
  respectCpu = null,
}) => {
  const cfg = PURPOSES[purpose] || PURPOSES.basic;

  const chosen = {};
  const chosenIds = {};

  let remaining =
    budget === null || budget === undefined ? null : Number(budget);

  // Commit pick + subtract budget
  const commitPick = (category, comp) => {
    if (!comp) return false;

    if (remaining !== null && priceNum(comp) > remaining) return false;

    chosen[category] = comp;
    chosenIds[category] = comp.id;

    if (remaining !== null) {
      remaining = Number((remaining - priceNum(comp)).toFixed(2));
      if (remaining < 0) remaining = 0;
    }

    return true;
  };

  // Iterate by priority
  for (const category of cfg.priority) {
    // ------------------------- CPU
    if (category === "cpu") {
      let list = await fetchAll("cpu");
      if (!list.length) continue;

      const current = await BuilderModel.expandComponents(chosenIds);

      // Respect pinned CPU if allowed
      if (respectCpu) {
        const keep = list.find((c) => c.id === respectCpu);
        if (keep) {
          const ok = Compatibility.checkComponentAgainstBuild(current, "cpu", {
            ...keep,
            category: "cpu",
          }).ok;

          if (ok && (remaining === null || priceNum(keep) <= remaining)) {
            commitPick("cpu", keep);
            continue;
          }
        }
      }

      // Filter compatible
      list = list.filter(
        (c) =>
          Compatibility.checkComponentAgainstBuild(current, "cpu", {
            ...c,
            category: "cpu",
          }).ok
      );

      // Filter budget
      if (remaining !== null)
        list = list.filter((c) => priceNum(c) <= remaining);

      if (!list.length) continue;

      const best = selectCPUFromList(list, cfg.cpu_rank);
      commitPick("cpu", best);
      continue;
    }

    // ------------------------- Motherboard
    if (category === "motherboard") {
      let list = await fetchAll("motherboard");
      if (!list.length) continue;

      // Enforce socket match if CPU chosen
      if (chosen.cpu?.specs?.socket) {
        const sock = String(chosen.cpu.specs.socket).toLowerCase();
        list = list.filter(
          (m) => String(m.specs?.socket || "").toLowerCase() === sock
        );
      }

      const current = await BuilderModel.expandComponents(chosenIds);

      list = list.filter(
        (m) =>
          Compatibility.checkComponentAgainstBuild(current, "motherboard", {
            ...m,
            category: "motherboard",
          }).ok
      );

      if (remaining !== null)
        list = list.filter((m) => priceNum(m) <= remaining);

      if (!list.length) continue;

      commitPick(
        "motherboard",
        [...list].sort((a, b) => priceNum(a) - priceNum(b))[0]
      );
      continue;
    }

    // ------------------------- Memory
    if (category === "memory") {
      let list = await fetchAll("memory");
      if (!list.length) continue;

      // RAM type match
      if (chosen.motherboard?.specs?.memory_type) {
        const type = String(chosen.motherboard.specs.memory_type).toLowerCase();
        list = list.filter(
          (r) => String(r.specs?.type || "").toLowerCase() === type
        );
      }

      const current = await BuilderModel.expandComponents(chosenIds);

      list = list.filter(
        (r) =>
          Compatibility.checkComponentAgainstBuild(current, "memory", {
            ...r,
            category: "memory",
          }).ok
      );

      const sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));
      const enough = sorted.filter(
        (r) => Number(r.specs?.capacity_gb || 0) >= cfg.ram_gb
      );

      // Budget-aware picks
      if (remaining !== null && enough.length) {
        const ok = enough.filter((r) => priceNum(r) <= remaining);
        if (ok.length) {
          commitPick("memory", ok[0]);
          continue;
        }
      }

      if (remaining === null && enough.length) {
        commitPick("memory", enough[0]);
        continue;
      }

      // Cheapest available
      if (remaining !== null) {
        const affordable = sorted.filter((r) => priceNum(r) <= remaining);
        if (affordable.length) {
          commitPick("memory", affordable[0]);
          continue;
        }
      }

      if (remaining === null && sorted.length) {
        commitPick("memory", sorted[0]);
      }

      continue;
    }

    // ------------------------- GPU
    if (category === "gpu") {
      if (!cfg.prefer_gpu) continue;

      let list = await fetchAll("gpu");
      if (!list.length) continue;

      const current = await BuilderModel.expandComponents(chosenIds);

      list = list.filter(
        (g) =>
          Compatibility.checkComponentAgainstBuild(current, "gpu", {
            ...g,
            category: "gpu",
          }).ok
      );

      let sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));

      if (remaining !== null)
        sorted = sorted.filter((g) => priceNum(g) <= remaining);

      if (!sorted.length) continue;

      commitPick("gpu", sorted[0]);
      continue;
    }

    // ------------------------- Storage
    if (category === "storage") {
      let list = await fetchAll("storage");
      if (!list.length) continue;

      const current = await BuilderModel.expandComponents(chosenIds);

      list = list.filter(
        (s) =>
          Compatibility.checkComponentAgainstBuild(current, "storage", {
            ...s,
            category: "storage",
          }).ok
      );

      const nvme = list.filter((s) =>
        String(s.specs?.interface || "")
          .toLowerCase()
          .includes("nvme")
      );

      let sorted = [...(nvme.length ? nvme : list)].sort(
        (a, b) => priceNum(a) - priceNum(b)
      );

      if (remaining !== null)
        sorted = sorted.filter((s) => priceNum(s) <= remaining);

      if (!sorted.length) continue;

      commitPick("storage", sorted[0]);
      continue;
    }

    // ------------------------- PSU
    if (category === "psu") {
      let list = await fetchAll("psu");
      if (!list.length) continue;

      const cpuTDP = Number(chosen.cpu?.specs?.tdp || 0);
      const gpuTDP = Number(chosen.gpu?.specs?.tdp || 0);

      const requiredW = Math.max(450, Math.ceil((cpuTDP + gpuTDP) * 1.5));

      list = list.filter((p) => Number(p.specs?.wattage || 0) >= requiredW);

      const current = await BuilderModel.expandComponents(chosenIds);

      list = list.filter(
        (p) =>
          Compatibility.checkComponentAgainstBuild(current, "psu", {
            ...p,
            category: "psu",
          }).ok
      );

      let sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));
      if (remaining !== null)
        sorted = sorted.filter((p) => priceNum(p) <= remaining);

      if (!sorted.length) continue;

      commitPick("psu", sorted[0]);
      continue;
    }

    // ------------------------- Case
    if (category === "case") {
      let list = await fetchAll("case");
      if (!list.length) continue;

      const mbForm = chosen.motherboard?.specs?.form_factor;
      const gpuLen = Number(chosen.gpu?.specs?.length || 0);

      // Form-factor match
      if (mbForm) {
        list = list.filter((c) =>
          (c.specs?.form_factor_support || []).includes(mbForm)
        );
      }

      // GPU length check
      list = list.filter((c) => {
        const max = Number(c.specs?.max_gpu_length || 0);
        return !gpuLen || !max || gpuLen <= max;
      });

      const current = await BuilderModel.expandComponents(chosenIds);

      list = list.filter(
        (c) =>
          Compatibility.checkComponentAgainstBuild(current, "case", {
            ...c,
            category: "case",
          }).ok
      );

      let sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));
      if (remaining !== null)
        sorted = sorted.filter((c) => priceNum(c) <= remaining);

      if (!sorted.length) continue;

      commitPick("case", sorted[0]);
      continue;
    }

    // ------------------------- CPU Cooler
    if (category === "cpu_cooler") {
      let list = await fetchAll("cpu_cooler");
      if (!list.length) continue;

      const socket = chosen.cpu?.specs?.socket;
      const maxH = Number(chosen.case?.specs?.max_cpu_cooler_height || 0);

      list = list.filter((c) => {
        const sockets = c.specs?.compatible_sockets || [];
        const height = Number(c.specs?.height || 0);

        if (socket && !sockets.includes(socket)) return false;
        if (maxH && height > maxH) return false;

        return true;
      });

      const current = await BuilderModel.expandComponents(chosenIds);

      list = list.filter(
        (c) =>
          Compatibility.checkComponentAgainstBuild(current, "cpu_cooler", {
            ...c,
            category: "cpu_cooler",
          }).ok
      );

      let sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));
      if (remaining !== null)
        sorted = sorted.filter((c) => priceNum(c) <= remaining);

      if (!sorted.length) continue;

      commitPick("cpu_cooler", sorted[0]);
      continue;
    }
  }

  // Return only IDs
  const result = {};
  for (const [cat, comp] of Object.entries(chosen)) {
    result[cat] = comp.id;
  }

  return result;
};

// -----------------------------------------------------------------------------
// AUTO-COMPLETE BUILDS
// -----------------------------------------------------------------------------
export const autoCompleteBuild = async (partial) => {
  const expanded = await BuilderModel.expandComponents(partial);

  let purpose = "gaming";
  if (expanded.memory?.specs?.capacity_gb >= 32) {
    purpose = "workstation";
  }

  const auto = await buildFromPurpose({
    purpose,
    budget: null,
    respectCpu: expanded.cpu?.id || null,
  });

  const final = {};
  for (const key of [
    "cpu",
    "motherboard",
    "memory",
    "gpu",
    "storage",
    "psu",
    "case",
    "cpu_cooler",
  ]) {
    final[key] = partial[key] || auto[key] || null;
  }

  return final;
};
