import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { existsSync, mkdirSync } from "node:fs";

const imagedDir = path.join(process.cwd(), "src", "assests", "image");
const pdfDir = path.join(process.cwd(), "src", "assests", "pdf");

if (!existsSync(imagedDir)) mkdirSync(imagedDir, { recursive: true });
if (!existsSync(pdfDir)) mkdirSync(pdfDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, pdfDir);
    } else {
      cb(null, imagedDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const allowedMimes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, 
    files: 10, 
  },
});

export function deleteFile(filePath: string) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Failed to delete file:", filePath, err);
    } else {
      console.log("Deleted file:", filePath);
    }
  });
}

export function startCleanupScheduler(
  intervalMs: number = 30 * 60 * 1000, 
  maxAgeMs: number = 60 * 60 * 1000, 
) {
  setInterval(() => {
    fs.readdir(imagedDir, (err, files) => {
      if (err) return console.error("Cleanup error:", err);

      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(imagedDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          const fileAge = now - stats.mtimeMs;
          if (fileAge > maxAgeMs) {
            deleteFile(filePath);
          }
        });
      }
    });
    fs.readdir(pdfDir, (err, files) => {
      if (err) return console.error("Cleanup error:", err);

      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(pdfDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          const fileAge = now - stats.mtimeMs;
          if (fileAge > maxAgeMs) {
            deleteFile(filePath);
          }
        });
      }
    });
  }, intervalMs);
  console.log(
    `[Cleanup] Scheduler started — deleting files older than ${maxAgeMs / 60000} min`,
  );
}

export default upload;
