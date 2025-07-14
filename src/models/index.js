// Organized model exports
// Core models - base entities
export * from "./core/index.js";

// Academic models - course management and assignments
export * from "./academic/index.js";

// Content models - document and file management
export * from "./content/index.js";

// Communication models - notifications and messaging
export * from "./communication/index.js";

// Utils
export * from "./utils/dbInitialization.js";

// Legacy exports for backward compatibility (can be removed later)
export { default as Student } from "./student.js";
export { default as Lecturer } from "./lecturer.js";
export { default as Hod } from "./hod.js";

// Legacy exports for backward compatibility (can be removed later)
export { default as Student } from "./student.js";
export { default as Lecturer } from "./lecturer.js";
export { default as Hod } from "./hod.js";
