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

  const categoryId = catRows[0].id;
  const specTable = `${slug}_specs`;

  const { rows } = await pool.query(
    `
      SELECT
        c.*,
        to_jsonb(s) AS specs
      FROM components c
      LEFT JOIN ${specTable} s ON s.component_id = c.id
      WHERE c.category_id = $1
      ORDER BY c.price ASC
    `,
    [categoryId]
  );

  return rows.map((c) => ({
    ...c,
    category: slug,
    specs: c.specs || {},
  }));
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
// allowMissing = true  → TEMP build (placeholder allowed)
// allowMissing = false → SAVED build (hide missing components)
export const expandComponents = async (
  components = {},
  allowMissing = true
) => {
  const expanded = {};
  const sourceId = components.__source_build_id || null;

  for (const [category, id] of Object.entries(components)) {
    if (category === "__source_build_id") continue;

    // ❗ FIX 1: Just skip null or missing id
    if (!id) continue;

    const comp = await getComponentWithSpecsById(id);

    // ❗ FIX 2: If component not found in DB → skip
    if (!comp) {
      console.warn(`⚠ Missing component → id: ${id} (category: ${category})`);
      continue;
    }

    // Normal valid component
    expanded[category] = { ...comp, category };
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
  // 1. Expand components to get full info including image URLs
  // 🛑 0. Clean components (remove null/missing)
  const filteredComponents = Object.fromEntries(
    Object.entries(components || {}).filter(([key, value]) => {
      if (!value) return false;
      if (
        typeof value === "object" &&
        (value.id === null || value.name === "Missing Component")
      )
        return false;
      return true;
    })
  );

  // 1. Expand ONLY the real components
  const expanded = await expandComponents(filteredComponents, false);

  // 2. Pick CASE image → fallback to other components
  let buildImage = null;

  const priority = ["case", "gpu", "cpu", "motherboard", "memory"];

  for (const p of priority) {
    if (expanded[p]?.image_url) {
      buildImage = expanded[p].image_url;
      break;
    }
  }

  // 3. Insert with image_url
  const { rows } = await pool.query(
    `
      INSERT INTO user_builds
        (user_id, name, components, total_price, power_usage, compatibility, 
         is_saved, image_url, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, $5, $6, true, $7, now(), now())
      RETURNING *
    `,
    [
      userId,
      name || "My Build",
      JSON.stringify(filteredComponents),
      total_price,
      power_usage,
      compatibility,
      buildImage,
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
// -----------------------------------------------------------------------------
// BUILD ITEM EXPANSION FOR CHECKOUT (used in cart checkout & order summary)
// -----------------------------------------------------------------------------
export const getBuildItems = async (buildId) => {
  const { rows } = await pool.query(
    `SELECT components FROM user_builds WHERE id = $1 LIMIT 1`,
    [buildId]
  );

  const comps = rows[0]?.components;
  if (!comps) return [];

  // Expand using existing logic
  const expanded = await expandComponents(comps, false);

  // Convert expanded object → array of COMPLETE items
  return Object.entries(expanded)
    .filter(
      ([key, comp]) =>
        key !== "__source_build_id" &&
        comp &&
        comp.id &&
        comp.name &&
        comp.price !== undefined
    )
    .map(([key, comp]) => ({
      component_id: comp.id,
      name: comp.name,
      price: Number(comp.price || 0),
      price_each: Number(comp.price || 0),
      quantity: 1,

      // Correct category mapping
      category: key,
      component_category: key,

      // IMPORTANT: image for frontend display
      image_url: comp.image_url || null,
      component_image: comp.image_url || null,
    }));
};
export const getFeaturedBuildItems = async (buildId) => {
  const { rows } = await pool.query(
    `
      SELECT 
        fbi.component_id,
        fbi.quantity,
        c.name AS component_name,
        c.image_url AS component_image,
        c.price AS price_each,
        cat.slug AS component_category,
        c.wattage
      FROM featured_build_items fbi
      LEFT JOIN components c ON c.id = fbi.component_id
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE fbi.build_id = $1
      ORDER BY cat.slug ASC
    `,
    [buildId]
  );

  return rows.map((i) => ({
    component_id: i.component_id,
    name: i.component_name,
    price_each: Number(i.price_each || 0),
    price: Number(i.price_each || 0),
    quantity: i.quantity || 1,

    // images
    component_image: i.component_image,
    image_url: i.component_image,

    // category (correct slug)
    category: i.component_category,
    component_category: i.component_category,

    // optional: wattage for PSU calc
    wattage: i.wattage || 0,
  }));
};
