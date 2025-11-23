import express from "express";
import {
  publicListComponents,
  publicGetComponent,
} from "../controllers/componentsPublicController.js";

const router = express.Router();

router.get("/", publicListComponents);
router.get("/:id", publicGetComponent);

export default router;
