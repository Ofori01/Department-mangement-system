import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      unique: true,
      trim: true,
      uppercase: true,
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

// Index for performance
departmentSchema.index({ name: 1 });
departmentSchema.index({ code: 1 });

const Department = mongoose.model(
  "Department",
  departmentSchema,
  "departments"
);
export default Department;
