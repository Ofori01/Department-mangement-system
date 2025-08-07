import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import {
  getAssignedCourses,
  getAssignedCourse,
  getCoursesSummary,
} from "../../controllers/lecturer/courseController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("Lecturer"));

/**
 * Course routes for lecturers
 * Base path: /api/lecturer/courses
 */

// Get all assigned courses with pagination and filters
router.get("/", getAssignedCourses);

// Get courses summary for quick reference
router.get("/summary", getCoursesSummary);

// Get specific course details
router.get("/:courseId", getAssignedCourse);

export default router;
