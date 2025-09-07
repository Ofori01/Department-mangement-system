import express from "express";
import {
  createProjectYear,
  getProjectYears,
  createProjectGroup,
  getProjectGroups,
  updateProjectGroup,
  gradeProject,
  getProjectGrades,
  getFinalProjectGrade,
} from "../controllers/lecturer/projectController.js";
import {
  authenticateToken,
  validateRole,
} from "../middleware/roleMiddleware.js";
import { body, param, query, validationResult } from "express-validator";

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

// Project Year Routes
router.post(
  "/years",
  authenticateToken,
  validateRole(["Lecturer", "HoD"]),
  [
    body("academic_year")
      .notEmpty()
      .withMessage("Academic year is required")
      .matches(/^\d{4}\/\d{4}$/)
      .withMessage(
        "Academic year must be in format YYYY/YYYY (e.g., 2024/2025)"
      ),
    body("department_id")
      .isMongoId()
      .withMessage("Valid department ID is required"),
  ],
  handleValidationErrors,
  createProjectYear
);

router.get(
  "/years",
  authenticateToken,
  validateRole(["Lecturer", "HoD", "Admin"]),
  [
    query("department_id")
      .optional()
      .isMongoId()
      .withMessage("Valid department ID is required"),
  ],
  handleValidationErrors,
  getProjectYears
);

// Project Group Routes
router.post(
  "/groups",
  authenticateToken,
  validateRole(["Lecturer", "HoD"]),
  [
    body("project_year_id")
      .isMongoId()
      .withMessage("Valid project year ID is required"),
    body("topic")
      .notEmpty()
      .withMessage("Project topic is required")
      .isLength({ min: 10, max: 500 })
      .withMessage("Project topic must be between 10 and 500 characters"),
    body("members")
      .isArray({ min: 1, max: 5 })
      .withMessage("Project must have 1-5 members"),
    body("members.*.student_id")
      .isMongoId()
      .withMessage("Valid student ID is required for each member"),
    body("supervisor_id")
      .isMongoId()
      .withMessage("Valid supervisor ID is required"),
  ],
  handleValidationErrors,
  createProjectGroup
);

router.get(
  "/groups",
  authenticateToken,
  validateRole(["Lecturer", "HoD", "Admin"]),
  [
    query("project_year_id")
      .optional()
      .isMongoId()
      .withMessage("Valid project year ID is required"),
    query("supervisor_id")
      .optional()
      .isMongoId()
      .withMessage("Valid supervisor ID is required"),
    query("current_stage")
      .optional()
      .isIn(["Proposal", "Progress", "Defense"])
      .withMessage("Current stage must be Proposal, Progress, or Defense"),
    query("status")
      .optional()
      .isIn(["Active", "Completed", "Suspended"])
      .withMessage("Status must be Active, Completed, or Suspended"),
  ],
  handleValidationErrors,
  getProjectGroups
);

router.put(
  "/groups/:groupId",
  authenticateToken,
  validateRole(["Lecturer", "HoD"]),
  [
    param("groupId").isMongoId().withMessage("Valid group ID is required"),
    body("topic")
      .optional()
      .isLength({ min: 10, max: 500 })
      .withMessage("Project topic must be between 10 and 500 characters"),
    body("current_stage")
      .optional()
      .isIn(["Proposal", "Progress", "Defense"])
      .withMessage("Current stage must be Proposal, Progress, or Defense"),
    body("status")
      .optional()
      .isIn(["Active", "Completed", "Suspended"])
      .withMessage("Status must be Active, Completed, or Suspended"),
  ],
  handleValidationErrors,
  updateProjectGroup
);

// Project Grading Routes
router.post(
  "/grades",
  authenticateToken,
  validateRole(["Lecturer", "HoD"]),
  [
    body("project_group_id")
      .isMongoId()
      .withMessage("Valid project group ID is required"),
    body("stage")
      .isIn(["Proposal", "Progress", "Defense"])
      .withMessage("Stage must be Proposal, Progress, or Defense"),
    body("score")
      .isNumeric()
      .withMessage("Score must be a number")
      .custom((value) => {
        if (value < 0 || value > 100) {
          throw new Error("Score must be between 0 and 100");
        }
        return true;
      }),
    body("comments")
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage("Comments must not exceed 1000 characters"),
    body("is_final")
      .optional()
      .isBoolean()
      .withMessage("is_final must be a boolean"),
  ],
  handleValidationErrors,
  gradeProject
);

router.get(
  "/grades",
  authenticateToken,
  validateRole(["Lecturer", "HoD", "Admin"]),
  [
    query("project_group_id")
      .optional()
      .isMongoId()
      .withMessage("Valid project group ID is required"),
    query("stage")
      .optional()
      .isIn(["Proposal", "Progress", "Defense"])
      .withMessage("Stage must be Proposal, Progress, or Defense"),
    query("grader_id")
      .optional()
      .isMongoId()
      .withMessage("Valid grader ID is required"),
    query("is_final")
      .optional()
      .isBoolean()
      .withMessage("is_final must be a boolean"),
  ],
  handleValidationErrors,
  getProjectGrades
);

router.get(
  "/groups/:groupId/final-grade",
  authenticateToken,
  validateRole(["Lecturer", "HoD", "Admin", "Student"]),
  [param("groupId").isMongoId().withMessage("Valid group ID is required")],
  handleValidationErrors,
  getFinalProjectGrade
);

export default router;
