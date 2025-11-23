// src/middleware/uploadMiddleware.js
// -----------------------------------------------------------------------------
// MULTER MEMORY STORAGE
// Handles image uploads by storing file buffers in memory.
// The actual upload to Supabase Storage happens inside the controllers.
// -----------------------------------------------------------------------------

import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),

  // 5MB upload limit (recommended for images)
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});
