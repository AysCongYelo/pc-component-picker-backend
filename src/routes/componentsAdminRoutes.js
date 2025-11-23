import express from "express";
import {
  adminListComponents,
  adminGetComponent,
  adminCreateComponent,
  adminUpdateComponent,
  adminDeleteComponent,
  adminBulkDelete,
  adminBulkUpdate,
} from "../controllers/componentsAdminController.js";

import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/", adminListComponents);
router.get("/:id", adminGetComponent);
router.post("/", adminCreateComponent);
router.put("/:id", adminUpdateComponent);
router.delete("/:id", adminDeleteComponent);
router.delete("/bulk/delete", adminBulkDelete);
router.put("/bulk/update", adminBulkUpdate);

export default router;
