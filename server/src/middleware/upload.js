/**
 * AfricaTravel - File Upload Middleware (Multer with Early Magic-Byte Verification)
 *
 * Implements stream-level early magic-byte verification (CWE-434, CWE-400):
 * - Validates file signature (magic bytes) on the initial incoming stream chunks
 *   before buffering the full payload into memory.
 * - Enforces strict 5MB size limit during streaming.
 * - Implements a concurrency budget / active upload semaphore to prevent DoS resource exhaustion.
 */

import multer from 'multer';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB hard cap
const MAX_CONCURRENT_UPLOADS = 10;

let activeUploads = 0;

/**
 * Concurrency budget middleware to limit active simultaneous upload requests
 */
export function uploadConcurrencyBudget(req, res, next) {
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many concurrent uploads in progress. Please try again shortly.',
        code: 'UPLOAD_CONCURRENCY_LIMIT_EXCEEDED'
      }
    });
  }

  activeUploads++;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      activeUploads = Math.max(0, activeUploads - 1);
    }
  };

  res.on('finish', release);
  res.on('close', release);
  next();
}

/**
 * Custom Multer Storage engine that performs early magic byte validation
 * on the first incoming chunks of the file stream before accumulating into buffer.
 */
class EarlyMagicByteStorage {
  constructor(options = {}) {
    this.maxSize = options.maxSize || MAX_FILE_SIZE;
  }

  _handleFile(req, file, cb) {
    const chunks = [];
    let bytesRead = 0;
    let magicChecked = false;
    const stream = file.stream;

    const onData = (chunk) => {
      bytesRead += chunk.length;

      if (bytesRead > this.maxSize) {
        stream.removeListener('data', onData);
        stream.resume();
        const err = new Error('LIMIT_FILE_SIZE');
        err.code = 'LIMIT_FILE_SIZE';
        return cb(err);
      }

      chunks.push(chunk);

      // Perform early magic byte check as soon as at least 8 bytes are received
      if (!magicChecked && bytesRead >= 8) {
        magicChecked = true;
        const head = Buffer.concat(chunks, 8);
        const isPdf = head.subarray(0, 4).toString('binary') === '%PDF';
        const isJpeg = head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
        const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47 &&
                      head[4] === 0x0D && head[5] === 0x0A && head[6] === 0x1A && head[7] === 0x0A;

        if (!isPdf && !isJpeg && !isPng) {
          stream.removeListener('data', onData);
          stream.resume();
          const err = new Error('INVALID_FILE_TYPE');
          err.code = 'INVALID_FILE_TYPE';
          return cb(err);
        }
      }
    };

    stream.on('data', onData);

    stream.on('end', () => {
      const fullBuffer = Buffer.concat(chunks);
      if (!magicChecked) {
        const isPdf = fullBuffer.length >= 4 && fullBuffer.subarray(0, 4).toString('binary') === '%PDF';
        const isJpeg = fullBuffer.length >= 3 && fullBuffer[0] === 0xFF && fullBuffer[1] === 0xD8 && fullBuffer[2] === 0xFF;
        const isPng = fullBuffer.length >= 8 && fullBuffer[0] === 0x89 && fullBuffer[1] === 0x50 && fullBuffer[2] === 0x4E && fullBuffer[3] === 0x47;
        if (!isPdf && !isJpeg && !isPng) {
          const err = new Error('INVALID_FILE_TYPE');
          err.code = 'INVALID_FILE_TYPE';
          return cb(err);
        }
      }

      cb(null, {
        buffer: fullBuffer,
        size: fullBuffer.length
      });
    });

    stream.on('error', (err) => cb(err));
  }

  _removeFile(req, file, cb) {
    delete file.buffer;
    cb(null);
  }
}

export const passportDocUpload = multer({
  storage: new EarlyMagicByteStorage({ maxSize: MAX_FILE_SIZE }),
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
