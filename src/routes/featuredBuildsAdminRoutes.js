import express from "express";
import {
  adminCreateFeaturedBuild,
  adminUpdateFeaturedBuild,
  adminDeleteFeaturedBuild,
  adminSetFeaturedItems,
  adminGetFeaturedBuild,
} from "../controllers/featuredBuildsController.js";

import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

// Create with image
router.post("/", upload.single("image"), adminCreateFeaturedBuild);

// Update with optional image
router.put("/:id", upload.single("image"), adminUpdateFeaturedBuild);

// Delete
router.delete("/:id", adminDeleteFeaturedBuild);

// Replace all items
router.put("/:id/items", adminSetFeaturedItems);

// Get full build (with items)
router.get("/:id", adminGetFeaturedBuild);

export default router;
