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

    // 1. Get build with ownership check
    const build = await Builder.getFullBuildById(buildId, userId);
    if (!build) {
      return res.status(404).json({ error: "Build not found" });
    }

    // 2. Expand components & compute total price
    const expanded = await Builder.expandComponents(build.components);
    const totalPrice = Object.values(expanded).reduce(
      (sum, comp) => sum + Number(comp.price || 0),
      0
    );

    // count how many components in the build
    const count = Object.keys(expanded).length;

    // 3. Insert bundled build into cart
    const bundle = await Cart.addBuildBundle({
      user_id: userId,
      build_id: build.id,
      build_name: build.name,
      build_total_price: totalPrice,
      bundle_item_count: count, // ✔ now valid
    });

    return res.json({
      success: true,
      message: "Build added to cart as bundled item.",
      item: bundle,
    });
  } catch (err) {
    console.error("addBuildToCart:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
/* ============================================================================
    CART — ADD TEMP BUILD (NO SAVE REQUIRED)
  ============================================================================ */

// Add all components from the user's temp build directly to the cart.
// Does NOT save the build as a bundle.
export const addTempBuildToCart = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get temp build
    const temp = await Builder.getTempBuild(userId);
    const components = temp.components || {};

    if (!components || Object.keys(components).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Your temp build is empty.",
      });
    }

    // Ensure cart record exists
    await Cart.getOrCreateCart(userId);

    const addedItems = [];
    let totalAddedPrice = 0;

    // OPTIONAL: wrap this block in a DB transaction for all-or-nothing behavior.
    for (const [category, componentId] of Object.entries(components)) {
      // skip marker fields
      if (!componentId || category === "__source_build_id") continue;

      const comp = await Builder.getComponentWithSpecsById(componentId);
      if (!comp) continue;

      // ensure numeric price
      const price = Number(comp.price || 0);
      // fallback: if price is NaN, set to 0 (or skip)
      const safePrice = Number.isFinite(price) ? price : 0;

      const item = await Cart.addItem(userId, componentId, safePrice, category);

      addedItems.push(item);
      totalAddedPrice += safePrice;
    }

    return res.json({
      success: true,
      count: addedItems.length,
      items: addedItems,
      total_price: Number(totalAddedPrice.toFixed(2)),
      message: "Temp build components added to cart.",
    });
  } catch (err) {
    console.error("addTempBuildToCart:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
export const deleteItemCompletely = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    await Cart.deleteRow(itemId, userId);

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteItemCompletely:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
