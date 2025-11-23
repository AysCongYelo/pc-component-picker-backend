// src/controllers/authController.js
import { supabase } from "../services/supabaseClient.js";
import { supabaseAdmin } from "../supabaseAdmin.js";

/* ============================================================================
   SIGNUP
============================================================================ */
export const signup = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name)
      return res.status(400).json({ error: "Missing fields" });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (error) throw error;

    // wait for trigger to create profile
    await new Promise((r) => setTimeout(r, 300));

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("id", data.user.id)
      .single();

    return res.json({
      success: true,
      user: profile || data.user,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/* ============================================================================
   LOGIN
============================================================================ */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("id", data.user.id)
      .single();

    return res.json({
      success: true,
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: profile,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/* ============================================================================
   GET CURRENT USER
============================================================================ */
export const getMe = async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, email, created_at")
      .eq("id", req.user.id)
      .single();

    return res.json({ success: true, user: profile });
  } catch {
    return res.status(500).json({ error: "Failed to load profile" });
  }
};

/* ============================================================================
   REFRESH TOKEN
============================================================================ */
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token)
      return res.status(400).json({ error: "refresh_token required" });

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) throw error;

    return res.json({
      success: true,
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/* ============================================================================
   LOGOUT
============================================================================ */
export const logout = async (req, res) => {
  try {
    let token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ error: "Missing token" });

    await supabaseAdmin.auth.signOut(token);

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/* ============================================================================
   PASSWORD RESET EMAIL
============================================================================ */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL,
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/* ============================================================================
   UPDATE PASSWORD (token from email)
============================================================================ */
export const updatePassword = async (req, res) => {
  try {
    const { access_token, new_password } = req.body;

    const { data, error } = await supabaseAdmin.auth.setUserPassword({
      access_token,
      password: new_password,
    });

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/* ============================================================================
   OAUTH REDIRECT (GOOGLE)
============================================================================ */
export const loginWithGoogle = async (req, res) => {
  try {
    const url = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: req.body.redirect_url,
      },
    });

    return res.json({ success: true, url: url.data.url });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
