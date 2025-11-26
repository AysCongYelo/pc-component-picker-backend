// src/routes/cartRoutes.js
// -----------------------------------------------------------------------------
// Routes for managing the authenticated user's shopping cart.
// -----------------------------------------------------------------------------

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getCart,
  addToCart,
  removeFromCart,
  addBuildToCart,
  addTempBuildToCart,
  deleteItemCompletely, // ← ADD THIS
} from "../controllers/cartController.js";

const router = express.Router();

// Require login for ALL cart routes
router.use(requireAuth);

/**
 * CART ROUTES
 * ---------------------------------------------------------------------------
 * GET    /api/cart/                       → Get user's cart
 * POST   /api/cart/add                    → Add single component
 * POST   /api/cart/addTempBuild           → Add temp build (no save required)
 * POST   /api/cart/add-build/:buildId     → Add full saved build as bundle
 * DELETE /api/cart/:itemId                → Minus 1 OR remove if qty = 1
 * DELETE /api/cart/deleteRow/:itemId      → Delete entire row
 */

// Get the user's cart
router.get("/", getCart);

// Add a component to cart
router.post("/add", addToCart);

// Add TEMP BUILD (new route)
router.post("/addTempBuild", addTempBuildToCart);

// Add a complete saved build
router.post("/add-build/:buildId", addBuildToCart);

// MINUS 1 (or delete if qty == 1)
router.delete("/:itemId", removeFromCart);

// DELETE ENTIRE ROW (quantity ignored)
router.delete("/deleteRow/:itemId", deleteItemCompletely);

export default router;
