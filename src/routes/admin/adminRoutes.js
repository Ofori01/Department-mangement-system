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
  getFolderDocuments,
  moveDocument,
  shareDocument,
  getDocumentShares,
  removeDocumentShare,
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
router.use(authorize("Admin"));

// Folder management routes
router.post(
  "/folders",
  [
    body("name").trim().notEmpty().withMessage("Folder name is required"),
    body("status")
      .optional()
      .isIn(["Pending", "Completed"])
      .withMessage("Invalid status"),
  ],
  validate,
  createFolder
);

router.get(
  "/folders",
  [
    query("status")
      .optional()
      .isIn(["Pending", "Completed"])
      .withMessage("Invalid status"),
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
  getFolders
);

router.get(
  "/folders/:folderId/documents",
  [
    param("folderId").isMongoId().withMessage("Invalid folder ID"),
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
  getFolderDocuments
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
    body("status")
      .optional()
      .isIn(["Pending", "Completed"])
      .withMessage("Invalid status"),
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
    body("title")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Title cannot be empty"),
    body("visibility")
      .optional()
      .isIn(["private", "public"])
      .withMessage("Visibility must be private or public"),
    body("folder_id")
      .notEmpty()
      .isMongoId()
      .withMessage("Valid folder ID is required"),
  ],
  validate,
  uploadDocument
);

router.get(
  "/documents",
  [
    query("search").optional().trim(),
    query("mimeType").optional().trim(),
    query("visibility")
      .optional()
      .isIn(["private", "public"])
      .withMessage("Visibility must be private or public"),
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
    body("visibility")
      .optional()
      .isIn(["private", "public"])
      .withMessage("Visibility must be private or public"),
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
      .isIn(["Student", "Lecturer", "HoD", "Admin"])
      .withMessage("Invalid role"),
    query("department_id")
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
      .isIn(["Student", "Lecturer", "HoD", "Admin"])
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
      .isIn(["general", "assignment", "announcement", "reminder", "urgent"])
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
      .isIn(["Student", "Lecturer", "HoD", "Admin"])
      .withMessage("Invalid role"),
    body("criteria.department_id")
      .optional()
      .isMongoId()
      .withMessage("Invalid department ID"),
    body("criteria.level")
      .optional()
      .isInt({ min: 1, max: 8 })
      .withMessage("Invalid level"),
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("message").trim().notEmpty().withMessage("Message is required"),
    body("type")
      .optional()
      .isIn(["general", "assignment", "announcement", "reminder", "urgent"])
      .withMessage("Invalid notification type"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority level"),
  ],
  validate,
  sendBulkNotification
);

// File management routes
router.post(
  "/documents/:id/move",
  [
    param("id").isMongoId().withMessage("Invalid document ID"),
    body("folder_id").isMongoId().withMessage("Invalid folder ID"),
  ],
  validate,
  moveDocument
);

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

router.get(
  "/documents/:id/shares",
  [param("id").isMongoId().withMessage("Invalid document ID")],
  validate,
  getDocumentShares
);

router.delete(
  "/documents/:id/shares/:shareId",
  [
    param("id").isMongoId().withMessage("Invalid document ID"),
    param("shareId").isMongoId().withMessage("Invalid share ID"),
  ],
  validate,
  removeDocumentShare
);

// System statistics
router.get("/stats", getSystemStats);

export default router;
