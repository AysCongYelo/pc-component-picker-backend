// src/models/builderModel.js
// -----------------------------------------------------------------------------
// BUILDER MODEL (Optimized Version)
// Handles:
// - Component fetching with specs
// - Temp build (workspace) CRUD
// - Saved builds CRUD
// - Admin build listing
// - Spec caching for maximum performance
// -----------------------------------------------------------------------------

import pool from "../db.js";

// -----------------------------------------------------------------------------
// SPEC TABLE MAP + CACHE
// -----------------------------------------------------------------------------
const SPEC_TABLES = [
  "cpu_specs",
  "motherboard_specs",
  "gpu_specs",
  "memory_specs",
  "psu_specs",
  "case_specs",
  "cpu_cooler_specs",
  "storage_specs",
];

// Cache: componentId -> specs object
const specsCache = new Map();

// Preload spec map (componentId → table)
let specSourceMap = null;

/** Load spec source map once (component_id → spec table) */
const loadSpecSourceMap = async () => {
  if (specSourceMap) return specSourceMap;

  specSourceMap = {};

  for (const table of SPEC_TABLES) {
    const { rows } = await pool.query(`SELECT component_id FROM ${table}`);
    rows.forEach((r) => {
      specSourceMap[r.component_id] = table;
    });
  }

  return specSourceMap;
};

// -----------------------------------------------------------------------------
// FETCH SPECS (Optimized & Cached)
// -----------------------------------------------------------------------------

/**
 * Get resolved specs for a component.
 * Uses cache + pre-scanned table map for 10x speed.
 */
export const getSpecsForComponent = async (componentId) => {
  if (specsCache.has(componentId)) {
    return specsCache.get(componentId);
  }

  const map = await loadSpecSourceMap();
  const table = map[componentId];

  if (!table) {
    specsCache.set(componentId, {});
    return {};
  }

  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE component_id = $1 LIMIT 1`,
    [componentId]
  );

  const row = rows[0];

  if (!row) {
    specsCache.set(componentId, {});
    return {};
  }

  const spec = { ...row };
  delete spec.id;
  delete spec.component_id;
  delete spec.created_at;

  specsCache.set(componentId, spec);
  return spec;
};

// -----------------------------------------------------------------------------
// COMPONENT + SPECS (Optimized)
// -----------------------------------------------------------------------------

/** Get single component with specs */
export const getComponentWithSpecsById = async (id) => {
  const { rows } = await pool.query(
    `
      SELECT c.*, cat.slug AS category
      FROM components c
      JOIN categories cat ON cat.id = c.category_id
      WHERE c.id = $1
      LIMIT 1
    `,
    [id]
  );

  if (!rows[0]) return null;

  const specs = await getSpecsForComponent(id);
  return { ...rows[0], specs };
};

/** Get all components under a category slug + specs */
export const getComponentsWithSpecs = async (slug) => {
  const { rows: catRows } = await pool.query(
    `SELECT id FROM categories WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  if (!catRows[0]) return [];

  const categoryId = catRows[0].id;

  const { rows: comps } = await pool.query(
    `
      SELECT *
      FROM components
      WHERE category_id = $1
      ORDER BY price ASC
    `,
    [categoryId]
  );

  return Promise.all(
    comps.map(async (c) => {
      const specs = await getSpecsForComponent(c.id);
      return { ...c, specs, category: slug };
    })
  );
};

// -----------------------------------------------------------------------------
// TEMP BUILD (Workspace)
// -----------------------------------------------------------------------------

export const getTempBuild = async (userId) => {
  const { rows } = await pool.query(
    `
      SELECT components
      FROM user_builds_temp
      WHERE user_id = $1
    `,
    [userId]
  );

  return rows[0] || { components: {} };
};

export const upsertTempBuild = async (userId, components) => {
  await pool.query(
    `
      INSERT INTO user_builds_temp (user_id, components, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (user_id)
      DO UPDATE SET
        components = EXCLUDED.components,
        updated_at = now()
    `,
    [userId, components]
  );
};

export const resetTempBuild = async (userId) => {
  await pool.query(`DELETE FROM user_builds_temp WHERE user_id = $1`, [userId]);
};

// -----------------------------------------------------------------------------
// EXPAND COMPONENTS
// -----------------------------------------------------------------------------

export const expandComponents = async (components) => {
  const expanded = {};

  let sourceId = null;
  if (components?.__source_build_id) {
    sourceId = components.__source_build_id;
  }

  for (const [category, id] of Object.entries(components || {})) {
    if (category === "__source_build_id") continue;

    const comp = await getComponentWithSpecsById(id);
    if (comp) expanded[category] = { ...comp, category };
  }

  if (sourceId) {
    expanded.__source_build_id = sourceId;
  }

  return expanded;
};

// -----------------------------------------------------------------------------
// BUILD SUMMARY
// -----------------------------------------------------------------------------

export const buildSummary = (expanded) => {
  let total = 0;
  let tdp = 0;

  for (const item of Object.values(expanded)) {
    total += Number(item.price || 0);
    tdp += Number(item.specs?.tdp || 0);
  }

  return {
    total_price: Number(total.toFixed(2)),
    power_usage: Number(tdp.toFixed(2)),
    compatibility: "unknown",
  };
};

// -----------------------------------------------------------------------------
// SAVED BUILDS
// -----------------------------------------------------------------------------

export const saveUserBuild = async (
  userId,
  { name, components, total_price, power_usage, compatibility = "ok" }
) => {
  const { rows } = await pool.query(
    `
      INSERT INTO user_builds
        (user_id, name, components, total_price, power_usage, compatibility, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, now(), now())
      RETURNING *
    `,
    [
      userId,
      name || "My Build",
      components,
      total_price,
      power_usage,
      compatibility,
    ]
  );

  return rows[0];
};

export const getUserBuilds = async (userId) => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM user_builds
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
};

export const getUserBuildById = async (userId, id) => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM user_builds
      WHERE user_id = $1 AND id = $2
    `,
    [userId, id]
  );

  return rows[0] || null;
};

export const deleteUserBuild = async (userId, id) => {
  await pool.query(
    `
      DELETE FROM user_builds
      WHERE user_id = $1 AND id = $2
    `,
    [userId, id]
  );
};

// -----------------------------------------------------------------------------
// ADMIN - LIST ALL BUILDS
// -----------------------------------------------------------------------------

export const getAllBuildsWithUser = async () => {
  const { rows } = await pool.query(
    `
      SELECT 
        ub.*,
        p.full_name AS user_name,
        p.email AS user_email
      FROM user_builds ub
      LEFT JOIN profiles p ON p.id = ub.user_id
      ORDER BY ub.created_at DESC
    `
  );

  return rows;
};

// -----------------------------------------------------------------------------
// UPDATE SAVED BUILD
// -----------------------------------------------------------------------------

export const updateUserBuild = async (
  userId,
  id,
  { name, components, total_price, power_usage, compatibility = "ok" }
) => {
  const { rows } = await pool.query(
    `
      UPDATE user_builds
      SET name = $1,
          components = $2,
          total_price = $3,
          power_usage = $4,
          compatibility = $5,
          updated_at = now()
      WHERE user_id = $6 AND id = $7
      RETURNING *
    `,
    [
      name,
      components || {},
      total_price,
      power_usage,
      compatibility,
      userId,
      id,
    ]
  );

  return rows[0];
};

// -----------------------------------------------------------------------------
// CHECKOUT
// -----------------------------------------------------------------------------

export const getFullBuildById = async (buildId, userId) => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM user_builds
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [buildId, userId]
  );

  return rows[0] || null;
};
