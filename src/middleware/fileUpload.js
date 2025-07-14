import multer from "multer";
import pkg from "mongodb";
const { GridFSBucket, ObjectId } = pkg;
import mongoose from "mongoose";
import crypto from "crypto";
import path from "path";

// GridFS bucket for file storage
let bucket;

// Initialize GridFS bucket
export const initGridFS = () => {
  if (mongoose.connection.readyState === 1) {
    bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });
    console.log("GridFS initialized");
  } else {
    mongoose.connection.once("open", () => {
      bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: "uploads",
      });
      console.log("GridFS initialized");
    });
  }
};

// Get GridFS bucket
export const getBucket = () => bucket;

// Multer storage configuration for GridFS
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Allow common file types
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/zip",
    "application/x-rar-compressed",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only images, documents, and archives are allowed."
      ),
      false
    );
  }
};

// Multer configuration
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

// Upload file to GridFS
export const uploadToGridFS = (file, metadata = {}) => {
  return new Promise((resolve, reject) => {
    if (!bucket) {
      return reject(new Error("GridFS not initialized"));
    }

    const filename = crypto.randomUUID() + path.extname(file.originalname);

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: file.originalname,
        uploadDate: new Date(),
        ...metadata,
      },
    });

    uploadStream.on("error", (error) => {
      reject(error);
    });

    uploadStream.on("finish", (file) => {
      resolve({
        fileId: file._id,
        filename: file.filename,
        originalName: file.metadata.originalName,
        size: file.length,
        uploadDate: file.uploadDate,
        metadata: file.metadata,
      });
    });

    uploadStream.end(file.buffer);
  });
};

// Download file from GridFS
export const downloadFromGridFS = (fileId) => {
  return new Promise((resolve, reject) => {
    if (!bucket) {
      return reject(new Error("GridFS not initialized"));
    }

    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    downloadStream.on("error", (error) => {
      reject(error);
    });

    resolve(downloadStream);
  });
};

// Delete file from GridFS
export const deleteFromGridFS = (fileId) => {
  return new Promise((resolve, reject) => {
    if (!bucket) {
      return reject(new Error("GridFS not initialized"));
    }

    bucket.delete(new ObjectId(fileId), (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

// Get file info from GridFS
export const getFileInfo = async (fileId) => {
  if (!bucket) {
    throw new Error("GridFS not initialized");
  }

  const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
  return files.length > 0 ? files[0] : null;
};

// Export uploadFile for use in routes
export const uploadFile = upload;
