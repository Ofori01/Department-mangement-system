import { body, validationResult } from "express-validator";

// Validation middleware
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// User validation rules
export const validateUser = [
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
    .isMongoId()
    .withMessage("Valid department ID is required"),
];

// Course validation rules
export const validateCourse = [
  body("title")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Course title is required"),
  body("code")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Course code is required"),
  // body("level").isIn(["100", "200", "300", "400"]).withMessage("Invalid level"),
  // body("semester").isIn(["first", "second"]).withMessage("Invalid semester"),
  body("credit_hours").isNumeric(),
  body("department_id")
    .isMongoId()
    .withMessage("Valid department ID is required"),
];

// Assignment validation rules
export const validateAssignment = [
  body("title")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Assignment title is required"),
  body("description")
    .trim()
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters"),
  body("due_date").isISO8601().withMessage("Valid due date is required"),
  body("course_id").isMongoId().withMessage("Valid course ID is required"),
];

// Document validation rules
export const validateDocument = [
  body("title")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Document title is required"),
  body("visibility")
    .optional()
    .isIn(["private", "shared"])
    .withMessage("Invalid visibility option"),
];

// Notification validation rules
export const validateNotification = [
  body("title")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Notification title is required"),
  body("message")
    .trim()
    .isLength({ min: 5 })
    .withMessage("Message must be at least 5 characters"),
  body("receiver_id").isMongoId().withMessage("Valid receiver ID is required"),
];

// Folder validation rules
export const validateFolder = [
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Folder name is required"),
  body("status")
    .optional()
    .isIn(["Pending", "Completed"])
    .withMessage("Invalid status"),
];
