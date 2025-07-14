import express from "express";
import courseRoutes from "./courseRoutes.js";
import assignmentRoutes from "./assignmentRoutes.js";
import notificationRoutes from "./notificationRoutes.js";

const router = express.Router();

// Student route groups
router.use("/courses", courseRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/notifications", notificationRoutes);

export default router;
