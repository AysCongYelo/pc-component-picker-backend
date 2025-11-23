// src/routes/checkoutRoutes.js
// -----------------------------------------------------------------------------
// Checkout routes: selective cart checkout OR full saved build checkout
// -----------------------------------------------------------------------------

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { checkout, checkoutBuild } from "../controllers/checkoutController.js";

const router = express.Router();

// All checkout routes MUST be authenticated
router.use(requireAuth);

/**
 * CHECKOUT ROUTES
 * ---------------------------------------------------------------------------
 * POST /api/checkout              → Checkout selected items from cart
 * POST /api/checkout/build/:id    → Checkout a whole saved build (bundle)
 */

// Selective cart checkout
router.post("/", checkout);

// Checkout a saved build as one bundled item
router.post("/build/:buildId", checkoutBuild);

export default router;
