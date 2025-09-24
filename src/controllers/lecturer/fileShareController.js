import Document from "../../models/content/document.js";
import FileShare from "../../models/content/fileShare.js";
import Folder from "../../models/content/folder.js";
import User from "../../models/core/user.js";
import Notification from "../../models/communication/notification.js";
import { getFileInfo } from "../../middleware/fileUpload.js";

// Share document with other users
export const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;

    // Verify document exists and belongs to lecturer
    const document = await Document.findOne({
      _id: id,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found or you don't have permission to share it",
      });
    }

    // Verify all target users exist and are in the same department
    const users = await User.find({
      _id: { $in: user_ids },
      department_id: req.user.department_id,
    }).select("name email role");

    if (users.length !== user_ids.length) {
      return res.status(400).json({
        success: false,
        message: "Some users not found or not in your department",
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
          title: "Document Shared by Lecturer",
          message: `Lecturer has shared document "${document.title}" with you`,
          type: "document_share",
          priority: "medium",
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
      message: `Document shared with ${shares.length} user(s) from your department`,
      data: {
        shares,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Error sharing document (Lecturer):", error);
    res.status(500).json({
      success: false,
      message: "Error sharing document",
      error: error.message,
    });
  }
};

// Get documents shared by this lecturer
export const getMySharedDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    // Build query for documents shared by this lecturer
    const shareQuery = { shared_by: req.user._id };

    const shares = await FileShare.find(shareQuery)
      .populate({
        path: "file_id",
        select: "title visibility status created_at owner_id",
        populate: { path: "owner_id", select: "name email role" },
      })
      .populate("shared_with", "name email role department_id")
      .populate({
        path: "shared_with",
        populate: { path: "department_id", select: "name" },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Filter by search term if provided
    let filteredShares = shares;
    if (search) {
      filteredShares = shares.filter(
        (share) =>
          share.file_id?.title?.toLowerCase().includes(search.toLowerCase()) ||
          share.shared_with?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Add file info for each document
    const sharesWithFileInfo = await Promise.all(
      filteredShares.map(async (share) => {
        if (!share.file_id) return share.toObject();

        try {
          const fileInfo = await getFileInfo(share.file_id.file_url);
          return {
            ...share.toObject(),
            file_id: {
              ...share.file_id.toObject(),
              fileInfo: fileInfo
                ? {
                    originalName:
                      fileInfo.metadata?.originalName || fileInfo.filename,
                    size: fileInfo.length,
                    uploadDate: fileInfo.uploadDate,
                    mimeType: fileInfo.metadata?.mimeType,
                  }
                : null,
            },
          };
        } catch (error) {
          return {
            ...share.toObject(),
            file_id: {
              ...share.file_id.toObject(),
              fileInfo: null,
            },
          };
        }
      })
    );

    const total = await FileShare.countDocuments(shareQuery);

    res.json({
      success: true,
      data: {
        shares: sharesWithFileInfo,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: sharesWithFileInfo.length,
          totalRecords: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching shared documents (Lecturer):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching shared documents",
      error: error.message,
    });
  }
};

// Get document shares
export const getDocumentShares = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify document ownership
    const document = await Document.findOne({
      _id: id,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found or you don't have permission to view shares",
      });
    }

    // Get shares made by this lecturer for this document
    const shares = await FileShare.find({
      file_id: id,
      shared_by: req.user._id,
    })
      .populate("shared_with", "name email role department_id")
      .populate({
        path: "shared_with",
        populate: { path: "department_id", select: "name" },
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        document: {
          _id: document._id,
          title: document.title,
          visibility: document.visibility,
          status: document.status,
        },
        shares,
        total: shares.length,
      },
    });
  } catch (error) {
    console.error("Error fetching document shares (Lecturer):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching document shares",
      error: error.message,
    });
  }
};

// Remove document share
export const removeDocumentShare = async (req, res) => {
  try {
    const { id, shareId } = req.params;

    // Verify document ownership
    const document = await Document.findOne({
      _id: id,
      owner_id: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message:
          "Document not found or you don't have permission to manage shares",
      });
    }

    // Find and remove the share (only shares made by this lecturer)
    const share = await FileShare.findOneAndDelete({
      _id: shareId,
      file_id: id,
      shared_by: req.user._id,
    }).populate("shared_with", "name");

    if (!share) {
      return res.status(404).json({
        success: false,
        message: "Share not found or access denied",
      });
    }

    // Send notification to the user
    const notification = new Notification({
      receiver_id: share.shared_with._id,
      sender_id: req.user._id,
      title: "Document Share Removed",
      message: `Lecturer has removed your access to document "${document.title}"`,
      type: "document_share",
      priority: "medium",
    });
    await notification.save();

    res.json({
      success: true,
      message: "Document share removed successfully",
      data: {
        removedUser: share.shared_with.name,
      },
    });
  } catch (error) {
    console.error("Error removing document share (Lecturer):", error);
    res.status(500).json({
      success: false,
      message: "Error removing document share",
      error: error.message,
    });
  }
};

// Get department users for sharing
export const getDepartmentUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;

    const query = {
      department_id: req.user.department_id,
      _id: { $ne: req.user._id }, // Exclude lecturer themselves
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select("name email role level studentId")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ role: 1, name: 1 });

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
    console.error("Error fetching department users (Lecturer):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department users",
      error: error.message,
    });
  }
};
