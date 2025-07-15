const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "..", "uploads");
    console.log(`[MULTER] Uploading file to: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // .jpg, .png, etc.
    const filename = Date.now() + "_" + Math.round(Math.random() * 1e9) + ext;
    console.log(`[MULTER] Generated filename: ${filename}`);
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  console.log(`[MULTER] Checking file: ${file.originalname} (${file.mimetype})`);
  if (file.mimetype.startsWith("image/")) {
    console.log(`[MULTER] File accepted`);
    cb(null, true);
  } else {
    console.warn(`[MULTER] File rejected: not an image`);
    cb(new Error("Hanya file gambar yang diperbolehkan"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter,
});

// Optional: listener to capture Multer errors globally (good for debug)
// upload.on('error', (err) => {
//   console.error('[MULTER] Upload error:', err);
// });

module.exports = upload;
