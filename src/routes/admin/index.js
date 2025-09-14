import express from "express";
import adminRoutes from "./adminRoutes.js";
import studentPromotionRoutes from "./studentPromotionRoutes.js";

const router = express.Router();

router.use("/", adminRoutes);
router.use("/students", studentPromotionRoutes);

export default router;
