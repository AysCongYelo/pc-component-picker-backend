// src/models/orderModel.js
// -----------------------------------------------------------------------------
// ORDER MODEL
// Handles:
// - Safe transactional order creation
// - Stock validation + deduction
// - Fetching orders for user and admin
// - Order status updates
// -----------------------------------------------------------------------------

import pool from "../db.js";

// -----------------------------------------------------------------------------
// ORDER — CREATE WITH TRANSACTION
// -----------------------------------------------------------------------------

/**
 * Creates a new order inside a SQL transaction.
 * Handles:
 *  - Stock locking (FOR UPDATE)
 *  - Validation
 *  - Order + order_items insertion
 *  - Stock deduction
 */
export const createOrderTransaction = async ({
  userId,
  items, // [{ component_id, qty, price_each, category, build_id }]
  payment_method = "cod",
  notes = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ---------------------------------------
    // STOCK VALIDATION (components only)
    // ---------------------------------------
    for (const it of items) {
      if (!it.component_id) continue; // skip bundle builds

      const { rows } = await client.query(
        `SELECT stock FROM components WHERE id = $1 FOR UPDATE`,
        [it.component_id]
      );

      if (!rows[0]) throw new Error(`Component not found: ${it.component_id}`);

      const stock = Number(rows[0].stock || 0);
      if (stock < it.qty) {
        throw new Error(`Out of stock: ${it.component_id}`);
      }
    }

    // ---------------------------------------
    // TOTAL PRICE
    // ---------------------------------------
    const total = items.reduce(
      (sum, item) => sum + Number(item.price_each) * Number(item.qty),
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
    // INSERT ORDER ITEMS + UPDATE STOCK
    // ---------------------------------------
    for (const it of items) {
      await client.query(
        `
          INSERT INTO order_items
            (order_id, component_id, quantity, price_each, category, build_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          order.id,
          it.component_id,
          it.qty,
          it.price_each,
          it.category || null,
          it.build_id || null,
        ]
      );

      if (it.component_id) {
        await client.query(
          `UPDATE components SET stock = stock - $1 WHERE id = $2`,
          [it.qty, it.component_id]
        );
      }
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
// ORDER — USER QUERIES
// -----------------------------------------------------------------------------

/**
 * Returns all orders belonging to a user.
 */
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

/**
 * Returns a single order if it belongs to the user.
 */
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

/**
 * Returns items belonging to a specific order.
 */
export const getOrderItems = async (orderId) => {
  const { rows } = await pool.query(
    `SELECT * FROM order_items WHERE order_id = $1`,
    [orderId]
  );

  return rows;
};

// -----------------------------------------------------------------------------
// ORDER — ADMIN UPDATE
// -----------------------------------------------------------------------------

/**
 * Updates the order status (admin only).
 */
export const updateOrderStatusDB = async (orderId, status) => {
  const valid = [
    "pending",
    "paid",
    "shipped",
    "completed",
    "cancelled",
    "refunded",
  ];

  // Normalize input (handles: Completed, COMPLETED, " completed ", etc.)
  const normalized = String(status).trim().toLowerCase();

  if (!valid.includes(normalized)) {
    throw new Error(`Invalid order status: ${status}`);
  }

  // Auto timestamps based on status
  const timestampFields = {
    paid: "paid_at",
    shipped: "shipped_at",
    completed: "completed_at",
    cancelled: "cancelled_at",
    refunded: "refunded_at",
  };

  let timestampColumn = timestampFields[normalized] || null;

  // Build dynamic SQL SET fields
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
