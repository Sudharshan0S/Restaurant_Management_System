import ErrorHandler from "../middlewares/error.js";
import Reservation from "../models/reservation.js";
import { notifyReservation } from "../services/notify.js";
import { cleanText, normalizePhone, randomCode } from "../utils/validators.js";

export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 21;
export const MAX_DAYS_AHEAD = 90;
export const SEAT_IDS = ["A", "B", "C", "D"].flatMap((r) => [1, 2, 3, 4, 5].map((n) => `${r}${n}`));
const ACTIVE = ["held", "confirmed"];

const pad = (n) => String(n).padStart(2, "0");
const dateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toDate = (date, time) => new Date(`${date}T${time}:00`); // local time (no "Z")

const buildWeekDays = (startIso, days = 7) => {
  const base = startIso ? new Date(`${startIso}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) throw new ErrorHandler("Invalid date.", 400);
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: Math.min(Number(days) || 7, 14) }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return { date: dateStr(d), dayName: d.toLocaleDateString("en-IN", { weekday: "long" }) };
  });
};

export const buildHourSlots = (start = OPEN_HOUR, end = CLOSE_HOUR) => {
  const slots = [];
  for (let h = start; h < end; h++) slots.push({ startTime: `${pad(h)}:00`, endTime: `${pad(h + 1)}:00` });
  return slots;
};
const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;

// ---------- validation ----------
export function validateDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new ErrorHandler("Please choose a valid date.", 400);
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) throw new ErrorHandler("Please choose a valid date.", 400);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (dt < today) throw new ErrorHandler("You cannot reserve a table for a past date.", 400);
  if (dt - today > MAX_DAYS_AHEAD * 86400000) throw new ErrorHandler(`Reservations open up to ${MAX_DAYS_AHEAD} days in advance.`, 400);
}

export function validateSlot(date, startTime, endTime) {
  const ok = buildHourSlots().some((s) => s.startTime === startTime && s.endTime === endTime);
  if (!ok) throw new ErrorHandler(`Please choose a valid time slot between ${OPEN_HOUR}:00 and ${CLOSE_HOUR}:00.`, 400);
  if (date === dateStr() && endTime <= hhmm()) throw new ErrorHandler("That time slot has already passed.", 400);
}

function validateGuestInfo(body) {
  const name = cleanText(body.name, 60);
  const phone = normalizePhone(body.phone);
  const guests = Number(body.guests);
  if (name.length < 2) throw new ErrorHandler("Please enter your name.", 400);
  if (!phone) throw new ErrorHandler("Please enter a valid 10-digit Indian mobile number.", 400);
  if (!Number.isInteger(guests) || guests < 1 || guests > 20) throw new ErrorHandler("Guests must be a whole number between 1 and 20.", 400);
  const seatId = String(body.seatId || "");
  if (!SEAT_IDS.includes(seatId)) throw new ErrorHandler("Please select a valid table.", 400);
  return { name, phone, guests, seatId, specialRequest: cleanText(body.specialRequest, 300) };
}

const publicReservation = (r) => ({
  reservationId: r.reservationId, seatId: r.seatId, date: r.date, startTime: r.startTime, endTime: r.endTime,
  guests: r.guests, specialRequest: r.specialRequest, status: r.status, name: r.firstName, createdAt: r.createdAt,
});

async function conflictExists({ seatId, date, startTime, endTime }) {
  const clauses = [{ date, startTime: { $lt: endTime }, endTime: { $gt: startTime } }];
  if (date === dateStr()) clauses.push({ date: { $exists: false }, reservedUntil: { $gt: new Date() } }); // legacy holds
  return Reservation.exists({ seatId, status: { $in: ACTIVE }, $or: clauses });
}

async function createReservation(req, res, next, { date, startTime, endTime }) {
  try {
    const info = validateGuestInfo(req.body);
    if (await conflictExists({ seatId: info.seatId, date, startTime, endTime })) {
      throw new ErrorHandler("That table is already reserved for this time. Please pick another table or time.", 409);
    }
    let doc;
    for (let i = 0; i < 5 && !doc; i++) {
      try {
        doc = await Reservation.create({
          reservationId: `RES-${randomCode(6)}`, userId: req.user._id,
          firstName: info.name, email: req.user.email, phone: info.phone,
          guests: info.guests, specialRequest: info.specialRequest, seatId: info.seatId,
          date, startTime, endTime, reservedUntil: toDate(date, endTime), status: "confirmed",
        });
      } catch (e) { if (!(e.code === 11000 && e.keyPattern?.reservationId)) throw e; }
    }
    if (!doc) throw new ErrorHandler("Unable to complete the request. Please try again.", 500);
    const notifications = await notifyReservation(doc, req.user);
    doc.notifications = notifications;
    await doc.save();
    res.status(201).json({ success: true, message: "Reservation confirmed.", reservation: publicReservation(doc), notifications });
  } catch (e) { next(e); }
}

// Seats that are occupied right now
export const getSeats = async (req, res, next) => {
  try {
    const now = new Date();
    const busy = await Reservation.find({
      status: { $in: ACTIVE },
      $or: [
        { date: dateStr(now), startTime: { $lte: hhmm(now) }, endTime: { $gt: hhmm(now) } },
        { date: { $exists: false }, reservedUntil: { $gt: now } },
      ],
    }).select("seatId").lean();
    const taken = new Set(busy.map((r) => r.seatId));
    res.json({ success: true, seats: SEAT_IDS.map((seatId) => ({ seatId, reserved: taken.has(seatId) })) });
  } catch (e) { next(e); }
};

// "Reserve now" - holds a table for one hour from this moment (within opening hours)
export const holdSeat = (req, res, next) => {
  const now = new Date();
  const start = hhmm(now);
  if (start < `${pad(OPEN_HOUR)}:00` || start >= `${pad(CLOSE_HOUR)}:00`) {
    return next(new ErrorHandler(`We take bookings between ${OPEN_HOUR}:00 and ${CLOSE_HOUR}:00. Please book a time slot instead.`, 400));
  }
  const plus = hhmm(new Date(now.getTime() + 3600000));
  const end = plus <= start || plus > `${pad(CLOSE_HOUR)}:00` ? `${pad(CLOSE_HOUR)}:00` : plus;
  return createReservation(req, res, next, { date: dateStr(now), startTime: start, endTime: end });
};

export const bookSeatSlot = (req, res, next) => {
  try {
    const { date, startTime, endTime } = req.body;
    validateDate(date);
    validateSlot(date, startTime, endTime);
    return createReservation(req, res, next, { date, startTime, endTime });
  } catch (e) { return next(e); }
};
export const bookSlot = bookSeatSlot;

export const cancelReservation = async (req, res, next) => {
  try {
    const filter = { userId: req.user._id, status: { $in: ACTIVE }, reservedUntil: { $gt: new Date() } };
    if (req.body.reservationId) filter.reservationId = String(req.body.reservationId);
    else if (req.body.seatId) filter.seatId = String(req.body.seatId);
    else throw new ErrorHandler("Please tell us which reservation to cancel.", 400);
    const doc = await Reservation.findOne(filter).sort({ createdAt: -1 });
    if (!doc) throw new ErrorHandler("No active reservation found.", 404);
    doc.status = "canceled";
    await doc.save();
    res.json({ success: true, message: "Reservation cancelled.", reservation: publicReservation(doc) });
  } catch (e) { next(e); }
};

export const getMyReservations = async (req, res, next) => {
  try {
    const list = await Reservation.find({ userId: req.user._id, status: { $in: ACTIVE }, reservedUntil: { $gt: new Date() } })
      .sort({ date: 1, startTime: 1 }).limit(50);
    res.json({ success: true, reservations: list.map(publicReservation) });
  } catch (e) { next(e); }
};

export const getSlots = async (req, res, next) => {
  try {
    const week = buildWeekDays(req.query.start, req.query.days);
    const slots = buildHourSlots();
    const existing = await Reservation.find({ date: { $in: week.map((d) => d.date) }, status: { $in: ACTIVE } }).lean();
    const result = week.map((d) => {
      const day = existing.filter((r) => r.date === d.date);
      return {
        date: d.date, dayName: d.dayName,
        slots: slots.map((s) => ({ ...s, reserved: day.some((r) => overlaps(s.startTime, s.endTime, r.startTime, r.endTime)) })),
      };
    });
    res.json({ success: true, week: result });
  } catch (e) { next(e); }
};

// Raw reservations for the seat grid (no personal data)
export const getRawWeekReservations = async (req, res, next) => {
  try {
    const week = buildWeekDays(req.query.start, req.query.days);
    const reservations = await Reservation.find({ date: { $in: week.map((d) => d.date) }, status: { $in: ACTIVE } })
      .select("seatId date startTime endTime status").lean();
    res.json({ success: true, reservations });
  } catch (e) { next(e); }
};

export default { getSeats, holdSeat, cancelReservation, getMyReservations, getSlots, bookSlot, bookSeatSlot, getRawWeekReservations };
