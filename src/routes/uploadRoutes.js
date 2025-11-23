import express from "express";
import multer from "multer";
import { uploadComponentImage } from "../controllers/uploadController.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer(); // memory storage

router.use(requireAuth, requireAdmin);

router.post("/component", upload.single("file"), uploadComponentImage);

export default router;
