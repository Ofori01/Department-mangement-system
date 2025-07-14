import mongoose from "mongoose";
import { departments } from "../../utils/enums.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      enum: ["Student", "Lecturer", "HoD", "Admin"],
      default: "Student",
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },
    // Additional fields for different roles
    studentId: {
      type: String,
      sparse: true, // Only required for students
      unique: true,
    },
    level: {
      type: String,
      enum: ["100", "200", "300", "400"],
      // Only for students
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department_id: 1 });
userSchema.index({ studentId: 1 }, { sparse: true });

const User = mongoose.model("User", userSchema, "users");
export default User;
