// Notification service. Reads configuration lazily from environment variables.
// Every send returns one of:  { status: "sent" | "failed" | "not_configured" | "skipped" }
// Nothing is ever reported as "sent" unless the provider accepted the message.
import nodemailer from "nodemailer";

export const restaurantName = () => process.env.RESTAURANT_NAME || "Indian Restaurant";

const emailConfigured = () =>
  ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASSWORD", "EMAIL_FROM"].every((k) => !!process.env[k]);

const smsConfigured = () =>
  process.env.SMS_PROVIDER === "twilio" &&
  ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"].every((k) => !!process.env[k]);

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.EMAIL_PORT);
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port,
      secure: process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === "true" : port === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 7000,
    });
  }
  return transporter;
};

export async function sendEmail({ to, subject, text, html }) {
  if (!to) return { status: "skipped" };
  if (!emailConfigured()) return { status: "not_configured" };
  try {
    await getTransporter().sendMail({ from: process.env.EMAIL_FROM, to, subject, text, html });
    return { status: "sent" };
  } catch (err) {
    console.error("[notify] email failed:", err.message);
    return { status: "failed" };
  }
}

// SMS through Twilio's REST API (no SDK needed). To use another provider, replace this function.
export async function sendSms({ phone, body }) {
  if (!phone) return { status: "skipped" };
  if (!smsConfigured()) return { status: "not_configured" };
  try {
    const cc = process.env.SMS_DEFAULT_COUNTRY_CODE || "+91";
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: `${cc}${phone}`, From: process.env.TWILIO_FROM, Body: body }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Twilio responded ${res.status}`);
    return { status: "sent" };
  } catch (err) {
    console.error("[notify] sms failed:", err.message);
    return { status: "failed" };
  }
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const when = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export async function notifyOrder(order, user) {
  const name = restaurantName();
  const lines = order.items.map((i) => `- ${i.name} x${i.qty}${i.comboName ? ` (${i.comboName})` : ""} - ${inr(i.lineTotal)}`);
  const text = [
    `Hello ${user.name},`, "", "Your order has been successfully placed.", "", "Order:", ...lines, "",
    `Total: ${inr(order.total)}`, `Order ID: ${order.orderId}`, `Placed on: ${when(order.createdAt)}`, "",
    `Thank you for ordering with ${name}.`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#2a1f1a">
    <h2 style="color:#8e2a1e;margin-bottom:4px">${esc(name)}</h2>
    <p>Hello ${esc(user.name)},</p><p>Your order has been successfully placed.</p>
    <table style="width:100%;border-collapse:collapse">${order.items.map((i) =>
      `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.name)} x${i.qty}${i.comboName ? `<br><small>${esc(i.comboName)}</small>` : ""}</td><td style="text-align:right;border-bottom:1px solid #eee">${inr(i.lineTotal)}</td></tr>`).join("")}
    <tr><td style="padding-top:10px"><strong>Total</strong></td><td style="text-align:right;padding-top:10px"><strong>${inr(order.total)}</strong></td></tr></table>
    <p>Order ID: <strong>${esc(order.orderId)}</strong><br>Placed on: ${esc(when(order.createdAt))}</p>
    <p>Thank you for ordering with ${esc(name)}.</p></div>`;
  const [email, sms] = await Promise.all([
    sendEmail({ to: user.email, subject: `Order Confirmation - ${order.orderId}`, text, html }),
    sendSms({ phone: order.phone, body: `${name}: order ${order.orderId} placed. Total ${inr(order.total)}.` }),
  ]);
  return { email, sms };
}

export async function notifyReservation(r, user) {
  const name = restaurantName();
  const text = [
    `Hello ${r.firstName},`, "", "Your table has been reserved successfully.", "",
    `Reservation ID: ${r.reservationId}`, `Date: ${r.date}`, `Time: ${r.startTime} - ${r.endTime}`,
    `Guests: ${r.guests}`, `Table: ${r.seatId}`, ...(r.specialRequest ? [`Special request: ${r.specialRequest}`] : []), "",
    `We look forward to welcoming you at ${name}.`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#2a1f1a">
    <h2 style="color:#8e2a1e;margin-bottom:4px">${esc(name)}</h2><p>Hello ${esc(r.firstName)},</p>
    <p>Your table has been reserved successfully.</p>
    <p>Reservation ID: <strong>${esc(r.reservationId)}</strong><br>Date: ${esc(r.date)}<br>Time: ${esc(r.startTime)} - ${esc(r.endTime)}<br>
    Guests: ${r.guests}<br>Table: ${esc(r.seatId)}${r.specialRequest ? `<br>Special request: ${esc(r.specialRequest)}` : ""}</p>
    <p>We look forward to welcoming you at ${esc(name)}.</p></div>`;
  const [email, sms] = await Promise.all([
    sendEmail({ to: user.email, subject: `Reservation Confirmed - ${r.reservationId}`, text, html }),
    sendSms({ phone: r.phone, body: `${name}: table ${r.seatId} reserved ${r.date} ${r.startTime}-${r.endTime} for ${r.guests}. Ref ${r.reservationId}.` }),
  ]);
  return { email, sms };
}
