import express from "express";
import {
  adminCreateFeaturedBuild,
  adminUpdateFeaturedBuild,
  adminDeleteFeaturedBuild,
  adminSetFeaturedItems,
  adminGetFeaturedBuild,
} from "../controllers/featuredBuildsController.js";

import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

// Create
router.post("/", adminCreateFeaturedBuild);

// Update
router.put("/:id", adminUpdateFeaturedBuild);

// Delete
router.delete("/:id", adminDeleteFeaturedBuild);

// Replace all items
router.put("/:id/items", adminSetFeaturedItems);

// Get full build (with items)
router.get("/:id", adminGetFeaturedBuild);

export default router;
