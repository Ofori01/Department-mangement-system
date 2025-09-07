import mongoose from "mongoose";

const projectGroupSchema = new mongoose.Schema(
  {
    project_year_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectYear",
      required: [true, "Project year is required"],
    },
    group_number: {
      type: Number,
      required: [true, "Group number is required"],
    },
    topic: {
      type: String,
      required: [true, "Project topic is required"],
      trim: true,
    },
    members: [
      {
        student_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        student_name: {
          type: String,
          required: true,
          trim: true,
        },
        student_index: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    supervisor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Supervisor is required"],
    },
    current_stage: {
      type: String,
      enum: ["Proposal", "Progress", "Defense"],
      default: "Proposal",
    },
    status: {
      type: String,
      enum: ["Active", "Completed", "Suspended"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
projectGroupSchema.index({ project_year_id: 1 });
projectGroupSchema.index({ supervisor_id: 1 });
projectGroupSchema.index({ current_stage: 1 });
projectGroupSchema.index({ status: 1 });

// Ensure unique group number per project year
projectGroupSchema.index(
  { project_year_id: 1, group_number: 1 },
  { unique: true }
);

// Ensure students can only be in one group per project year
projectGroupSchema.index(
  { project_year_id: 1, "members.student_id": 1 },
  { unique: true }
);

const ProjectGroup = mongoose.model("ProjectGroup", projectGroupSchema);
export default ProjectGroup;
