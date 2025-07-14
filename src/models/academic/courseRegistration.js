import mongoose from "mongoose";

const courseRegistrationSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique student-course registrations
courseRegistrationSchema.index(
  { student_id: 1, course_id: 1 },
  { unique: true }
);
courseRegistrationSchema.index({ student_id: 1 });
courseRegistrationSchema.index({ course_id: 1 });

const CourseRegistration = mongoose.model(
  "CourseRegistration",
  courseRegistrationSchema
);
export default CourseRegistration;
