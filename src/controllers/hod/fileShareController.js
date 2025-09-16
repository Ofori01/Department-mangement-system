import Document from "../../models/content/document.js";
import FileShare from "../../models/content/fileShare.js";
import Folder from "../../models/content/folder.js";
import User from "../../models/core/user.js";
import Notification from "../../models/communication/notification.js";
import { getFileInfo } from "../../middleware/fileUpload.js";

// HoD File Sharing Operations
export const shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body;

    // Verify document exists and is accessible to HoD
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Check if HoD can share this document
    // HoD can share documents from their department or documents shared with them
    const canShare = await checkHoDDocumentAccess(req.user, document);
    if (!canShare) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You can only share documents from your department or documents shared with you.",
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
          title: "Document Shared by HoD",
          message: `HoD has shared document "${document.title}" with you`,
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
    console.error("Error sharing document (HoD):", error);
    res.status(500).json({
      success: false,
      message: "Error sharing document",
      error: error.message,
    });
  }
};

export const getMySharedDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    // Build query for documents shared by this HoD
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
    console.error("Error fetching shared documents (HoD):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching shared documents",
      error: error.message,
    });
  }
};

export const getDocumentShares = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify document accessibility
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const canAccess = await checkHoDDocumentAccess(req.user, document);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get shares made by this HoD for this document
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
    console.error("Error fetching document shares (HoD):", error);
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

    // Verify document accessibility
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Find and remove the share (only shares made by this HoD)
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
      message: `HoD has removed your access to document "${document.title}"`,
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
    console.error("Error removing document share (HoD):", error);
    res.status(500).json({
      success: false,
      message: "Error removing document share",
      error: error.message,
    });
  }
};

export const getAccessibleDocuments = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    // Get documents from HoD's department (owned by department members)
    const departmentUserQuery = { department_id: req.user.department_id };
    const departmentUsers = await User.find(departmentUserQuery).select("_id");
    const departmentUserIds = departmentUsers.map((user) => user._id);

    // Get documents shared with this HoD
    const sharedWithHoD = await FileShare.find({
      shared_with: req.user._id,
    }).select("file_id");
    const sharedDocumentIds = sharedWithHoD.map((share) => share.file_id);

    // Build query for accessible documents
    const query = {
      $or: [
        { owner_id: { $in: departmentUserIds } }, // Department documents
        { _id: { $in: sharedDocumentIds } }, // Shared documents
      ],
    };

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (status) {
      query.status = status;
    }

    const documents = await Document.find(query)
      .populate("owner_id", "name email role department_id")
      .populate({
        path: "owner_id",
        populate: { path: "department_id", select: "name" },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ created_at: -1 });

    // Add file info and sharing status
    const documentsWithDetails = await Promise.all(
      documents.map(async (doc) => {
        try {
          const fileInfo = await getFileInfo(doc.file_url);

          // Check if HoD has shared this document
          const sharedByHoD = await FileShare.countDocuments({
            file_id: doc._id,
            shared_by: req.user._id,
          });

          return {
            ...doc.toObject(),
            fileInfo: fileInfo
              ? {
                  originalName:
                    fileInfo.metadata?.originalName || fileInfo.filename,
                  size: fileInfo.length,
                  uploadDate: fileInfo.uploadDate,
                  mimeType: fileInfo.metadata?.mimeType,
                }
              : null,
            sharingInfo: {
              sharedByMe: sharedByHoD > 0,
              shareCount: sharedByHoD,
            },
          };
        } catch (error) {
          return {
            ...doc.toObject(),
            fileInfo: null,
            sharingInfo: { sharedByMe: false, shareCount: 0 },
          };
        }
      })
    );

    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      data: {
        documents: documentsWithDetails,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: documentsWithDetails.length,
          totalRecords: total,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching accessible documents (HoD):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching accessible documents",
      error: error.message,
    });
  }
};

// Helper function to check if HoD can access/share a document
async function checkHoDDocumentAccess(user, document) {
  // HoD can access documents if:
  // 1. Document is from their department
  // 2. Document has been shared with them

  // Check if document owner is from HoD's department
  const documentOwner = await User.findById(document.owner_id).select(
    "department_id"
  );
  if (
    documentOwner &&
    documentOwner.department_id.toString() === user.department_id.toString()
  ) {
    return true;
  }

  // Check if document has been shared with HoD
  const sharedWithHoD = await FileShare.findOne({
    file_id: document._id,
    shared_with: user._id,
  });

  return !!sharedWithHoD;
}

// Get department users for sharing
export const getDepartmentUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;

    const query = {
      department_id: req.user.department_id,
      _id: { $ne: req.user._id }, // Exclude HoD themselves
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
    console.error("Error fetching department users (HoD):", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department users",
      error: error.message,
    });
  }
};
