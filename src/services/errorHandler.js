// src/services/errorHandler.js
// -----------------------------------------------------------------------------
// GLOBAL ASYNC ERROR WRAPPER
// Wraps controller functions and ensures any unhandled error results in a
// unified 500 JSON response instead of crashing the server.
// -----------------------------------------------------------------------------

/**
 * Wraps an Express controller in a try/catch block.
 * Any thrown error is logged and transformed into a 500 response.
 */
export const tryCatch = (controller) => {
  return async (req, res, next) => {
    try {
      await controller(req, res, next);
    } catch (err) {
      console.error("Controller Error:", err.message);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };
};
