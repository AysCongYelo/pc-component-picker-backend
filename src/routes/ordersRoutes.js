// src/routes/ordersRoutes.js
// -----------------------------------------------------------------------------
// Routes for user order history & order detail
// -----------------------------------------------------------------------------

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getMyOrders,
  getMyOrderDetail,
} from "../controllers/ordersController.js";

const router = express.Router();

// Protect all order routes
router.use(requireAuth);

/**
 * ROUTES
 * ---------------------------------------------------------------------------
 * GET /api/orders           → list all my orders
 * GET /api/orders/:id       → get single order detail + items
 */

router.get("/", getMyOrders);
router.get("/:id", getMyOrderDetail);

export default router;
