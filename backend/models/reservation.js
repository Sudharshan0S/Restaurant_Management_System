import mongoose from "mongoose";
import validator from "validator";

const notifySchema = new mongoose.Schema({ status: { type: String, default: "skipped" } }, { _id: false });

const reservationSchema = new mongoose.Schema(
  {
    reservationId: { type: String, unique: true, sparse: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    firstName: {
      type: String, required: true,
      minLength: [2, "Name must be at least 2 characters."],
      maxLength: [60, "Name cannot exceed 60 characters."],
    },
    lastName: { type: String, default: "", maxLength: 30 }, // kept for older records
    email: {
      type: String,
      validate: { validator: (v) => (v ? validator.isEmail(v) : true), message: "Provide a valid email." },
    },
    phone: {
      type: String, required: true,
      validate: { validator: (v) => /^\d{10,}$/.test(v), message: "Phone must contain at least 10 digits." },
    },
    guests: { type: Number, min: 1, max: 20, default: 1 },
    specialRequest: { type: String, maxLength: 300, default: "" },
    seatId: { type: String, required: true },
    reservedUntil: { type: Date, required: true },
    date: { type: String }, // "YYYY-MM-DD"
    startTime: { type: String }, // "HH:mm"
    endTime: { type: String }, // "HH:mm"
    status: { type: String, enum: ["held", "confirmed", "canceled"], default: "confirmed" },
    notifications: { email: { type: notifySchema, default: () => ({}) }, sms: { type: notifySchema, default: () => ({}) } },
  },
  { timestamps: true }
);

reservationSchema.index({ seatId: 1, status: 1, reservedUntil: 1 });
reservationSchema.index({ seatId: 1, date: 1, startTime: 1, endTime: 1, status: 1 });

const Reservation = mongoose.models.Reservation || mongoose.model("Reservation", reservationSchema);
export default Reservation;
