// src/models/builderModel.js
// -----------------------------------------------------------------------------
// BUILDER MODEL
// Handles:
// - Component + specs fetching
// - Temp build (workspace) management
// - Saved builds CRUD
// - Admin build listing
// -----------------------------------------------------------------------------

import pool from "../db.js";

// -----------------------------------------------------------------------------
// SPEC TABLE MAP
// Automatically detects which spec table contains a component’s specs
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

// -----------------------------------------------------------------------------
// COMPONENTS + SPECS
// -----------------------------------------------------------------------------

/** Get specs for a component by scanning every spec table */
export const getSpecsForComponent = async (componentId) => {
  for (const table of SPEC_TABLES) {
    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE component_id = $1 LIMIT 1`,
      [componentId]
    );

    if (rows[0]) {
      const spec = { ...rows[0] };
      delete spec.id;
      delete spec.component_id;
      delete spec.created_at;
      return spec;
    }
  }

  return {};
};

/** Get single component + category + resolved specs */
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

/** Get all components for a category slug + specs */
export const getComponentsWithSpecs = async (slug) => {
  const { rows: catRows } = await pool.query(
    `SELECT id FROM categories WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  if (!catRows[0]) return [];

  const categoryId = catRows[0].id;

  const { rows: components } = await pool.query(
    `
      SELECT *
      FROM components
      WHERE category_id = $1
      ORDER BY price ASC
    `,
    [categoryId]
  );

  return Promise.all(
    components.map(async (c) => {
      const specs = await getSpecsForComponent(c.id);
      return { ...c, specs, category: slug };
    })
  );
};

// -----------------------------------------------------------------------------
// TEMP BUILD (WORKSPACE)
// -----------------------------------------------------------------------------

/** Get user’s temp build */
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

/** Insert or update temp build */
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

/** Clear temp build */
export const resetTempBuild = async (userId) => {
  await pool.query(`DELETE FROM user_builds_temp WHERE user_id = $1`, [userId]);
};

/** Expand component IDs into full objects (preserves __source_build_id) */
export const expandComponents = async (components) => {
  const expanded = {};

  // Keep marker BEFORE expanding
  let sourceId = null;
  if (components && components.__source_build_id) {
    sourceId = components.__source_build_id;
  }

  for (const [category, id] of Object.entries(components || {})) {
    if (category === "__source_build_id") continue; // skip marker

    const comp = await getComponentWithSpecsById(id);
    if (comp) expanded[category] = { ...comp, category };
  }

  // Reattach marker
  if (sourceId) {
    expanded.__source_build_id = sourceId;
  }

  return expanded;
};

// -----------------------------------------------------------------------------
// BUILD SUMMARY
// -----------------------------------------------------------------------------

/** Compute price + total TDP of the build */
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
// SAVED BUILDS (USER CRUD)
// -----------------------------------------------------------------------------

/** Save final build */
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

/** Get all builds of user */
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

/** Get one build of user */
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

/** Delete build */
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
// ADMIN — ALL BUILDS LISTING
// -----------------------------------------------------------------------------

/** Admin: get all builds + user info */
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
// UPDATE EXISTING SAVED BUILD
// -----------------------------------------------------------------------------

/** Update user's saved build */
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
// CHECKOUT — GET FULL BUILD
// -----------------------------------------------------------------------------

/** Get one saved build (full) for checkout */
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
