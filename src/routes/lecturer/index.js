import express from "express";
import assignmentRoutes from "./assignmentRoutes.js";
import submissionRoutes from "./submissionRoutes.js";
import documentRoutes from "./documentRoutes.js";
import notificationRoutes from "./notificationRoutes.js";

const router = express.Router();

// Lecturer route groups
router.use("/assignments", assignmentRoutes);
router.use("/submissions", submissionRoutes);
router.use("/documents", documentRoutes);
router.use("/notifications", notificationRoutes);

export default router;
