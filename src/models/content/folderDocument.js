import mongoose from "mongoose";

const folderDocumentSchema = new mongoose.Schema(
  {
    folder_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      required: [true, "Folder is required"],
    },
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: [true, "Document is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique folder-document relationships
folderDocumentSchema.index({ folder_id: 1, document_id: 1 }, { unique: true });
folderDocumentSchema.index({ folder_id: 1 });
folderDocumentSchema.index({ document_id: 1 });

const FolderDocument = mongoose.model("FolderDocument", folderDocumentSchema);
export default FolderDocument;
