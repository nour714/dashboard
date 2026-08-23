/**
 * AfricaTravel - File Upload Middleware (Multer)
 *
 * Configures multer with memory storage for passport document uploads.
 * Files are buffered in memory and streamed directly to Supabase Storage
 * without ever touching the local filesystem.
 */

import multer from 'multer';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB hard cap

export const passportDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new Error('INVALID_FILE_TYPE');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err);
    }
    cb(null, true);
  }
});
