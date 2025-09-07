import mongoose from "mongoose";

const projectGradeSchema = new mongoose.Schema(
  {
    project_group_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectGroup",
      required: [true, "Project group is required"],
    },
    stage: {
      type: String,
      enum: ["Proposal", "Progress", "Defense"],
      required: [true, "Grading stage is required"],
    },
    grader_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Grader is required"],
    },
    grader_name: {
      type: String,
      required: [true, "Grader name is required"],
      trim: true,
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: [0, "Score cannot be negative"],
      max: [100, "Score cannot exceed 100"],
    },
    comments: {
      type: String,
      trim: true,
      default: "",
    },
    is_final: {
      type: Boolean,
      default: false,
    },
    grading_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
projectGradeSchema.index({ project_group_id: 1 });
projectGradeSchema.index({ stage: 1 });
projectGradeSchema.index({ grader_id: 1 });
projectGradeSchema.index({ grading_date: -1 });

// Ensure one final grade per stage per group
projectGradeSchema.index(
  { project_group_id: 1, stage: 1, is_final: 1 },
  { unique: true, partialFilterExpression: { is_final: true } }
);

// Virtual to calculate overall project grade
projectGradeSchema.virtual("weightedScore").get(function () {
  const weights = {
    Proposal: 0.2,
    Progress: 0.3,
    Defense: 0.5,
  };
  return this.score * (weights[this.stage] || 1);
});

// Static method to calculate final project grade
projectGradeSchema.statics.calculateFinalProjectGrade = async function (
  projectGroupId
) {
  const grades = await this.find({
    project_group_id: projectGroupId,
    is_final: true,
  });

  const weights = {
    Proposal: 0.2,
    Progress: 0.3,
    Defense: 0.5,
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;

  grades.forEach((grade) => {
    const weight = weights[grade.stage] || 0;
    totalWeightedScore += grade.score * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
};

const ProjectGrade = mongoose.model("ProjectGrade", projectGradeSchema);
export default ProjectGrade;
