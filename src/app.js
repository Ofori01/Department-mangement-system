import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import dbConfig from "./config/db.js";
import config from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initGridFS } from "./middleware/fileUpload.js";

const app = express();
const PORT = config.PORT;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Logging
app.use(morgan("combined"));

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api", routes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Academic Management System API is running",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use(errorHandler);

// Start the server
app.listen(PORT, async () => {
  try {
    // Database connection
    await dbConfig();

    // Initialize GridFS
    initGridFS();

    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 Academic Management System API is ready`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  mongoose.connection.close(() => {
    console.log("Database connection closed.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  mongoose.connection.close(() => {
    console.log("Database connection closed.");
    process.exit(0);
  });
});

export default app;
