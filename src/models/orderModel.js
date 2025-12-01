// src/models/orderModel.js
// -----------------------------------------------------------------------------
// ORDER MODEL
// Handles:
// - Transactional order creation
// - Stock validation + deduction
// - Fetching orders for user/admin
// - Order status updates
// -----------------------------------------------------------------------------

import pool from "../db.js";
import * as Builder from "../models/builderModel.js";

// -----------------------------------------------------------------------------
// ORDER — CREATE WITH TRANSACTION (used by checkoutBuild)
// -----------------------------------------------------------------------------

/**
 * Creates a new order for a SAVED BUILD checkout.
 * Inserts ONLY internal bundle components.
 */
export const createOrderTransaction = async ({
  userId,
  items, // always [{ component_id: null, qty: 1, price_each, category: "build_bundle", build_id }]
  payment_method = "cod",
  notes = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Grab first item (this is always the build bundle)
    const it = items[0];
    const buildId = it.build_id;

    if (!buildId) {
      throw new Error("Missing build_id in createOrderTransaction");
    }

    // Load all internal components inside the saved build
    const parts = await Builder.getBuildItems(buildId);

    if (!parts || parts.length === 0) {
      throw new Error("Build has no components");
    }

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
          order.id,
          bi.component_id,
          bi.quantity || 1,
          bi.price || bi.price_each || 0,
          bi.category || bi.component_category,
          buildId,
          bi.name || bi.component_name || null,
          bi.image_url || bi.component_image || null,
          bi.category || bi.component_category || null,
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
// ADMIN: UPDATE ORDER STATUS
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
  if (!valid.includes(normalized)) {
    throw new Error(`Invalid order status: ${status}`);
  }

  const timestampFields = {
    paid: "paid_at",
    shipped: "shipped_at",
    completed: "completed_at",
    cancelled: "cancelled_at",
    refunded: "refunded_at",
  };

  const timestampColumn = timestampFields[normalized] || null;

  const setParts = [`status = $1`, `updated_at = NOW()`];

  if (timestampColumn) {
    setParts.push(`${timestampColumn} = NOW()`);
  }

  const sql = `
    UPDATE orders
    SET ${setParts.join(", ")}
    WHERE id = $2
    RETURNING *
  `;

  const { rows } = await pool.query(sql, [normalized, orderId]);
  return rows[0];
};
