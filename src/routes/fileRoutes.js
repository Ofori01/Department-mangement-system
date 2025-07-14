import express from "express";
import { param } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import { downloadFile, streamFile } from "../controllers/fileController.js";

const router = express.Router();

// Download file
router.get(
  "/download/:id",
  authenticate,
  [param("id").isMongoId().withMessage("Invalid file ID")],
  validate,
  downloadFile
);

// Stream file (for videos, audio, etc.)
router.get(
  "/stream/:id",
  authenticate,
  [param("id").isMongoId().withMessage("Invalid file ID")],
  validate,
  streamFile
);

export default router;
