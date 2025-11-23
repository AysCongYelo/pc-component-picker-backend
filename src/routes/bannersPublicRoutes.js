import express from "express";
import { getBanners } from "../controllers/bannersController.js";

const router = express.Router();

// PUBLIC: get all banners
router.get("/", getBanners);

export default router;
