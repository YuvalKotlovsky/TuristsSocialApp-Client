import { Router } from "express";
import multer from "multer";
import { register } from "../controllers/auth.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/register", upload.single("avatar"), register);

export default router;
