import express from "express";
import courseRoutes from "./courseRoutes.js";
import assignmentRoutes from "./assignmentRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import projectRoutes from "./projectRoutes.js";

const router = express.Router();

// Student route groups
router.use("/courses", courseRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/projects", projectRoutes);

export default router;
