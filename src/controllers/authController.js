import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import User from "../models/core/user.js";
import Department from "../models/core/department.js";

// Initialize default departments
const initializeDepartments = async () => {
  try {
    const existingDepartments = await Department.countDocuments();

    if (existingDepartments === 0) {
      const defaultDepartments = [
        {
          name: "COMPUTER ENGINEERING DEPARTMENT",
          code: "CPEN",
          description: "Department of Computer Engineering",
        },
        {
          name: "FOOD PROCESSING ENGINEERING DEPARTMENT",
          code: "FPEN",
          description: "Department of Food Processing Engineering",
        },
        {
          name: "MATERIALS ENGINEERING DEPARTMENT",
          code: "MTEN",
          description: "Department of Materials Engineering",
        },
        {
          name: "BIOMEDICAL ENGINEERING DEPARTMENT",
          code: "BMEN",
          description: "Department of Biomedical Engineering",
        },
        {
          name: "AGRICULTURAL ENGINEERING DEPARTMENT",
          code: "AREN",
          description: "Department of Agricultural Engineering",
        },
      ];

      await Department.insertMany(defaultDepartments);
      console.log("✅ Default departments initialized");
    }
  } catch (error) {
    console.error("❌ Error initializing departments:", error.message);
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRE,
  });
};

// Register user
export const register = async (req, res) => {
  try {
    const { name, email, password, role, department_id, studentId, level } =
      req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Validate department (not required for Admin users)
    if (role !== "Admin") {
      if (!department_id) {
        return res
          .status(400)
          .json({ message: "Department is required for non-admin users" });
      }

      const department = await Department.findById(department_id);
      if (!department) {
        return res.status(400).json({ message: "Invalid department" });
      }
    } else {
      // For Admin users, ensure department_id is not provided
      if (department_id) {
        return res
          .status(400)
          .json({ message: "Admin users should not have a department" });
      }
    }

    // Check if studentId is unique (for students only)
    if (role === "Student") {
      if (!studentId) {
        return res
          .status(400)
          .json({ message: "Student ID is required for students" });
      }

      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({ message: "Student ID already exists" });
      }

      if (!level) {
        return res
          .status(400)
          .json({ message: "Level is required for students" });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      ...(role !== "Admin" && { department_id }), // Only set department_id for non-admin users
      ...(role === "Student" && { studentId, level }),
    });

    await user.save();

    // Populate the user with department info (only if not Admin)
    let populatedUser = user;
    if (user.role !== "Admin") {
      populatedUser = await User.findById(user._id).populate(
        "department_id",
        "name code"
      );
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: populatedUser._id,
        name: populatedUser.name,
        email: populatedUser.email,
        role: populatedUser.role,
        ...(populatedUser.role !== "Admin" && {
          department: populatedUser.department_id,
        }),
        ...(populatedUser.studentId && { studentId: populatedUser.studentId }),
        ...(populatedUser.level && { level: populatedUser.level }),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).populate(
      "department_id",
      "name code"
    );
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department_id,
        ...(user.studentId && { studentId: user.studentId }),
        ...(user.level && { level: user.level }),
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("department_id", "name code")
      .select("-password");

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Email already taken" });
      }
    }

    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();
    await user.populate("department_id", "name code");

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department_id,
        ...(user.studentId && { studentId: user.studentId }),
        ...(user.level && { level: user.level }),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all departments
export const getDepartments = async (req, res) => {
  try {
    // Initialize departments if they don't exist
    await initializeDepartments();

    const departments = await Department.find().sort({ name: 1 });
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
