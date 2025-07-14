import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance
departmentSchema.index({ name: 1 });

const Department = mongoose.model("Department", departmentSchema);
export default Department;
