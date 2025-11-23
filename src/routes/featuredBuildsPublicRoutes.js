import express from "express";
import {
  getFeaturedBuildsPublic,
  getFeaturedBuildPublic,
} from "../controllers/featuredBuildsController.js";

const router = express.Router();

router.get("/", getFeaturedBuildsPublic);
router.get("/:id", getFeaturedBuildPublic);

export default router;
