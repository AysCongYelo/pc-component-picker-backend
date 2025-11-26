// src/utils/autoBuilder.js
// -----------------------------------------------------------------------------
// AUTO-BUILDER ENGINE (Patched: best-fit + budget allocation)
// Generates builds based on purpose, budget, and compatibility rules.
// -----------------------------------------------------------------------------

import * as BuilderModel from "../models/builderModel.js";
import * as Compatibility from "./compatibility.js";

// ============================================================================
// TIMEOUT HELPERS
// ============================================================================

const OVERALL_MS = 10000; // 10 seconds total for entire autobuild

const withTimeout = (p, ms) =>
  Promise.race([
    p,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("Operation timed out")), ms)
    ),
  ]);

const rem = (deadline) => Math.max(200, deadline - Date.now());

// ============================================================================
// PURPOSE PROFILES + BUDGET ALLOCATION (% of total budget)
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

/**
 * Budget allocation percentages per purpose.
 * Keys are categories. Values sum roughly to 1.0
 * Tweak percentages if you want different targets.
 */
const BUDGET_ALLOCATION = {
  gaming: {
    gpu: 0.4, // 40%
    cpu: 0.23, // 23%
    motherboard: 0.1, // 10% (bumped up)
    memory: 0.08,
    storage: 0.08,
    psu: 0.06,
    case: 0.03,
    cpu_cooler: 0.02,
  },
  workstation: {
    cpu: 0.38, // 38%
    memory: 0.22, // 22%
    storage: 0.14,
    motherboard: 0.1,
    gpu: 0.08,
    cpu_cooler: 0.04, // 4% (bumped up for high-end CPU)
    psu: 0.03,
    case: 0.01,
  },
  streaming: {
    cpu: 0.3, // 30%
    gpu: 0.28, // 28%
    memory: 0.14,
    storage: 0.1,
    motherboard: 0.08, // 8% (bumped up)
    psu: 0.05,
    cpu_cooler: 0.03,
    case: 0.02,
  },
  basic: {
    cpu: 0.35,
    memory: 0.2,
    storage: 0.15,
    motherboard: 0.12,
    psu: 0.07, // 7% (lowered)
    gpu: 0.06,
    case: 0.03,
    cpu_cooler: 0.02,
  },
};

// ============================================================================
// HELPERS: robust price parsing & scoring
// ============================================================================

const priceNum = (c) => {
  try {
    if (!c) return 0;
    const raw = c.price ?? 0;
    const s = String(raw);
    const clean = s.replace(/[^0-9.]/g, "");
    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const cpuScore = (c) => {
  const cores = Number(c?.specs?.cores || 0);
  const threads = Number(c?.specs?.threads || 0);
  const clock =
    Number(c?.specs?.base_clock_ghz || 0) ||
    Number((c?.specs?.base_clock_mhz || 0) / 1000 || 0) ||
    0;
  const perfField = Number(c?.specs?.performance_score || 0);
  const base = perfField || cores * 100 + clock * 30 + threads * 10;
  return base;
};

const gpuScore = (g) => {
  const perf = Number(g?.specs?.performance_score || 0);
  if (perf > 0) return perf;
  const tdp = Number(g?.specs?.tdp || 0);
  if (tdp > 0) return tdp * 10;
  return priceNum(g);
};

const memoryScore = (m) => {
  const cap = Number(m?.specs?.capacity_gb || 0);
  const speed = Number(m?.specs?.speed_mhz || 0);
  return cap * 100 + speed / 10;
};

const storageScore = (s) => {
  const iface = String(s?.specs?.interface || "").toLowerCase();
  const cap = Number(s?.specs?.capacity_gb || 0);
  const nvme = /nvme|m\.2|m2|pci/.test(iface) ? 1 : 0;
  return nvme * 10000 + cap;
};

const psuScore = (p) => Number(p?.specs?.wattage || 0);

// ============================================================================
// Budget allocation helper
// ============================================================================

const computeAllocatedBudgets = (purpose, budget) => {
  if (budget === null || budget === undefined) return null;
  const allocPerc = BUDGET_ALLOCATION[purpose] || BUDGET_ALLOCATION["basic"];
  const allocated = {};
  let usedPerc = 0;
  for (const [k, v] of Object.entries(allocPerc)) {
    allocated[k] = Math.floor(budget * v);
    usedPerc += v;
  }
  // If percentages don't sum to 1, leave leftover as 'pool'
  const leftover = Math.max(
    0,
    Math.floor(budget - Object.values(allocated).reduce((a, b) => a + b, 0))
  );
  allocated._pool = leftover;
  return allocated;
};

// ============================================================================
// CPU selection helper (respects rank and budget slice)
// ============================================================================

const selectCPUFromList = (cpus, rank, allocatedBudget, remaining) => {
  if (!cpus || !cpus.length) return null;

  const scored = cpus
    .map((c) => ({ c, score: cpuScore(c), price: priceNum(c) }))
    .sort((a, b) => b.score - a.score || a.price - b.price);

  // prefer those within allocatedBudget (if provided), else within remaining
  let candidates;
  if (allocatedBudget !== null && allocatedBudget !== undefined) {
    candidates = scored.filter((s) => s.price <= allocatedBudget);
  }
  if (!candidates || !candidates.length) {
    candidates =
      remaining !== null ? scored.filter((s) => s.price <= remaining) : scored;
  }
  if (!candidates || !candidates.length) candidates = scored;

  const n = candidates.length;
  const topEnd = Math.max(1, Math.ceil(n * 0.3));
  const midEnd = Math.max(topEnd, Math.ceil(n * 0.7));
  const top = candidates.slice(0, topEnd);
  const mid = candidates.slice(topEnd, midEnd);
  const low = candidates.slice(midEnd);

  if (rank === "high")
    return (top[Math.floor(top.length / 2)] || top[0] || candidates[0])?.c;
  if (rank === "mid-high")
    return (top[top.length - 1] || mid[0] || candidates[0])?.c;
  if (rank === "mid")
    return (mid[Math.floor(mid.length / 2)] || top[0] || candidates[0])?.c;
  return (low[Math.floor(low.length / 2)] || mid[0] || candidates[0])?.c;
};

// ============================================================================
// MAIN AUTO-BUILD ENGINE
// ============================================================================

export const buildFromPurpose = async ({
  purpose,
  budget = null,
  respectCpu = null,
}) => {
  const cfg = PURPOSES[purpose] || PURPOSES.basic;
  const deadline = Date.now() + OVERALL_MS;

  const chosen = {};
  const chosenIds = {};
  let remaining =
    budget === null || budget === undefined ? null : Number(budget);

  // compute allocated budgets map (or null if no overall budget)
  const allocatedBudgets = computeAllocatedBudgets(purpose, remaining);

  // initial expanded build
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
    const p = priceNum(comp);
    if (remaining !== null && p > remaining) return;

    chosen[cat] = comp;
    chosenIds[cat] = comp.id;

    if (remaining !== null) {
      remaining -= p;
      if (remaining < 0) remaining = 0;
    }

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
      // helper: local allocated budget for this category (may be undefined if no budget)
      const localAlloc = allocatedBudgets
        ? allocatedBudgets[category] ?? allocatedBudgets._pool ?? null
        : null;

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
        if (!list.length) continue;

        const selected = selectCPUFromList(
          list,
          cfg.cpu_rank,
          localAlloc,
          remaining
        );
        if (selected) await commit("cpu", selected);
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
        if (!list.length) continue;
        let candidates = list;
        if (localAlloc !== null)
          candidates =
            candidates.filter((m) => priceNum(m) <= localAlloc) || candidates;
        if (remaining !== null && (!candidates || !candidates.length))
          candidates = list.filter((m) => priceNum(m) <= remaining) || list;
        candidates = candidates.length ? candidates : list;
        await commit(
          "motherboard",
          candidates[Math.floor(candidates.length / 2)] || candidates[0]
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
            (r) =>
              String(r.specs?.type || "").toLowerCase() ===
              String(type).toLowerCase()
          );
        list = list.filter(
          (r) =>
            Compatibility.checkComponentAgainstBuild(expanded, "memory", {
              ...r,
              category: "memory",
            }).ok
        );
        if (!list.length) continue;
        const sortedByCapacity = [...list].sort(
          (a, b) => memoryScore(b) - memoryScore(a)
        );
        const enough = sortedByCapacity.filter(
          (r) => Number(r.specs?.capacity_gb || 0) >= (cfg.ram_gb || 8)
        );
        if (localAlloc !== null && enough.length) {
          const affordable = enough.filter((r) => priceNum(r) <= localAlloc);
          if (affordable.length) {
            await commit(
              "memory",
              affordable[Math.floor(affordable.length / 2)]
            );
            continue;
          }
        }
        if (enough.length) {
          await commit("memory", enough[0]);
          continue;
        }
        let affordableAll = sortedByCapacity.filter(
          (r) => priceNum(r) <= (remaining === null ? Infinity : remaining)
        );
        affordableAll = affordableAll.length ? affordableAll : sortedByCapacity;
        await commit(
          "memory",
          affordableAll[Math.floor(affordableAll.length / 2)]
        );
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
        if (!list.length) continue;
        let scored = list
          .map((g) => ({ g, score: gpuScore(g), price: priceNum(g) }))
          .sort((a, b) => b.score - a.score || a.price - b.price);
        let candidates = [];
        if (localAlloc !== null)
          candidates = scored.filter((s) => s.price <= localAlloc);
        if (!candidates.length)
          candidates =
            remaining !== null
              ? scored.filter((s) => s.price <= remaining)
              : scored;
        if (!candidates.length) candidates = scored;
        await commit("gpu", candidates[0].g);
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
        if (!list.length) continue;
        const nvme = list.filter((s) =>
          /nvme|m\.2|m2|pci/.test(
            String(s.specs?.interface || "").toLowerCase()
          )
        );
        let preferred = nvme.length ? nvme : list;
        let scored = preferred
          .map((s) => ({ s, score: storageScore(s), price: priceNum(s) }))
          .sort((a, b) => b.score - a.score || a.price - b.price);
        let candidates = [];
        if (localAlloc !== null)
          candidates = scored.filter((x) => x.price <= localAlloc);
        if (!candidates.length)
          candidates =
            remaining !== null
              ? scored.filter((x) => x.price <= remaining)
              : scored;
        if (!candidates.length) candidates = scored;
        await commit("storage", candidates[0].s);
        continue;
      }

      // ------------------------ PSU (PATCHED — never skip)
      if (category === "psu") {
        let list = await fetchList("psu");
        if (!list.length) continue;

        const cpuT = Number(chosen.cpu?.specs?.tdp || 0);
        const gpuT = Number(chosen.gpu?.specs?.tdp || 0);

        // realistic recommended wattage
        const need = Math.ceil((cpuT + gpuT) * 1.2);

        // DO NOT hard filter — only sort (fix)
        list = list
          .map((p) => ({
            ...p,
            _watt: Number(p.specs?.wattage || 0),
            _price: priceNum(p),
          }))
          .sort((a, b) => {
            // prefer wattage >= need but still allow weaker PSUs
            const aOK = a._watt >= need ? 1 : 0;
            const bOK = b._watt >= need ? 1 : 0;

            if (aOK !== bOK) return bOK - aOK; // prioritize meeting wattage
            return a._price - b._price; // otherwise cheapest
          });

        const chosenPsu = list[0];
        await commit("psu", chosenPsu);
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
        if (!list.length) continue;
        let candidates =
          remaining !== null
            ? list.filter(
                (c) =>
                  priceNum(c) <= (localAlloc !== null ? localAlloc : remaining)
              )
            : list;
        candidates = candidates.length ? candidates : list;
        await commit("case", candidates[Math.floor(candidates.length / 2)]);
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
          if (socket && sockets.length && !sockets.includes(socket))
            return false;
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
        if (!list.length) continue;
        let candidates =
          remaining !== null
            ? list.filter(
                (c) =>
                  priceNum(c) <= (localAlloc !== null ? localAlloc : remaining)
              )
            : list;
        candidates = candidates.length ? candidates : list;
        await commit(
          "cpu_cooler",
          candidates[Math.floor(candidates.length / 2)]
        );
        continue;
      }
    } catch (err) {
      console.warn(
        `auto-build step failed for ${category}:`,
        err?.message || err
      );
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
  if (expanded.memory?.specs?.capacity_gb >= 32) purpose = "workstation";
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
