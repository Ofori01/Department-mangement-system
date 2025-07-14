import express from "express";
import { body } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validate } from "../../middleware/validation.js";
import {
  getSubmissions,
  gradeSubmission,
  getSubmission,
  getSubmissionStats,
} from "../../controllers/lecturer/submissionController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("Lecturer"));

// Validation for grading
const validateGrade = [
  body("grade")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Grade must be between 0 and 100"),
  body("feedback")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Feedback cannot be empty if provided"),
];

// Submission routes
router.get("/", getSubmissions);
router.get("/:submissionId", getSubmission);
router.put("/:submissionId/grade", validateGrade, validate, gradeSubmission);
router.get("/assignment/:assignmentId/stats", getSubmissionStats);

export default router;
