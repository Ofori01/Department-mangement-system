import mongoose from "mongoose";
import pkg from "mongodb";
const { GridFSBucket } = pkg;
import Document from "../models/content/document.js";

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
    if (
      !document.isPublic &&
      document.uploadedBy.toString() !== req.user._id.toString()
    ) {
      // Additional access checks can be implemented here based on roles/permissions
      if (req.user.role !== "admin" && req.user.role !== "hod") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Create GridFS bucket
    const bucket = new GridFSBucket(mongoose.connection.db);

    // Check if file exists in GridFS
    const files = await bucket.find({ _id: document.gridFSId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File not found in storage",
      });
    }

    // Set appropriate headers
    res.set({
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.originalName}"`,
      "Content-Length": document.size,
    });

    // Stream the file
    const downloadStream = bucket.openDownloadStream(document.gridFSId);

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
    if (
      !document.isPublic &&
      document.uploadedBy.toString() !== req.user._id.toString()
    ) {
      if (req.user.role !== "admin" && req.user.role !== "hod") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Create GridFS bucket
    const bucket = new GridFSBucket(mongoose.connection.db);

    // Check if file exists in GridFS
    const files = await bucket.find({ _id: document.gridFSId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        message: "File not found in storage",
      });
    }

    // Set appropriate headers for streaming
    res.set({
      "Content-Type": document.mimeType,
      "Content-Length": document.size,
      "Accept-Ranges": "bytes",
    });

    // Handle range requests for video/audio streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : document.size - 1;
      const chunksize = end - start + 1;

      res.status(206);
      res.set({
        "Content-Range": `bytes ${start}-${end}/${document.size}`,
        "Content-Length": chunksize,
      });

      const downloadStream = bucket.openDownloadStream(document.gridFSId, {
        start,
        end: end + 1,
      });

      downloadStream.pipe(res);
    } else {
      // Stream the entire file
      const downloadStream = bucket.openDownloadStream(document.gridFSId);
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
