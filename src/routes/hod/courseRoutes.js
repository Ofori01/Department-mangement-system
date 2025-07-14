import express from "express";
import {
  authenticate,
  authorize,
  checkDepartmentAccess,
} from "../../middleware/auth.js";
import { validateCourse, validate } from "../../middleware/validation.js";
import {
  createCourse,
  getCourses,
  updateCourse,
  deleteCourse,
} from "../../controllers/hod/courseController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("HoD"));
router.use(checkDepartmentAccess);

// Course routes
router.post("/", validateCourse, validate, createCourse);
router.get("/", getCourses);
router.put("/:courseId", updateCourse);
router.delete("/:courseId", deleteCourse);

export default router;
