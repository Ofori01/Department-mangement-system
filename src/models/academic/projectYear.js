import mongoose from "mongoose";

const projectYearSchema = new mongoose.Schema(
  {
    academic_year: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
      // Format: "2024/2025"
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
projectYearSchema.index({ department_id: 1, academic_year: 1 });
projectYearSchema.index({ created_by: 1 });
projectYearSchema.index({ is_active: 1 });

// Ensure unique academic year per department
projectYearSchema.index(
  { department_id: 1, academic_year: 1 },
  { unique: true }
);

const ProjectYear = mongoose.model("ProjectYear", projectYearSchema);
export default ProjectYear;
