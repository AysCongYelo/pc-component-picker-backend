// src/controllers/checkoutController.js
// -----------------------------------------------------------------------------
// Handles all checkout operations: selective cart checkout, stock validation,
// multi-quantity items, bundled build checkout, and order creation.
// -----------------------------------------------------------------------------

import * as Cart from "../models/cartModel.js";
import * as Builder from "../models/builderModel.js";
import { createOrderTransaction } from "../models/orderModel.js";
import pool from "../db.js";

/* ============================================================================
   CHECKOUT — SELECTIVE CART CHECKOUT + STOCK VALIDATION
============================================================================ */

/**
 * Checkout selected cart items.
 * - Supports selective checkout (item_ids array)
 * - Validates stock for individual component items
 * - Deducts stock
 * - Creates order + order_items
 * - Removes only checked-out items from cart
 */
export const checkout = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { item_ids = [], payment_method, notes } = req.body;

    const cartItems = await Cart.getCartItems(userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Selective checkout — if none provided, checkout everything
    const items =
      item_ids.length > 0
        ? cartItems.filter((i) => item_ids.includes(i.id))
        : cartItems;

    if (items.length === 0) {
      return res.status(400).json({ error: "No valid items selected" });
    }

    /* -----------------------------------------------------------------------
       STOCK VALIDATION (only for real components)
    ----------------------------------------------------------------------- */
    for (const item of items) {
      if (!item.component_id) continue; // skip build bundles

      const { rows } = await client.query(
        `SELECT stock FROM components WHERE id = $1`,
        [item.component_id]
      );

      const stock = rows[0]?.stock ?? 0;

      if (stock < item.quantity) {
        return res.status(400).json({
          error: `Not enough stock for ${item.component_name}. Remaining: ${stock}`,
        });
      }
    }

    /* -----------------------------------------------------------------------
       CREATE ORDER
    ----------------------------------------------------------------------- */
    const total = items.reduce(
      (sum, i) => sum + Number(i.price) * Number(i.quantity),
      0
    );

    await client.query("BEGIN");

    const { rows: orderRows } = await client.query(
      `
        INSERT INTO orders (user_id, total, payment_method, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [userId, total, payment_method || "cod", notes || null]
    );

    const order = orderRows[0];

    /* -----------------------------------------------------------------------
       INSERT ORDER ITEMS + DEDUCT STOCK
    ----------------------------------------------------------------------- */
    for (const item of items) {
      // Insert into order_items
      await client.query(
        `
          INSERT INTO order_items
            (order_id, component_id, build_id, quantity, price_each, category)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          order.id,
          item.component_id || null,
          item.build_id || null,
          item.quantity,
          item.price,
          item.category || null,
        ]
      );

      // Deduct stock for actual components
      if (item.component_id) {
        await client.query(
          `
            UPDATE components
               SET stock = stock - $1
             WHERE id = $2
          `,
          [item.quantity, item.component_id]
        );
      }
    }

    /* -----------------------------------------------------------------------
       REMOVE ONLY CHECKED-OUT CART ITEMS
    ----------------------------------------------------------------------- */
    const removeIds = items.map((i) => i.id);

    await client.query(
      `
        DELETE FROM cart_items
         WHERE user_id = $1
           AND id = ANY($2::uuid[])
      `,
      [userId, removeIds]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      order,
      checked_out_items: items,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("checkout:", err.message);
    return res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
};

/* ============================================================================
   CHECKOUT — SAVED BUILD (BUNDLED MODE)
============================================================================ */

/**
 * Checkout a saved user build as a single bundled item.
 * - Converts full build into one bundled order item
 * - Calculates total price from all component prices
 * - Uses a database transaction (createOrderTransaction)
 */
export const checkoutBuild = async (req, res) => {
  try {
    const userId = req.user.id;
    const buildId = req.params.buildId;
    const { payment_method, notes } = req.body;

    const build = await Builder.getUserBuildById(userId, buildId);
    if (!build) {
      return res.status(404).json({ error: "Build not found" });
    }

    const expanded = await Builder.expandComponents(build.components);

    const totalPrice = Object.values(expanded).reduce(
      (sum, comp) => sum + Number(comp.price),
      0
    );

    const items = [
      {
        component_id: null,
        qty: 1,
        price_each: totalPrice,
        category: "build_bundle",
        build_id: build.id,
      },
    ];

    const order = await createOrderTransaction({
      userId,
      items,
      payment_method: payment_method || "cod",
      notes: notes || null,
    });

    return res.json({
      success: true,
      order,
      message: "Build checkout successful (bundled mode)",
    });
  } catch (err) {
    console.error("checkoutBuild:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
