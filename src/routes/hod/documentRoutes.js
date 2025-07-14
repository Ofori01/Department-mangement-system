import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { upload } from "../../middleware/fileUpload.js";
import {
  validateDocument,
  validateFolder,
  validate,
} from "../../middleware/validation.js";
import { body } from "express-validator";
import {
  uploadDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  createFolder,
  getFolders,
  updateFolder,
  deleteFolder,
  addDocumentToFolder,
  removeDocumentFromFolder,
  getFolderDocuments,
} from "../../controllers/hod/documentController.js";

const router = express.Router();

// Apply authentication and authorization middleware
router.use(authenticate);
router.use(authorize("HoD"));

// Document routes
router.post(
  "/upload",
  upload.single("file"),
  validateDocument,
  validate,
  uploadDocument
);
router.get("/documents", getDocuments);
router.put("/documents/:documentId", updateDocument);
router.delete("/documents/:documentId", deleteDocument);

// Folder routes
router.post("/folders", validateFolder, validate, createFolder);
router.get("/folders", getFolders);
router.put("/folders/:folderId", updateFolder);
router.delete("/folders/:folderId", deleteFolder);

// Folder-Document relationship routes
router.post(
  "/folders/:folderId/documents",
  [
    body("document_id")
      .isMongoId()
      .withMessage("Valid document ID is required"),
  ],
  validate,
  addDocumentToFolder
);
router.delete(
  "/folders/:folderId/documents/:documentId",
  removeDocumentFromFolder
);
router.get("/folders/:folderId/documents", getFolderDocuments);

export default router;
