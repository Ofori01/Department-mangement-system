import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },
    title: {
      type: String,
      required: [true, "Assignment title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Assignment description is required"],
    },
    due_date: {
      type: Date,
      required: [true, "Due date is required"],
    },
    file_url: {
      type: String,
      // Optional - assignments might not always have files
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
assignmentSchema.index({ course_id: 1 });
assignmentSchema.index({ created_by: 1 });
assignmentSchema.index({ due_date: 1 });

const Assignment = mongoose.model("Assignment", assignmentSchema);
export default Assignment;
