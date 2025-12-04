// src/routes/adminRoutes.js
// -----------------------------------------------------------------------------
// Admin-only routes for managing users, orders, and inventory monitoring.
// -----------------------------------------------------------------------------

import express from "express";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";
import {
  adminGetUsers,
  adminGetUserDetail,
  adminUpdateUserRole,
  adminGetOrders,
  adminGetOrderDetail,
  adminUpdateOrderStatus,
  adminLowStock,
  adminDeleteOrder,
  adminUpdateUserStatus,
} from "../controllers/adminController.js";

const router = express.Router();

// Protect all routes
router.use(requireAuth, requireAdmin);

/* ============================================================================
   USER MANAGEMENT
=========================================================================== */

// GET all users
router.get("/users", adminGetUsers);

// GET one user
router.get("/users/:id", adminGetUserDetail);

// Update role (admin/user)
router.put("/users/:id/role", adminUpdateUserRole);

// Update status (active / inactive / banned)
router.put("/users/:id/status", adminUpdateUserStatus);

/* ============================================================================
   ORDER MANAGEMENT
=========================================================================== */

// GET all orders
router.get("/orders", adminGetOrders);

// GET one order
router.get("/orders/:id", adminGetOrderDetail);

// Update order status
router.put("/orders/:id/status", adminUpdateOrderStatus);

// Delete order
router.delete("/orders/:id", adminDeleteOrder);

/* ============================================================================
   INVENTORY / LOW STOCK
=========================================================================== */

router.get("/components/low-stock", adminLowStock);

export default router;
