import express from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { upload } from "../../middleware/fileUpload.js";
import { validateDocument, validate, validateFolder } from "../../middleware/validation.js";
import {
  uploadDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  createFolder,
  getFolders,
  addDocumentToFolderOnDocumentCreation,
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

//document creation with folder
router.post(
  "/upload/folder",
  upload.single("file"),
  validateDocument,
  validate,
  uploadDocument,
  addDocumentToFolderOnDocumentCreation
);

router.get("/", getDocuments);
router.put("/:documentId", updateDocument);
router.delete("/:documentId", deleteDocument);



//folder routes
router.post("/folders", validateFolder, validate, createFolder);
router.get("/folders", getFolders);
// router.put("/folders/:folderId", updateFo);
// router.delete("/folders/:folderId", deletefol);
export default router;
