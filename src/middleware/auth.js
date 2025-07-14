import jwt from "jsonwebtoken";
import config from "../config/env.js";
import User from "../models/core/user.js";

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id).populate("department_id");

    if (!user) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Access denied. No user found." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

// Check if user belongs to the same department (for HoD operations)
export const checkDepartmentAccess = async (req, res, next) => {
  try {
    if (req.user.role === "Admin") {
      // Admins have access to all departments
      return next();
    }

    // For HoD, ensure they can only manage their own department
    if (req.user.role === "HoD") {
      req.departmentId = req.user.department_id._id;
      return next();
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
