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

const OVERALL_MS = 10000;
const withTimeout = (p, ms) =>
  Promise.race([
    p,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("Operation timed out")), ms)
    ),
  ]);
const rem = (deadline) => Math.max(200, deadline - Date.now());

// ============================================================================
// PURPOSE PROFILES + BUDGET ALLOCATION
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
// BUDGET ALLOCATION TABLE
// ============================================================================

const BUDGET_ALLOCATION = {
  gaming: {
    gpu: 0.4,
    cpu: 0.23,
    motherboard: 0.1,
    memory: 0.08,
    storage: 0.08,
    psu: 0.06,
    case: 0.03,
    cpu_cooler: 0.02,
  },
  workstation: {
    cpu: 0.38,
    memory: 0.22,
    storage: 0.14,
    motherboard: 0.1,
    gpu: 0.08,
    cpu_cooler: 0.04,
    psu: 0.03,
    case: 0.01,
  },
  streaming: {
    cpu: 0.3,
    gpu: 0.28,
    memory: 0.14,
    storage: 0.1,
    motherboard: 0.08,
    psu: 0.05,
    cpu_cooler: 0.03,
    case: 0.02,
  },
  basic: {
    cpu: 0.35,
    memory: 0.2,
    storage: 0.15,
    motherboard: 0.12,
    psu: 0.07,
    gpu: 0.06,
    case: 0.03,
    cpu_cooler: 0.02,
  },
};

// ============================================================================
// HELPERS: price + scoring
// ============================================================================

const priceNum = (c) => {
  try {
    if (!c) return 0;
    const val = String(c.price ?? "0").replace(/[^0-9.]/g, "");
    return Number(val) || 0;
  } catch {
    return 0;
  }
};

const cpuScore = (c) => {
  const cores = Number(c?.specs?.cores || 0);
  const threads = Number(c?.specs?.threads || 0);
  const clock =
    Number(c?.specs?.base_clock_ghz || 0) ||
    Number((c?.specs?.base_clock_mhz || 0) / 1000 || 0);
  const perf = Number(c?.specs?.performance_score || 0);
  return perf || cores * 100 + clock * 30 + threads * 10;
};

const gpuScore = (g) => {
  const p = Number(g?.specs?.performance_score || 0);
  if (p > 0) return p;
  return Number(g?.specs?.tdp || 0) * 10 || priceNum(g);
};

const memoryScore = (m) =>
  Number(m?.specs?.capacity_gb || 0) * 100 +
  Number(m?.specs?.speed_mhz || 0) / 10;

const storageScore = (s) => {
  const iface = String(s?.specs?.interface || "").toLowerCase();
  const nvme = /nvme|m\.2|m2|pci/.test(iface) ? 1 : 0;
  return nvme * 10000 + Number(s?.specs?.capacity_gb || 0);
};

// ============================================================================
// BUDGET ALLOCATION CALC
// ============================================================================

const computeAllocatedBudgets = (purpose, budget) => {
  if (budget == null) return null;

  const table = BUDGET_ALLOCATION[purpose] || BUDGET_ALLOCATION.basic;
  const allocated = {};

  for (const [cat, pct] of Object.entries(table)) {
    allocated[cat] = Math.floor(budget * pct);
  }

  const leftover = budget - Object.values(allocated).reduce((a, b) => a + b, 0);
  allocated._pool = Math.max(0, leftover);

  return allocated;
};

// ============================================================================
// CPU PICKER (cleaner)
// ============================================================================

const selectCPUFromList = (list, rank, allocated, remaining) => {
  let candidates = list.filter((c) => {
    const p = priceNum(c);
    if (allocated != null) return p <= allocated;
    if (remaining != null) return p <= remaining;
    return true;
  });

  if (!candidates.length) candidates = list;

  const scored = candidates
    .map((c) => ({ c, s: cpuScore(c), p: priceNum(c) }))
    .sort((a, b) => b.s - a.s || a.p - b.p);

  const n = scored.length;
  const top = scored.slice(0, Math.ceil(n * 0.3));
  const mid = scored.slice(top.length, Math.ceil(n * 0.7));
  const low = scored.slice(Math.ceil(n * 0.7));

  if (rank === "high") return top[Math.floor(top.length / 2)]?.c || scored[0].c;
  if (rank === "mid-high") return top[top.length - 1]?.c || mid[0]?.c;
  if (rank === "mid") return mid[Math.floor(mid.length / 2)]?.c || top[0]?.c;
  return low[Math.floor(low.length / 2)]?.c || mid[0]?.c;
};

// ============================================================================
// AUTO-BUILD MAIN ENGINE
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
  let remaining = budget == null ? null : Number(budget);

  const allocated = computeAllocatedBudgets(purpose, remaining);

  let expanded = {};
  try {
    expanded = await withTimeout(
      BuilderModel.expandComponents(chosenIds),
      rem(deadline)
    );
  } catch {}

  const commit = async (cat, comp) => {
    if (!comp?.id) return;
    const p = priceNum(comp);
    if (remaining != null && p > remaining) return;

    chosen[cat] = comp;
    chosenIds[cat] = comp.id;

    if (remaining != null) remaining = Math.max(0, remaining - p);

    try {
      expanded = await withTimeout(
        BuilderModel.expandComponents(chosenIds),
        rem(deadline)
      );
    } catch {}
  };

  const fetchList = async (cat) => {
    const list = await withTimeout(
      BuilderModel.getComponentsWithSpecs(cat),
      rem(deadline)
    );
    return (list || []).filter(
      (c) => c.status === "active" && (c.stock == null || c.stock > 0)
    );
  };

  // ========================================================================
  // CATEGORY LOOP
  // ========================================================================

  for (const category of cfg.priority) {
    if (Date.now() > deadline) break;

    try {
      // Local allocated budget
      let localAlloc = null;
      if (allocated) {
        if (allocated[category] != null) localAlloc = allocated[category];
        else localAlloc = Math.max(allocated._pool, 500);
      }

      // ------------------------ Minimum GPU budget (Fix #4)
      if (
        (purpose === "gaming" || purpose === "streaming") &&
        category === "gpu"
      ) {
        const minGpuBudget = Math.floor((budget || 0) * 0.25);
        if (localAlloc < minGpuBudget) localAlloc = minGpuBudget;
      }

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
              (remaining == null || priceNum(keep) <= remaining);

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

        const cpuSock = String(chosen.cpu?.specs?.socket || "").toLowerCase();
        if (cpuSock)
          list = list.filter(
            (m) => String(m.specs?.socket || "").toLowerCase() === cpuSock
          );

        list = list.filter(
          (m) =>
            Compatibility.checkComponentAgainstBuild(expanded, "motherboard", {
              ...m,
              category: "motherboard",
            }).ok
        );

        let candidates = list.filter(
          (m) => priceNum(m) <= (localAlloc ?? remaining ?? Infinity)
        );
        if (!candidates.length) candidates = list;

        await commit(
          "motherboard",
          candidates[Math.floor(candidates.length / 2)]
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

        const sorted = [...list].sort(
          (a, b) => memoryScore(b) - memoryScore(a)
        );
        const enough = sorted.filter(
          (r) => Number(r.specs?.capacity_gb || 0) >= (cfg.ram_gb || 8)
        );

        if (localAlloc != null) {
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

        const affordableAll = sorted.filter(
          (r) => priceNum(r) <= (remaining ?? Infinity)
        );

        await commit(
          "memory",
          (affordableAll.length ? affordableAll : sorted)[
            Math.floor(
              (affordableAll.length ? affordableAll : sorted).length / 2
            )
          ]
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

        let scored = list
          .map((g) => ({ g, s: gpuScore(g), p: priceNum(g) }))
          .sort((a, b) => b.s - a.s || a.p - b.p);

        let candidates = scored.filter(
          (c) => c.p <= (localAlloc ?? remaining ?? Infinity)
        );
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

        const nvme = list.filter((s) =>
          /nvme|m\.2|m2|pci/.test(
            String(s.specs?.interface || "").toLowerCase()
          )
        );

        const preferred = nvme.length ? nvme : list;

        let scored = preferred
          .map((s) => ({ s, sc: storageScore(s), p: priceNum(s) }))
          .sort((a, b) => b.sc - a.sc || a.p - b.p);

        let candidates = scored.filter(
          (x) => x.p <= (localAlloc ?? remaining ?? Infinity)
        );
        if (!candidates.length) candidates = scored;

        await commit("storage", candidates[0].s);
        continue;
      }

      // ------------------------ PSU (x1.3 stays)
      if (category === "psu") {
        let list = await fetchList("psu");
        if (!list.length) continue;

        const cpuT = Number(chosen.cpu?.specs?.tdp || 0);
        const gpuT = Number(chosen.gpu?.specs?.tdp || 0);

        // KEEPING EXACTLY AS YOUR VERSION:
        const need = Math.max(350, Math.ceil((cpuT + gpuT) * 1.3));

        list = list
          .map((p) => ({
            ...p,
            _watt: Number(p.specs?.wattage || 0),
            _price: priceNum(p),
          }))
          .sort((a, b) => {
            const aOK = a._watt >= need ? 1 : 0;
            const bOK = b._watt >= need ? 1 : 0;

            if (aOK !== bOK) return bOK - aOK;
            if (!aOK && !bOK) return b._watt - a._watt;
            return a._price - b._price;
          });

        await commit("psu", list[0]);
        continue;
      }

      // ------------------------ Case (Fix #3)
      if (category === "case") {
        let list = await fetchList("case");
        if (!list.length) continue;

        const mbForm = chosen.motherboard?.specs?.form_factor;
        const gpuLen = Number(chosen.gpu?.specs?.length || 0);

        list = list.filter((c) => {
          const supported = c.specs?.form_factor_support;

          // FIX — if no support list, we ALLOW the case
          if (!supported || !supported.length) return true;

          return supported.includes(mbForm);
        });

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

        let candidates = list.filter(
          (c) => priceNum(c) <= (localAlloc ?? remaining ?? Infinity)
        );
        if (!candidates.length) candidates = list;

        await commit("case", candidates[Math.floor(candidates.length / 2)]);
        continue;
      }

      // ------------------------ Cooler
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

        let candidates = list.filter(
          (c) => priceNum(c) <= (localAlloc ?? remaining ?? Infinity)
        );
        if (!candidates.length) candidates = list;

        await commit(
          "cpu_cooler",
          candidates[Math.floor(candidates.length / 2)]
        );
        continue;
      }
    } catch (err) {
      console.warn(`auto-build step failed for ${category}:`, err.message);
      continue;
    }
  }

  const final = {};
  for (const [cat, comp] of Object.entries(chosen)) {
    final[cat] = comp?.id || null;
  }

  return final;
};

// ============================================================================
// AUTO COMPLETE
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
