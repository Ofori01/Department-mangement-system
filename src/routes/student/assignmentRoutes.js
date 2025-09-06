import express from "express";
import { param } from "express-validator";
import { authenticate, authorize } from "../../middleware/auth.js";
import { upload } from "../../middleware/fileUpload.js";
import { validate } from "../../middleware/validation.js";
import {
  getAssignments,
  submitAssignment,
  getSubmissions,
  updateSubmission,
  getSubmission,
  downloadAssignmentFile,
} from "../../controllers/student/assignmentController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("Student"));

// Assignment routes
router.get("/", getAssignments);
router.get(
  "/:assignmentId/download",
  [param("assignmentId").isMongoId().withMessage("Invalid assignment ID")],
  validate,
  downloadAssignmentFile
);
router.post("/:assignmentId/submit", upload.single("file"), submitAssignment);
router.put(
  "/submissions/:submissionId",
  upload.single("file"),
  updateSubmission
);
router.get("/submissions", getSubmissions);
router.get("/submissions/:submissionId", getSubmission);

export default router;
