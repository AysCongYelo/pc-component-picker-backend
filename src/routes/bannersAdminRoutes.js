import express from "express";
import { getBanners } from "../controllers/bannersController.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/", getBanners);

export default router;
