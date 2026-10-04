import express from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import * as a from "../controller/admin.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.get("/orders", a.listOrders);
router.patch("/orders/:orderId/status", a.updateOrderStatus);

router.get("/reservations", a.listReservations);
router.post("/reservations/:reservationId/cancel", a.adminCancelReservation);

export default router;
