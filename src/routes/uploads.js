import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = Router();
const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const maxMb = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 100));
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 12);
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime|mpeg))$/i;
    if (!allowed.test(file.mimetype)) return cb(new Error("Only supported image and video files are allowed."));
    cb(null, true);
  }
});

router.post("/", upload.array("files", 10), (req, res) => {
  const files = (req.files || []).map(file => ({
    name: file.originalname,
    type: file.mimetype,
    size: file.size,
    url: `/uploads/${file.filename}`
  }));
  res.status(201).json({ files });
});

export default router;
