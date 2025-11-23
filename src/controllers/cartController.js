// src/controllers/cartController.js
// -----------------------------------------------------------------------------
// Cart system: handles component items, build bundles, fetch operations,
// add/remove actions, and price calculations.
// -----------------------------------------------------------------------------

import * as Cart from "../models/cartModel.js";
import * as Builder from "../models/builderModel.js";

/* ============================================================================
   CART — GET ITEMS
============================================================================ */

/**
 * Get all cart items for the authenticated user.
 * Includes: individual components + bundled saved builds.
 */
export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ensure the user has a cart record
    await Cart.getOrCreateCart(userId);

    const items = await Cart.getCartItems(userId);

    return res.json({ success: true, user_id: userId, items });
  } catch (err) {
    console.error("getCart:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
   CART — ADD SINGLE COMPONENT
============================================================================ */

/**
 * Add a single component to the user's cart.
 */
export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { componentId } = req.body;

    const component = await Builder.getComponentWithSpecsById(componentId);
    if (!component) {
      return res.status(404).json({ error: "Component not found" });
    }

    // Ensure cart exists
    await Cart.getOrCreateCart(userId);

    const item = await Cart.addItem(
      userId,
      componentId,
      component.price,
      component.category
    );

    return res.json({ success: true, item });
  } catch (err) {
    console.error("addToCart:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
   CART — REMOVE ITEM
============================================================================ */

/**
 * Remove a cart item by item ID.
 */
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    await Cart.removeItem(itemId, userId);

    return res.json({ success: true });
  } catch (err) {
    console.error("removeFromCart:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
   CART — ADD FULL BUILD
============================================================================ */

/**
 * Add a complete saved build to the cart as a bundled item.
 */
export const addBuildToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const buildId = req.params.buildId;

    // Get build with ownership check
    const build = await Builder.getFullBuildById(buildId, userId);
    if (!build) {
      return res.status(404).json({ error: "Build not found" });
    }

    // Expand component details to compute total bundle price
    const expanded = await Builder.expandComponents(build.components);

    const totalPrice = Object.values(expanded).reduce(
      (sum, comp) => sum + Number(comp.price || 0),
      0
    );

    const bundle = await Cart.addBuildBundle(userId, buildId, totalPrice);

    return res.json({
      success: true,
      message: "Build added to cart as bundled item.",
      bundle,
    });
  } catch (err) {
    console.error("addBuildToCart:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
