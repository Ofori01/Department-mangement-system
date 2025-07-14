import mongoose from "mongoose";
import { semesters, levels } from "../../utils/enums.js";

const coursesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Course code is required"],
      uppercase: true,
      unique: true,
      trim: true,
    },
    hod_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "HoD is required"],
    },
    level: {
      type: String,
      required: [true, "Course level is required"],
      enum: levels,
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },
    semester: {
      type: String,
      required: [true, "Semester is required"],
      enum: semesters,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
coursesSchema.index({ code: 1 });
coursesSchema.index({ hod_id: 1 });
coursesSchema.index({ department_id: 1 });
coursesSchema.index({ level: 1 });

const Course = mongoose.model("Course", coursesSchema);

export default Course;
