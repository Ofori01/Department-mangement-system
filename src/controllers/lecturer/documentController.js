import { Document, Folder, FolderDocument } from "../../models/index.js";
import {
  uploadToGridFS,
  deleteFromGridFS,
  getFileInfo,
} from "../../middleware/fileUpload.js";

// Upload document (same as HoD but for lecturer)
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { title, visibility = "private" } = req.body;

    // Upload file to GridFS
    const fileResult = await uploadToGridFS(req.file, {
      uploadedBy: req.user._id,
      userRole: req.user.role,
      department: req.user.department_id,
    });

    // Create document record
    const document = new Document({
      owner_id: req.user._id,
      title: title || req.file.originalname,
      file_url: fileResult.fileId,
      visibility,
    });

    await document.save();
    await document.populate("owner_id", "name email role");

    res.status(201).json({
      message: "Document uploaded successfully",
      document: {
        ...document.toObject(),
        fileInfo: {
          originalName: fileResult.originalName,
          size: fileResult.size,
          uploadDate: fileResult.uploadDate,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get documents
export const getDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, visibility } = req.query;

    const filter = { owner_id: req.user._id };
    if (visibility) filter.visibility = visibility;

    const documents = await Document.find(filter)
      .populate("owner_id", "name email role")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ created_at: -1 });

    // Add file info for each document
    const documentsWithFileInfo = await Promise.all(
      documents.map(async (doc) => {
        try {
          const fileInfo = await getFileInfo(doc.file_url);
          return {
            ...doc.toObject(),
            fileInfo: fileInfo
              ? {
                  originalName:
                    fileInfo.metadata?.originalName || fileInfo.filename,
                  size: fileInfo.length,
                  uploadDate: fileInfo.uploadDate,
                }
              : null,
          };
        } catch (error) {
          return {
            ...doc.toObject(),
            fileInfo: null,
          };
        }
      })
    );

    const total = await Document.countDocuments(filter);

    res.json({
      documents: documentsWithFileInfo,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update document
export const updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { title, visibility } = req.body;

    const document = await Document.findOne({
      _id: documentId,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (title) document.title = title;
    if (visibility) document.visibility = visibility;

    await document.save();
    await document.populate("owner_id", "name email role");

    res.json({
      message: "Document updated successfully",
      document,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findOne({
      _id: documentId,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Delete file from GridFS
    try {
      await deleteFromGridFS(document.file_url);
    } catch (error) {
      console.warn("Failed to delete file from GridFS:", error.message);
    }

    // Remove document from folders
    await FolderDocument.deleteMany({ document_id: documentId });

    // Delete document record
    await Document.findByIdAndDelete(documentId);

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
