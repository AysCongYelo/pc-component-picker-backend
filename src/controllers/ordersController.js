// src/controllers/ordersController.js
// -----------------------------------------------------------------------------
// Returns user order list + full order detail
// -----------------------------------------------------------------------------

import * as OrderModel from "../models/orderModel.js";

// -----------------------------------------------------------------------------
// GET ALL MY ORDERS
// -----------------------------------------------------------------------------

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await OrderModel.getUserOrders(userId);

    return res.json({
      success: true,
      orders: orders.map((o) => ({
        id: o.id,
        total: o.total,
        status: o.status,
        payment_method: o.payment_method,
        created_at: o.created_at,
      })),
    });
  } catch (err) {
    console.error("getMyOrders:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

// -----------------------------------------------------------------------------
// GET SINGLE ORDER DETAIL
// -----------------------------------------------------------------------------

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

    return res.json({
      success: true,
      order: {
        ...order,
        items,
        total: order.total,
      },
    });
  } catch (err) {
    console.error("getMyOrderDetail:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
