import express from "express";
import courseRoutes from "./courseRoutes.js";
import courseAssignmentRoutes from "./courseAssignmentRoutes.js";
import courseRegistrationRoutes from "./courseRegistrationRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import documentRoutes from "./documentRoutes.js";
import fileShareRoutes from "./fileShareRoutes.js";

const router = express.Router();

// HoD route groups
router.use("/courses", courseRoutes);
router.use("/course-assignments", courseAssignmentRoutes);
router.use("/course-registrations", courseRegistrationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/content", documentRoutes);
router.use("/files", fileShareRoutes);

export default router;
