import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: [true, "Assignment is required"],
    },
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: [true, "Submission document is required"],
    },
    grade: {
      type: Number,
      min: 0,
      max: 100,
    },
    submitted_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique assignment-student submissions
submissionSchema.index({ assignment_id: 1, student_id: 1 }, { unique: true });
submissionSchema.index({ assignment_id: 1 });
submissionSchema.index({ student_id: 1 });
submissionSchema.index({ submitted_at: 1 });

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;
