import express from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getDepartments,
} from "../controllers/authController.js";

const router = express.Router();

// Validation rules
const validateRegister = [
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .isIn(["Student", "Lecturer", "HoD", "Admin"])
    .withMessage("Invalid role"),
  body("department_id")
    .optional()
    .custom((value, { req }) => {
      const role = req.body.role;

      // Admin users should NOT have a department_id
      if (role === "Admin") {
        if (value) {
          throw new Error("Admin users should not have a department");
        }
        return true;
      }

      // Non-Admin users MUST have a department_id
      if (!value) {
        throw new Error("Department ID is required for non-admin users");
      }

      // Check if it's a valid MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error("Valid department ID is required");
      }

      return true;
    }),
  body("studentId")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Student ID cannot be empty"),
  body("level")
    .optional()
    .isIn(["100", "200", "300", "400"])
    .withMessage("Invalid level"),
];

const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 1 }).withMessage("Password is required"),
];

const validateProfileUpdate = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
];

const validatePasswordChange = [
  body("currentPassword")
    .isLength({ min: 1 })
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

// Public routes
router.post("/register", validateRegister, validate, register);
router.post("/login", validateLogin, validate, login);
router.get("/departments", getDepartments);

// Protected routes
router.use(authenticate); // Apply authentication middleware to routes below
router.get("/profile", getProfile);
router.put("/profile", validateProfileUpdate, validate, updateProfile);
router.put(
  "/change-password",
  validatePasswordChange,
  validate,
  changePassword
);

export default router;
