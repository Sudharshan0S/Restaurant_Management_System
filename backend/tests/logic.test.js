import test from "node:test";
import assert from "node:assert/strict";
import { priceOrder } from "../services/pricing.js";
import { buildStats, recommendFor } from "../services/recommendations.js";
import { normalizePhone, strongPassword, isEmail } from "../utils/validators.js";
import { requireRole } from "../middlewares/auth.js";
import { validateDate, validateSlot } from "../controller/reservation.js";

const dishes = [
  { id: "1", title: "Masala Dosa", price: 80 },
  { id: "7", title: "Hyderabadi Biryani", price: 220 },
  { id: "8", title: "Barfi", price: 80 },
];
const combos = [{ comboId: "C4", comboName: "Biryani + Raita", addOn: "Raita", extraPrice: 50, dishIds: ["7"] }];

test("order prices come from the server data; combos add their extra price", () => {
  const r = priceOrder([{ menuId: "7", qty: 2, comboId: "C4", price: 1, total: 1 }], dishes, combos);
  assert.equal(r.total, (220 + 50) * 2);
  assert.equal(r.items[0].lineTotal, 540);
});
test("identical lines are merged", () => {
  const r = priceOrder([{ menuId: "1", qty: 1 }, { menuId: "1", qty: 2 }], dishes, combos);
  assert.equal(r.items.length, 1);
  assert.equal(r.total, 240);
});
test("invalid orders are rejected", () => {
  assert.throws(() => priceOrder([], dishes, combos));
  assert.throws(() => priceOrder([{ menuId: "1", qty: 0 }], dishes, combos));
  assert.throws(() => priceOrder([{ menuId: "1", qty: 21 }], dishes, combos));
  assert.throws(() => priceOrder([{ menuId: "999", qty: 1 }], dishes, combos));
  assert.throws(() => priceOrder([{ menuId: "9", qty: 1 }], dishes, combos), /not on the menu/);
  assert.throws(() => priceOrder([{ menuId: "1", qty: 1, comboId: "C4" }], dishes, combos)); // combo for another dish
});

const ctx = { dishes, combos };
test("recommendations fall back to predefined pairings when there is little data", () => {
  const r = recommendFor("7", buildStats([]), ctx);
  assert.equal(r.source, "predefined");
  assert.equal(r.suggestions[0].id, "C4");
});
test("recommendations use order co-occurrence once there is enough data", () => {
  const orders = [
    { items: [{ menuId: "7", comboId: "C4" }] }, { items: [{ menuId: "7", comboId: "C4" }, { menuId: "8" }] },
    { items: [{ menuId: "7", comboId: "C4" }] }, { items: [{ menuId: "7" }, { menuId: "8" }] },
  ];
  const r = recommendFor("7", buildStats(orders), ctx);
  assert.equal(r.source, "orders");
  assert.equal(r.basedOnOrders, 4);
  assert.equal(r.suggestions[0].id, "C4");
  assert.equal(r.suggestions[0].count, 3);
  assert.equal(r.suggestions[1].name, "Barfi");
});

test("validators", () => {
  assert.equal(normalizePhone("+91 98765 43210"), "9876543210");
  assert.equal(normalizePhone("12345"), null);
  assert.ok(strongPassword("admin123"));
  assert.ok(!strongPassword("short1"));
  assert.ok(!strongPassword("onlyletters"));
  assert.ok(isEmail("a@b.com") && !isEmail("nope"));
});

test("requireRole only lets matching roles through", () => {
  let called = null;
  const next = (e) => { called = e || "ok"; };
  requireRole("admin")({ user: { role: "admin" } }, {}, next); assert.equal(called, "ok");
  requireRole("admin")({ user: { role: "customer" } }, {}, next); assert.equal(called.statusCode, 403);
  requireRole("admin")({}, {}, next); assert.equal(called.statusCode, 403);
});

test("reservation validation", () => {
  assert.throws(() => validateDate("2020-01-01"));
  assert.throws(() => validateDate("2026-02-31"));
  assert.throws(() => validateDate("tomorrow"));
  assert.throws(() => validateSlot("2099-01-01", "03:00", "04:00"));
  assert.doesNotThrow(() => validateSlot("2099-01-01", "13:00", "14:00"));
});
