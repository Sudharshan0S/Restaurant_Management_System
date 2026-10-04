import express from "express";
import rateLimit from "express-rate-limit";
import { register, login, adminLogin, logout, me } from "../controller/auth.js";
import { requireAuth } from "../middlewares/auth.js";

const limiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in a few minutes." },
});
const router = express.Router();
router.post("/register", limiter(30), register);
router.post("/login", limiter(30), login);
router.post("/admin/login", limiter(15), adminLogin);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
export default router;
