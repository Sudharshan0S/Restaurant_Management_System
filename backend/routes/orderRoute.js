import express from "express";
import { placeOrder, getMyOrders, getRecommendations, recommendCombo, recommendTop3 } from "../controller/order.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = express.Router();
router.post("/", requireAuth, requireRole("customer"), placeOrder);
router.get("/mine", requireAuth, requireRole("customer"), getMyOrders);
router.get("/recommendations", getRecommendations);
router.get("/recommend", recommendCombo);
router.get("/recommendTop3", recommendTop3);
export default router;
