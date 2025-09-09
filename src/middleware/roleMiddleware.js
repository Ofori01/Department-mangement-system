import { authorize } from "./auth.js";

// Role validation middleware - wrapper around the existing authorize middleware
export const validateRole = (roles) => {
  return authorize(...roles);
};

// Export the existing auth functions for backwards compatibility
export { authenticate as authenticateToken, authorize, checkDepartmentAccess } from "./auth.js";
