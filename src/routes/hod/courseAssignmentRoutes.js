import express from "express";
import { body } from "express-validator";
import {
  authenticate,
  authorize,
  checkDepartmentAccess,
} from "../../middleware/auth.js";
import { validate } from "../../middleware/validation.js";
import {
  assignLecturerToCourse,
  getCourseAssignments,
  removeLecturerFromCourse,
  getAvailableLecturers,
} from "../../controllers/hod/courseAssignmentController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("HoD"));
router.use(checkDepartmentAccess);

// Validation rules for course assignment
const validateCourseAssignment = [
  body("course_id").isMongoId().withMessage("Valid course ID is required"),
  body("lecturer_id").isMongoId().withMessage("Valid lecturer ID is required"),
  body("semester").isIn(["first", "second"]).withMessage("Valid semester is required"),
  body("level").isIn(["100", "200", "300", "400"]).withMessage("Valid level is required"),
  body("department_id").isMongoId().withMessage("Valid Department ID is required")
];

// Course assignment routes
router.post("/", validateCourseAssignment, validate, assignLecturerToCourse);
router.get("/", getCourseAssignments);
router.delete("/:assignmentId", removeLecturerFromCourse);
router.get("/lecturers/available", getAvailableLecturers);

export default router;
