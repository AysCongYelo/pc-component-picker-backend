import express from "express";
import {
  getComponents,
  getTempBuild,
  addToTempBuild,
  removeFromTempBuild,
  resetTempBuild,
  saveBuild,
  getUserBuilds,
  getUserBuildById,
  duplicateBuild,
  deleteBuild,
  autoComplete,
  autoBuild,
  getAllBuildsWithUser,
  loadSavedBuildToTemp,
  updateSavedBuild,
  getMySavedBuilds,
} from "../controllers/builderController.js";

import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ======================================================
   USER — TEMP BUILD WORKFLOW
====================================================== */
router.get("/temp", requireAuth, getTempBuild); // load temp
router.post("/temp/add", requireAuth, addToTempBuild); // add part
router.post("/temp/remove", requireAuth, removeFromTempBuild); // remove part
router.post("/temp/reset", requireAuth, resetTempBuild); // reset

/* ======================================================
   USER — COMPONENT LIST FOR PICKER
====================================================== */
router.get("/components", requireAuth, getComponents); // with compatibility filters

/* ======================================================
   USER — SAVE / LOAD / MANAGE BUILDS
====================================================== */
router.post("/save", requireAuth, saveBuild);
router.get("/my", requireAuth, getUserBuilds);
router.get("/my/preview", requireAuth, getMySavedBuilds);
router.get("/my/:id", requireAuth, getUserBuildById);
router.post("/my/:id/duplicate", requireAuth, duplicateBuild);
router.delete("/my/:id", requireAuth, deleteBuild);

/* ======================================================
   USER — LOAD & UPDATE SAVED BUILD
====================================================== */
router.post("/load/:id", requireAuth, loadSavedBuildToTemp);
router.put("/update/:id", requireAuth, updateSavedBuild);

/* ======================================================
   AUTOBUILDER TOOLS
====================================================== */
router.post("/autobuild", requireAuth, autoBuild);
router.post("/autocomplete", requireAuth, autoComplete);

/* ======================================================
   ADMIN — VIEW ALL BUILDS WITH USER INFO
====================================================== */
router.get("/admin/all", requireAuth, requireAdmin, getAllBuildsWithUser);

export default router;
