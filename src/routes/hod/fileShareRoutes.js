import express from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validation.js";
import {
  shareDocument,
  getMySharedDocuments,
  getDocumentShares,
  removeDocumentShare,
  getAccessibleDocuments,
  getDepartmentUsers,
} from "../../controllers/hod/fileShareController.js";

const router = express.Router();

// Apply authentication and HoD authorization to all routes
router.use(authenticate);
router.use(authorize("HoD"));

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

// Get documents shared by this HoD
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

// Get accessible documents (department + shared with HoD)
router.get(
  "/documents",
  [
    query("search").optional().trim(),
    query("status")
      .optional()
      .isIn(["Pending", "Completed"])
      .withMessage("Status must be Pending or Completed"),
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
  getAccessibleDocuments
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
      .isIn(["Student", "Lecturer"])
      .withMessage("Role must be Student or Lecturer"),
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
