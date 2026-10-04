import { describe, it, expect } from "vitest";
import { formatINR, imgSrc, normalizePhone, isEmail, notificationNotices } from "./utils.js";

describe("utils", () => {
  it("formats rupees with Indian digit grouping", () => {
    expect(formatINR(270)).toBe("₹270");
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(undefined)).toBe("₹0");
  });
  it("resolves static image paths (spaces, case, underscores, parentheses)", () => {
    expect(imgSrc("Masala dosa.jpg")).toBe("/Masala%20dosa.jpg");
    expect(imgSrc("./kheer.jpg")).toBe("/kheer.jpg");
    expect(imgSrc("phirni(desert).jpg")).toBe("/phirni(desert).jpg");
    expect(imgSrc("Dal_tadka.jpg")).toBe("/Dal_tadka.jpg");
    expect(imgSrc(null)).toBeNull();
  });
  it("validates Indian phone numbers and emails", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("12345")).toBeNull();
    expect(isEmail("admin@gmail.com")).toBe(true);
    expect(isEmail("admin.gmail.com")).toBe(false);
  });
  it("never claims a message was sent unless the server says so", () => {
    expect(notificationNotices({ email: { status: "not_configured" } }, "a@b.com")[0].text).toMatch(/not configured/);
    expect(notificationNotices({ email: { status: "sent" } }, "a@b.com")[0].tone).toBe("ok");
    expect(notificationNotices({ email: { status: "failed" } }, "a@b.com")[0].tone).toBe("warn");
    expect(notificationNotices({}, "a@b.com")).toEqual([]);
  });
});
