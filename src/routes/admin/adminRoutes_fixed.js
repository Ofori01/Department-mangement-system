import express from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth.js";
import { uploadFile } from "../../middleware/fileUpload.js";
import { validate } from "../../middleware/validation.js";
import {
  createFolder,
  getFolders,
  updateFolder,
  deleteFolder,
  uploadDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  searchUsers,
  getUserDetails,
  updateUserRole,
  sendNotification,
  sendBulkNotification,
  getSystemStats,
} from "../../controllers/admin/adminController.js";

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize("admin"));

// Folder management routes
router.post(
  "/folders",
  [
    body("name").trim().notEmpty().withMessage("Folder name is required"),
    body("description").optional().trim(),
    body("parentFolder")
      .optional()
      .isMongoId()
      .withMessage("Invalid parent folder ID"),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),
  ],
  validate,
  createFolder
);

router.get(
  "/folders",
  [
    query("parentFolder")
      .optional()
      .isMongoId()
      .withMessage("Invalid parent folder ID"),
    query("search").optional().trim(),
    query("isPublic")
      .optional()
      .isIn(["true", "false"])
      .withMessage("isPublic must be true or false"),
  ],
  validate,
  getFolders
);

router.put(
  "/folders/:id",
  [
    param("id").isMongoId().withMessage("Invalid folder ID"),
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Folder name cannot be empty"),
    body("description").optional().trim(),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),
  ],
  validate,
  updateFolder
);

router.delete(
  "/folders/:id",
  [param("id").isMongoId().withMessage("Invalid folder ID")],
  validate,
  deleteFolder
);

// Document management routes
router.post(
  "/documents",
  uploadFile.single("file"),
  [
    body("folder").optional().isMongoId().withMessage("Invalid folder ID"),
    body("description").optional().trim(),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),
  ],
  validate,
  uploadDocument
);

router.get(
  "/documents",
  [
    query("folder").optional().isMongoId().withMessage("Invalid folder ID"),
    query("search").optional().trim(),
    query("mimeType").optional().trim(),
    query("isPublic")
      .optional()
      .isIn(["true", "false"])
      .withMessage("isPublic must be true or false"),
  ],
  validate,
  getDocuments
);

router.put(
  "/documents/:id",
  [
    param("id").isMongoId().withMessage("Invalid document ID"),
    body("title")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Title cannot be empty"),
    body("description").optional().trim(),
    body("folder").optional().isMongoId().withMessage("Invalid folder ID"),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),
  ],
  validate,
  updateDocument
);

router.delete(
  "/documents/:id",
  [param("id").isMongoId().withMessage("Invalid document ID")],
  validate,
  deleteDocument
);

// User management routes
router.get(
  "/users/search",
  [
    query("search").optional().trim(),
    query("role")
      .optional()
      .isIn(["student", "lecturer", "hod", "admin"])
      .withMessage("Invalid role"),
    query("department")
      .optional()
      .isMongoId()
      .withMessage("Invalid department ID"),
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
  searchUsers
);

router.get(
  "/users/:id",
  [param("id").isMongoId().withMessage("Invalid user ID")],
  validate,
  getUserDetails
);

router.put(
  "/users/:id/role",
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("role")
      .isIn(["student", "lecturer", "hod", "admin"])
      .withMessage("Invalid role"),
  ],
  validate,
  updateUserRole
);

// Notification management routes
router.post(
  "/notifications",
  [
    body("recipients")
      .isArray({ min: 1 })
      .withMessage("Recipients must be a non-empty array"),
    body("recipients.*").isMongoId().withMessage("Invalid recipient ID"),
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("message").trim().notEmpty().withMessage("Message is required"),
    body("type")
      .optional()
      .isIn(["announcement", "reminder", "alert", "general"])
      .withMessage("Invalid notification type"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority level"),
  ],
  validate,
  sendNotification
);

router.post(
  "/notifications/bulk",
  [
    body("criteria").isObject().withMessage("Criteria must be an object"),
    body("criteria.role")
      .optional()
      .isIn(["student", "lecturer", "hod", "admin"])
      .withMessage("Invalid role"),
    body("criteria.department")
      .optional()
      .isMongoId()
      .withMessage("Invalid department ID"),
    body("criteria.yearOfStudy")
      .optional()
      .isInt({ min: 1, max: 8 })
      .withMessage("Invalid year of study"),
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("message").trim().notEmpty().withMessage("Message is required"),
    body("type")
      .optional()
      .isIn(["announcement", "reminder", "alert", "general"])
      .withMessage("Invalid notification type"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority level"),
  ],
  validate,
  sendBulkNotification
);

// System statistics
router.get("/stats", getSystemStats);

export default router;
