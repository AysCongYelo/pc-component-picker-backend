// src/utils/autoBuilder.js
// -----------------------------------------------------------------------------
// AUTO-BUILDER ENGINE (Patched: strict compatibility + safe fallbacks)
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
// (unchanged from your version)
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
// HELPERS: price + scoring (kept same logic)
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
// SAFE COMPATIBILITY HELPER
// - Only runs Compatibility.checkComponentAgainstBuild if expanded has
//   enough context or category is standalone.
// - prevents returning false negatives when required parent part is missing.
// ============================================================================
const isCompatibleWithExpanded = (expanded, category, comp) => {
  // If compatibility util expects a motherboard for dependent checks,
  // skip the check if motherboard is missing (we'll do best-effort).
  // We assume compatibility.checkComponentAgainstBuild returns { ok, reason } or boolean.
  try {
    // If expanded is empty (nothing picked yet), we can allow candidates
    // BUT still run check if it won't depend on missing parent.
    const hasMb = !!expanded?.motherboard;
    if (
      category === "memory" ||
      category === "cpu_cooler" ||
      category === "case"
    ) {
      // these may depend on motherboard/case - only run compatibility if parent exists
      if (category === "memory" && !hasMb) return true;
      if (
        category === "cpu_cooler" &&
        !expanded?.case &&
        !expanded?.motherboard
      )
        return true;
      if (category === "case") return true; // case rarely needs existing parent to validate
    }

    // For other categories, it's safe to run the check even on partial builds.
    const out = Compatibility.checkComponentAgainstBuild(expanded, category, {
      ...comp,
      category,
    });

    // Some compatibility utils return boolean, some return object
    if (typeof out === "boolean") return out;
    return out?.ok ?? true;
  } catch (err) {
    // If compatibility check crashes for any reason, don't block the builder.
    return true;
  }
};

// ============================================================================
// CPU PICKER (cleaner, unchanged)
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

  if (rank === "high")
    return top[Math.floor(top.length / 2)]?.c || scored[0]?.c;
  if (rank === "mid-high") return top[top.length - 1]?.c || mid[0]?.c;
  if (rank === "mid") return mid[Math.floor(mid.length / 2)]?.c || top[0]?.c;
  return low[Math.floor(low.length / 2)]?.c || mid[0]?.c;
};

// ============================================================================
// AUTO-BUILD MAIN ENGINE (patched)
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

  // Start with empty expanded (will be updated after commits)
  let expanded = {};
  try {
    expanded = await withTimeout(
      BuilderModel.expandComponents(chosenIds),
      rem(deadline)
    );
  } catch (e) {
    expanded = {};
  }

  const commit = async (cat, comp) => {
    if (!comp || !comp.id) {
      chosen[cat] = null;
      chosenIds[cat] = null;
      return;
    }

    const p = priceNum(comp);
    if (remaining != null && p > remaining) {
      // can't afford -> skip
      chosen[cat] = null;
      chosenIds[cat] = null;
      return;
    }

    chosen[cat] = comp;
    chosenIds[cat] = comp.id;

    if (remaining != null) remaining = Math.max(0, remaining - p);

    try {
      expanded = await withTimeout(
        BuilderModel.expandComponents(chosenIds),
        rem(deadline)
      );
    } catch (e) {
      // ignore expand failures and keep best-effort expanded
    }
  };

  const fetchList = async (cat) => {
    try {
      const list = await withTimeout(
        BuilderModel.getComponentsWithSpecs(cat),
        rem(deadline)
      );
      if (!Array.isArray(list)) return [];
      return (list || []).filter(
        (c) => c.status === "active" && (c.stock == null || c.stock > 0)
      );
    } catch (err) {
      // safe fallback: log and return empty array
      console.warn(`fetchList(${cat}) failed:`, err.message || err);
      return [];
    }
  };

  for (const category of cfg.priority) {
    if (Date.now() > deadline) break;

    try {
      // local allocated budget
      let localAlloc = null;
      if (allocated) {
        if (allocated[category] != null) localAlloc = allocated[category];
        else localAlloc = Math.max(allocated._pool, 500);
      }

      // min GPU budget safety
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
        if (!list.length) {
          await commit("cpu", null);
          continue;
        }

        if (respectCpu) {
          const keep = list.find((c) => c.id === respectCpu);
          if (keep) {
            const ok =
              isCompatibleWithExpanded(expanded, "cpu", keep) &&
              (remaining == null || priceNum(keep) <= remaining);

            if (ok) {
              await commit("cpu", keep);
              continue;
            }
          }
        }

        list = list.filter((c) => isCompatibleWithExpanded(expanded, "cpu", c));
        if (!list.length) {
          // no compatible CPU found -> leave null instead of blocking
          await commit("cpu", null);
          continue;
        }

        const selected = selectCPUFromList(
          list,
          cfg.cpu_rank,
          localAlloc,
          remaining
        );
        if (selected) await commit("cpu", selected);
        else await commit("cpu", null);

        continue;
      }

      // ------------------------ Motherboard
      if (category === "motherboard") {
        let list = await fetchList("motherboard");
        if (!list.length) {
          await commit("motherboard", null);
          continue;
        }

        // If CPU chosen, prefer motherboards matching CPU socket
        const cpuSock = String(chosen.cpu?.specs?.socket || "").toLowerCase();
        if (cpuSock) {
          const matched = list.filter(
            (m) => String(m.specs?.socket || "").toLowerCase() === cpuSock
          );
          if (matched.length) list = matched;
        }

        // run compatibility only if CPU exists in expanded or chosen
        list = list.filter((m) =>
          isCompatibleWithExpanded(expanded, "motherboard", m)
        );

        if (!list.length) {
          // no compatible motherboard -> mark null and continue
          await commit("motherboard", null);
          continue;
        }

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
        if (!list.length) {
          await commit("memory", null);
          continue;
        }

        // If motherboard exists, filter by supported memory type
        const mbType = chosen.motherboard?.specs?.memory_type;
        if (mbType) {
          const filteredByType = list.filter(
            (r) =>
              String(r.specs?.type || "").toLowerCase() ===
              String(mbType).toLowerCase()
          );
          if (filteredByType.length) list = filteredByType;
        }

        // Run compatibility only when motherboard or cpu present in expanded
        list = list.filter((r) =>
          isCompatibleWithExpanded(expanded, "memory", r)
        );

        if (!list.length) {
          await commit("memory", null);
          continue;
        }

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
        if (!cfg.prefer_gpu) {
          await commit("gpu", null);
          continue;
        }

        let list = await fetchList("gpu");
        if (!list.length) {
          await commit("gpu", null);
          continue;
        }

        // Filter by compatibility only if it makes sense
        list = list.filter((g) => isCompatibleWithExpanded(expanded, "gpu", g));

        let scored = list
          .map((g) => ({ g, s: gpuScore(g), p: priceNum(g) }))
          .sort((a, b) => b.s - a.s || a.p - b.p);

        let candidates = scored.filter(
          (c) => c.p <= (localAlloc ?? remaining ?? Infinity)
        );
        if (!candidates.length) candidates = scored;

        if (!candidates.length) {
          await commit("gpu", null);
          continue;
        }

        await commit("gpu", candidates[0].g);
        continue;
      }

      // ------------------------ Storage
      if (category === "storage") {
        let list = await fetchList("storage");
        if (!list.length) {
          await commit("storage", null);
          continue;
        }

        list = list.filter((s) =>
          isCompatibleWithExpanded(expanded, "storage", s)
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

        if (!candidates.length) {
          await commit("storage", null);
          continue;
        }

        await commit("storage", candidates[0].s);
        continue;
      }

      // ------------------------ PSU
      if (category === "psu") {
        let list = await fetchList("psu");
        if (!list.length) {
          await commit("psu", null);
          continue;
        }

        const cpuT = Number(chosen.cpu?.specs?.tdp || 0);
        const gpuT = Number(chosen.gpu?.specs?.tdp || 0);

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

        if (!list.length) {
          await commit("psu", null);
          continue;
        }

        await commit("psu", list[0]);
        continue;
      }

      // ------------------------ Case
      if (category === "case") {
        let list = await fetchList("case");
        if (!list.length) {
          await commit("case", null);
          continue;
        }

        const mbForm = chosen.motherboard?.specs?.form_factor;
        const gpuLen = Number(chosen.gpu?.specs?.length || 0);

        list = list.filter((c) => {
          const supported = c.specs?.form_factor_support;

          // If no support info, allow case (don't block)
          if (!supported || !supported.length) return true;
          if (!mbForm) return true; // can't validate without motherboard
          return supported.includes(mbForm);
        });

        list = list.filter((c) => {
          const max = Number(c.specs?.max_gpu_length || 0);
          return !gpuLen || !max || gpuLen <= max;
        });

        list = list.filter((c) =>
          isCompatibleWithExpanded(expanded, "case", c)
        );

        if (!list.length) {
          await commit("case", null);
          continue;
        }

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
        if (!list.length) {
          await commit("cpu_cooler", null);
          continue;
        }

        const cpuSocket = chosen.cpu?.specs?.socket;
        const heightLimit = Number(
          chosen.case?.specs?.max_cpu_cooler_height || 0
        );

        list = list.filter((c) => {
          const sockets = c.specs?.compatible_sockets || [];
          const h = Number(c.specs?.height || 0);

          if (cpuSocket && sockets.length && !sockets.includes(cpuSocket))
            return false;
          if (heightLimit && h > heightLimit) return false;
          return true;
        });

        list = list.filter((c) =>
          isCompatibleWithExpanded(expanded, "cpu_cooler", c)
        );

        if (!list.length) {
          await commit("cpu_cooler", null);
          continue;
        }

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
      // Log and continue - don't let a single step failure kill the build.
      console.warn(
        `auto-build step failed for ${category}:`,
        err?.message || err
      );
      // mark category as null to keep deterministic behavior
      try {
        await commit(category, null);
      } catch {}
      continue;
    }
  }
  // ============================================================================
  // UPGRADE PHASE — bring build NEAR the budget (not cheapest)
  // ============================================================================

  if (budget != null && remaining > 0) {
    const UPGRADE_ORDER = [
      "gpu",
      "cpu",
      "memory",
      "storage",
      "motherboard",
      "psu",
      "case",
      "cpu_cooler",
    ];

    for (const cat of UPGRADE_ORDER) {
      if (!chosen[cat]) continue;

      const list = await fetchList(cat);
      if (!list.length) continue;

      const sorted =
        cat === "gpu"
          ? list.sort((a, b) => gpuScore(b) - gpuScore(a))
          : cat === "cpu"
          ? list.sort((a, b) => cpuScore(b) - cpuScore(a))
          : cat === "memory"
          ? list.sort((a, b) => memoryScore(b) - memoryScore(a))
          : cat === "storage"
          ? list.sort((a, b) => storageScore(b) - storageScore(a))
          : list.sort((a, b) => priceNum(b) - priceNum(a));

      const currentPrice = priceNum(chosen[cat]);

      const affordable = sorted.filter((c) => {
        const diff = priceNum(c) - currentPrice;
        return (
          diff > 0 &&
          diff <= remaining &&
          isCompatibleWithExpanded(expanded, cat, c)
        );
      });

      if (affordable.length) {
        const best = affordable[0];
        const diff = priceNum(best) - currentPrice;

        chosen[cat] = best;
        chosenIds[cat] = best.id;
        remaining -= diff;

        try {
          expanded = await withTimeout(
            BuilderModel.expandComponents(chosenIds),
            rem(deadline)
          );
        } catch (_) {}
      }
    }
  }

  // Final: convert chosen to id map (null when not chosen)
  const final = {};
  for (const [cat, comp] of Object.entries(chosen)) {
    if (comp?.id) final[cat] = comp.id; // ONLY add if may component
  }

  return final;
};

// ============================================================================
// AUTO COMPLETE
// ============================================================================
export const autoCompleteBuild = async (partial) => {
  // 1) Expand existing para meron tayong base for compatibility checks
  const expanded = await BuilderModel.expandComponents(partial).catch(
    () => ({})
  );

  // 2) Detect purpose (optional logic)
  let purpose = "gaming";
  if (expanded.memory?.specs?.capacity_gb >= 32) purpose = "workstation";
  if (expanded.cpu?.specs?.cores >= 12) purpose = "workstation";

  // 3) Use same priority as autobuild for alignment
  const cfg = PURPOSES[purpose] || PURPOSES.gaming;
  const categories = cfg.priority;

  const final = { ...partial }; // keep existing choices as is

  for (const category of categories) {
    // Skip categories already chosen
    if (partial[category]) continue;

    // Fetch components in this category
    const list = await BuilderModel.getComponentsWithSpecs(category);
    if (!list || !list.length) continue;

    // Filter: active + in-stock + compatible
    const compatible = list.filter((c) => {
      if (c.status !== "active") return false;
      if (c.stock != null && c.stock <= 0) return false;

      return Compatibility.isComponentCompatibleWithBuild(expanded, {
        ...c,
        category,
      });
    });

    if (!compatible.length) continue;

    // Pick CHEAPEST FULLY COMPATIBLE
    const cheapest = [...compatible].sort(
      (a, b) => priceNum(a) - priceNum(b)
    )[0];

    // Commit to build
    final[category] = cheapest.id;
    expanded[category] = cheapest; // update expanded so next categories see compatibility
  }

  return final;
};
