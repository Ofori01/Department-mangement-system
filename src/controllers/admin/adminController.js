import Folder from "../../models/content/folder.js";
import Document from "../../models/content/document.js";
import User from "../../models/core/user.js";
import Department from "../../models/core/department.js";
import Notification from "../../models/communication/notification.js";
import mongoose from "mongoose";
import pkg from "mongodb";
const { GridFSBucket } = pkg;

// Folder management
export const createFolder = async (req, res) => {
  try {
    const { name, description, parentFolder, isPublic } = req.body;

    const folder = new Folder({
      name,
      description,
      parentFolder,
      isPublic: isPublic || false,
      createdBy: req.user._id,
    });

    await folder.save();
    await folder.populate("parentFolder", "name");
    await folder.populate("createdBy", "name email");

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
    const { parentFolder, search, isPublic } = req.query;
    const query = {};

    if (parentFolder) query.parentFolder = parentFolder;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (isPublic !== undefined) query.isPublic = isPublic === "true";

    const folders = await Folder.find(query)
      .populate("parentFolder", "name")
      .populate("createdBy", "name email")
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
    const { name, description, isPublic } = req.body;

    const folder = await Folder.findByIdAndUpdate(
      id,
      { name, description, isPublic },
      { new: true, runValidators: true }
    )
      .populate("parentFolder", "name")
      .populate("createdBy", "name email");

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

    // Check if folder has subfolders or documents
    const hasSubfolders = await Folder.countDocuments({ parentFolder: id });
    const hasDocuments = await Document.countDocuments({ folder: id });

    if (hasSubfolders > 0 || hasDocuments > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete folder that contains subfolders or documents",
      });
    }

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

    const { folder, description, isPublic } = req.body;

    const document = new Document({
      title: req.file.originalname,
      description,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      gridFSId: req.file.id,
      folder: folder || null,
      isPublic: isPublic || false,
      uploadedBy: req.user._id,
    });

    await document.save();
    await document.populate("folder", "name");
    await document.populate("uploadedBy", "name email");

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document,
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
    const { folder, search, mimeType, isPublic } = req.query;
    const query = {};

    if (folder) query.folder = folder;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { originalName: { $regex: search, $options: "i" } },
      ];
    }
    if (mimeType) query.mimeType = { $regex: mimeType, $options: "i" };
    if (isPublic !== undefined) query.isPublic = isPublic === "true";

    const documents = await Document.find(query)
      .populate("folder", "name")
      .populate("uploadedBy", "name email")
      .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      data: documents,
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
    const { title, description, folder, isPublic } = req.body;

    const document = await Document.findByIdAndUpdate(
      id,
      { title, description, folder, isPublic },
      { new: true, runValidators: true }
    )
      .populate("folder", "name")
      .populate("uploadedBy", "name email");

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
    const bucket = new GridFSBucket(mongoose.connection.db);
    await bucket.delete(document.gridFSId);

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
    const { search, role, department, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;
    if (department) query.department = department;

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select("-password -refreshTokens")
      .populate("department", "name code")
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
      .populate("department", "name code description");

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
      .populate("department", "name code");

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
    if (criteria.department) query.department = criteria.department;
    if (criteria.yearOfStudy) query.yearOfStudy = criteria.yearOfStudy;

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
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "lecturer" }),
      User.countDocuments({ role: "hod" }),
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
        totalDepartments: stats[4],
        totalDocuments: stats[5],
        totalFolders: stats[6],
        unreadNotifications: stats[7],
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
