// src/utils/autoBuilder.js
// -----------------------------------------------------------------------------
// AUTO-BUILDER ENGINE (Optimized + Defensive)
// Generates builds based on purpose, budget, and compatibility rules.
// -----------------------------------------------------------------------------

import * as BuilderModel from "../models/builderModel.js";
import * as Compatibility from "./compatibility.js";

// ============================================================================
// TIMEOUT HELPERS
// ============================================================================

// fastest safe timeout rule: each DB call must finish before OVERALL deadline
const OVERALL_MS = 10000; // 10 seconds total for entire autobuild

const withTimeout = (p, ms) =>
  Promise.race([
    p,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("Operation timed out")), ms)
    ),
  ]);

// compute remaining overall milliseconds
const rem = (deadline) => Math.max(200, deadline - Date.now());

// ============================================================================
// PURPOSE PROFILES
// ============================================================================

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

// ============================================================================
// CPU selection helper
// ============================================================================

const selectCPUFromList = (cpus, rank) => {
  if (!cpus || !cpus.length) return null;

  const byPrice = [...cpus].sort((a, b) => Number(a.price) - Number(b.price));
  const byCores = [...cpus].sort(
    (a, b) => (b.specs?.cores || 0) - (a.specs?.cores || 0)
  );

  if (rank === "high") return byCores[0];

  if (rank === "mid-high" || rank === "mid") {
    return [...cpus].sort(
      (a, b) =>
        (b.specs?.cores || 0) - (a.specs?.cores || 0) ||
        Number(a.price) - Number(b.price)
    )[0];
  }

  return byPrice[0];
};

const priceNum = (c) => Number(c?.price || 0);

// ============================================================================
// MAIN AUTO-BUILD ENGINE
// ============================================================================

export const buildFromPurpose = async ({
  purpose,
  budget = null,
  respectCpu = null,
}) => {
  const cfg = PURPOSES[purpose] || PURPOSES.basic;

  // OVERALL DEADLINE
  const deadline = Date.now() + OVERALL_MS;

  const chosen = {};
  const chosenIds = {};

  let remaining =
    budget === null || budget === undefined ? null : Number(budget);

  // Try expand initial empty build (cached)
  let expanded = {};
  try {
    expanded = await withTimeout(
      BuilderModel.expandComponents(chosenIds),
      rem(deadline)
    );
  } catch (_) {
    expanded = {};
  }

  const commit = async (cat, comp) => {
    if (!comp || !comp.id) return;

    if (remaining !== null && priceNum(comp) > remaining) return;

    chosen[cat] = comp;
    chosenIds[cat] = comp.id;

    if (remaining !== null) {
      remaining -= priceNum(comp);
      if (remaining < 0) remaining = 0;
    }

    // update expanded
    try {
      expanded = await withTimeout(
        BuilderModel.expandComponents(chosenIds),
        rem(deadline)
      );
    } catch (_) {}

    return true;
  };

  const fetchList = async (cat) => {
    const ms = rem(deadline);
    if (ms <= 200) throw new Error("Global autobuild timeout reached");

    const list = await withTimeout(
      BuilderModel.getComponentsWithSpecs(cat),
      ms
    );

    return (list || []).filter(
      (c) => c && c.status === "active" && (c.stock === null || c.stock > 0)
    );
  };

  // iterate categories by priority
  for (const category of cfg.priority) {
    if (Date.now() > deadline) break;

    try {
      // ------------------------ CPU
      if (category === "cpu") {
        let list = await fetchList("cpu");
        if (!list.length) continue;

        if (respectCpu) {
          const keep = list.find((c) => c.id === respectCpu);
          if (keep) {
            const ok =
              Compatibility.checkComponentAgainstBuild(expanded, "cpu", {
                ...keep,
                category: "cpu",
              }).ok &&
              (remaining === null || priceNum(keep) <= remaining);

            if (ok) {
              await commit("cpu", keep);
              continue;
            }
          }
        }

        list = list.filter(
          (c) =>
            Compatibility.checkComponentAgainstBuild(expanded, "cpu", {
              ...c,
              category: "cpu",
            }).ok
        );

        if (remaining !== null)
          list = list.filter((c) => priceNum(c) <= remaining);

        if (!list.length) continue;

        const best = selectCPUFromList(list, cfg.cpu_rank);
        await commit("cpu", best);
        continue;
      }

      // ------------------------ Motherboard
      if (category === "motherboard") {
        let list = await fetchList("motherboard");
        if (!list.length) continue;

        const cpuSock = chosen.cpu?.specs?.socket;
        if (cpuSock) {
          const sock = String(cpuSock).toLowerCase();
          list = list.filter(
            (m) => String(m.specs?.socket || "").toLowerCase() === sock
          );
        }

        list = list.filter(
          (m) =>
            Compatibility.checkComponentAgainstBuild(expanded, "motherboard", {
              ...m,
              category: "motherboard",
            }).ok
        );

        if (remaining !== null)
          list = list.filter((m) => priceNum(m) <= remaining);

        if (!list.length) continue;

        await commit(
          "motherboard",
          [...list].sort((a, b) => priceNum(a) - priceNum(b))[0]
        );
        continue;
      }

      // ------------------------ Memory
      if (category === "memory") {
        let list = await fetchList("memory");
        if (!list.length) continue;

        const type = chosen.motherboard?.specs?.memory_type;
        if (type)
          list = list.filter(
            (r) => String(r.specs?.type || "").toLowerCase() === type
          );

        list = list.filter(
          (r) =>
            Compatibility.checkComponentAgainstBuild(expanded, "memory", {
              ...r,
              category: "memory",
            }).ok
        );

        const sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));
        const enough = sorted.filter(
          (r) => Number(r.specs?.capacity_gb || 0) >= cfg.ram_gb
        );

        if (remaining !== null && enough.length) {
          const ok = enough.filter((r) => priceNum(r) <= remaining);
          if (ok.length) {
            await commit("memory", ok[0]);
            continue;
          }
        }

        if (remaining === null && enough.length) {
          await commit("memory", enough[0]);
          continue;
        }

        if (remaining !== null) {
          const affordable = sorted.filter((r) => priceNum(r) <= remaining);
          if (affordable.length) {
            await commit("memory", affordable[0]);
            continue;
          }
        }

        if (remaining === null && sorted.length) {
          await commit("memory", sorted[0]);
        }
        continue;
      }

      // ------------------------ GPU
      if (category === "gpu") {
        if (!cfg.prefer_gpu) continue;

        let list = await fetchList("gpu");
        if (!list.length) continue;

        list = list.filter(
          (g) =>
            Compatibility.checkComponentAgainstBuild(expanded, "gpu", {
              ...g,
              category: "gpu",
            }).ok
        );

        let sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));
        if (remaining !== null)
          sorted = sorted.filter((g) => priceNum(g) <= remaining);

        if (!sorted.length) continue;

        await commit("gpu", sorted[0]);
        continue;
      }

      // ------------------------ Storage
      if (category === "storage") {
        let list = await fetchList("storage");
        if (!list.length) continue;

        list = list.filter(
          (s) =>
            Compatibility.checkComponentAgainstBuild(expanded, "storage", {
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

        await commit("storage", sorted[0]);
        continue;
      }

      // ------------------------ PSU
      if (category === "psu") {
        let list = await fetchList("psu");
        if (!list.length) continue;

        const cpuT = Number(chosen.cpu?.specs?.tdp || 0);
        const gpuT = Number(chosen.gpu?.specs?.tdp || 0);
        const need = Math.max(450, Math.ceil((cpuT + gpuT) * 1.5));

        list = list.filter((p) => Number(p.specs?.wattage || 0) >= need);

        list = list.filter(
          (p) =>
            Compatibility.checkComponentAgainstBuild(expanded, "psu", {
              ...p,
              category: "psu",
            }).ok
        );

        let sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));
        if (remaining !== null)
          sorted = sorted.filter((p) => priceNum(p) <= remaining);

        if (!sorted.length) continue;

        await commit("psu", sorted[0]);
        continue;
      }

      // ------------------------ Case
      if (category === "case") {
        let list = await fetchList("case");
        if (!list.length) continue;

        const mbForm = chosen.motherboard?.specs?.form_factor;
        const gpuLen = Number(chosen.gpu?.specs?.length || 0);

        if (mbForm)
          list = list.filter((c) =>
            (c.specs?.form_factor_support || []).includes(mbForm)
          );

        list = list.filter((c) => {
          const max = Number(c.specs?.max_gpu_length || 0);
          return !gpuLen || !max || gpuLen <= max;
        });

        list = list.filter(
          (c) =>
            Compatibility.checkComponentAgainstBuild(expanded, "case", {
              ...c,
              category: "case",
            }).ok
        );

        let sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));
        if (remaining !== null)
          sorted = sorted.filter((c) => priceNum(c) <= remaining);

        if (!sorted.length) continue;

        await commit("case", sorted[0]);
        continue;
      }

      // ------------------------ CPU Cooler
      if (category === "cpu_cooler") {
        let list = await fetchList("cpu_cooler");
        if (!list.length) continue;

        const socket = chosen.cpu?.specs?.socket;
        const heightLimit = Number(
          chosen.case?.specs?.max_cpu_cooler_height || 0
        );

        list = list.filter((c) => {
          const sockets = c.specs?.compatible_sockets || [];
          const h = Number(c.specs?.height || 0);

          if (socket && !sockets.includes(socket)) return false;
          if (heightLimit && h > heightLimit) return false;

          return true;
        });

        list = list.filter(
          (c) =>
            Compatibility.checkComponentAgainstBuild(expanded, "cpu_cooler", {
              ...c,
              category: "cpu_cooler",
            }).ok
        );

        let sorted = [...list].sort((a, b) => priceNum(a) - priceNum(b));
        if (remaining !== null)
          sorted = sorted.filter((c) => priceNum(c) <= remaining);

        if (!sorted.length) continue;

        await commit("cpu_cooler", sorted[0]);
        continue;
      }
    } catch (err) {
      console.warn(`auto-build step failed for ${category}:`, err.message);
      continue;
    }
  }

  // return only IDs
  const finalIds = {};
  for (const [cat, comp] of Object.entries(chosen)) {
    finalIds[cat] = comp?.id || null;
  }

  return finalIds;
};

// ============================================================================
// AUTO-COMPLETE (low priority)
// ============================================================================

export const autoCompleteBuild = async (partial) => {
  const expanded = await BuilderModel.expandComponents(partial).catch(
    () => ({})
  );

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
