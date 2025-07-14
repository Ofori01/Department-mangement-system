import { Document, Folder, FolderDocument } from "../../models/index.js";
import {
  uploadToGridFS,
  deleteFromGridFS,
  getFileInfo,
} from "../../middleware/fileUpload.js";

// Upload document
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

// Create folder
export const createFolder = async (req, res) => {
  try {
    const { name, status = "Pending" } = req.body;

    const folder = new Folder({
      name,
      status,
      owner_id: req.user._id,
    });

    await folder.save();
    await folder.populate("owner_id", "name email role");

    res.status(201).json({
      message: "Folder created successfully",
      folder,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get folders
export const getFolders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { owner_id: req.user._id };
    if (status) filter.status = status;

    const folders = await Folder.find(filter)
      .populate("owner_id", "name email role")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Add document count for each folder
    const foldersWithDocCount = await Promise.all(
      folders.map(async (folder) => {
        const docCount = await FolderDocument.countDocuments({
          folder_id: folder._id,
        });
        return {
          ...folder.toObject(),
          documentCount: docCount,
        };
      })
    );

    const total = await Folder.countDocuments(filter);

    res.json({
      folders: foldersWithDocCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update folder
export const updateFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name, status } = req.body;

    const folder = await Folder.findOne({
      _id: folderId,
      owner_id: req.user._id,
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (name) folder.name = name;
    if (status) folder.status = status;

    await folder.save();
    await folder.populate("owner_id", "name email role");

    res.json({
      message: "Folder updated successfully",
      folder,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete folder
export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    const folder = await Folder.findOne({
      _id: folderId,
      owner_id: req.user._id,
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Remove all folder-document relationships
    await FolderDocument.deleteMany({ folder_id: folderId });

    // Delete folder
    await Folder.findByIdAndDelete(folderId);

    res.json({ message: "Folder deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add document to folder
export const addDocumentToFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { document_id } = req.body;

    // Verify folder ownership
    const folder = await Folder.findOne({
      _id: folderId,
      owner_id: req.user._id,
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    // Verify document ownership
    const document = await Document.findOne({
      _id: document_id,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if document is already in folder
    const existingRelation = await FolderDocument.findOne({
      folder_id: folderId,
      document_id,
    });

    if (existingRelation) {
      return res.status(400).json({ message: "Document already in folder" });
    }

    const folderDocument = new FolderDocument({
      folder_id: folderId,
      document_id,
    });

    await folderDocument.save();

    res.status(201).json({
      message: "Document added to folder successfully",
      folderDocument,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove document from folder
export const removeDocumentFromFolder = async (req, res) => {
  try {
    const { folderId, documentId } = req.params;

    // Verify folder ownership
    const folder = await Folder.findOne({
      _id: folderId,
      owner_id: req.user._id,
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const folderDocument = await FolderDocument.findOneAndDelete({
      folder_id: folderId,
      document_id: documentId,
    });

    if (!folderDocument) {
      return res.status(404).json({ message: "Document not found in folder" });
    }

    res.json({ message: "Document removed from folder successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get documents in folder
export const getFolderDocuments = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verify folder ownership
    const folder = await Folder.findOne({
      _id: folderId,
      owner_id: req.user._id,
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const folderDocuments = await FolderDocument.find({ folder_id: folderId })
      .populate({
        path: "document_id",
        populate: { path: "owner_id", select: "name email role" },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Add file info for each document
    const documentsWithFileInfo = await Promise.all(
      folderDocuments.map(async (folderDoc) => {
        try {
          const fileInfo = await getFileInfo(folderDoc.document_id.file_url);
          return {
            ...folderDoc.toObject(),
            document_id: {
              ...folderDoc.document_id.toObject(),
              fileInfo: fileInfo
                ? {
                    originalName:
                      fileInfo.metadata?.originalName || fileInfo.filename,
                    size: fileInfo.length,
                    uploadDate: fileInfo.uploadDate,
                  }
                : null,
            },
          };
        } catch (error) {
          return {
            ...folderDoc.toObject(),
            document_id: {
              ...folderDoc.document_id.toObject(),
              fileInfo: null,
            },
          };
        }
      })
    );

    const total = await FolderDocument.countDocuments({ folder_id: folderId });

    res.json({
      folder,
      documents: documentsWithFileInfo,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
