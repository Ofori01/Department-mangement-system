import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { upload } from "../../middleware/fileUpload.js";
import { validateDocument, validate } from "../../middleware/validation.js";
import {
  uploadDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
} from "../../controllers/lecturer/documentController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("Lecturer"));

// Document routes
router.post(
  "/upload",
  upload.single("file"),
  validateDocument,
  validate,
  uploadDocument
);
router.get("/", getDocuments);
router.put("/:documentId", updateDocument);
router.delete("/:documentId", deleteDocument);

export default router;
