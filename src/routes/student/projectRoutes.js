import express from "express";
import {
  getMyProjectGroup,
  getMyProjectGrades,
  getDepartmentProjects
} from "../../controllers/student/studentProjectController.js";
import { authenticateToken, validateRole } from "../../middleware/roleMiddleware.js";
import { query, validationResult } from "express-validator";

const router = express.Router();

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

// Get student's own project group
router.get(
  "/my-group",
  authenticateToken,
  validateRole(["Student"]),
  getMyProjectGroup
);

// Get student's project grades
router.get(
  "/my-grades",
  authenticateToken,
  validateRole(["Student"]),
  getMyProjectGrades
);

// Get all projects in student's department (for reference)
router.get(
  "/department-projects",
  authenticateToken,
  validateRole(["Student"]),
  [
    query("academic_year")
      .optional()
      .matches(/^\d{4}\/\d{4}$/)
      .withMessage(
        "Academic year must be in format YYYY/YYYY (e.g., 2024/2025)"
      ),
  ],
  handleValidationErrors,
  getDepartmentProjects
);

export default router;
