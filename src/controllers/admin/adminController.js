import Folder from "../../models/content/folder.js";
import Document from "../../models/content/document.js";
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
    const { status, search } = req.query;
    const query = { owner_id: req.user._id }; // Only show folders created by this admin

    if (status) query.status = status;
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const folders = await Folder.find(query)
      .populate("owner_id", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: folders,
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

    const folder = await Folder.findByIdAndDelete(id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: "Folder not found",
      });
    }

    res.json({
      success: true,
      message: "Folder deleted successfully",
    });
  } catch (error) {
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
    await document.populate("owner_id", "name email");

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: {
        ...document.toObject(),
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
    const query = {};

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
    const { title, description, visibility } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (visibility) updateData.visibility = visibility;

    const document = await Document.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("owner_id", "name email");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.json({
      success: true,
      message: "Document updated successfully",
      data: document,
    });
  } catch (error) {
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

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Delete file from GridFS
    try {
      await deleteFromGridFS(document.file_url);
    } catch (error) {
      console.warn("Failed to delete file from GridFS:", error.message);
    }

    // Delete document record
    await Document.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting document",
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
        recipient: recipientId,
        sender: req.user._id,
        title,
        message,
        type: type || "general",
        priority: priority || "medium",
      });

      await notification.save();
      await notification.populate("sender", "name email");
      await notification.populate("recipient", "name email");

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
        recipient: recipient._id,
        sender: req.user._id,
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
      Folder.countDocuments(),
      Notification.countDocuments({ isRead: false }),
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
        totalFolders: stats[7],
        unreadNotifications: stats[8],
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
