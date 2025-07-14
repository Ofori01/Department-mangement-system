import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Database Configuration
  MONGODB_URI:
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/academic_management_system",

  // JWT Configuration
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "your_super_secret_jwt_key_here_change_in_production",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    "your_super_secret_refresh_jwt_key_here_change_in_production",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "24h",
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || "7d",

  // Frontend URL (for CORS)
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // File Upload Configuration
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || "50MB",
  ALLOWED_FILE_TYPES:
    process.env.ALLOWED_FILE_TYPES ||
    "pdf,doc,docx,jpg,jpeg,png,gif,mp4,avi,mov,mp3,wav",

  // Email Configuration (Optional)
  EMAIL_HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: process.env.EMAIL_PASS || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "noreply@academicmanagement.com",

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
};

export default config;
