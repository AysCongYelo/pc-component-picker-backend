// src/models/builderModel.js

import pool from "../db.js";

// -----------------------------------------------------------------------------
// SPEC TABLES + CACHE
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

const specsCache = new Map();

// -----------------------------------------------------------------------------
// FETCH SPECS
// -----------------------------------------------------------------------------
export const getSpecsForComponent = async (componentId) => {
  if (specsCache.has(componentId)) return specsCache.get(componentId);

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

      specsCache.set(componentId, spec);
      return spec;
    }
  }

  specsCache.set(componentId, {});
  return {};
};

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------
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

export const getComponentsWithSpecs = async (slug) => {
  const { rows: catRows } = await pool.query(
    `SELECT id FROM categories WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  if (!catRows[0]) return [];

  const { rows: comps } = await pool.query(
    `SELECT * FROM components WHERE category_id = $1 ORDER BY price ASC`,
    [catRows[0].id]
  );

  return Promise.all(
    comps.map(async (c) => ({
      ...c,
      specs: await getSpecsForComponent(c.id),
      category: slug,
    }))
  );
};

// -----------------------------------------------------------------------------
// TEMP BUILD
// -----------------------------------------------------------------------------
export const getTempBuild = async (userId) => {
  const { rows } = await pool.query(
    `SELECT components FROM user_builds_temp WHERE user_id = $1`,
    [userId]
  );

  return rows[0] || { components: {} };
};

export const upsertTempBuild = async (userId, components) => {
  await pool.query(
    `
      INSERT INTO user_builds_temp (user_id, components, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (user_id)
      DO UPDATE SET components = EXCLUDED.components, updated_at = now()
    `,
    [userId, JSON.stringify(components)]
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

  let sourceId = components?.__source_build_id || null;

  for (const [category, id] of Object.entries(components || {})) {
    if (category === "__source_build_id") continue;

    const comp = await getComponentWithSpecsById(id);
    if (comp) expanded[category] = { ...comp, category };
  }

  if (sourceId) expanded.__source_build_id = sourceId;

  return expanded;
};

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
export const buildSummary = (expanded) => {
  let total = 0;
  let tdp = 0;

  for (const [key, item] of Object.entries(expanded)) {
    if (key === "__source_build_id") continue;

    total += Number(item.price || 0);
    tdp += Number(item.specs?.tdp || 0);
  }

  return {
    total_price: total,
    power_usage: tdp,
    compatibility: "unknown",
  };
};

// -----------------------------------------------------------------------------
// SAVED BUILDS (with is_saved)
// -----------------------------------------------------------------------------
export const saveUserBuild = async (
  userId,
  { name, components, total_price, power_usage, compatibility = "ok" }
) => {
  const { rows } = await pool.query(
    `
      INSERT INTO user_builds
        (user_id, name, components, total_price, power_usage, compatibility, is_saved, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, $5, $6, true, now(), now())
      RETURNING *
    `,
    [
      userId,
      name || "My Build",
      JSON.stringify(components || {}),
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
      WHERE user_id = $1 AND is_saved = true
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
      WHERE user_id = $1 AND id = $2 AND is_saved = true
      LIMIT 1
    `,
    [userId, id]
  );

  return rows[0] || null;
};

export const deleteUserBuild = async (userId, id) => {
  await pool.query(
    `
      UPDATE user_builds
      SET is_saved = false, updated_at = now()
      WHERE user_id = $1 AND id = $2
    `,
    [userId, id]
  );
};

export const removeFromSaved = async (userId, buildId) => {
  await pool.query(
    `
      UPDATE user_builds
      SET is_saved = false, updated_at = now()
      WHERE user_id = $1 AND id = $2
    `,
    [userId, buildId]
  );
};

// -----------------------------------------------------------------------------
// ADMIN LIST
// -----------------------------------------------------------------------------
export const getAllBuildsWithUser = async () => {
  const { rows } = await pool.query(
    `
      SELECT ub.*, p.full_name AS user_name, p.email AS user_email
      FROM user_builds ub
      LEFT JOIN profiles p ON p.id = ub.user_id
      ORDER BY ub.created_at DESC
    `
  );

  return rows;
};

// -----------------------------------------------------------------------------
// CHECKOUT
// -----------------------------------------------------------------------------
export const getFullBuildById = async (buildId, userId) => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM user_builds
      WHERE id = $1 AND user_id = $2 AND is_saved = true
      LIMIT 1
    `,
    [buildId, userId]
  );

  return rows[0] || null;
};
