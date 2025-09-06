import express from "express";
import { param, query } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import { downloadFile, streamFile, getSharedFiles } from "../controllers/fileController.js";

const router = express.Router();

// Get shared files for current user
router.get(
  "/shared",
  authenticate,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  validate,
  getSharedFiles
);

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
