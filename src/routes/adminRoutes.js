// src/routes/adminRoutes.js
// -----------------------------------------------------------------------------
// Admin-only routes for managing users, orders, and inventory monitoring.
// All routes in this file are protected by authentication and admin role checks.
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

// -----------------------------------------------------------------------------
// GLOBAL ADMIN PROTECTION
// Every route below requires:
// 1) Authenticated user (requireAuth)
// 2) User with admin role (requireAdmin)
// -----------------------------------------------------------------------------
router.use(requireAuth, requireAdmin);

/**
 * USER MANAGEMENT
 * ---------------------------------------------------------------------------
 * GET    /api/admin/users               → Get all users
 * GET    /api/admin/users/:id           → View a single user's details
 * PUT    /api/admin/users/:id/role      → Update user role (e.g., user → admin)
 */

// Fetch all users
router.get("/users", adminGetUsers);

// Fetch specific user details
router.get("/users/:id", adminGetUserDetail);

// Update a user’s role
router.put("/users/:id/role", adminUpdateUserRole);

/**
 * ORDER MANAGEMENT
 * ---------------------------------------------------------------------------
 * GET    /api/admin/orders              → Get all orders
 * GET    /api/admin/orders/:id          → Get specific order details
 * PUT    /api/admin/orders/:id/status   → Update order status
 */

// Get all orders
router.get("/orders", adminGetOrders);

// Get specific order details
router.get("/orders/:id", adminGetOrderDetail);

// Update order status (e.g., pending → shipped)
router.put("/orders/:id/status", adminUpdateOrderStatus);

router.delete("/orders/:id", adminDeleteOrder);
router.put("/users/:id/status", adminUpdateUserStatus);


/**
 * INVENTORY MONITORING
 * ---------------------------------------------------------------------------
 * GET    /api/admin/components/low-stock → List components with low inventory
 */

// View low-stock components
router.get("/components/low-stock", adminLowStock);

export default router;
