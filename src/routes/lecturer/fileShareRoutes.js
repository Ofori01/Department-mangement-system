import express from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validation.js";
import {
  shareDocument,
  getMySharedDocuments,
  getDocumentShares,
  removeDocumentShare,
  getDepartmentUsers,
} from "../../controllers/lecturer/fileShareController.js";

const router = express.Router();

// Apply authentication and Lecturer authorization to all routes
router.use(authenticate);
router.use(authorize("Lecturer"));

// Share document with department users
router.post(
  "/documents/:id/share",
  [
    param("id").isMongoId().withMessage("Invalid document ID"),
    body("user_ids")
      .isArray({ min: 1 })
      .withMessage("User IDs must be a non-empty array"),
    body("user_ids.*").isMongoId().withMessage("Invalid user ID"),
  ],
  validate,
  shareDocument
);

// Get documents shared by this lecturer
router.get(
  "/documents/shared",
  [
    query("search").optional().trim(),
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
  getMySharedDocuments
);

// Get sharing details for a specific document
router.get(
  "/documents/:id/shares",
  [param("id").isMongoId().withMessage("Invalid document ID")],
  validate,
  getDocumentShares
);

// Remove document share
router.delete(
  "/documents/:id/shares/:shareId",
  [
    param("id").isMongoId().withMessage("Invalid document ID"),
    param("shareId").isMongoId().withMessage("Invalid share ID"),
  ],
  validate,
  removeDocumentShare
);

// Get department users for sharing
router.get(
  "/users",
  [
    query("search").optional().trim(),
    query("role")
      .optional()
      .isIn(["Student", "Lecturer", "HoD"])
      .withMessage("Role must be Student, Lecturer, or HoD"),
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
  getDepartmentUsers
);

export default router;
