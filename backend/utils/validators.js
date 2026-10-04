import validator from "validator";

// Indian mobile numbers: accepts "9876543210", "+91 98765 43210", "09876543210".
// Returns the 10-digit number or null.
export const normalizePhone = (raw) => {
  let d = String(raw ?? "").replace(/[\s\-()]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (/^91\d{10}$/.test(d)) d = d.slice(2);
  if (/^0\d{10}$/.test(d)) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
};

export const isEmail = (v) => typeof v === "string" && validator.isEmail(v.trim());
export const cleanText = (v, max) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, max);
export const strongPassword = (p) => typeof p === "string" && p.length >= 8 && p.length <= 72 && /[A-Za-z]/.test(p) && /\d/.test(p);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export const randomCode = (len = 6) => {
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
};
