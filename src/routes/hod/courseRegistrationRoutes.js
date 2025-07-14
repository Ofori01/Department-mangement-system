import express from "express";
import { body } from "express-validator";
import {
  authenticate,
  authorize,
  checkDepartmentAccess,
} from "../../middleware/auth.js";
import { validate } from "../../middleware/validation.js";
import {
  registerStudentToCourse,
  bulkRegisterStudents,
  getCourseRegistrations,
  removeStudentFromCourse,
  getAvailableStudents,
} from "../../controllers/hod/courseRegistrationController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("HoD"));
router.use(checkDepartmentAccess);

// Validation rules for course registration
const validateCourseRegistration = [
  body("course_id").isMongoId().withMessage("Valid course ID is required"),
  body("student_id").isMongoId().withMessage("Valid student ID is required"),
];

const validateBulkRegistration = [
  body("course_id").isMongoId().withMessage("Valid course ID is required"),
  body("student_ids")
    .isArray({ min: 1 })
    .withMessage("At least one student ID is required"),
  body("student_ids.*")
    .isMongoId()
    .withMessage("All student IDs must be valid"),
];

// Course registration routes
router.post("/", validateCourseRegistration, validate, registerStudentToCourse);
router.post("/bulk", validateBulkRegistration, validate, bulkRegisterStudents);
router.get("/", getCourseRegistrations);
router.delete("/:registrationId", removeStudentFromCourse);
router.get("/students/available", getAvailableStudents);

export default router;
