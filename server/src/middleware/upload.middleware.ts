import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function imageFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
}

function makeStorage(folder: string) {
  ensureDir(folder);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, folder),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

export const uploadAvatar = multer({
  storage: makeStorage("uploads/avatars"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("avatar");

export const uploadPost = multer({
  storage: makeStorage("uploads/posts"),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("image");
