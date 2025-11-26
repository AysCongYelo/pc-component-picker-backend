// src/controllers/builderController.js
// -----------------------------------------------------------------------------
// PC Builder system: components, temporary build workspace, compatibility
// checks, saved builds, auto-builder tools, and admin build overview.
// -----------------------------------------------------------------------------

import * as BuilderModel from "../models/builderModel.js";
import * as Compatibility from "../utils/compatibility.js";
import * as AutoBuilder from "../utils/autoBuilder.js";

/** Allowed component categories for the builder */
const ALLOWED_CATEGORIES = [
  "cpu",
  "motherboard",
  "memory",
  "gpu",
  "psu",
  "case",
  "cpu_cooler",
  "storage",
];

/* ============================================================================
    BUILDER — GET AVAILABLE COMPONENTS
  ============================================================================ */

/**
 * Get compatible components for a specific category.
 * Applies availability filters and compatibility rules against current temp build.
 */
// Helper — validate authenticated user
const ensureUser = (req, res) => {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
    return false;
  }
  return true;
};

export const getComponents = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const category = req.query.category;

    if (!category)
      return res.status(400).json({ error: "category query required" });

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: "invalid category",
        allowed: ALLOWED_CATEGORIES,
      });
    }

    const temp = await BuilderModel.getTempBuild(req.user.id);
    const expanded = await BuilderModel.expandComponents(temp.components || {});
    const candidates = await BuilderModel.getComponentsWithSpecs(category);

    // Filter active + in-stock + compatible parts
    const filtered = candidates.filter((c) => {
      if (c.status !== "active" || (c.stock !== null && c.stock <= 0))
        return false;

      return Compatibility.isComponentCompatibleWithBuild(expanded, {
        ...c,
        category,
      });
    });

    // If no compatible components found
    if (filtered.length === 0) {
      return res.json({
        components: [],
        message: "No compatible components available for your current setup.",
      });
    }

    return res.json({ components: filtered });
  } catch (err) {
    console.error("getComponents:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
    BUILDER — TEMPORARY BUILD
  ============================================================================ */

/**
 * Get the user's current temporary build (workspace).
 */
export const getTempBuild = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const temp = await BuilderModel.getTempBuild(req.user.id);
    const build = await BuilderModel.expandComponents(temp.components || {});
    const summary = BuilderModel.buildSummary(build);

    return res.json({
      build,
      summary,
      source_build_id: temp.components.__source_build_id || null,
    });
  } catch (err) {
    console.error("getTempBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Add a component to the temporary build.
 */
export const addToTempBuild = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const { category, componentId } = req.body;

    if (!category || !componentId) {
      return res
        .status(400)
        .json({ error: "category and componentId required" });
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: "invalid category",
        allowed: ALLOWED_CATEGORIES,
      });
    }

    const component = await BuilderModel.getComponentWithSpecsById(componentId);
    if (!component)
      return res.status(404).json({ error: "component not found" });

    const temp = await BuilderModel.getTempBuild(req.user.id);
    const expanded = await BuilderModel.expandComponents(temp.components || {});

    const isOk = Compatibility.checkComponentAgainstBuild(expanded, category, {
      ...component,
      category,
    });

    if (!isOk.ok) {
      return res.status(400).json({
        error: "Incompatible component",
        reason: isOk.reason,
      });
    }

    temp.components[category] = componentId;
    await BuilderModel.upsertTempBuild(req.user.id, temp.components);

    const detailed = await BuilderModel.expandComponents(temp.components);
    const summary = BuilderModel.buildSummary(detailed);

    return res.json({ build: detailed, summary });
  } catch (err) {
    console.error("addToTempBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Remove a component from the temporary build.
 */
export const removeFromTempBuild = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const { category } = req.body;

    if (!category)
      return res.status(400).json({ error: "category is required" });

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: "invalid category",
        allowed: ALLOWED_CATEGORIES,
      });
    }

    const temp = await BuilderModel.getTempBuild(req.user.id);
    delete temp.components[category];

    await BuilderModel.upsertTempBuild(req.user.id, temp.components);

    const detailed = await BuilderModel.expandComponents(temp.components);
    const summary = BuilderModel.buildSummary(detailed);

    return res.json({ build: detailed, summary });
  } catch (err) {
    console.error("removeFromTempBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Reset temporary build (clears everything).
 */
export const resetTempBuild = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    await BuilderModel.resetTempBuild(req.user.id);

    return res.json({
      success: true,
      build: {},
      summary: BuilderModel.buildSummary({}),
    });
  } catch (err) {
    console.error("resetTempBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
    BUILDER — SAVE / LOAD / MANAGE USER BUILDS
  ============================================================================ */

/**
 * Save current temp build as a user build.
 */
export const saveBuild = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const { name } = req.body;

    const temp = await BuilderModel.getTempBuild(req.user.id);
    const expanded = await BuilderModel.expandComponents(temp.components || {});
    const summary = BuilderModel.buildSummary(expanded);

    const REQUIRED_PARTS = ["cpu", "motherboard", "memory", "psu", "case"];
    let isIncomplete = REQUIRED_PARTS.some((part) => !expanded[part]);

    const check = Compatibility.checkWholeBuild(expanded);

    let compatibilityState = "ok";
    if (!check.ok) compatibilityState = "invalid";
    else if (isIncomplete) compatibilityState = "incomplete";

    const componentsToSave = { ...temp.components };
    delete componentsToSave.__source_build_id;

    const saved = await BuilderModel.saveUserBuild(req.user.id, {
      name: name || "My Build",
      components: componentsToSave,
      total_price: summary.total_price,
      power_usage: summary.power_usage,
      compatibility: compatibilityState,
    });

    // ➤ IMPORTANT: CLEAR TEMP AFTER SAVE
    await BuilderModel.resetTempBuild(req.user.id);

    return res.json({ build: saved });
  } catch (err) {
    console.error("saveBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get all builds for the authenticated user.
 */
export const getUserBuilds = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const builds = await BuilderModel.getUserBuilds(req.user.id);
    return res.json({ builds });
  } catch (err) {
    console.error("getUserBuilds:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get a single saved build by ID.
 */
export const getUserBuildById = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const id = req.params.id;

    const build = await BuilderModel.getUserBuildById(req.user.id, id);
    if (!build) return res.status(404).json({ error: "build not found" });

    const expanded = await BuilderModel.expandComponents(
      build.components || {}
    );
    const summary = BuilderModel.buildSummary(expanded);

    return res.json({ build: { ...build, expanded }, summary });
  } catch (err) {
    console.error("getUserBuildById:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

export const duplicateBuild = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const id = req.params.id;

    const build = await BuilderModel.getUserBuildById(req.user.id, id);
    if (!build) return res.status(404).json({ error: "build not found" });

    const allBuilds = await BuilderModel.getUserBuilds(req.user.id);
    const names = allBuilds.map((b) => b.name);

    let originalName = build.name;

    const topLevelMatch = originalName.match(/\((\d+)\)$/);

    let newName = "";

    if (!topLevelMatch) {
      let n = 1;
      newName = `${originalName} (${n})`;
      while (names.includes(newName)) {
        n++;
        newName = `${originalName} (${n})`;
      }
    } else {
      const withoutLast = originalName.replace(/\(\d+\)$/, "").trim();
      const lastNumber = topLevelMatch[1];

      // FIX: correct spaced nested base
      const nestedBase = `${withoutLast} (${lastNumber})`;

      let n = 1;
      newName = `${nestedBase}(${n})`;
      while (names.includes(newName)) {
        n++;
        newName = `${nestedBase}(${n})`;
      }
    }

    const copy = await BuilderModel.saveUserBuild(req.user.id, {
      name: newName,
      components: build.components,
      total_price: build.total_price,
      power_usage: build.power_usage,
      compatibility: build.compatibility,
    });

    return res.json({ build: copy });
  } catch (err) {
    console.error("duplicateBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Delete a saved build.
 */
export const deleteBuild = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    await BuilderModel.deleteUserBuild(req.user.id, req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
    BUILDER — AUTO BUILDER TOOLS
  ============================================================================ */

/**
 * Auto-complete missing parts of the temp build.
 */
export const autoComplete = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const temp = await BuilderModel.getTempBuild(req.user.id);

    // keep source build id
    const sourceId = temp.components.__source_build_id || null;

    const updated = await AutoBuilder.autoCompleteBuild(temp.components || {});

    // merge source id back para hindi mawala
    await BuilderModel.upsertTempBuild(req.user.id, {
      ...updated,
      ...(sourceId ? { __source_build_id: sourceId } : {}),
    });

    // separate the marker
    const { __source_build_id, ...componentOnly } = {
      ...updated,
      ...(sourceId ? { __source_build_id: sourceId } : {}),
    };

    // expand only the real components
    const detailed = await BuilderModel.expandComponents(componentOnly);

    // reattach marker cleanly
    if (sourceId) {
      detailed.__source_build_id = sourceId;
    }

    const summary = BuilderModel.buildSummary(detailed);

    return res.json({ build: detailed, summary });
  } catch (err) {
    console.error("autoComplete:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Generate a complete build based on purpose + budget.
 */
export const autoBuild = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const { purpose, budget } = req.body;

    if (!purpose) return res.status(400).json({ error: "purpose is required" });

    const temp = await BuilderModel.getTempBuild(req.user.id);

    const sourceId = temp.components.__source_build_id || null;

    const built = await AutoBuilder.buildFromPurpose({
      purpose,
      budget,
      respectCpu: null,
    });

    await BuilderModel.upsertTempBuild(req.user.id, {
      ...built,
      ...(sourceId ? { __source_build_id: sourceId } : {}),
    });

    const { __source_build_id, ...componentOnly } = {
      ...built,
      ...(sourceId ? { __source_build_id: sourceId } : {}),
    };

    const detailed = await BuilderModel.expandComponents(componentOnly);

    if (sourceId) detailed.__source_build_id = sourceId;

    const summary = BuilderModel.buildSummary(detailed);

    const check = Compatibility.checkWholeBuild(detailed);
    if (!check.ok) {
      return res.status(400).json({
        error: "AutoBuild generated an incompatible build",
        reason: check.reason,
      });
    }

    return res.json({ build: detailed, summary });
  } catch (err) {
    console.error("autoBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
    BUILDER — ADMIN VIEW
  ============================================================================ */

/**
 * Get all builds with user info (admin only).
 */
export const getAllBuildsWithUser = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const builds = await BuilderModel.getAllBuildsWithUser();
    return res.json({ builds });
  } catch (err) {
    console.error("getAllBuildsWithUser:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
    BUILDER — LOAD & UPDATE SAVED BUILD
  ============================================================================ */

/**
 * Load a saved build into the temporary builder workspace.
 */
export const loadSavedBuildToTemp = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const id = req.params.id;

    const build = await BuilderModel.getUserBuildById(req.user.id, id);
    if (!build) return res.status(404).json({ error: "build not found" });

    // Create a temp component object with marker
    const tempComponents = {
      ...build.components,
      __source_build_id: id,
    };

    await BuilderModel.upsertTempBuild(req.user.id, tempComponents);

    const expanded = await BuilderModel.expandComponents(build.components);
    const summary = BuilderModel.buildSummary(expanded);

    return res.json({
      source_build_id: id,
      build: expanded,
      summary,
      message: "Loaded into temp build for editing",
    });
  } catch (err) {
    console.error("loadSavedBuildToTemp:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update an existing saved build using the current temp build.
 */
export const updateSavedBuild = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const id = req.params.id;
    const { name } = req.body;

    const original = await BuilderModel.getUserBuildById(req.user.id, id);
    if (!original) return res.status(404).json({ error: "build not found" });

    const temp = await BuilderModel.getTempBuild(req.user.id);
    const updatedComponents = temp.components || {};

    // --- FIXED LOGIC ---
    // Accept update if:
    // A) temp build contains the source marker, OR
    // B) temp build structure matches the saved build (means it was loaded earlier)
    const tempCopy = { ...updatedComponents };
    delete tempCopy.__source_build_id;

    const originalKeys = Object.keys(original.components || {}).sort();
    const tempKeys = Object.keys(tempCopy || {}).sort();

    const isSameStructure =
      JSON.stringify(originalKeys) === JSON.stringify(tempKeys);

    if (!isSameStructure && updatedComponents.__source_build_id !== id) {
      return res.status(400).json({
        error: "You must load this saved build before updating it.",
      });
    }

    // Remove marker before saving
    delete updatedComponents.__source_build_id;

    const expanded = await BuilderModel.expandComponents(updatedComponents);
    const check = Compatibility.checkWholeBuild(expanded);

    if (!check.ok) {
      return res.status(400).json({
        error: "Build incompatible",
        reason: check.reason,
      });
    }

    const summary = BuilderModel.buildSummary(expanded);

    const updated = await BuilderModel.updateUserBuild(req.user.id, id, {
      name: name || original.name,
      components: updatedComponents,
      total_price: summary.total_price,
      power_usage: summary.power_usage,
      compatibility: "compatible",
    });

    // CLEAR TEMP BUILD AFTER SUCCESSFUL UPDATE
    await BuilderModel.resetTempBuild(req.user.id);

    return res.json({
      build: updated,
      message: "Build updated successfully",
    });
  } catch (err) {
    console.error("updateSavedBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get all saved builds with preview (used in Saved Builds tab UI).
 */
export const getMySavedBuilds = async (req, res) => {
  try {
    if (!ensureUser(req, res)) return;

    const builds = await BuilderModel.getUserBuilds(req.user.id);

    const results = [];
    for (const b of builds) {
      const expanded = await BuilderModel.expandComponents(b.components || {});
      const summary = BuilderModel.buildSummary(expanded);

      results.push({
        id: b.id,
        name: b.name,
        total_price: summary.total_price,
        power_usage: summary.power_usage,
        compatibility: b.compatibility || "ok",
        preview: expanded,
        created_at: b.created_at,
      });
    }

    return res.json({ builds: results });
  } catch (err) {
    console.error("getMySavedBuilds:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
