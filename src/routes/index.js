import express from "express";
import authRoutes from "./authRoutes.js";
import hodRoutes from "./hod/index.js";
import lecturerRoutes from "./lecturer/index.js";
import studentRoutes from "./student/index.js";
import adminRoutes from "./admin/index.js";
import fileRoutes from "./fileRoutes.js";
import projectRoutes from "./projectRoutes.js";

const router = express.Router();

// Authentication routes
router.use("/auth", authRoutes);

// Role-based routes
router.use("/hod", hodRoutes);
router.use("/lecturer", lecturerRoutes);
router.use("/student", studentRoutes);
router.use("/admin", adminRoutes);

// File management routes
router.use("/files", fileRoutes);

// Project management routes
router.use("/projects", projectRoutes);

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Academic Management System API is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
