export const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n) || 0);

// Photos live in frontend/public. encodeURI keeps parentheses/underscores and encodes spaces ("Masala dosa.jpg" -> "Masala%20dosa.jpg").
export const imgSrc = (file) => {
  if (!file) return null;
  const f = String(file);
  if (/^(https?:|data:)/.test(f)) return f;
  return "/" + encodeURI(f.replace(/^\.?\//, ""));
};

export const normalizePhone = (raw) => {
  let d = String(raw ?? "").replace(/[\s\-()]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (/^91\d{10}$/.test(d)) d = d.slice(2);
  if (/^0\d{10}$/.test(d)) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
};
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Turns the server's notification result into user-facing wording. Never claims "sent" unless the server says so.
export const notificationNotices = (n, email) => {
  const out = [];
  const e = n?.email?.status;
  if (e === "sent") out.push({ tone: "ok", text: `Confirmation email sent to ${email}.` });
  else if (e === "failed") out.push({ tone: "warn", text: "We could not send the confirmation email, but your booking is saved." });
  else if (e === "not_configured") out.push({ tone: "info", text: "Email service is not configured on this server, so no email was sent." });
  const s = n?.sms?.status;
  if (s === "sent") out.push({ tone: "ok", text: "Confirmation SMS sent to your phone." });
  else if (s === "failed") out.push({ tone: "warn", text: "We could not send the SMS confirmation." });
  return out;
};
