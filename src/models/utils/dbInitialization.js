import mongoose from "mongoose";
import Department from "../core/department.js";
import { departments } from "../../utils/enums.js";

export const initializeDepartments = async () => {
  try {
    // Check if departments already exist
    const existingDepartments = await Department.find();

    if (existingDepartments.length === 0) {
      // Create departments from enum
      const departmentDocs = departments.map((name) => ({ name }));
      await Department.insertMany(departmentDocs);
      console.log("Departments initialized successfully");
    } else {
      console.log("Departments already exist");
    }
  } catch (error) {
    console.error("Error initializing departments:", error);
  }
};

// Helper function to get department ID by name
export const getDepartmentIdByName = async (departmentName) => {
  try {
    const department = await Department.findOne({ name: departmentName });
    return department ? department._id : null;
  } catch (error) {
    console.error("Error finding department:", error);
    return null;
  }
};
