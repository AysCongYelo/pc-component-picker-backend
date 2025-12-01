import { supabaseAdmin as supabase } from "../supabaseAdmin.js";
import { updateOrderStatusDB } from "../models/orderModel.js";

/* ============================================================================
   ADMIN — USER MANAGEMENT
============================================================================ */

/**
 * Get all users (basic info only)
 */
export const adminGetUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ success: true, users: data });
  } catch (err) {
    console.error("adminGetUsers:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get one user profile + statistics (total orders, total builds)
 */
export const adminGetUserDetail = async (req, res) => {
  try {
    const userId = req.params.id;

    // Fetch user profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("id", userId)
      .single();

    if (profileErr || !profile)
      return res.status(404).json({ error: "User not found" });

    // Count orders + builds in parallel
    const [ordersRes, buildsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),

      supabase
        .from("user_builds")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    return res.json({
      success: true,
      user: profile,
      stats: {
        orders: ordersRes.count || 0,
        builds: buildsRes.count || 0,
      },
    });
  } catch (err) {
    console.error("adminGetUserDetail:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update user role (admin or user)
 */
export const adminUpdateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: "Role updated successfully",
      user: data,
    });
  } catch (err) {
    console.error("adminUpdateUserRole:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
   ADMIN — ORDER MANAGEMENT
============================================================================ */

/**
 * Get all orders with basic user info
 */
export const adminGetOrders = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*, profiles:user_id(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ success: true, orders: data });
  } catch (err) {
    console.error("adminGetOrders:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get single order + its items
 */
export const adminGetOrderDetail = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Fetch order + user details
    const { data: order, error } = await supabase
      .from("orders")
      .select("*, profiles:user_id(full_name, email)")
      .eq("id", orderId)
      .single();

    if (error || !order)
      return res.status(404).json({ error: "Order not found" });

    // Fetch all items for this order
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsErr) throw itemsErr;

    return res.json({
      success: true,
      order,
      items,
    });
  } catch (err) {
    console.error("adminGetOrderDetail:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update the status of an order
 */
export const adminUpdateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status)
      return res.status(400).json({ error: "status field is required" });

    const updated = await updateOrderStatusDB(orderId, status);

    if (!updated) return res.status(404).json({ error: "Order not found" });

    return res.json({
      success: true,
      message: "Order status updated",
      order: updated,
    });
  } catch (err) {
    console.error("adminUpdateOrderStatus:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ============================================================================
   ADMIN — LOW STOCK MONITORING
============================================================================ */

/**
 * Get components marked as low in stock
 * Uses Postgres RPC function "get_low_stock_components"
 */
export const adminLowStock = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc("get_low_stock_components");
    if (error) throw error;

    return res.json({
      success: true,
      components: data,
    });
  } catch (err) {
    console.error("adminLowStock:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
/**
 * Delete an order + its items
 */
export const adminDeleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    // 1. Delete order items first (required by FK)
    const { error: itemsErr } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (itemsErr) throw itemsErr;

    // 2. Delete order
    const { data, error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json({
      success: true,
      message: "Order deleted successfully",
      order: data,
    });
  } catch (err) {
    console.error("adminDeleteOrder:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
