import express from "express";
import { param } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateNotification, validate } from "../../middleware/validation.js";
import { body } from "express-validator";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
  sendCourseNotification,
  getSentNotifications,
  getCourseStudents,
} from "../../controllers/lecturer/notificationController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("Lecturer"));

// Validation for course notification
const validateCourseNotification = [
  body("title")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Notification title is required"),
  body("message")
    .trim()
    .isLength({ min: 5 })
    .withMessage("Message must be at least 5 characters"),
  body("course_id").isMongoId().withMessage("Valid course ID is required"),
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
  "/course",
  validateCourseNotification,
  validate,
  sendCourseNotification
);
router.get("/sent", getSentNotifications);
router.get("/students", getCourseStudents);

export default router;
