import mongoose from "mongoose";
import Document from "../models/content/document.js";
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
    // if (
    //   document.visibility === "private" &&
    //   document.owner_id.toString() !== req.user._id.toString()
    // ) {
    //   // Additional access checks can be implemented here based on roles/permissions
    //   if (req.user.role !== "Admin" && req.user.role !== "HoD") {
    //     return res.status(403).json({
    //       success: false,
    //       message: "Access denied",
    //     });
    //   }
    // }

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
    if (
      document.visibility === "private" &&
      document.owner_id.toString() !== req.user._id.toString()
    ) {
      if (req.user.role !== "Admin" && req.user.role !== "HoD") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
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
