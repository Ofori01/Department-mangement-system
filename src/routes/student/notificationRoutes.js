import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../../controllers/student/notificationController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("Student"));

// Notification routes
router.get("/", getNotifications);
router.put("/:notificationId/read", markAsRead);
router.put("/mark-all-read", markAllAsRead);

export default router;
