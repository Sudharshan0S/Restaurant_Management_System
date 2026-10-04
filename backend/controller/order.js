import ErrorHandler from "../middlewares/error.js";
import Order from "../models/order.js";
import { DISHES, COMBOS } from "../data/menu.js";
import { priceOrder } from "../services/pricing.js";
import { buildStats, recommendFor } from "../services/recommendations.js";
import { notifyOrder } from "../services/notify.js";
import { cleanText, randomCode } from "../utils/validators.js";

const publicOrder = (o) => ({
  orderId: o.orderId, status: o.status, items: o.items, total: o.total, notes: o.notes,
  createdAt: o.createdAt, notifications: o.notifications,
});

// POST /api/orders  (login required). The client sends only {menuId, qty, comboId}.
// Prices and the total are always recomputed here from server-side menu data.
export const placeOrder = async (req, res, next) => {
  try {
    const user = req.user;
    const requestId = typeof req.body.requestId === "string" ? req.body.requestId.slice(0, 64) : undefined;

    if (requestId) {
      const existing = await Order.findOne({ userId: user._id, requestId });
      if (existing) return res.status(200).json({ success: true, duplicate: true, order: publicOrder(existing), notifications: existing.notifications });
    }

    const raw = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
    const { items, total } = priceOrder(raw, DISHES, COMBOS);
    const notes = cleanText(req.body.notes, 300);

    let order;
    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      try {
        order = await Order.create({
          orderId: `ORD${randomCode(6)}`, userId: user._id, requestId,
          firstName: user.name, phone: user.phone, email: user.email,
          items, total, notes, status: "PLACED",
        });
      } catch (e) {
        const dupOrderId = e.code === 11000 && e.keyPattern?.orderId;
        if (!dupOrderId) throw e;
      }
    }
    if (!order) throw new ErrorHandler("Unable to complete the request. Please try again.", 500);

    const notifications = await notifyOrder(order, user);
    order.notifications = notifications;
    await order.save();

    res.status(201).json({ success: true, message: "Order placed.", order: publicOrder(order), notifications });
  } catch (e) { next(e); }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, orders: orders.map(publicOrder) });
  } catch (e) { next(e); }
};

// GET /api/orders/recommendations[?dishId=] - frequency-based from stored orders (see services/recommendations.js).
// The website no longer calls this (its "pairs well with" hints come from the local menu data); kept for future use.
export const getRecommendations = async (req, res, next) => {
  try {
    const orders = await Order.find({ status: { $ne: "CANCELLED" } }, "items.menuId items.comboId")
      .sort({ createdAt: -1 }).limit(5000).lean();
    const stats = buildStats(orders);
    const ids = req.query.dishId ? [String(req.query.dishId)] : DISHES.map((d) => d.id);
    const byDish = {};
    for (const id of ids) byDish[id] = recommendFor(id, stats, { dishes: DISHES, combos: COMBOS });
    res.json({ success: true, totalOrders: orders.length, byDish });
  } catch (e) { next(e); }
};

// ---- legacy endpoints (kept for backward compatibility) ----
const topCombos = (dishId, limit) => Order.aggregate([
  { $unwind: "$items" },
  { $match: { "items.menuId": String(dishId), "items.comboId": { $ne: null } } },
  { $group: { _id: { comboId: "$items.comboId", comboName: "$items.comboName" }, count: { $sum: 1 } } },
  { $sort: { count: -1 } }, { $limit: limit },
]);

export const recommendCombo = async (req, res, next) => {
  const { dishId } = req.query;
  if (!dishId) return res.status(400).json({ success: false, message: "dishId is required", suggestion: null });
  try {
    const [top] = await topCombos(dishId, 1);
    const suggestion = top ? { dishId: String(dishId), dishName: null, comboId: top._id.comboId, comboName: top._id.comboName, count: top.count, avgExtra: 0 } : null;
    res.json({ success: true, suggestion });
  } catch (e) { next(e); }
};

export const recommendTop3 = async (req, res, next) => {
  const { dishId } = req.query;
  if (!dishId) return res.status(400).json({ success: false, message: "dishId is required", suggestions: [] });
  try {
    const agg = await topCombos(dishId, 3);
    res.json({ success: true, suggestions: agg.map((r) => ({ comboId: r._id.comboId, comboName: r._id.comboName, count: r.count })) });
  } catch (e) { next(e); }
};
