import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { upload } from "../../middleware/fileUpload.js";
import {
  getAssignments,
  submitAssignment,
  getSubmissions,
  updateSubmission,
  getSubmission,
} from "../../controllers/student/assignmentController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("Student"));

// Assignment routes
router.get("/", getAssignments);
router.post("/:assignmentId/submit", upload.single("file"), submitAssignment);
router.put(
  "/submissions/:submissionId",
  upload.single("file"),
  updateSubmission
);
router.get("/submissions", getSubmissions);
router.get("/submissions/:submissionId", getSubmission);

export default router;
