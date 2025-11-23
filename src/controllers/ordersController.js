// src/controllers/ordersController.js
// -----------------------------------------------------------------------------
// USER ORDERS CONTROLLER
// Handles: listing all user orders + retrieving full order details.
// -----------------------------------------------------------------------------

import * as OrderModel from "../models/orderModel.js";

/* ============================================================================
   USER — GET ALL MY ORDERS
============================================================================ */

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await OrderModel.getUserOrders(userId);

    const formatted = orders.map((o) => ({
      id: o.id,
      total: o.total,
      status: o.status,
      payment_method: o.payment_method,
      created_at: o.created_at,
    }));

    return res.json({
      success: true,
      orders: formatted,
    });
  } catch (err) {
    console.error("getMyOrders:", err.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/* ============================================================================
   USER — GET SINGLE ORDER DETAIL
============================================================================ */

export const getMyOrderDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const order = await OrderModel.getOrderById(userId, orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    const items = await OrderModel.getOrderItems(orderId);

    // 🔥 FRONTEND EXPECTS: order.items + order.total inside single object
    const fullOrder = {
      ...order,
      items, // merge items array
      total: order.total,
    };

    return res.json({
      success: true,
      order: fullOrder,
    });
  } catch (err) {
    console.error("getMyOrderDetail:", err.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
