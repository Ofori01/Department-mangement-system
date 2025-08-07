import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
    },
    file_url: {
      type: String,
      required: [true, "File URL is required"],
    },
    gridFSId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Make it optional for backward compatibility
    },
    originalName: {
      type: String,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number,
    },
    visibility: {
      type: String,
      enum: ["private", "shared"],
      default: "private",
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
documentSchema.index({ owner_id: 1 });
documentSchema.index({ visibility: 1 });
documentSchema.index({ created_at: 1 });

const Document = mongoose.model("Document", documentSchema);
export default Document;
