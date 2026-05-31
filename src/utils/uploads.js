const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const allowedTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeExtension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${safeExtension}`);
  },
});

const evidenceUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported file type.'));
    }

    cb(null, true);
  },
});

module.exports = {
  uploadDir,
  evidenceUpload,
};
