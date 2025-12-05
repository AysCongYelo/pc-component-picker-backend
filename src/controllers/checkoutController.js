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

export const checkout = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { item_ids = [], payment_method, notes } = req.body;

    const cartItems = await Cart.getCartItems(userId);
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Selective checkout
    const items =
      Array.isArray(item_ids) && item_ids.length > 0
        ? cartItems.filter((i) => item_ids.includes(i.id))
        : cartItems;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "No valid items selected" });
    }

    /* -----------------------------------------------------------------------
       STOCK VALIDATION — COMPONENT ITEMS
    ----------------------------------------------------------------------- */
    for (const item of items) {
      if (!item.component_id) continue;

      const { rows } = await client.query(
        `SELECT stock FROM components WHERE id = $1`,
        [item.component_id]
      );

      const stock = rows[0]?.stock ?? 0;

      if (stock < (Number(item.quantity) || 0)) {
        return res.status(400).json({
          error: `Not enough stock for ${item.component_name}. Remaining: ${stock}`,
        });
      }
    }

    /* -----------------------------------------------------------------------
       STOCK VALIDATION — BUILD BUNDLES
    ----------------------------------------------------------------------- */
    for (const item of items) {
      if (item.category !== "build_bundle" || !item.build_id) continue;

      const bundleItems = await Builder.getBuildItems(item.build_id);

      for (const bi of bundleItems) {
        const { rows } = await client.query(
          `SELECT stock FROM components WHERE id = $1`,
          [bi.component_id]
        );

        const stock = rows[0]?.stock ?? 0;

        if (stock < bi.quantity) {
          return res.status(400).json({
            error: `Not enough stock for ${bi.name} inside the saved build. Remaining: ${stock}`,
          });
        }
      }
    }

    /* -----------------------------------------------------------------------
       CREATE ORDER
    ----------------------------------------------------------------------- */
    const total = items.reduce(
      (sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0),
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
       INSERT ORDER ITEMS
    ----------------------------------------------------------------------- */
    for (const item of items) {
      const isBundle = item.category === "build_bundle";

      /* -------------------------------------------------------------
         NORMAL COMPONENT ITEMS
      ------------------------------------------------------------- */
      if (!isBundle && item.component_id) {
        await client.query(
          `
      INSERT INTO order_items (
        order_id,
        component_id,
        quantity,
        price_each,
        category,
        component_name,
        component_image,
        component_category
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `,
          [
            order.id,
            item.component_id,
            Number(item.quantity || 1),
            Number(item.price || 0),
            item.category,

            // SNAPSHOT FIELDS
            item.component_name || item.name || null,
            item.component_image || item.image_url || null,
            item.component_category || item.category || null,
          ]
        );
      }

      /* -------------------------------------------------------------
         BUILD BUNDLES → INSERT INTERNAL COMPONENTS ONLY
      ------------------------------------------------------------- */
      if (isBundle && item.build_id) {
        const parts = await Builder.getBuildItems(item.build_id);

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
              item.build_id,
              bi.name || bi.component_name || null,
              bi.image_url || bi.component_image || null,
              bi.category || bi.component_category || null,
            ]
          );
        }
      }

      /* -------------------------------------------------------------
         DEDUCT STOCK — COMPONENT ITEMS
      ------------------------------------------------------------- */
      if (!isBundle && item.component_id) {
        await client.query(
          `
            UPDATE components
            SET stock = stock - $1
            WHERE id = $2
          `,
          [Number(item.quantity || 1), item.component_id]
        );
      }

      /* -------------------------------------------------------------
         DEDUCT STOCK — BUILD BUNDLES
      ------------------------------------------------------------- */
      if (isBundle && item.build_id) {
        const parts = await Builder.getBuildItems(item.build_id);

        for (const bi of parts) {
          await client.query(
            `
              UPDATE components
              SET stock = stock - $1
              WHERE id = $2
            `,
            [Number(bi.quantity || 1), bi.component_id]
          );
        }
      }
    }

    /* -----------------------------------------------------------------------
       REMOVE CHECKED-OUT CART ITEMS
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

export const checkoutBuild = async (req, res) => {
  try {
    const userId = req.user.id;
    const buildId = req.params.buildId;
    const { payment_method, notes } = req.body;

    const build = await Builder.getUserBuildById(userId, buildId);
    if (!build) {
      return res.status(404).json({ error: "Build not found" });
    }

    const expanded = await Builder.expandComponents(build.components || {});

    const totalPrice = Object.values(expanded)
      .filter((c) => c?.price !== undefined)
      .reduce((sum, comp) => sum + Number(comp.price || 0), 0);

    const items = [
      {
        component_id: null,
        quantity: 1, // ✅ CORRECT FIELD NAME
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

    try {
      await Builder.removeFromSaved(userId, buildId);
    } catch (e) {
      console.warn("removeFromSaved failed:", e.message || e);
    }

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
