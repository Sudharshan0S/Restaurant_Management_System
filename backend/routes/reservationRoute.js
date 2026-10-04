import express from "express";
import controller from "../controller/reservation.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = express.Router();
const customer = [requireAuth, requireRole("customer")];

// public (availability only - no personal data)
router.get("/seats", controller.getSeats);
router.get("/slots", controller.getSlots);
router.get("/rawWeek", controller.getRawWeekReservations);

// logged-in customers (each only sees their own reservations)
router.get("/mine", ...customer, controller.getMyReservations);
router.post("/hold", ...customer, controller.holdSeat);
router.post("/cancel", ...customer, controller.cancelReservation);
router.post("/book", ...customer, controller.bookSlot);
router.post("/bookSeatSlot", ...customer, controller.bookSeatSlot);

export default router;
