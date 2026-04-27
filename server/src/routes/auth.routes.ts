import { Router } from "express";
import multer from "multer";
import { login, register } from "../controllers/auth.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/register", upload.single("avatar"), register);
router.post("/login", login);

export default router;
