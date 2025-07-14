import mongoose from "mongoose";

const fileShareSchema = new mongoose.Schema(
  {
    file_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: [true, "File is required"],
    },
    shared_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sharer is required"],
    },
    shared_with: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
    },
    shared_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique file-sharer-recipient combinations
fileShareSchema.index(
  { file_id: 1, shared_by: 1, shared_with: 1 },
  { unique: true }
);
fileShareSchema.index({ file_id: 1 });
fileShareSchema.index({ shared_by: 1 });
fileShareSchema.index({ shared_with: 1 });
fileShareSchema.index({ shared_at: 1 });

const FileShare = mongoose.model("FileShare", fileShareSchema);
export default FileShare;
