import mongoose from "mongoose";
import Document from "../models/content/document.js";
import FileShare from "../models/content/fileShare.js";
import { downloadFromGridFS, getFileInfo } from "../middleware/fileUpload.js";

export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the document
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Check if user has access to the file
    let hasAccess = false;
    
    // Check ownership
    if (document.owner_id.toString() === req.user._id.toString()) {
      hasAccess = true;
    }
    
    // Check if file is public
    if (document.visibility === "public") {
      hasAccess = true;
    }
    
    // Check admin/HoD access
    if (req.user.role === "Admin" || req.user.role === "HoD") {
      hasAccess = true;
    }
    
    // Check if file is shared with user
    if (!hasAccess && document.visibility === "private") {
      const sharedFile = await FileShare.findOne({
        file_id: id,
        shared_with: req.user._id,
      });
      if (sharedFile) {
        hasAccess = true;
      }
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get file info from GridFS
    const fileInfo = await getFileInfo(document.file_url);
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: "File not found in storage",
      });
    }

    // Set appropriate headers
    res.set({
      "Content-Type": document.mimeType || fileInfo.contentType,
      "Content-Disposition": `attachment; filename="${
        document.originalName ||
        fileInfo.metadata?.originalName ||
        document.title
      }"`,
      "Content-Length": document.size || fileInfo.length,
    });

    // Get download stream from GridFS
    const downloadStream = await downloadFromGridFS(document.file_url);

    downloadStream.on("error", (error) => {
      console.error("Download stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Error downloading file",
        });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading file",
      error: error.message,
    });
  }
};

export const streamFile = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the document
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Check if user has access to the file
    let hasAccess = false;
    
    // Check ownership
    if (document.owner_id.toString() === req.user._id.toString()) {
      hasAccess = true;
    }
    
    // Check if file is public
    if (document.visibility === "public") {
      hasAccess = true;
    }
    
    // Check admin/HoD access
    if (req.user.role === "Admin" || req.user.role === "HoD") {
      hasAccess = true;
    }
    
    // Check if file is shared with user
    if (!hasAccess && document.visibility === "private") {
      const sharedFile = await FileShare.findOne({
        file_id: id,
        shared_with: req.user._id,
      });
      if (sharedFile) {
        hasAccess = true;
      }
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get file info from GridFS
    const fileInfo = await getFileInfo(document.file_url);
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: "File not found in storage",
      });
    }

    // Set appropriate headers for streaming
    res.set({
      "Content-Type": document.mimeType || fileInfo.contentType,
      "Content-Length": document.size || fileInfo.length,
      "Accept-Ranges": "bytes",
    });

    // Handle range requests for video/audio streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : (document.size || fileInfo.length) - 1;
      const chunksize = end - start + 1;

      res.status(206);
      res.set({
        "Content-Range": `bytes ${start}-${end}/${
          document.size || fileInfo.length
        }`,
        "Content-Length": chunksize,
      });

      // Note: Your existing downloadFromGridFS doesn't support range requests
      // For now, we'll stream the entire file
      const downloadStream = await downloadFromGridFS(document.file_url);
      downloadStream.pipe(res);
    } else {
      // Stream the entire file
      const downloadStream = await downloadFromGridFS(document.file_url);
      downloadStream.pipe(res);
    }
  } catch (error) {
    console.error("Stream error:", error);
    res.status(500).json({
      success: false,
      message: "Error streaming file",
      error: error.message,
    });
  }
};

export const getSharedFiles = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const shares = await FileShare.find({ shared_with: req.user._id })
      .populate("shared_by", "name email role")
      .populate("file_id")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Add file info for each document
    const sharesWithFileInfo = await Promise.all(
      shares.map(async (share) => {
        try {
          if (!share.file_id) {
            return null; // Skip if file was deleted
          }

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
                    contentType: fileInfo.contentType,
                  }
                : null,
            },
          };
        } catch (error) {
          return {
            ...share.toObject(),
            file_id: share.file_id
              ? {
                  ...share.file_id.toObject(),
                  fileInfo: null,
                }
              : null,
          };
        }
      })
    );

    // Filter out null entries (deleted files)
    const validShares = sharesWithFileInfo.filter(share => share && share.file_id);

    const total = await FileShare.countDocuments({ shared_with: req.user._id });

    res.json({
      success: true,
      data: {
        shares: validShares,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: validShares.length,
          totalRecords: total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching shared files",
      error: error.message,
    });
  }
};
