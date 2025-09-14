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
      required: function () {
        // Department is not required for Admin users
        return this.role !== "Admin";
      },
      validate: {
        validator: function (value) {
          // If role is Admin, department_id should be null/undefined
          if (this.role === "Admin") {
            return !value; // Should be falsy (null, undefined, empty string)
          }
          // For other roles, department_id is required and should have a value
          return value != null;
        },
        message:
          "Admin users should not have a department, other roles require a department",
      },
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
    status: {
      type: String,
      enum: ["Active", "Graduated", "Suspended", "Inactive"],
      default: "Active",
    },
    graduationYear: {
      type: String,
      // Format: YYYY (e.g., "2024")
    },
    graduationDate: {
      type: Date,
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
userSchema.index({ status: 1 });
userSchema.index({ level: 1 });
userSchema.index({ graduationYear: 1 });

const User = mongoose.model("User", userSchema, "users");
export default User;
