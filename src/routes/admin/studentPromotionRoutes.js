import express from "express";
import {
  promoteStudents,
  getPromotionPreview,
  getGraduatedStudents,
  rollbackPromotion,
} from "../../controllers/admin/studentPromotionController.js";
import {
  authenticateToken,
  validateRole,
} from "../../middleware/roleMiddleware.js";
import { body, query, validationResult } from "express-validator";

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

// Get promotion preview (see what will happen before promoting)
router.get(
  "/preview",
  authenticateToken,
  validateRole(["Admin"]),
  getPromotionPreview
);

// Promote all students
router.post(
  "/promote",
  authenticateToken,
  validateRole(["Admin"]),
  [
    body("academic_year")
      .notEmpty()
      .withMessage("Academic year is required")
      .matches(/^\d{4}$/)
      .withMessage("Academic year must be a 4-digit year (e.g., '2024')"),
  ],
  handleValidationErrors,
  promoteStudents
);

// Get graduated students
router.get(
  "/graduates",
  authenticateToken,
  validateRole(["Admin"]),
  [
    query("graduation_year")
      .optional()
      .matches(/^\d{4}$/)
      .withMessage("Graduation year must be a 4-digit year"),
    query("department_id")
      .optional()
      .isMongoId()
      .withMessage("Valid department ID is required"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  handleValidationErrors,
  getGraduatedStudents
);

// Emergency rollback promotion
router.post(
  "/rollback",
  authenticateToken,
  validateRole(["Admin"]),
  [
    body("academic_year")
      .notEmpty()
      .withMessage("Academic year is required")
      .matches(/^\d{4}$/)
      .withMessage("Academic year must be a 4-digit year"),
    body("confirm")
      .equals("true")
      .withMessage("Confirmation required: set 'confirm' to 'true'"),
  ],
  handleValidationErrors,
  rollbackPromotion
);

export default router;
