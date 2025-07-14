import express from "express";
import { body } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validation.js";
import {
  registerForCourse,
  getRegisteredCourses,
  getAvailableCourses,
  unregisterFromCourse,
} from "../../controllers/student/courseController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("Student"));

// Validation for course registration
const validateCourseRegistration = [
  body("course_id").isMongoId().withMessage("Valid course ID is required"),
];

// Course routes
router.post(
  "/register",
  validateCourseRegistration,
  validate,
  registerForCourse
);
router.get("/registered", getRegisteredCourses);
router.get("/available", getAvailableCourses);
router.delete("/registrations/:registrationId", unregisterFromCourse);

export default router;
