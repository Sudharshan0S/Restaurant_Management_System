import mongoose from "mongoose";

export const ORDER_STATUSES = ["PLACED", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

const orderItemSchema = new mongoose.Schema(
  {
    menuId: { type: String, required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // unit price (dish + combo extra)
    comboId: { type: String, default: null },
    comboName: { type: String, default: null },
    comboExtra: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const notifySchema = new mongoose.Schema({ status: { type: String, default: "skipped" } }, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    requestId: { type: String }, // client-generated; makes double submits idempotent
    firstName: { type: String, required: true, minLength: 2 },
    phone: { type: String, required: true },
    email: { type: String },
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    total: { type: Number, required: true, min: 0 },
    notes: { type: String, maxLength: 300 },
    status: { type: String, enum: ORDER_STATUSES, default: "PLACED" },
    notifications: { email: { type: notifySchema, default: () => ({}) }, sms: { type: notifySchema, default: () => ({}) } },
  },
  { timestamps: true }
);

orderSchema.index({ "items.menuId": 1, "items.comboId": 1 });
orderSchema.index({ userId: 1, requestId: 1 }, { unique: true, partialFilterExpression: { requestId: { $type: "string" } } });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;
