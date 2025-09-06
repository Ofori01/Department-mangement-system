import express from "express";
import { param } from "express-validator";
import {
  authenticate,
  authorize,
  checkDepartmentAccess,
} from "../../middleware/auth.js";
import { validateNotification, validate } from "../../middleware/validation.js";
import { body } from "express-validator";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
  sendDepartmentNotification,
  getSentNotifications,
  getDepartmentUsers,
} from "../../controllers/hod/notificationController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("HoD"));
router.use(checkDepartmentAccess);

// Validation for department notification
const validateDepartmentNotification = [
  body("title")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Notification title is required"),
  body("message")
    .trim()
    .isLength({ min: 5 })
    .withMessage("Message must be at least 5 characters"),
  body("roles").optional().isArray().withMessage("Roles must be an array"),
  body("roles.*")
    .optional()
    .isIn(["Student", "Lecturer", "Admin"])
    .withMessage("Invalid role"),
];

// Notification routes
// Received notifications
router.get("/", getNotifications);
router.put(
  "/:notificationId/read",
  [param("notificationId").isMongoId().withMessage("Invalid notification ID")],
  validate,
  markAsRead
);
router.put("/read-all", markAllAsRead);

// Sending notifications
router.post("/send", validateNotification, validate, sendNotification);
router.post(
  "/department",
  validateDepartmentNotification,
  validate,
  sendDepartmentNotification
);
router.get("/sent", getSentNotifications);
router.get("/users", getDepartmentUsers);

export default router;
