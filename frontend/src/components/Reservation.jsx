import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api, { errorMessage } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { normalizePhone, notificationNotices, todayISO } from "../utils";
import SuccessModal from "./SuccessModal";

const OPEN = 9, CLOSE = 21, MAX_DAYS = 90;
const ROWS = ["A", "B", "C", "D"];
const COLS = [1, 2, 3, 4, 5];
const SEATS = ROWS.flatMap((r) => COLS.map((c) => `${r}${c}`));
const pad = (n) => String(n).padStart(2, "0");
const SLOTS = Array.from({ length: CLOSE - OPEN }, (_, i) => ({ startTime: `${pad(OPEN + i)}:00`, endTime: `${pad(OPEN + i + 1)}:00` }));
const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

const Reservation = () => {
  const { user, isAdmin } = useAuth();
  const [mode, setMode] = useState("slot"); // "slot" | "now"
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState(null);
  const [seat, setSeat] = useState("");
  const [form, setForm] = useState({ name: null, phone: null, guests: 2, specialRequest: "" }); // null = not edited, falls back to the account details
  const nameVal = form.name ?? user?.name ?? "";
  const phoneVal = form.phone ?? user?.phone ?? "";
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const [errors, setErrors] = useState({});
  const [taken, setTaken] = useState([]); // reservations (seatId,date,startTime,endTime) for the chosen date
  const [busySeats, setBusySeats] = useState(new Set()); // occupied right now
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  const [availError, setAvailError] = useState("");
  const [done, setDone] = useState(null);
  const lock = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (mode === "now") {
          const { data } = await api.get("/api/reservations/seats");
          if (alive) { setBusySeats(new Set(data.seats.filter((x) => x.reserved).map((x) => x.seatId))); setAvailError(""); }
        } else {
          const { data } = await api.get("/api/reservations/rawWeek", { params: { start: date, days: 1 } });
          if (alive) { setTaken(data.reservations); setAvailError(""); }
        }
      } catch (e) { if (alive) setAvailError(errorMessage(e, "Unable to load availability.")); }
    })();
    return () => { alive = false; };
  }, [mode, date, tick]);

  useEffect(() => {
    if (!user || isAdmin) return undefined;
    let alive = true;
    api.get("/api/reservations/mine").then(({ data }) => { if (alive) setMine(data.reservations); }).catch(() => {});
    return () => { alive = false; };
  }, [user, isAdmin, tick]);

  const overlapping = (s) => taken.filter((r) => r.startTime < s.endTime && s.startTime < r.endTime);
  const slotPast = (s) => date === todayISO() && s.endTime <= nowHHMM();
  const seatBooked = (id) => (mode === "now" ? busySeats.has(id) : !!slot && overlapping(slot).some((r) => r.seatId === id));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (nameVal.trim().length < 2) e.name = "Enter your name.";
    if (!normalizePhone(phoneVal)) e.phone = "Enter a valid 10-digit mobile number.";
    const g = Number(form.guests);
    if (!Number.isInteger(g) || g < 1 || g > 20) e.guests = "Guests must be between 1 and 20.";
    if (mode === "slot") {
      if (!date || date < todayISO()) e.date = "Choose today or a future date.";
      if (!slot) e.slot = "Choose a time slot.";
    } else {
      const n = nowHHMM();
      if (n < `${pad(OPEN)}:00` || n >= `${pad(CLOSE)}:00`) e.slot = `Tables can be held between ${OPEN}:00 and ${CLOSE}:00. Please choose a time slot.`;
    }
    if (!seat) e.seat = "Choose a table.";
    else if (seatBooked(seat)) e.seat = "That table is already booked.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (lock.current) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    lock.current = true; setBusy(true);
    try {
      const payload = { seatId: seat, name: nameVal, phone: phoneVal, guests: Number(form.guests), specialRequest: form.specialRequest };
      const url = mode === "now" ? "/api/reservations/hold" : "/api/reservations/bookSeatSlot";
      const { data } = await api.post(url, mode === "now" ? payload : { ...payload, date, startTime: slot.startTime, endTime: slot.endTime });
      setDone(data); setSeat(""); setSlot(null);
      refresh();
    } catch (err) {
      const msg = errorMessage(err);
      setErrors({ form: msg });
      if (err?.response?.status === 409) refresh();
    } finally { lock.current = false; setBusy(false); }
  };

  const cancel = async (reservationId) => {
    try { await api.post("/api/reservations/cancel", { reservationId }); toast.success("Reservation cancelled."); refresh(); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const maxDate = useMemo(() => addDays(todayISO(), MAX_DAYS), []);

  return (
    <section className="reserve section">
      <div className="container">
        <h1 className="heading">Reserve a table</h1>

        {isAdmin && (<p className="notice notice--info">You are logged in as admin. Reservations are managed from the <Link to="/admin">dashboard</Link>.</p>)}
        {!user && (
          <p className="notice notice--info">
            You can check availability now. To confirm a booking please <Link to="/login" state={{ from: "/reservation" }}>log in</Link> or <Link to="/register" state={{ from: "/reservation" }}>register</Link>.
          </p>
        )}

        <form className="reserve__grid" onSubmit={submit} noValidate>
          <div className="panel">
            <h2>1. Your details</h2>
            <div className="field"><label htmlFor="r-name">Name</label><input id="r-name" value={nameVal} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} />{errors.name && <small className="field__error" role="alert">{errors.name}</small>}</div>
            <div className="field"><label htmlFor="r-email">Email</label><input id="r-email" value={user?.email || ""} readOnly placeholder="Log in to see your email" /><small className="muted">Confirmation is sent to your registered email.</small></div>
            <div className="field"><label htmlFor="r-phone">Phone</label><input id="r-phone" type="tel" value={phoneVal} onChange={set("phone")} autoComplete="tel" aria-invalid={!!errors.phone} />{errors.phone && <small className="field__error" role="alert">{errors.phone}</small>}</div>
            <div className="field"><label htmlFor="r-guests">Guests</label><input id="r-guests" type="number" min="1" max="20" value={form.guests} onChange={set("guests")} aria-invalid={!!errors.guests} />{errors.guests && <small className="field__error" role="alert">{errors.guests}</small>}</div>
            <div className="field"><label htmlFor="r-note">Special request (optional)</label><textarea id="r-note" rows="2" maxLength={300} value={form.specialRequest} onChange={set("specialRequest")} /></div>
          </div>

          <div className="panel">
            <h2>2. Date and time</h2>
            <div className="tabs" role="group" aria-label="Reservation type">
              <button type="button" className={mode === "slot" ? "is-active" : ""} aria-pressed={mode === "slot"} onClick={() => { setMode("slot"); setSeat(""); }}>Book a time slot</button>
              <button type="button" className={mode === "now" ? "is-active" : ""} aria-pressed={mode === "now"} onClick={() => { setMode("now"); setSeat(""); setSlot(null); }}>Reserve now (1 hour)</button>
            </div>
            {mode === "slot" ? (
              <>
                <div className="field"><label htmlFor="r-date">Date</label><input id="r-date" type="date" min={todayISO()} max={maxDate} value={date} onChange={(e) => { setDate(e.target.value); setSlot(null); setSeat(""); }} aria-invalid={!!errors.date} />{errors.date && <small className="field__error" role="alert">{errors.date}</small>}</div>
                <fieldset className="slots">
                  <legend>Time</legend>
                  {SLOTS.map((s) => {
                    const free = SEATS.length - new Set(overlapping(s).map((r) => r.seatId)).size;
                    const disabled = slotPast(s) || free === 0;
                    return (
                      <button type="button" key={s.startTime} disabled={disabled} className={`slot ${slot?.startTime === s.startTime ? "is-selected" : ""}`} aria-pressed={slot?.startTime === s.startTime} onClick={() => { setSlot(s); setSeat(""); }}>
                        {s.startTime}<small>{slotPast(s) ? "Passed" : free === 0 ? "Full" : `${free} free`}</small>
                      </button>
                    );
                  })}
                </fieldset>
              </>
            ) : (
              <p className="muted">Holds a table for one hour starting now (within {OPEN}:00–{CLOSE}:00).</p>
            )}
            {errors.slot && <p className="field__error" role="alert">{errors.slot}</p>}
          </div>

          <div className="panel panel--wide">
            <h2>3. Choose a table</h2>
            {availError && <p className="notice notice--warn" role="alert">{availError}</p>}
            {mode === "slot" && !slot ? <p className="muted">Pick a time slot to see which tables are free.</p> : (
              <div className="seats" role="group" aria-label="Tables">
                {SEATS.map((id) => {
                  const booked = seatBooked(id);
                  return (
                    <button type="button" key={id} disabled={booked} className={`seat ${seat === id ? "is-selected" : ""} ${booked ? "is-booked" : ""}`} aria-pressed={seat === id} onClick={() => setSeat(id)}>
                      <span>{id}</span><small>{booked ? "Booked" : seat === id ? "Selected" : "Free"}</small>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.seat && <p className="field__error" role="alert">{errors.seat}</p>}
            {errors.form && <p className="notice notice--warn" role="alert">{errors.form}</p>}
            {user && !isAdmin ? (
              <button className="btn btn--primary" disabled={busy}>{busy ? "Reserving…" : "Confirm reservation"}</button>
            ) : (
              isAdmin ? null : <Link to="/login" state={{ from: "/reservation" }} className="btn btn--primary">Log in to reserve</Link>
            )}
          </div>
        </form>

        {user && !isAdmin && mine.length > 0 && (
          <div className="panel myres">
            <h2>Your upcoming reservations</h2>
            <ul>
              {mine.map((r) => (
                <li key={r.reservationId}>
                  <span><strong>{r.reservationId}</strong> · {fmtDate(r.date)} · {r.startTime}–{r.endTime} · Table {r.seatId} · {r.guests} guest{r.guests > 1 ? "s" : ""}</span>
                  <button type="button" className="linkbtn" onClick={() => cancel(r.reservationId)}>Cancel</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {done && (
        <SuccessModal
          title="Reservation confirmed"
          message="Your table has been reserved successfully."
          details={[
            { label: "Reservation ID", value: done.reservation.reservationId },
            { label: "Date", value: fmtDate(done.reservation.date) },
            { label: "Time", value: `${done.reservation.startTime} – ${done.reservation.endTime}` },
            { label: "Guests", value: String(done.reservation.guests) },
            { label: "Table", value: done.reservation.seatId },
          ]}
          notices={notificationNotices(done.notifications, user?.email)}
          onClose={() => setDone(null)}
        />
      )}
    </section>
  );
};

export default Reservation;
