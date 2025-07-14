import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateAssignment, validate } from "../../middleware/validation.js";
import {
  createAssignment,
  getAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignedCourses,
} from "../../controllers/lecturer/assignmentController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("Lecturer"));

// Assignment routes
router.post("/", validateAssignment, validate, createAssignment);
router.get("/", getAssignments);
router.get("/courses", getAssignedCourses);
router.get("/:assignmentId", getAssignment);
router.put("/:assignmentId", updateAssignment);
router.delete("/:assignmentId", deleteAssignment);

export default router;
