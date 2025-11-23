// src/routes/authRoutes.js
import express from "express";
import {
  signup,
  login,
  getMe,
  refreshToken,
  logout,
  forgotPassword,
  updatePassword,
  loginWithGoogle,
} from "../controllers/authController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// PUBLIC
router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/update-password", updatePassword);
router.post("/oauth/google", loginWithGoogle);

// PROTECTED
router.get("/me", requireAuth, getMe);
router.post("/logout", requireAuth, logout);

export default router;
