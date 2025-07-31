import mongoose from "mongoose";
import { departments, levels, semesters } from "../../utils/enums.js";

const courseAssignmentSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },
    lecturer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Lecturer is required"],
    },
    semester: {
      type: String,
      required : [true, "Assignment semester is required"],
      enum: semesters
    },
    level: {
      type: String,
      required: true,
      enum: levels
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      enum: departments
    }
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique course-lecturer assignments
courseAssignmentSchema.index(
  { course_id: 1, lecturer_id: 1 },
  { unique: true }
);
courseAssignmentSchema.index({ course_id: 1 });
courseAssignmentSchema.index({ lecturer_id: 1 });

const CourseAssignment = mongoose.model(
  "CourseAssignment",
  courseAssignmentSchema
);
export default CourseAssignment;
