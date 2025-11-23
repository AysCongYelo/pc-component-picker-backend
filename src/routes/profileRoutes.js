// src/routes/profileRoutes.js
// -----------------------------------------------------------------------------
// USER PROFILE ROUTES
// View profile, update name, update avatar
// -----------------------------------------------------------------------------

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import multer from "multer";
import {
  getMyProfile,
  updateProfile,
  updateAvatar,
} from "../controllers/profileController.js";

const router = express.Router();
const upload = multer(); // for avatar upload (buffer)

// All profile routes require auth
router.use(requireAuth);

/**
 * ROUTES
 * ---------------------------------------------------------------------------
 * GET    /api/profile           → get my profile
 * PUT    /api/profile           → update full name
 * POST   /api/profile/avatar    → upload/update avatar
 */

// Get my profile
router.get("/", getMyProfile);

// Update full name only
router.put("/", updateProfile);

// Update avatar (multipart/form-data)
router.post("/avatar", upload.single("file"), updateAvatar);

export default router;
