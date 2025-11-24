import express from "express";
import {
  publicListComponents,
  publicGetComponent,
  publicGetTrending,
} from "../controllers/componentsPublicController.js";

const router = express.Router();

router.get("/", publicListComponents);
router.get("/trending", publicGetTrending);
router.get("/:id", publicGetComponent);

export default router;
