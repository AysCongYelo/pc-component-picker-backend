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
  addTempBuildToCart, // ← IMPORTED
} from "../controllers/cartController.js";

const router = express.Router();

// Require login for ALL cart routes
router.use(requireAuth);

/**
 * CART ROUTES
 * ---------------------------------------------------------------------------
 * GET    /api/cart/                   → Get user's cart
 * POST   /api/cart/add                → Add single component
 * POST   /api/cart/addTempBuild       → Add temp build (no save required)
 * POST   /api/cart/add-build/:buildId → Add full saved build as bundle
 * DELETE /api/cart/:itemId            → Remove a cart item
 */

// Get the user's cart
router.get("/", getCart);

// Add a component to cart
router.post("/add", addToCart);

// Add TEMP BUILD (new route)
router.post("/addTempBuild", addTempBuildToCart);

// Add a complete saved build
router.post("/add-build/:buildId", addBuildToCart);

// Remove an item from cart
router.delete("/:itemId", removeFromCart);

export default router;
