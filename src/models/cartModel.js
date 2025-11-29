// src/models/cartModel.js
// -----------------------------------------------------------------------------
// CART MODEL
// Handles:
// - Cart retrieval or creation
// - Component & build bundle insertion
// - Quantity updates
// - Item deletion and cart cleanup
// -----------------------------------------------------------------------------

import pool from "../db.js";

// -----------------------------------------------------------------------------
// CART — RETRIEVE / CREATE
// -----------------------------------------------------------------------------

/**
 * Retrieves the user's cart.
 * If no cart exists, a new empty cart is created and returned.
 */
export const getOrCreateCart = async (userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM carts WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  if (rows.length) return rows[0];

  const { rows: inserted } = await pool.query(
    `INSERT INTO carts (user_id) VALUES ($1) RETURNING *`,
    [userId]
  );

  return inserted[0];
};

// -----------------------------------------------------------------------------
// CART — GET ITEMS
// -----------------------------------------------------------------------------

/**
 * Returns all items inside the user's cart.
 * Items may be:
 *  - regular components
 *  - bundled saved builds
 */
import * as Builder from "./models/builderModel.js";

export const getCartItems = async (userId) => {
  const { rows } = await pool.query(
    `
      SELECT 
        ci.id,
        ci.user_id,
        ci.component_id,
        ci.build_id,
        ci.build_name,
        ci.build_total_price,
        ci.price,
        ci.quantity,
        ci.category,
        ci.components,
        ci.bundle_item_count,
        ci.updated_at,

        -- REAL COMPONENT DATA
        c.name AS component_name,
        c.price AS component_price,
        c.image_url AS image_url,
        c.category_id AS category_id,

        -- SAVED BUILD IMAGE
        ub.image_url AS build_image_url

      FROM cart_items ci
      LEFT JOIN components c
        ON ci.component_id = c.id
      LEFT JOIN user_builds ub
        ON ci.build_id = ub.id
      WHERE ci.user_id = $1
      ORDER BY ci.updated_at DESC
    `,
    [userId]
  );

  // ----------------------------
  // ⭐ ATTACH bundle_items HERE
  // ----------------------------

  for (const row of rows) {
    if (row.category === "build_bundle" && row.build_id) {
      const fullBuild = await Builder.getFullBuildById(row.build_id, userId);

      if (fullBuild && fullBuild.components) {
        const expanded = await Builder.expandComponents(fullBuild.components);

        row.bundle_items = Object.values(expanded).map((comp) => ({
          category: comp.category,
          name: comp.name,
          price: comp.price,
        }));
      } else {
        row.bundle_items = [];
      }
    }
  }

  return rows;
};

// -----------------------------------------------------------------------------
// CART — ADD COMPONENT
// -----------------------------------------------------------------------------

/**
 * Adds a component item to the cart.
 * If the component already exists in the cart, increments quantity by +1.
 */
export const addItem = async (userId, componentId, price, category) => {
  const { rows } = await pool.query(
    `
      INSERT INTO cart_items
        (user_id, component_id, price, quantity, category, updated_at)
      VALUES ($1, $2, $3, 1, $4, NOW())
      ON CONFLICT (user_id, component_id)
      DO UPDATE SET 
        quantity = cart_items.quantity + 1,
        updated_at = NOW()
      RETURNING *
    `,
    [userId, componentId, price, category]
  );

  return rows[0];
};

// -----------------------------------------------------------------------------
// CART — ADD SAVED BUILD BUNDLE
// -----------------------------------------------------------------------------

/**
 * Adds a full saved build to the cart as a "build_bundle" item.
 */
export const addBuildBundle = async ({
  user_id,
  build_id,
  build_name,
  build_total_price,
  bundle_item_count, // <── ADD THIS
}) => {
  const { rows } = await pool.query(
    `
      INSERT INTO cart_items
        (user_id, build_id, build_name, price, quantity, category, bundle_item_count, updated_at)
      VALUES ($1, $2, $3, $4, 1, 'build_bundle', $5, NOW())
      RETURNING *
    `,
    [user_id, build_id, build_name, build_total_price, bundle_item_count]
  );

  return rows[0];
};

// -----------------------------------------------------------------------------
// CART — ADD TEMP BUILD AS BUNDLE
// -----------------------------------------------------------------------------

export const addTempBuildBundle = async (userId, components, totalPrice) => {
  const { rows } = await pool.query(
    `
      INSERT INTO cart_items
        (user_id, component_id, build_id, price, quantity, category, components, updated_at)
      VALUES ($1, NULL, NULL, $2, 1, 'temp_build', $3, NOW())
      RETURNING *
    `,
    [userId, totalPrice, components]
  );

  return rows[0];
};

// -----------------------------------------------------------------------------
// CART — REMOVE ITEM
// -----------------------------------------------------------------------------

/**
 * Removes a single cart item by id.
 */
export const removeItem = async (itemId, userId) => {
  // Check current quantity
  const { rows } = await pool.query(
    `SELECT quantity FROM cart_items WHERE id = $1 AND user_id = $2`,
    [itemId, userId]
  );

  if (!rows[0]) return;

  const qty = Number(rows[0].quantity);

  // If more than 1 → minus only
  if (qty > 1) {
    await pool.query(
      `
        UPDATE cart_items
        SET quantity = quantity - 1,
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `,
      [itemId, userId]
    );
  }

  // If 1 → delete the row
  else {
    await pool.query(`DELETE FROM cart_items WHERE id = $1 AND user_id = $2`, [
      itemId,
      userId,
    ]);
  }
};

// -----------------------------------------------------------------------------
// CART — CLEAR ALL ITEMS
// -----------------------------------------------------------------------------

/**
 * Deletes all items inside the user's cart.
 */
export const clearCart = async (userId) => {
  await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
};
export const deleteRow = async (itemId, userId) => {
  await pool.query(`DELETE FROM cart_items WHERE id = $1 AND user_id = $2`, [
    itemId,
    userId,
  ]);
};
