import ErrorHandler from "../middlewares/error.js";
import Order, { ORDER_STATUSES } from "../models/order.js";
import Reservation from "../models/reservation.js";

/* ---------- orders ---------- */
export const listOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, orders: orders.map((o) => ({
      orderId: o.orderId, status: o.status, total: o.total, items: o.items, notes: o.notes, createdAt: o.createdAt,
      customer: { name: o.firstName, email: o.email, phone: o.phone },
    })) });
  } catch (e) { next(e); }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const status = String(req.body.status || "");
    if (!ORDER_STATUSES.includes(status)) throw new ErrorHandler("Invalid order status.", 400);
    const order = await Order.findOneAndUpdate({ orderId: req.params.orderId }, { status }, { new: true });
    if (!order) throw new ErrorHandler("Order not found.", 404);
    res.json({ success: true, message: "Order updated.", status: order.status });
  } catch (e) { next(e); }
};

/* ---------- reservations (admin only: includes customer email and phone) ---------- */
export const listReservations = async (req, res, next) => {
  try {
    const filter = req.query.status === "all" ? {} : { status: { $in: ["held", "confirmed"] } };
    const list = await Reservation.find(filter).sort({ date: -1, startTime: -1 }).limit(300).lean();
    res.json({ success: true, reservations: list.map((r) => ({
      reservationId: r.reservationId, name: r.firstName, email: r.email, phone: r.phone, seatId: r.seatId,
      date: r.date, startTime: r.startTime, endTime: r.endTime, guests: r.guests, specialRequest: r.specialRequest,
      status: r.status, createdAt: r.createdAt, notifications: r.notifications,
    })) });
  } catch (e) { next(e); }
};

export const adminCancelReservation = async (req, res, next) => {
  try {
    const r = await Reservation.findOneAndUpdate({ reservationId: req.params.reservationId, status: { $in: ["held", "confirmed"] } }, { status: "canceled" }, { new: true });
    if (!r) throw new ErrorHandler("Active reservation not found.", 404);
    res.json({ success: true, message: "Reservation cancelled." });
  } catch (e) { next(e); }
};
