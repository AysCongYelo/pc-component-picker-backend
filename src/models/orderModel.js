// src/models/orderModel.js
// -----------------------------------------------------------------------------
// ORDER MODEL — Clean, Bug-Free Version
// Handles:
// - Build checkout
// - Stock validation
// - Order + order_items creation
// - User order queries
// -----------------------------------------------------------------------------

import pool from "../db.js";
import * as Builder from "../models/builderModel.js";

// -----------------------------------------------------------------------------
// CREATE ORDER FOR SAVED BUILD CHECKOUT
// -----------------------------------------------------------------------------

export const createOrderTransaction = async ({
  userId,
  items, // [{ component_id:null, qty:1, price_each, category:"build_bundle", build_id }]
  payment_method = "cod",
  notes = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Always 1 saved build per checkout
    const it = items[0];
    const buildId = it.build_id;

    if (!buildId) throw new Error("Missing build_id");

    // Load all internal components inside saved build
    const parts = await Builder.getBuildItems(buildId);
    if (!parts || parts.length === 0)
      throw new Error("Build has no components");

    // ---------------------------------------
    // STOCK VALIDATION
    // ---------------------------------------
    for (const bi of parts) {
      const { rows } = await client.query(
        `SELECT stock FROM components WHERE id = $1 FOR UPDATE`,
        [bi.component_id]
      );

      if (!rows[0]) throw new Error(`Component not found: ${bi.component_id}`);

      const stock = Number(rows[0].stock || 0);
      if (stock < (bi.quantity || 1)) {
        throw new Error(`Out of stock: ${bi.component_id}`);
      }
    }

    // ---------------------------------------
    // COMPUTE TOTAL
    // ---------------------------------------
    const total = parts.reduce(
      (sum, bi) => sum + Number(bi.price || bi.price_each || 0),
      0
    );

    // ---------------------------------------
    // INSERT ORDER
    // ---------------------------------------
    const { rows: orderRows } = await client.query(
      `
        INSERT INTO orders (user_id, total, payment_method, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [userId, total, payment_method, notes]
    );

    const order = orderRows[0];

    // ---------------------------------------
    // INSERT INTERNAL COMPONENT ITEMS
    // ---------------------------------------
    for (const bi of parts) {
      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            component_id,
            quantity,
            price_each,
            category,
            build_id,
            component_name,
            component_image,
            component_category
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          order.id, // order_id
          bi.component_id, // component_id
          bi.quantity || 1, // quantity
          bi.price || bi.price_each || 0, // price_each
          bi.category || bi.component_category || null, // category
          buildId, // build_id
          bi.name || bi.component_name || null, // component_name
          bi.image_url || bi.component_image || null, // component_image
          bi.category || bi.component_category || null, // component_category
        ]
      );

      // Deduct stock
      await client.query(
        `UPDATE components SET stock = stock - $1 WHERE id = $2`,
        [bi.quantity || 1, bi.component_id]
      );
    }

    await client.query("COMMIT");
    return order;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// -----------------------------------------------------------------------------
// USER QUERIES
// -----------------------------------------------------------------------------

export const getUserOrders = async (userId) => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
};

export const getOrderById = async (userId, id) => {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM orders
      WHERE id = $1 AND user_id = $2
    `,
    [id, userId]
  );

  return rows[0] || null;
};

export const getOrderItems = async (orderId) => {
  const { rows } = await pool.query(
    `
      SELECT 
        oi.id,
        oi.order_id,
        oi.component_id,
        oi.build_id,
        oi.quantity,
        oi.price_each,
        oi.category,
        oi.created_at,

        -- Prefer saved snapshot, fallback to component table
        COALESCE(oi.component_name, c.name) AS component_name,
        COALESCE(oi.component_image, c.image_url) AS component_image,
        COALESCE(oi.component_category, c.category) AS component_category

      FROM order_items oi
      LEFT JOIN components c ON c.id = oi.component_id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `,
    [orderId]
  );

  return rows;
};

// -----------------------------------------------------------------------------
// ADMIN — UPDATE STATUS
// -----------------------------------------------------------------------------

export const updateOrderStatusDB = async (orderId, status) => {
  const valid = [
    "pending",
    "paid",
    "shipped",
    "completed",
    "cancelled",
    "refunded",
  ];

  const normalized = String(status).trim().toLowerCase();
  if (!valid.includes(normalized)) throw new Error(`Invalid status: ${status}`);

  const timestamps = {
    paid: "paid_at",
    shipped: "shipped_at",
    completed: "completed_at",
    cancelled: "cancelled_at",
    refunded: "refunded_at",
  };

  const tsField = timestamps[normalized] || null;

  const set = [`status = $1`, `updated_at = NOW()`];
  if (tsField) set.push(`${tsField} = NOW()`);

  const sql = `
    UPDATE orders
    SET ${set.join(", ")}
    WHERE id = $2
    RETURNING *
  `;

  const { rows } = await pool.query(sql, [normalized, orderId]);
  return rows[0];
};
