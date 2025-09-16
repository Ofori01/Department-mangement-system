import Folder from "../../models/content/folder.js";
import Document from "../../models/content/document.js";
import FileShare from "../../models/content/fileShare.js";
import { FolderDocument } from "../../models/index.js";
import User from "../../models/core/user.js";
import Department from "../../models/core/department.js";
import Notification from "../../models/communication/notification.js";
import {
  uploadToGridFS,
  deleteFromGridFS,
  getFileInfo,
} from "../../middleware/fileUpload.js";
import mongoose from "mongoose";
import pkg from "mongodb";
const { GridFSBucket } = pkg;

// Folder management
export const createFolder = async (req, res) => {
  try {
    const { name, status = "Pending" } = req.body;

    const folder = new Folder({
      name,
      status,
      owner_id: req.user._id,
    });

    await folder.save();
    await folder.populate("owner_id", "name email");

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      data: folder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating folder",
      error: error.message,
    });
  }
};

export const getFolders = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = { owner_id: req.user._id }; // Only show folders created by this admin

    if (status) query.status = status;
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const folders = await Folder.find(query)
      .populate("owner_id", "name email")
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

    const total = await Folder.countDocuments(query);

    res.json({
      success: true,
      data: {
        folders: foldersWithDocCount,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: foldersWithDocCount.length,
          totalRecords: total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching folders",
      error: error.message,
    });
  }
};

export const updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const folder = await Folder.findByIdAndUpdate(
      id,
      { name, status },
      { new: true, runValidators: true }
    ).populate("owner_id", "name email");

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    res.json({
      success: true,
      message: "Folder updated successfully",
      data: folder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating folder",
      error: error.message,
    });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { delete_documents = false, force = false } = req.query;

    // Find folder with additional information
    const folder = await Folder.findById(id).populate(
      "owner_id",
      "name email role"
    );

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    // Get folder documents
    const folderDocuments = await FolderDocument.find({
      folder_id: id,
    }).populate("document_id");
    const documentCount = folderDocuments.length;

    if (documentCount > 0 && !delete_documents && !force) {
      return res.status(409).json({
        success: false,
        message: `Folder contains ${documentCount} document(s). Use delete_documents=true to delete documents or force=true to remove folder only.`,
        data: {
          folderInfo: {
            name: folder.name,
            owner: folder.owner_id.name,
            documentCount,
          },
          documents: folderDocuments.map((fd) => ({
            id: fd.document_id._id,
            title: fd.document_id.title,
          })),
        },
      });
    }

    const deletionResults = {
      folderId: id,
      folderName: folder.name,
      documentsProcessed: 0,
      documentsDeleted: 0,
      folderAssociationsRemoved: 0,
      errors: [],
    };

    // Handle document deletion if requested
    if (delete_documents && documentCount > 0) {
      for (const folderDoc of folderDocuments) {
        try {
          const document = folderDoc.document_id;

          // Delete file from GridFS
          try {
            await deleteFromGridFS(document.file_url);
          } catch (gridFSError) {
            console.warn(
              `Failed to delete file from GridFS for document ${document._id}:`,
              gridFSError.message
            );
            deletionResults.errors.push({
              documentId: document._id,
              title: document.title,
              error: "Failed to delete from storage",
            });
          }

          // Remove all file shares for this document
          await FileShare.deleteMany({ file_id: document._id });

          // Remove from all folders (not just this one)
          await FolderDocument.deleteMany({ document_id: document._id });

          // Delete document record
          await Document.findByIdAndDelete(document._id);

          // Send notification to document owner if they're not admin
          if (document.owner_id.toString() !== req.user._id.toString()) {
            const notification = new Notification({
              receiver_id: document.owner_id,
              sender_id: req.user._id,
              title: "Documents Deleted with Folder",
              message: `Your document "${document.title}" was deleted when folder "${folder.name}" was removed by an administrator.`,
              type: "admin_action",
              priority: "high",
            });
            await notification.save();
          }

          deletionResults.documentsDeleted++;
        } catch (docError) {
          console.error(
            `Error deleting document ${folderDoc.document_id._id}:`,
            docError
          );
          deletionResults.errors.push({
            documentId: folderDoc.document_id._id,
            title: folderDoc.document_id.title,
            error: docError.message,
          });
        }
        deletionResults.documentsProcessed++;
      }
    } else if (documentCount > 0) {
      // Remove folder associations without deleting documents
      const deletedAssociations = await FolderDocument.deleteMany({
        folder_id: id,
      });
      deletionResults.folderAssociationsRemoved =
        deletedAssociations.deletedCount;
    }

    // Delete the folder
    await Folder.findByIdAndDelete(id);

    // Send notification to folder owner if they're not admin
    if (folder.owner_id._id.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        receiver_id: folder.owner_id._id,
        sender_id: req.user._id,
        title: "Folder Deleted by Admin",
        message: `Your folder "${folder.name}" has been deleted by an administrator.`,
        type: "admin_action",
        priority: "high",
      });
      await notification.save();
    }

    res.json({
      success: true,
      message: `Folder "${folder.name}" deleted successfully`,
      data: deletionResults,
    });
  } catch (error) {
    console.error("Error deleting folder (Admin):", error);
    res.status(500).json({
      success: false,
      message: "Error deleting folder",
      error: error.message,
    });
  }
};

// Document management
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { title, visibility = "private", folder_id } = req.body;

    // Validate folder_id is provided
    if (!folder_id) {
      return res.status(400).json({
        success: false,
        message: "Folder ID is required",
      });
    }

    // Verify folder exists and user owns it
    const folder = await Folder.findOne({
      _id: folder_id,
      owner_id: req.user._id,
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found or access denied",
      });
    }

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
    await document.populate("owner_id", "name email");

    // Automatically add document to the folder
    const folderDocument = new FolderDocument({
      folder_id: folder_id,
      document_id: document._id,
    });

    await folderDocument.save();

    res.status(201).json({
      success: true,
      message: "Document uploaded and added to folder successfully",
      data: {
        ...document.toObject(),
        folder: {
          _id: folder._id,
          name: folder.name,
          status: folder.status,
        },
        fileInfo: {
          originalName: fileResult.originalName,
          size: fileResult.size,
          uploadDate: fileResult.uploadDate,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error uploading document",
      error: error.message,
    });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const { search, mimeType, visibility, page = 1, limit = 10 } = req.query;
    const query = { owner_id: req.user._id }; // Only show documents owned by this admin

    if (search) {
      query.$or = [{ title: { $regex: search, $options: "i" } }];
    }
    if (mimeType) query.mimeType = { $regex: mimeType, $options: "i" };
    if (visibility) query.visibility = visibility;

    const documents = await Document.find(query)
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

    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      data: {
        documents: documentsWithFileInfo,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: documentsWithFileInfo.length,
          totalRecords: total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching documents",
      error: error.message,
    });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, visibility, status } = req.body;

    // Find document (admin can update any document)
    const document = await Document.findById(id).populate(
      "owner_id",
      "name email role"
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (visibility) updateData.visibility = visibility;
    if (status) updateData.status = status;

    const updatedDocument = await Document.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("owner_id", "name email role");

    // Send notification to document owner if status was changed and owner is not admin
    if (
      status &&
      document.owner_id._id.toString() !== req.user._id.toString()
    ) {
      const notification = new Notification({
        receiver_id: document.owner_id._id,
        sender_id: req.user._id,
        title: "Document Status Updated",
        message: `The status of your document "${document.title}" has been updated to "${status}" by an administrator.`,
        type: "admin_action",
        priority: "medium",
      });
      await notification.save();
    }

    res.json({
      success: true,
      message: "Document updated successfully",
      data: updatedDocument,
    });
  } catch (error) {
    console.error("Error updating document (Admin):", error);
    res.status(500).json({
      success: false,
      message: "Error updating document",
      error: error.message,
    });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query; // Force delete option

    // Find document with additional validation
    const document = await Document.findById(id).populate(
      "owner_id",
      "name email role"
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Check if document is shared - warn admin
    const shareCount = await FileShare.countDocuments({ file_id: id });
    if (shareCount > 0 && !force) {
      return res.status(409).json({
        success: false,
        message: `Document is shared with ${shareCount} user(s). Use force=true to delete anyway.`,
        data: {
          shareCount,
          documentInfo: {
            title: document.title,
            owner: document.owner_id.name,
          },
        },
      });
    }

    // Delete file from GridFS with error handling
    try {
      await deleteFromGridFS(document.file_url);
    } catch (gridFSError) {
      console.warn("Failed to delete file from GridFS:", gridFSError.message);
      if (!force) {
        return res.status(500).json({
          success: false,
          message:
            "Failed to delete file from storage. Use force=true to delete record anyway.",
          error: gridFSError.message,
        });
      }
    }

    // Remove all file shares
    const deletedShares = await FileShare.deleteMany({ file_id: id });

    // Remove document from all folders
    const deletedFolderAssociations = await FolderDocument.deleteMany({
      document_id: id,
    });

    // Delete document record
    await Document.findByIdAndDelete(id);

    // Send notification to original owner if they're not the admin
    if (document.owner_id._id.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        receiver_id: document.owner_id._id,
        sender_id: req.user._id,
        title: "Document Deleted by Admin",
        message: `Your document "${document.title}" has been deleted by an administrator.`,
        type: "admin_action",
        priority: "high",
      });
      await notification.save();
    }

    res.json({
      success: true,
      message: "Document deleted successfully",
      data: {
        deletedDocument: {
          id: document._id,
          title: document.title,
          owner: document.owner_id.name,
        },
        cleanupResults: {
          sharesRemoved: deletedShares.deletedCount,
          folderAssociationsRemoved: deletedFolderAssociations.deletedCount,
        },
      },
    });
  } catch (error) {
    console.error("Error deleting document (Admin):", error);
    res.status(500).json({
      success: false,
      message: "Error deleting document",
      error: error.message,
    });
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
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
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
      success: true,
      data: {
        folder,
        documents: documentsWithFileInfo,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: documentsWithFileInfo.length,
          totalRecords: total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching folder documents",
      error: error.message,
    });
  }
};

// File management operations
export const moveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { folder_id } = req.body;

    // Verify document exists and user owns it
    const document = await Document.findOne({
      _id: id,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found or access denied",
      });
    }

    // Verify target folder exists and user owns it
    const targetFolder = await Folder.findOne({
      _id: folder_id,
      owner_id: req.user._id,
    });

    if (!targetFolder) {
      return res.status(404).json({
        success: false,
        message: "Target folder not found or access denied",
      });
    }

    // Check if document is already in the target folder
    const existingAssociation = await FolderDocument.findOne({
      folder_id: folder_id,
      document_id: id,
    });

    if (existingAssociation) {
      return res.status(400).json({
        success: false,
        message: "Document is already in this folder",
      });
    }

    // Remove from current folders (admin can move between their own folders)
    await FolderDocument.deleteMany({ document_id: id });

    // Add to new folder
    const folderDocument = new FolderDocument({
      folder_id: folder_id,
      document_id: id,
    });

    await folderDocument.save();
    await folderDocument.populate("folder_id", "name status");

    res.json({
      success: true,
      message: "Document moved successfully",
      data: {
        document_id: id,
        moved_to: folderDocument.folder_id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error moving document",
      error: error.message,
    });
  }
};

export const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;

    // Verify document exists and user owns it
    const document = await Document.findOne({
      _id: id,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found or access denied",
      });
    }

    // Verify all users exist
    const users = await User.find({ _id: { $in: user_ids } }).select(
      "name email role"
    );

    if (users.length !== user_ids.length) {
      return res.status(400).json({
        success: false,
        message: "One or more users not found",
      });
    }

    const shares = [];
    const errors = [];

    // Create shares
    for (const user_id of user_ids) {
      try {
        // Check if already shared
        const existingShare = await FileShare.findOne({
          file_id: id,
          shared_by: req.user._id,
          shared_with: user_id,
        });

        if (existingShare) {
          errors.push({
            user_id,
            error: "Document already shared with this user",
          });
          continue;
        }

        // Don't share with self
        if (user_id === req.user._id.toString()) {
          errors.push({
            user_id,
            error: "Cannot share document with yourself",
          });
          continue;
        }

        const share = new FileShare({
          file_id: id,
          shared_by: req.user._id,
          shared_with: user_id,
        });

        await share.save();
        await share.populate("shared_with", "name email role");

        shares.push(share);

        // Send notification to the user
        const notification = new Notification({
          receiver_id: user_id,
          sender_id: req.user._id,
          title: "Document Shared",
          message: `A document "${document.title}" has been shared with you`,
          type: "general",
        });
        await notification.save();
      } catch (error) {
        errors.push({
          user_id,
          error: error.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Document shared with ${shares.length} user(s)`,
      data: {
        shares,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sharing document",
      error: error.message,
    });
  }
};

export const getDocumentShares = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify document exists and user owns it
    const document = await Document.findOne({
      _id: id,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found or access denied",
      });
    }

    const shares = await FileShare.find({
      file_id: id,
      shared_by: req.user._id,
    })
      .populate("shared_with", "name email role department_id")
      .populate({
        path: "shared_with",
        populate: { path: "department_id", select: "name code" },
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        document: {
          _id: document._id,
          title: document.title,
          visibility: document.visibility,
        },
        shares,
        total: shares.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching document shares",
      error: error.message,
    });
  }
};

export const removeDocumentShare = async (req, res) => {
  try {
    const { id, shareId } = req.params;

    // Verify document exists and user owns it
    const document = await Document.findOne({
      _id: id,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found or access denied",
      });
    }

    // Find and remove the share
    const share = await FileShare.findOneAndDelete({
      _id: shareId,
      file_id: id,
      shared_by: req.user._id,
    });

    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Share not found",
      });
    }

    // Send notification to the user
    const notification = new Notification({
      receiver_id: share.shared_with,
      sender_id: req.user._id,
      title: "Document Share Removed",
      message: `Access to document "${document.title}" has been removed`,
      type: "general",
    });
    await notification.save();

    res.json({
      success: true,
      message: "Document share removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing document share",
      error: error.message,
    });
  }
};

// User management
export const searchUsers = async (req, res) => {
  try {
    const { search, role, department_id, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;
    if (department_id) query.department_id = department_id;

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select("-password -refreshTokens")
      .populate("department_id", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: users.length,
          totalRecords: total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching users",
      error: error.message,
    });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password -refreshTokens")
      .populate("department_id", "name code description");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user details",
      error: error.message,
    });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    )
      .select("-password -refreshTokens")
      .populate("department_id", "name code");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating user role",
      error: error.message,
    });
  }
};

// Notification management
export const sendNotification = async (req, res) => {
  try {
    const { recipients, title, message, type, priority } = req.body;

    const notifications = [];

    for (const recipientId of recipients) {
      const notification = new Notification({
        receiver_id: recipientId,
        sender_id: req.user._id,
        title,
        message,
        type: type || "general",
        priority: priority || "medium",
      });

      await notification.save();
      await notification.populate("sender_id", "name email");
      await notification.populate("receiver_id", "name email");

      notifications.push(notification);
    }

    res.status(201).json({
      success: true,
      message: `${notifications.length} notification(s) sent successfully`,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending notifications",
      error: error.message,
    });
  }
};

export const sendBulkNotification = async (req, res) => {
  try {
    const { criteria, title, message, type, priority } = req.body;

    // Build query based on criteria
    const query = {};
    if (criteria.role) query.role = criteria.role;
    if (criteria.department_id) query.department_id = criteria.department_id;
    if (criteria.level) query.level = criteria.level;

    const recipients = await User.find(query).select("_id");

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No users found matching the criteria",
      });
    }

    const notifications = [];

    for (const recipient of recipients) {
      const notification = new Notification({
        receiver_id: recipient._id,
        sender_id: req.user._id,
        title,
        message,
        type: type || "general",
        priority: priority || "medium",
      });

      await notification.save();
      notifications.push(notification);
    }

    res.status(201).json({
      success: true,
      message: `Bulk notification sent to ${notifications.length} users`,
      data: { count: notifications.length, criteria },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending bulk notification",
      error: error.message,
    });
  }
};

// System statistics
export const getSystemStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "Student" }),
      User.countDocuments({ role: "Lecturer" }),
      User.countDocuments({ role: "HoD" }),
      User.countDocuments({ role: "Admin" }),
      Department.countDocuments(),
      Document.countDocuments(),
      Document.countDocuments({ status: "Pending" }),
      Document.countDocuments({ status: "Completed" }),
      Folder.countDocuments(),
      Notification.countDocuments({ read: false }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: stats[0],
        totalStudents: stats[1],
        totalLecturers: stats[2],
        totalHods: stats[3],
        totalAdmins: stats[4],
        totalDepartments: stats[5],
        totalDocuments: stats[6],
        pendingDocuments: stats[7],
        completedDocuments: stats[8],
        totalFolders: stats[9],
        unreadNotifications: stats[10],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching system statistics",
      error: error.message,
    });
  }
};

// Bulk document status update
export const bulkUpdateDocumentStatus = async (req, res) => {
  try {
    const { document_ids, status, notify_owners = true } = req.body;

    if (
      !document_ids ||
      !Array.isArray(document_ids) ||
      document_ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Document IDs array is required",
      });
    }

    if (!["Pending", "Completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'Pending' or 'Completed'",
      });
    }

    // Get documents with owner information
    const documents = await Document.find({
      _id: { $in: document_ids },
    }).populate("owner_id", "name email");

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No documents found",
      });
    }

    // Update documents
    const updateResult = await Document.updateMany(
      { _id: { $in: document_ids } },
      { $set: { status } }
    );

    // Send notifications to owners if requested
    if (notify_owners) {
      const uniqueOwners = [
        ...new Set(documents.map((doc) => doc.owner_id._id.toString())),
      ];

      for (const ownerId of uniqueOwners) {
        if (ownerId !== req.user._id.toString()) {
          const ownerDocuments = documents.filter(
            (doc) => doc.owner_id._id.toString() === ownerId
          );
          const docTitles = ownerDocuments.map((doc) => doc.title).join(", ");

          const notification = new Notification({
            receiver_id: ownerId,
            sender_id: req.user._id,
            title: "Documents Status Updated",
            message: `Status of ${ownerDocuments.length} document(s) updated to "${status}": ${docTitles}`,
            type: "admin_action",
            priority: "medium",
          });
          await notification.save();
        }
      }
    }

    res.json({
      success: true,
      message: `${updateResult.modifiedCount} document(s) updated to ${status}`,
      data: {
        totalRequested: document_ids.length,
        totalFound: documents.length,
        totalUpdated: updateResult.modifiedCount,
        status,
        notificationsSent: notify_owners,
      },
    });
  } catch (error) {
    console.error("Error bulk updating document status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating document status",
      error: error.message,
    });
  }
};
